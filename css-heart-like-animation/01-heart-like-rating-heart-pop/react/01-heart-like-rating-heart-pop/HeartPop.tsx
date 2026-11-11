import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import styles from "./HeartPop.module.scss";

export type HeartPopProps = {
  /** 하트가 튀어 오르는 시간 (기본 220ms) */
  duration?: number;
  /** CSS easing (기본 cubic-bezier(.2,1.4,.4,1)) */
  easing?: string;
  /** 채워질 때 하트 색 */
  color?: string;
  defaultLiked?: boolean;
  onChange?: (liked: boolean) => void;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** 파티클 1개의 물성 — 질량·감쇠·중력으로 흩어졌다 멈춘다 */
type Particle = {
  x: number; y: number; vx: number; vy: number;
  m: number; k: number; g: number;
  rot: number; spin: number; s: number;
  born: number; life: number;
};

// 미니 하트 / 별 모양 교차 배치 (레이아웃·색은 기존 그대로)
const KINDS = ["heart", "star", "heart", "star", "heart", "star", "heart"] as const;

/** 질량-감쇠 물리 초기 상태. 감쇠 가속도 = -k/m·v (질량이 클수록 덜 감속), 중력 = g (질량 무관). */
function spawn(now: number, i: number): Particle {
  const m = 0.6 + Math.random() * 0.9;                        // 개별 질량 0.6~1.5
  const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.5;     // 위쪽 부채꼴 ±72°
  const v0 = (110 + Math.random() * 100) * (1.15 - m * 0.2);  // 무거울수록 느게 출발
  return {
    x: 0, y: 0,
    vx: Math.cos(ang) * v0, vy: Math.sin(ang) * v0,
    m, k: 3.4, g: 300,
    rot: (Math.random() - 0.5) * 40, spin: (Math.random() - 0.5) * 540,
    s: 0.4 + m * 0.3,
    born: now + i * 22, life: 800 + Math.random() * 450,      // 순차 분사 + 수명 랜덤
  };
}

export default function HeartPop({
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#fff7e6",
  defaultLiked = false,
  onChange,
}: HeartPopProps) {
  const [liked, setLiked] = useState(defaultLiked);
  const [burstKey, setBurstKey] = useState(0);
  const iconRef = useRef<HTMLSpanElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 한 겹: 체크되는 순간 파티클을 (재)발사 — 다시 좋아요를 눌러도 재생
  const fire = useCallback(() => setBurstKey((k) => k + 1), []);

  // 준암시 오일러 적분 루프 — rAF 안에서 좌표를 계산해 transform 에 쓴다 (keyframes 하드코딩 아님)
  useEffect(() => {
    if (!burstKey) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const icon = iconRef.current;
    if (!icon) return;
    const els = Array.from(icon.querySelectorAll<HTMLElement>(`.${styles.particle}`));
    if (!els.length) return;
    const now = performance.now();
    const ps: (Particle | null)[] = els.map((_, i) => spawn(now, i));
    let raf = 0, last = now, alive = true;
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
      if (any) raf = requestAnimationFrame(step); else alive = false; // 전부 정지하면 루프 종료
    };
    raf = requestAnimationFrame(step);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [burstKey]);

  return (
    <label className={styles.heart} style={vars}>
      <input
        type="checkbox"
        className={styles.input}
        checked={liked}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          setLiked(e.target.checked);
          if (e.target.checked) fire();
          onChange?.(e.target.checked);
        }}
      />
      <span className={styles.icon} aria-hidden="true" ref={iconRef}>
        <span className={`${styles.shape} ${styles.outline}`} />
        <span className={`${styles.shape} ${styles.fill} ${liked ? styles.isLiked : ""}`} />
        {KINDS.map((kind, i) => (
          <span
            key={i}
            className={`${styles.particle} ${kind === "heart" ? styles.pHeart : styles.pStar}`}
          />
        ))}
      </span>
      <span className={styles.label}>좋아요</span>
    </label>
  );
}
