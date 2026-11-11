import type { CSSProperties } from "react";
import styles from "./WiggleEmphasis.module.scss";

type Vars = CSSProperties & { "--i"?: number; "--n"?: number };

function noise(i: number): number {
  const s = Math.sin((i + 1) * 12.9898) * 43758.5453;
  return Number((s - Math.floor(s)).toFixed(3));
}

export type WiggleEmphasisProps = {
  text: string;
  /** 왕복 한 주기 (기본 2000ms) */
  duration?: number;
  color?: string;
};

export default function WiggleEmphasis({ text, duration = 2000, color = "#fff7e6" }: WiggleEmphasisProps) {
  const vars = { "--duration": `${duration}ms`, "--color": color } as CSSProperties;
  const chars = Array.from(text);
  return (
    <p className={styles.wiggle} style={vars}>
      {chars.map((ch, i) => (
        <span key={i} className={styles.letter} style={{ "--i": i, "--n": noise(i) } as Vars}>
          {ch === " " ? " " : ch}
        </span>
      ))}
    </p>
  );
}
