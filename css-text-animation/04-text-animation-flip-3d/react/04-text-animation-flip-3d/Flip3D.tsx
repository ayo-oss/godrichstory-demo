import type { CSSProperties } from "react";
import styles from "./Flip3D.module.scss";

type Vars = CSSProperties & { "--i"?: number; "--n"?: number };

function noise(i: number): number {
  const s = Math.sin((i + 1) * 12.9898) * 43758.5453;
  return Number((s - Math.floor(s)).toFixed(3));
}

export type Flip3DProps = {
  letters: string[];
  /** 글자들이 한 바퀴 도는 시간 ms (기본 2000) */
  duration?: number;
  /** --i 1당 시차 ms (기본 70ms) */
  stagger?: number;
  color?: string;
};

export default function Flip3D({ letters, duration = 2000, color = "#17141a" }: Flip3DProps) {
  return (
    <h1 className={styles.flip} style={{ "--color": color, "--duration": `${duration}ms` } as CSSProperties}>
      {letters.map((ch, i) => (
        <span key={i} style={{ "--i": i, "--n": noise(i) } as Vars}>{ch}</span>
      ))}
    </h1>
  );
}
