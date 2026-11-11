import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import styles from "./StarFill.module.scss";

export type StarFillProps = {
  duration?: number;
  easing?: string;
  color?: string;
  defaultValue?: number;
  onChange?: (value: number) => void;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** 파티클 1개의 물성 — 질량·감쇠·중력으로 흩어졌다 멈춘다 */
type Particle = {
  x: number; y: number; vx: number; vy: number;
  m: number; k: number; g: number; s: number;
  rot: number; spin: number;
  born: number; life: number;
};

const STARS = [5, 4, 3, 2, 1]; // 역순 DOM — 형제 선택자로 앞쪽 별까지 채우는 CSS 데모와 순서를 맞춘다
const SPARKS = [0, 1, 2, 3];

/** 질량-감쇠 물리 초기 상태. 감쇠 가속도 = -k/m·v (무거울수록 덜 감속), 중력 = g (질량 무관). */
function spawn(now: number, i: number): Particle {
  const m = 0.6 + Math.random() * 0.8;                            // 개별 질량 0.6~1.4
  const ang = -Math.PI / 2 + (Math.random() - 0.5) * 3;           // 위쪽 부채꼴 ±86°
  const v0 = (120 + Math.random() * 80) * (1.15 - m * 0.2);       // 무거울수록 느게 출발
  return {
    x: 0, y: 0,
    vx: Math.cos(ang) * v0, vy: Math.sin(ang) * v0,
    m, k: 3.6, g: 300, s: 0.4 + m * 0.3,
    rot: (Math.random() - 0.5) * 40, spin: (Math.random() - 0.5) * 840,
    born: now + i * 24, life: 650 + Math.random() * 300,          // 순차 분사 + 수명 랜덤
  };
}

export default function StarFill({ duration = 300, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#2f6df6", defaultValue = 0, onChange }: StarFillProps) {
  const [value, setValue] = useState(defaultValue);
  const [burstKey, setBurstKey] = useState(0);
  const starRef = useRef<HTMLLabelElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const fire = useCallback(() => setBurstKey((k) => k + 1), []);

  // 준암시 오일러 적분 루프 — rAF 안에서 좌표를 계산해 transform 에 쓴다 (keyframes 하드코딩 아님)
  useEffect(() => {
    if (!burstKey) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const star = starRef.current;
    if (!star) return;
    const els = Array.from(star.querySelectorAll<HTMLElement>(`.${styles.spark}`));
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

  return (
    <fieldset className={styles.rating} style={vars}>
      <legend className={styles.legend}>평점</legend>
      <div className={styles.stars}>
        {STARS.map((n) => (
          <label key={n} className={styles.star} data-picked={n === value || undefined} ref={n === value ? starRef : undefined}>
            <input
              type="radio"
              name="rating"
              className={styles.input}
              checked={value === n}
              onChange={(e: ChangeEvent<HTMLInputElement>) => { setValue(n); if (e.target.checked) fire(); onChange?.(n); }}
              aria-label={`${n}점`}
            />
            <span className={n <= value ? styles.filled : ""}>★</span>
            {n === value && SPARKS.map((i) => (
              <span key={`${burstKey}-${i}`} className={styles.spark} aria-hidden="true" />
            ))}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
