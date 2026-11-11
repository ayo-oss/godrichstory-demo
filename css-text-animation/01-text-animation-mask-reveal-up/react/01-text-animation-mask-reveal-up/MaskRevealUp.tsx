import type { CSSProperties } from "react";
import styles from "./MaskRevealUp.module.scss";

type Vars = CSSProperties & { "--i"?: number; "--n"?: number };

function noise(i: number): number {
  const s = Math.sin((i + 1) * 12.9898) * 43758.5453;
  return Number((s - Math.floor(s)).toFixed(3));
}

export type MaskRevealUpProps = {
  text: string;
  /** 마스크가 걷히는 한 주기 (기본 2000ms) */
  duration?: number;
  color?: string;
};

export default function MaskRevealUp({ text, duration = 2000, color = "#fff7e6" }: MaskRevealUpProps) {
  const vars = { "--duration": `${duration}ms`, "--color": color } as CSSProperties;
  const chars = Array.from(text);
  return (
    <div className={styles.mask}>
      <h1 className={styles.text} style={vars}>
        {chars.map((ch, i) => (
          <span key={i} className={styles.letter} style={{ "--i": i, "--n": noise(i) } as Vars}>
            {ch === " " ? " " : ch}
          </span>
        ))}
      </h1>
    </div>
  );
}
