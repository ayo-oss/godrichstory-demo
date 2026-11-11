import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./InlineLiveMessage.module.scss";

export type InlineLiveMessageProps = {
  label?: string;
  placeholder?: string;
  badMessage?: string;
  goodMessage?: string;
  /** 자동 재생 루프 (갤러리용). 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type ChangeEvt = { target: { value: string } };

const MAIL: RegExp = /^[\w.+-]+@[\w-]+\.[\w.-]{2,}$/;

export default function InlineLiveMessage({
  label = "Email",
  placeholder = "Type an email address",
  badMessage = "The part after @ is still missing",
  goodMessage = "This address can receive mail",
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: InlineLiveMessageProps) {
  const [value, setValue] = useState("");
  const [live, setLive] = useState(demo);

  const good = MAIL.test(value);
  const bad = !good && value.length > 0;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = [styles.root, live ? styles.isDemo : "", bad ? styles.isBad : "", good ? styles.isGood : ""].join(" ");

  return (
    <div className={cls} style={vars}>
      <label className={styles.label} htmlFor="il-input">{label}</label>
      <div className={styles.field}>
        <input
          className={styles.input}
          id="il-input"
          type="email"
          autoComplete="off"
          placeholder={placeholder}
          aria-describedby="il-msg"
          aria-invalid={!good}
          value={value}
          onChange={(e: ChangeEvt) => { setValue(e.target.value); setLive(false); }}
          onFocus={() => setLive(false)}
        />
        <span className={styles.ghost} aria-hidden="true">bitna@shop.co.kr</span>
      </div>
      <p className={styles.msg} id="il-msg" aria-live="polite">
        <span className={styles.bad}>{badMessage}</span>
        <span className={styles.good}>{goodMessage}</span>
      </p>
    </div>
  );
}
