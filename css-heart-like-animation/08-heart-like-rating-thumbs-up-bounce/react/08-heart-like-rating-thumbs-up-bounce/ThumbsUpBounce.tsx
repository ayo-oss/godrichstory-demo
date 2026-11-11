import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import styles from "./ThumbsUpBounce.module.scss";

export type ThumbsUpBounceProps = {
  duration?: number;
  easing?: string;
  defaultHelpful?: boolean;
  onChange?: (helpful: boolean) => void;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string };

/** 임팩트 스파크 1개의 물성 — 가벼운 질량·빠른 감쇠로 착지 순간 퍼졌다 멈춘다 */
type Particle = {
  x: number; y: number; vx: number; vy: number;
  m: number; k: number; g: number;
  rot: number; spin: number; s: number;
  born: number; life: number;
};

// 미니 별 4개 + 동그라미 점 2개 교차 배치 (점은 회전 없이 translate+scale 만)
const KINDS = ["star", "dot", "star", "dot", "star", "star"] as const;

/** 질량-감쇠 물리 초기 상태. 감쇠 = -k/m·v (임팩트라 빠른 감쇠 k=4), 중력 = g. */
function spawn(now: number, i: number): Particle {
  const m = 0.5 + Math.random() * 0.6;                          // 가벼운 질량 0.5~1.1
  const ang = -Math.PI / 2 + (Math.random() - 0.5) * 3.2;       // 위쪽 부채꼴 ±92°
  const v0 = (120 + Math.random() * 80) * (1.1 - m * 0.15);     // 가벼울수록 빠르게 출발
  const isDot = KINDS[i] === "dot";
  return {
    x: 0, y: 0,
    vx: Math.cos(ang) * v0, vy: Math.sin(ang) * v0,
    m, k: 4.0, g: 300,
    rot: (Math.random() - 0.5) * 40, spin: isDot ? 0 : (Math.random() - 0.5) * 720,
    s: 0.4 + m * 0.3,
    born: now + i * 16, life: 550 + Math.random() * 350,        // 순차 분사 + 수명 랜덤
  };
}

export default function ThumbsUpBounce({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", defaultHelpful = false, onChange }: ThumbsUpBounceProps) {
  const [helpful, setHelpful] = useState(defaultHelpful);
  const [burstKey, setBurstKey] = useState(0);
  const wrapRef = useRef<HTMLLabelElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing };

  const fire = useCallback(() => setBurstKey((k) => k + 1), []);

  // 준암시 오일러 적분 루프 — rAF 안에서 좌표를 계산해 transform 에 쓴다 (keyframes 하드코딩 아님)
  useEffect(() => {
    if (!burstKey) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const icon = wrap.querySelector<HTMLElement>(`.${styles.icon}`);
    const fx = wrap.querySelector<HTMLElement>(`.${styles.fx}`);
    if (!icon || !fx) return;
    fx.style.left = `${icon.offsetLeft + icon.offsetWidth / 2}px`; // 아이콘 중심으로 발사점 이동(아이콘 애니메이션과 분리)
    const els = Array.from(fx.querySelectorAll<HTMLElement>(`.${styles.spark}`));
    if (!els.length) return;
    const now = performance.now();
    const ps: (Particle | null)[] = els.map((_, i) => spawn(now, i));
    let raf = 0, last = now;
    const step = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.05);            // 탭 복귀 시 폭주 방지 클램프
      last = t;
      let any = false;
      for (let i = 0; i < els.length; i++) {
        const el = els[i], p = ps[i]; if (!p) continue;
        const age = t - p.born;
        if (age < 0) { any = true; continue; }                  // 방출 전 지연
        if (age >= p.life) { el.style.opacity = "0"; ps[i] = null; continue; } // 수명 끝 → 정지
        p.vx += (-p.k / p.m * p.vx) * dt;                       // 감쇠 = -k/m·v
        p.vy += (p.g - p.k / p.m * p.vy) * dt;                  // 중력 + 감쇠
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt;
        const o = age / p.life;
        el.style.opacity = o < 0.55 ? "1" : (1 - (o - 0.55) / 0.45).toFixed(3);
        el.style.transform =
          `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px) rotate(${p.rot.toFixed(1)}deg) scale(${p.s.toFixed(3)})`;
        any = true;
      }
      if (any) raf = requestAnimationFrame(step);               // 전부 정지하면 루프 종료
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [burstKey]);

  return (
    <label className={styles.thumb} style={vars} ref={wrapRef}>
      <input
        type="checkbox"
        className={styles.input}
        checked={helpful}
        onChange={(e: ChangeEvent<HTMLInputElement>) => { setHelpful(e.target.checked); if (e.target.checked) fire(); onChange?.(e.target.checked); }}
      />
      <span className={`${styles.icon} ${helpful ? styles.isHelpful : ""}`} aria-hidden="true">👍</span>
      <span className={styles.label}>도움됐어요</span>
      <span className={styles.fx} aria-hidden="true">
        {KINDS.map((kind, i) => (
          <span key={`${burstKey}-${i}`} className={`${styles.spark} ${kind === "star" ? styles.sStar : styles.sDot}`} aria-hidden="true" />
        ))}
      </span>
    </label>
  );
}
