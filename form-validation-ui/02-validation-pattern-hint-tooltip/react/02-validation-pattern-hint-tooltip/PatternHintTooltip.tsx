import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PatternHintTooltip.module.scss";

export type PatternHintTooltipProps = {
  label?: string;
  placeholder?: string;
  /** 자동 재생 루프 (갤러리용). 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type ChangeEvt = { target: { value: string } };

const RULES: RegExp[] = [/^010/, /^010-?\d{4}/, /^010-?\d{4}-?\d{4}$/];

function format(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length > 7) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length > 3) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return d;
}

export default function PatternHintTooltip({
  label = "Mobile number",
  placeholder = "Digits only",
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: PatternHintTooltipProps) {
  const [value, setValue] = useState("010-12");
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState(demo);

  let done = 0;
  RULES.forEach((re, i) => { if (re.test(value)) done = i + 1; });
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = [styles.root, live ? styles.isDemo : "", open ? styles.isOpen : ""].join(" ");

  return (
    <div className={cls} style={vars} data-done={done}>
      <div className={styles.tip} id="ph-tip" role="tooltip">
        <span className={styles.seg} data-seg="0">010</span>
        <span className={styles.dash} data-seg="0">-</span>
        <span className={styles.seg} data-seg="1">1234</span>
        <span className={styles.dash} data-seg="1">-</span>
        <span className={styles.seg} data-seg="2">5678</span>
      </div>
      <label className={styles.label} htmlFor="ph-input">{label}</label>
      <div className={styles.field}>
        <input
          className={styles.input}
          id="ph-input"
          type="tel"
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          aria-describedby="ph-tip"
          aria-invalid={done !== 3}
          value={value}
          onChange={(e: ChangeEvt) => { setValue(format(e.target.value)); setLive(false); }}
          onFocus={() => { setOpen(true); setLive(false); }}
          onBlur={() => setOpen(false)}
        />
        <span className={styles.ghost} aria-hidden="true">010-1234-5678</span>
      </div>
    </div>
  );
}
