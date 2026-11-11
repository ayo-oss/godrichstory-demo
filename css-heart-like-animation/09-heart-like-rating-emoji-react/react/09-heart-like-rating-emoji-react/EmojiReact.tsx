import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./EmojiReact.module.scss";

export type EmojiReactProps = {
  duration?: number;
  easing?: string;
  defaultValue?: string | null;
  onChange?: (value: string) => void;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string };

/** 미니 하트 1개의 물성 — 질량·감쇠·중력으로 퍼졌다 멈춘다 */
type Particle = {
  x: number; y: number; vx: number; vy: number;
  m: number; k: number; g: number;
  rot: number; spin: number; s: number;
  born: number; life: number;
};

const SPARK_COUNT = 5;

const OPTIONS = [
  { id: "heart", emoji: "❤️", label: "하트" },
  { id: "laugh", emoji: "😂", label: "웃음" },
  { id: "like", emoji: "👍", label: "좋아요" },
  { id: "wow", emoji: "😮", label: "놀람" },
];

/** 질량-감쇠 물리 초기 상태. 감쇠 = -k/m·v, 중력 = g. 고른 이모지 라벨 중심에서 위쪽 부채꼴로 흩어진다. */
function spawn(now: number, i: number): Particle {
  const m = 0.6 + Math.random() * 0.8;                          // 개별 질량 0.6~1.4
  const ang = -Math.PI / 2 + (Math.random() - 0.5) * 3.2;       // 위쪽 부채꼴 ±92°
  const v0 = (110 + Math.random() * 70) * (1.15 - m * 0.2);     // 무거울수록 느게 출발
  return {
    x: 0, y: 0,
    vx: Math.cos(ang) * v0, vy: Math.sin(ang) * v0,
    m, k: 3.5, g: 300,
    rot: (Math.random() - 0.5) * 40, spin: (Math.random() - 0.5) * 800,
    s: 0.4 + m * 0.3,
    born: now + i * 22, life: 650 + Math.random() * 350,        // 순차 분사 + 수명 랜덤
  };
}

export default function EmojiReact({ duration = 220, easing = "cubic-bezier(.2,1.4,.4,1)", defaultValue = null, onChange }: EmojiReactProps) {
  const [picked, setPicked] = useState(defaultValue);
  const [burstKey, setBurstKey] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing };

  const fire = useCallback(() => setBurstKey((k) => k + 1), []);

  // 준암시 오일러 적분 루프 — rAF 안에서 좌표를 계산해 transform 에 쓴다 (keyframes 하드코딩 아님)
  useEffect(() => {
    if (!burstKey) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const els = Array.from(wrap.querySelectorAll<HTMLElement>(`.${styles.spark}`)); // 렌더된 그룹(고른 라벨 하나)만
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
    <fieldset className={styles.react} style={vars}>
      <legend className={styles.legend}>리액션 고르기</legend>
      <div className={styles.row} data-active={picked ? "" : undefined} ref={wrapRef}>
        {OPTIONS.map((o) => (
          <label key={o.id} className={styles.emoji} data-picked={picked === o.id || undefined}>
            <input
              type="radio"
              name="react"
              className={styles.input}
              checked={picked === o.id}
              onChange={() => { setPicked(o.id); fire(); onChange?.(o.id); }}
              aria-label={o.label}
            />
            <span aria-hidden="true">{o.emoji}</span>
            {picked === o.id && (
              <span className={styles.fx} aria-hidden="true">
                {Array.from({ length: SPARK_COUNT }, (_, i) => (
                  <span key={`${burstKey}-${i}`} className={styles.spark} aria-hidden="true" />
                ))}
              </span>
            )}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
