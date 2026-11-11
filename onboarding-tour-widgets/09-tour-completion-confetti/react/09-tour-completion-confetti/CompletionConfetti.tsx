import type { CSSProperties } from "react";
import styles from "./CompletionConfetti.module.scss";

export type CompletionConfettiProps = {
  duration?: number;
  easing?: string;
  color?: string;
  message?: string;
  label?: string;
};

// 조각마다 가로 위치·색·각도·시차가 다르다. 같은 순간에 같은 각도로 뿌려지면 가짜로 보인다
const BITS: { left: number; bg: string; delay: number; rotate: number }[] = [
  { left: 6,  bg: "#ff4d1f", delay: 0,    rotate: 24 },
  { left: 16, bg: "#ff9ebb", delay: 90,   rotate: -38 },
  { left: 26, bg: "#2f6df6", delay: 210,  rotate: 61 },
  { left: 34, bg: "#4cd4a6", delay: 50,   rotate: -17 },
  { left: 44, bg: "#ff4d1f", delay: 330,  rotate: 44 },
  { left: 52, bg: "#b9a0ff", delay: 140,  rotate: -55 },
  { left: 61, bg: "#2f6df6", delay: 270,  rotate: 12 },
  { left: 69, bg: "#4cd4a6", delay: 400,  rotate: -29 },
  { left: 77, bg: "#ff4d1f", delay: 170,  rotate: 71 },
  { left: 85, bg: "#ff9ebb", delay: 300,  rotate: -46 },
  { left: 92, bg: "#6ec8ff", delay: 110,  rotate: 33 },
  { left: 47, bg: "#6ec8ff", delay: 450,  rotate: -63 },
];

export default function CompletionConfetti({
  duration = 2000,
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#ff4d1f",
  message = "All done",
  label = "Onboarding complete",
}: CompletionConfettiProps) {
  const vars: CSSProperties = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  } as CSSProperties;

  return (
    <div className={styles.scene} style={vars}>
      <div className={styles.bits} aria-hidden="true">
        {BITS.map((b, i) => (
          <i
            key={i}
            className={styles.b}
            style={{
              left: `${b.left}%`,
              background: b.bg,
              animationDelay: `${b.delay}ms`,
              "--r": `${b.rotate}deg`,
            } as CSSProperties}
          />
        ))}
      </div>
      <span className={styles.seal} role="img" aria-label={label}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor">
          <path d="M232,56V200a16,16,0,0,1-16,16H40a16,16,0,0,1-16-16V56A16,16,0,0,1,40,40H216A16,16,0,0,1,232,56Z" opacity="0.2" />
          <path d="M205.66,85.66l-96,96a8,8,0,0,1-11.32,0l-40-40a8,8,0,0,1,11.32-11.32L104,164.69l90.34-90.35a8,8,0,0,1,11.32,11.32Z" />
        </svg>
      </span>
      <p className={styles.msg}>{message}</p>
    </div>
  );
}
