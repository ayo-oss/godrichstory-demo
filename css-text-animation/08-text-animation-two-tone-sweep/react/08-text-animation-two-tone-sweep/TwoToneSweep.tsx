import type { CSSProperties } from "react";
import styles from "./TwoToneSweep.module.scss";

type Vars = CSSProperties & { "--i"?: number; "--n"?: number };

function noise(i: number): number {
  const s = Math.sin((i + 1) * 12.9898) * 43758.5453;
  return Number((s - Math.floor(s)).toFixed(3));
}

export type TwoToneSweepProps = {
  text: string;
  /** 스윕 한 주기 (기본 2000ms) */
  duration?: number;
  base?: string;
  sweep?: string;
};

export default function TwoToneSweep({ text, duration = 2000, base = "#17141a", sweep = "#2f6df6" }: TwoToneSweepProps) {
  const vars = { "--duration": `${duration}ms`, "--base": base, "--sweep": sweep } as CSSProperties;
  const chars = Array.from(text);
  const renderLetters = () =>
    chars.map((ch, i) => (
      <span key={i} className={styles.letter} style={{ "--i": i, "--n": noise(i) } as Vars}>
        {ch === " " ? " " : ch}
      </span>
    ));
  return (
    <div className={styles.sweep} style={vars}>
      <span className={styles.base}>{renderLetters()}</span>
      <span className={styles.top} aria-hidden="true">{renderLetters()}</span>
    </div>
  );
}
