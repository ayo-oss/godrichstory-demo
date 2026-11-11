import { useMemo, useState, type ChangeEvent, type CSSProperties } from "react";
import styles from "./PasswordStrengthMeter.module.scss";

export type PasswordStrengthMeterProps = {
  /** 막대 너비·색이 바뀌는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
};

const LEVELS = ["", "Weak", "Weak", "Medium", "Strong", "Strong"];
const COLORS = ["#e6e2d8", "#c2361a", "#c2361a", "#ff9d1f", "#1f9d55", "#1f9d55"];
const WIDTHS = [0, 15, 15, 40, 70, 100];

function score(v: string) {
  let s = 0;
  if (v.length >= 6) s++;
  if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++;
  if (/[0-9]/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v)) s++;
  return v.length ? s + 1 : 0;
}

/** input 이벤트마다 길이·문자 조합을 다시 계산해 막대 너비·색·라벨을 갱신한다 */
export default function PasswordStrengthMeter({ duration = 300, easing = "ease-out" }: PasswordStrengthMeterProps) {
  const [value, setValue] = useState("");
  const s = useMemo(() => score(value), [value]);
  const style = { "--duration": `${duration}ms`, "--easing": easing } as CSSProperties;
  const onChange = (e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value);
  return (
    <div className={styles.card} style={style}>
      <label className={styles.label} htmlFor="pw-react">Password</label>
      <input className={styles.input} id="pw-react" type="password" value={value} onChange={onChange} placeholder="Type a password" />
      <div className={styles.meter}>
        <span className={styles.fill} style={{ width: `${WIDTHS[s]}%`, background: COLORS[s] }} />
      </div>
      <p className={styles.status} aria-live="polite" style={{ color: COLORS[s] }}>{LEVELS[s]}</p>
    </div>
  );
}
