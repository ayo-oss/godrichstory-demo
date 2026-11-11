import type { CSSProperties } from "react";
import styles from "./FlickerText.module.scss";

export type FlickerTextProps = {
  /** 글자를 하나씩 나눠 넣는다 (공백은 별도 span 으로) */
  letters: string[];
  /** 전구 하나가 어두워졌다 돌아오는 한 주기 (기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 전구 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type LetterVars = CSSProperties & { "--i"?: number };

export default function FlickerText({
  letters,
  duration = 2000,
  easing = "linear",
  color = "#fff7e6",
}: FlickerTextProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <h1 className={styles.marquee} style={vars}>
      {letters.map((ch, i) =>
        ch === " " ? (
          <span key={i} className={styles.gap} aria-hidden="true" />
        ) : (
          <span key={i} style={{ "--i": i } as LetterVars}>{ch}</span>
        )
      )}
    </h1>
  );
}
