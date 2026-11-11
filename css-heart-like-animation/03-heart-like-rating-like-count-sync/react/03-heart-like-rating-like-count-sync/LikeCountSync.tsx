import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import styles from "./LikeCountSync.module.scss";

export type LikeCountSyncProps = {
  duration?: number;
  easing?: string;
  color?: string;
  baseCount?: number;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** 파티클 1개의 물성 — 질량·감쇠·중력으로 흩어졌다 멈춘다 */
type Particle = {
  x: number; y: number; vx: number; vy: number;
  m: number; k: number; g: number;
  rot: number; spin: number; s: number;
  born: number; life: number;
};

// 미니 하트 / 별 모양 교차 배치
const KINDS = ["heart", "star", "heart", "star", "heart"] as const;

/** 질량-감쇠 물리 초기 상태. 감쇠 가속도 = -k/m·v (질량이 클수록 덜 감속), 중력 = g (질량 무관). */
function spawn(now: number, i: number): Particle {
  const m = 0.6 + Math.random() * 0.9;                        // 개별 질량 0.6~1.5
  const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;     // 위쪽 부채꼴 ±69°
  const v0 = (100 + Math.random() * 90) * (1.15 - m * 0.2);   // 무거울수록 느게 출발
  return {
    x: 0, y: 0,
    vx: Math.cos(ang) * v0, vy: Math.sin(ang) * v0,
    m, k: 3.6, g: 320,
    rot: (Math.random() - 0.5) * 40, spin: (Math.random() - 0.5) * 480,
    s: 0.4 + m * 0.3,
    born: now + i * 26, life: 800 + Math.random() * 420,      // 순차 분사 + 수명 랜덤
  };
}

export default function LikeCountSync({ duration = 220, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#fff7e6", baseCount = 12 }: LikeCountSyncProps) {
  const [liked, setLiked] = useState(false);
  const [pop, setPop] = useState(0);
  const wrapRef = useRef<HTMLLabelElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const fire = useCallback(() => setPop((p) => p + 1), []);

  // 준암시 오일러 적분 루프 — rAF 안에서 좌표를 계산해 transform 에 쓴다 (keyframes 하드코딩 아님)
  useEffect(() => {
    if (!pop) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const els = Array.from(wrap.querySelectorAll<HTMLElement>(`.${styles.spark}`));
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
  }, [pop]);

  const toggle = (checked: boolean) => { setLiked(checked); if (checked) fire(); };

  return (
    <label className={styles.like} style={vars} ref={wrapRef}>
      <input type="checkbox" className={styles.input} checked={liked} onChange={(e: ChangeEvent<HTMLInputElement>) => toggle(e.target.checked)} />
      <span className={`${styles.heart} ${liked ? styles.isLiked : ""}`} aria-hidden="true" />
      {KINDS.map((kind, i) => (
        <span key={i} className={`${styles.spark} ${kind === "heart" ? styles.sHeart : styles.sStar}`} aria-hidden="true" />
      ))}
      <span className={styles.count}>
        <span key={pop} className={styles.num}>{liked ? baseCount + 1 : baseCount}</span>
      </span>
    </label>
  );
}
