import type { CSSProperties } from "react";
import styles from "./LetterBounce.module.scss";

type Vars = CSSProperties & { "--i"?: number; "--n"?: number };

function noise(i: number): number {
  const s = Math.sin((i + 1) * 12.9898) * 43758.5453;
  return Number((s - Math.floor(s)).toFixed(3));
}

export type LetterBounceProps = {
  letters: string[];
  /** 글자들이 한 바퀴 도는 시간 ms (기본 2000) */
  duration?: number;
  /** --i 1당 시차 ms (기본 40ms) */
  stagger?: number;
  color?: string;
};

export default function LetterBounce({ letters, duration = 2000, color = "#17141a" }: LetterBounceProps) {
  return (
    <h1 className={styles.letters} style={{ "--color": color, "--duration": `${duration}ms` } as CSSProperties}>
      {letters.map((ch, i) => (
        <span key={i} style={{ "--i": i, "--n": noise(i) } as Vars}>{ch}</span>
      ))}
    </h1>
  );
}
