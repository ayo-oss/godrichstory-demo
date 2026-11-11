import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ClapCount.module.scss";

export type ClapCountProps = {
  duration?: number;
  easing?: string;
  color?: string;
  baseCount?: number;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** 파티클 1개의 물성 — 질량·감쇠·중력으로 흩어졌다 멈춘다 */
type Particle = {
  x: number; y: number; vx: number; vy: number;
  m: number; k: number; g: number; s: number;
  rot: number; spin: number;
  born: number; life: number;
};

const SPARKS = [0, 1, 2, 3, 4];

/** 질량-감쇠 물리 초기 상태. 감쇠 가속도 = -k/m·v (무거울수록 덜 감속), 중력 = g (질량 무관). 박수 리듬에 맞춰 빠르고 짧게. */
function spawn(now: number, i: number): Particle {
  const m = 0.6 + Math.random() * 0.6;                            // 개별 질량 0.6~1.2
  const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;         // 위쪽 좁은 부채꼴 ±69°
  const v0 = (100 + Math.random() * 70) * (1.15 - m * 0.2);       // 무거울수록 느게 출발
  return {
    x: 0, y: 0,
    vx: Math.cos(ang) * v0, vy: Math.sin(ang) * v0,
    m, k: 3.8, g: 320, s: 0.4 + m * 0.3,
    rot: (Math.random() - 0.5) * 40, spin: (Math.random() - 0.5) * 840,
    born: now + i * 18, life: 550 + Math.random() * 300,          // 순차 분사 + 수명 랜덤
  };
}

export default function ClapCount({ duration = 220, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#17141a", baseCount = 128 }: ClapCountProps) {
  const [count, setCount] = useState(baseCount);
  const [claps, setClaps] = useState(0); // 카운트 증가 펄스이자 파티클 burstKey 를 겸한다
  const btnRef = useRef<HTMLButtonElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const clap = () => { setCount((c) => c + 1); setClaps((k) => k + 1); };

  // 준암시 오일러 적분 루프 — rAF 안에서 좌표를 계산해 transform 에 쓴다 (keyframes 하드코딩 아님)
  useEffect(() => {
    if (!claps) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const btn = btnRef.current;
    if (!btn) return;
    const icon = btn.querySelector<HTMLElement>(`.${styles.icon}`);
    const fx = btn.querySelector<HTMLElement>(`.${styles.fx}`);
    if (!icon || !fx) return;
    fx.style.left = `${icon.offsetLeft + icon.offsetWidth / 2}px`; // 아이콘 중심으로 발사 원점 이동
    const els = Array.from(fx.querySelectorAll<HTMLElement>(`.${styles.spark}`));
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
  }, [claps]);

  return (
    <button type="button" className={styles.clap} style={vars} onClick={clap} aria-label="박수" ref={btnRef}>
      <span key={claps} className={styles.icon} aria-hidden="true">👏</span>
      {claps > 0 && <span key={`plus-${claps}`} className={styles.plus} aria-hidden="true">+1</span>}
      <span className={styles.count}>{count}</span>
      {claps > 0 && (
        <span key={`fx-${claps}`} className={styles.fx} aria-hidden="true">
          {SPARKS.map((i) => (
            <span key={`${claps}-${i}`} className={styles.spark} />
          ))}
        </span>
      )}
    </button>
  );
}
