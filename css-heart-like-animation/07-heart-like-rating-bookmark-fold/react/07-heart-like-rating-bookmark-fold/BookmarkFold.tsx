import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import styles from "./BookmarkFold.module.scss";

export type BookmarkFoldProps = {
  duration?: number;
  easing?: string;
  color?: string;
  defaultSaved?: boolean;
  onChange?: (saved: boolean) => void;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** 종잇조각 1개의 물성 — 질량·감쇠·중력으로 날아갔다 멈춘다 (귀 꼭짓점 기준 바깥 부채꼴) */
type Particle = {
  x: number; y: number; vx: number; vy: number;
  m: number; k: number; g: number;
  rot: number; spin: number; s: number;
  born: number; life: number;
};

const CHIP_COUNT = 6;

/** 질량-감쇠 물리 초기 상태. 감쇠 = -k/m·v, 중력 = g. 접힌 귀에서 위·오른쪽 부채꼴로 흩어진다. */
function spawn(now: number, i: number): Particle {
  const m = 0.7 + Math.random() * 0.9;                          // 개별 질량 0.7~1.6
  const ang = -Math.PI / 4 + (Math.random() - 0.5) * 2.8;       // 바깥쪽(위·오른쪽) 부채꼴 ±80°
  const v0 = (110 + Math.random() * 80) * (1.15 - m * 0.2);     // 무거울수록 느게 출발
  return {
    x: 0, y: 0,
    vx: Math.cos(ang) * v0, vy: Math.sin(ang) * v0,
    m, k: 3.2, g: 320,
    rot: (Math.random() - 0.5) * 40, spin: (Math.random() - 0.5) * 960,
    s: 0.4 + m * 0.3,
    born: now + i * 20, life: 700 + Math.random() * 300,        // 순차 분사 + 수명 랜덤
  };
}

export default function BookmarkFold({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#fff7e6", defaultSaved = false, onChange }: BookmarkFoldProps) {
  const [saved, setSaved] = useState(defaultSaved);
  const [burstKey, setBurstKey] = useState(0);
  const iconRef = useRef<HTMLSpanElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const fire = useCallback(() => setBurstKey((k) => k + 1), []);

  // 준암시 오일러 적분 루프 — rAF 안에서 좌표를 계산해 transform 에 쓴다 (keyframes 하드코딩 아님)
  useEffect(() => {
    if (!burstKey) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const icon = iconRef.current;
    if (!icon) return;
    const els = Array.from(icon.querySelectorAll<HTMLElement>(`.${styles.chip}`));
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
    <label className={styles.bookmark} style={vars}>
      <input
        type="checkbox"
        className={styles.input}
        checked={saved}
        onChange={(e: ChangeEvent<HTMLInputElement>) => { setSaved(e.target.checked); if (e.target.checked) fire(); onChange?.(e.target.checked); }}
      />
      <span className={styles.icon} aria-hidden="true" ref={iconRef}>
        <span className={styles.ribbon}>
          <span className={`${styles.ribbonFill} ${saved ? styles.isSaved : ""}`} />
        </span>
        <span className={`${styles.fold} ${saved ? styles.isSaved : ""}`} />
        <span className={styles.fx} aria-hidden="true">
          {Array.from({ length: CHIP_COUNT }, (_, i) => (
            <span key={`${burstKey}-${i}`} className={styles.chip} aria-hidden="true" />
          ))}
        </span>
      </span>
      <span className={styles.label}>저장</span>
    </label>
  );
}
