import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PasswordScoreGauge.module.scss";

export type PasswordScoreGaugeProps = {
  placeholder?: string;
  words?: [string, string, string];
  messages?: string[];
  /** 자동 재생 루프 (갤러리용). 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type ChangeEvt = { target: { value: string } };

const DEFAULT_MESSAGES = [
  "None of the four rules are met",
  "Only one of the four rules is met",
  "Two rules are met",
  "One more rule and it is strong",
  "All four rules are met",
];

export function scoreOf(v: string) {
  let n = 0;
  if (/^.{10,}$/.test(v)) n += 1;
  if (/[a-z]/.test(v) && /[A-Z]/.test(v)) n += 1;
  if (/\d/.test(v)) n += 1;
  if (/[^\w\s]/.test(v)) n += 1;
  return n;
}

export default function PasswordScoreGauge({
  placeholder = "Type a password",
  words = ["Weak", "Fair", "Strong"],
  messages = DEFAULT_MESSAGES,
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: PasswordScoreGaugeProps) {
  const [value, setValue] = useState("");
  const [live, setLive] = useState(demo);

  const score = scoreOf(value);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={`${styles.root} ${live ? styles.isDemo : ""}`} style={vars} data-score={score}>
      <div className={styles.field}>
        <input
          className={styles.input}
          id="pg-input"
          type="text"
          autoComplete="off"
          placeholder={placeholder}
          aria-describedby="pg-out"
          value={value}
          onChange={(e: ChangeEvt) => { setValue(e.target.value); setLive(false); }}
          onFocus={() => setLive(false)}
        />
        <span className={styles.ghost} aria-hidden="true">Bit9na!Shop</span>
      </div>
      <div className={styles.gauge} aria-hidden="true">
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={styles.cell} data-cell={n} />
        ))}
      </div>
      <p className={styles.out} id="pg-out">
        <span className={styles.words} aria-hidden="true">
          <span className={styles.w} data-w="low">{words[0]}</span>
          <span className={styles.w} data-w="mid">{words[1]}</span>
          <span className={styles.w} data-w="high">{words[2]}</span>
        </span>
        <span className={styles.nums} aria-hidden="true">
          {[0, 1, 2, 3, 4].map((n) => (
            <span key={n} className={styles.n} data-n={n}>{n} / 4</span>
          ))}
        </span>
        <span className={styles.say} role="status" aria-live="polite">{messages[score]}</span>
      </p>
    </div>
  );
}
