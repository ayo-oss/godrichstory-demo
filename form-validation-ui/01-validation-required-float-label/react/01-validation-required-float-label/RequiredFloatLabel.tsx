import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./RequiredFloatLabel.module.scss";

export type RequiredFloatLabelProps = {
  label?: string;
  emptyMessage?: string;
  filledMessage?: string;
  /** 자동 재생 루프 (갤러리용). 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type ChangeEvt = { target: { value: string } };

export default function RequiredFloatLabel({
  label = "Name",
  emptyMessage = "Enter your name to continue",
  filledMessage = "Name looks good",
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: RequiredFloatLabelProps) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  const [live, setLive] = useState(demo);

  const filled = value.length > 0;
  const bad = touched && !filled;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = [
    styles.root,
    live ? styles.isDemo : "",
    focused || filled ? styles.isUp : "",
    bad ? styles.isBad : "",
    filled && !bad ? styles.isOk : "",
  ].join(" ");

  return (
    <form
      className={cls}
      style={vars}
      noValidate
      onSubmit={(e: { preventDefault: () => void }) => { e.preventDefault(); setTouched(true); setLive(false); }}
    >
      <div className={styles.box}>
        <input
          className={styles.input}
          id="fl-input"
          type="text"
          autoComplete="off"
          aria-required="true"
          aria-invalid={bad}
          aria-describedby="fl-msg"
          value={value}
          onChange={(e: ChangeEvt) => { setValue(e.target.value); setLive(false); }}
          onFocus={() => { setFocused(true); setLive(false); }}
          onBlur={() => { setFocused(false); setTouched(true); }}
        />
        <span className={styles.ghost} aria-hidden="true">Bitna Kim</span>
        <label className={styles.label} htmlFor="fl-input">
          <span className={styles.text}>{label}</span>
          <span className={styles.star} aria-hidden="true">*</span>
        </label>
      </div>
      <p className={styles.msg} id="fl-msg" role="status">
        <span className={styles.m1}>{emptyMessage}</span>
        <span className={styles.m2}>{filledMessage}</span>
      </p>
    </form>
  );
}
