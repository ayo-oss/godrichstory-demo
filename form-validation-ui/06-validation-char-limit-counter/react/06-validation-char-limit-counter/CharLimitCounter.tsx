import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CharLimitCounter.module.scss";

export type CharLimitCounterProps = {
  placeholder?: string;
  max?: number;
  /** 남은 글자가 이 수 이하로 떨어지면 경고색으로 넘어간다 */
  nearAt?: number;
  nearNote?: string;
  fullNote?: string;
  /** 자동 재생 루프 (갤러리용). 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type ChangeEvt = { target: { value: string } };

export default function CharLimitCounter({
  placeholder = "Leave a one-line review",
  max = 60,
  nearAt = 12,
  nearNote = "Almost at the limit",
  fullNote = "No room left",
  demo = true,
  duration = 220,
  easing = "ease-out",
  color = "#17141a",
}: CharLimitCounterProps) {
  const [value, setValue] = useState("");
  const [live, setLive] = useState(demo);

  const used = value.length;
  const left = max - used;
  const level = left === 0 ? "full" : left <= nearAt ? "near" : "ok";
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const fill: CSSProperties = { transform: `scaleX(${(used / max).toFixed(3)})` };

  return (
    <div className={`${styles.root} ${live ? styles.isDemo : ""}`} style={vars} data-level={level}>
      <div className={styles.field}>
        <textarea
          className={styles.input}
          id="cc-input"
          rows={2}
          maxLength={max}
          placeholder={placeholder}
          aria-describedby="cc-out"
          value={value}
          onChange={(e: ChangeEvt) => { setValue(e.target.value); setLive(false); }}
          onFocus={() => setLive(false)}
        />
        <span className={styles.ghost} aria-hidden="true">It arrived in a day and the packaging was careful</span>
      </div>
      <div className={styles.bar} aria-hidden="true"><span className={styles.fill} style={fill} /></div>
      <p className={styles.out} id="cc-out">
        <span className={styles.nums} aria-hidden="true">
          {[44, 26, 8, 0].map((n, i) => (
            <span key={n} className={styles.n} data-n={i}>{n} left</span>
          ))}
        </span>
        <span className={styles.live}>{`${left} left`}</span>
        <span className={styles.notes} aria-hidden="true">
          <span className={styles.note} data-note="near">{nearNote}</span>
          <span className={styles.note} data-note="full">{fullNote}</span>
        </span>
        <span className={styles.say} role="status" aria-live="polite">{`${used} of ${max} characters used`}</span>
      </p>
    </div>
  );
}
