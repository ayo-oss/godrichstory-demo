import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";
import styles from "./GlitchText.module.scss";

type Vars = CSSProperties & { "--i"?: number; "--n"?: number };

function noise(i: number): number {
  const s = Math.sin((i + 1) * 12.9898) * 43758.5453;
  return Number((s - Math.floor(s)).toFixed(3));
}

export type GlitchTextProps = {
  text: string;
  /** 글리치 두 번이 도는 한 주기 (기본 2000ms) */
  duration?: number;
  color?: string;
};

export default function GlitchText({ text, duration = 2000, color = "#fff7e6" }: GlitchTextProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    // reduced-motion 이면 재생 자체를 걸지 않는다 (el.animate() 를 쓰는 항목의 정리 규칙과 같다)
    return () => ref.current?.getAnimations().forEach((a) => a.cancel());
  }, []);
  const vars = { "--duration": `${duration}ms`, "--color": color } as CSSProperties;
  const chars = Array.from(text);
  const renderLetters = () =>
    chars.map((ch, i) => (
      <span key={i} className={styles.letter} style={{ "--i": i, "--n": noise(i) } as Vars}>
        {ch === " " ? " " : ch}
      </span>
    ));
  return (
    <div ref={ref} className={styles.glitch} style={vars}>
      <span className={styles.base}>{renderLetters()}</span>
      <span className={styles.r} aria-hidden="true">{renderLetters()}</span>
      <span className={styles.b} aria-hidden="true">{renderLetters()}</span>
    </div>
  );
}
