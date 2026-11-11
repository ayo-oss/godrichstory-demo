import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import styles from "./ParticleBurst.module.scss";

export type ParticleBurstProps = {
  /** 파티클이 퍼지는 시간 (기본 600ms) */
  duration?: number;
  easing?: string;
  color?: string;
  onChange?: (liked: boolean) => void;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type DotVars = CSSProperties & { "--i"?: number };

/** 파티클 1개의 물성 — 질량·감쇠·중력으로 흩어졌다 멈춘다 */
type Particle = {
  x: number; y: number; vx: number; vy: number;
  m: number; k: number; g: number; s: number;
  born: number; life: number;
};

const DOTS = Array.from({ length: 8 }, (_, i) => i);

/** 질량-감쇠 물리 초기 상태. 감쇠 가속도 = -k/m·v (무거울수록 덜 감속해 관성으로 더 멀리), 중력 = g (질량 무관). */
function spawn(now: number, i: number, n: number): Particle {
  const m = 0.7 + Math.random() * 0.9;                          // 개별 질량 0.7~1.6
  const ang = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.55; // 45° 뼈대 + 지터
  const v0 = (150 + Math.random() * 130) * m;                   // 무거울수록 세게 — 질량이 관성
  return {
    x: 0, y: 0,
    vx: Math.cos(ang) * v0, vy: Math.sin(ang) * v0,
    m, k: 4.2, g: 260, s: 0.35 + m * 0.45,
    born: now + i * 20, life: 620 + Math.random() * 380,        // 순차 분사 + 수명 랜덤
  };
}

export default function ParticleBurst({ duration = 600, easing = "ease-out", color = "#17141a", onChange }: ParticleBurstProps) {
  const [liked, setLiked] = useState(false);
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
    const els = Array.from(icon.querySelectorAll<HTMLElement>(`.${styles.dot}`));
    if (!els.length) return;
    const now = performance.now();
    const ps: (Particle | null)[] = els.map((_, i) => spawn(now, i, els.length));
    let raf = 0, last = now;
    const step = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.05);              // 탭 복귀 시 폭주 방지 클램프
      last = t;
      let any = false;
      for (let i = 0; i < els.length; i++) {
        const el = els[i], p = ps[i]; if (!p) continue;
        const age = t - p.born;
        if (age < 0) { any = true; continue; }                    // 방출 전 지연
        if (age >= p.life) { el.style.opacity = "0"; ps[i] = null; continue; } // 수명 끝 → 정지
        p.vx += (-p.k / p.m * p.vx) * dt;                         // 감쇠 = -k/m·v
        p.vy += (p.g - p.k / p.m * p.vy) * dt;                    // 중력 + 감쇠
        p.x += p.vx * dt; p.y += p.vy * dt;
        const o = age / p.life;
        el.style.opacity = o < 0.6 ? "1" : (1 - (o - 0.6) / 0.4).toFixed(3);
        el.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px) scale(${p.s.toFixed(3)})`;
        any = true;
      }
      if (any) raf = requestAnimationFrame(step);                 // 전부 정지하면 루프 종료
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [burstKey]);

  const handle = (checked: boolean) => {
    setLiked(checked);
    if (checked) fire(); // 다시 좋아요를 눌러도 파티클이 재생되게
    onChange?.(checked);
  };

  return (
    <label className={styles.burst} style={vars}>
      <input type="checkbox" className={styles.input} checked={liked} onChange={(e: ChangeEvent<HTMLInputElement>) => handle(e.target.checked)} />
      <span className={styles.icon} aria-hidden="true" ref={iconRef}>
        <span className={`${styles.heart} ${liked ? styles.isLiked : ""}`} />
        {DOTS.map((i) => (
          <span key={`${burstKey}-${i}`} className={styles.dot} style={{ "--i": i } as DotVars} />
        ))}
      </span>
      <span className={styles.label}>좋아요</span>
    </label>
  );
}
