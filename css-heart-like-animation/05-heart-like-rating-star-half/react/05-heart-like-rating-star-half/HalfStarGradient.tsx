import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./HalfStarGradient.module.scss";

export type HalfStarGradientProps = {
  /** 5점 만점 평균 평점, 소수 가능 */
  rating: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--pct"?: string };

/** 파티클 1개의 물성 — 질량·감쇠·중력으로 흩어졌다 멈춘다 */
type Particle = {
  x: number; y: number; vx: number; vy: number;
  m: number; k: number; g: number; s: number;
  rot: number; spin: number;
  born: number; life: number;
};

// 읽는 순서가 언어마다 달라 라벨 전체를 한 문구로 둔다 (en 은 "4.3 out of 5")
const RATING_LABEL = "5점 만점에 {r}점";
const SPARKS = [0, 1, 2, 3, 4, 5];

/** 질량-감쇠 물리 초기 상태. 감쇠 가속도 = -k/m·v (무거울수록 덜 감속), 중력 = g (질량 무관). */
function spawn(now: number, i: number): Particle {
  const m = 0.7 + Math.random() * 0.8;                            // 개별 질량 0.7~1.5
  const ang = -Math.PI / 2 + (Math.random() - 0.5) * 3.4;         // 넓은 위쪽 부채꼴 ±97°
  const v0 = (130 + Math.random() * 80) * (1.15 - m * 0.2);       // 무거울수록 느게 출발
  return {
    x: 0, y: 0,
    vx: Math.cos(ang) * v0, vy: Math.sin(ang) * v0,
    m, k: 3.4, g: 280, s: 0.4 + m * 0.3,
    rot: (Math.random() - 0.5) * 40, spin: (Math.random() - 0.5) * 920,
    born: now + i * 26, life: 700 + Math.random() * 400,          // 순차 분사 + 수명 랜덤
  };
}

// 입력이 아니라 읽기전용 평균 평점 배지. 클릭으로 값을 바꾸는 별점은 04 StarFill 을 쓴다.
export default function HalfStarGradient({ rating, duration = 600, easing = "ease-out", color = "#fff7e6" }: HalfStarGradientProps) {
  const pct = `${Math.max(0, Math.min(5, rating)) / 5 * 100}%`;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color, "--pct": pct };
  const [burstKey, setBurstKey] = useState(0);
  const starsRef = useRef<HTMLSpanElement>(null);

  // 준암시 오일러 적분 루프 — rAF 안에서 좌표를 계산해 transform 에 쓴다 (keyframes 하드코딩 아님)
  useEffect(() => {
    if (!burstKey) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const stars = starsRef.current;
    if (!stars) return;
    const els = Array.from(stars.querySelectorAll<HTMLElement>(`.${styles.spark}`));
    if (!els.length) return;
    const now = performance.now();
    const ps: (Particle | null)[] = els.map((_, i) => spawn(now, i));
    let raf = 0, last = now;
    const step = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.05);                // 탭 복귀 시 폭주 방지 클램프
      last = t;
      let any = false;
      for (let i = 0; i < els.length; i++) {
        const el = els[i], p = ps[i]; if (!p) continue;
        const age = t - p.born;
        if (age < 0) { any = true; continue; }                      // 방출 전 지연
        if (age >= p.life) { el.style.opacity = "0"; ps[i] = null; continue; } // 수명 끝 → 정지
        p.vx += (-p.k / p.m * p.vx) * dt;                           // 감쇠 = -k/m·v
        p.vy += (p.g - p.k / p.m * p.vy) * dt;                      // 중력 + 감쇠
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt;
        const o = age / p.life;
        el.style.opacity = o < 0.55 ? "1" : (1 - (o - 0.55) / 0.45).toFixed(3);
        el.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px) rotate(${p.rot.toFixed(1)}deg) scale(${p.s.toFixed(3)})`;
        any = true;
      }
      if (any) raf = requestAnimationFrame(step);                   // 전부 정지하면 루프 종료
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [burstKey]);

  // 값이 바뀌면(및 최초 마운트) 채움이 다 차는 duration 뒤에 앞가장자리에서 발사
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setTimeout(() => setBurstKey((k) => k + 1), duration);
    return () => clearTimeout(timer);
  }, [rating, duration]);

  return (
    <div className={styles.avg} style={vars} role="img" aria-label={RATING_LABEL.replace("{r}", String(rating))}>
      <span className={styles.stars} aria-hidden="true" ref={starsRef}>
        <span className={styles.base}>★★★★★</span>
        <span className={styles.fill}><span className={styles.fillText}>★★★★★</span></span>
        <span className={styles.fx}>
          {SPARKS.map((i) => (
            <span key={`${burstKey}-${i}`} className={styles.spark} />
          ))}
        </span>
      </span>
      <span className={styles.num}>{rating}</span>
    </div>
  );
}
