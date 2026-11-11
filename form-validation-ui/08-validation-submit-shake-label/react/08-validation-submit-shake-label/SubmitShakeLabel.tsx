import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SubmitShakeLabel.module.scss";

export type ShakeField = { label: string; type: string; sample: string };

export type SubmitShakeLabelProps = {
  fields?: ShakeField[];
  submitLabel?: string;
  /** 자동 재생 루프 (갤러리용). 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type ChangeEvt = { target: { value: string } };

const DEFAULT_FIELDS: ShakeField[] = [
  { label: "Email", type: "email", sample: "bitna@shop.co.kr" },
  { label: "Phone", type: "tel", sample: "010-1234-5678" },
];

export default function SubmitShakeLabel({
  fields = DEFAULT_FIELDS,
  submitLabel = "Sign up",
  demo = true,
  duration = 300,
  easing = "cubic-bezier(.36,.07,.19,.97)",
  color = "#2f6df6",
}: SubmitShakeLabelProps) {
  const [values, setValues] = useState<string[]>(fields.map(() => ""));
  const [tries, setTries] = useState(0);
  const [live, setLive] = useState(demo);

  const empty = values.map((v) => v.trim().length === 0);
  const badCount = empty.filter(Boolean).length;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function set(i: number, v: string) {
    setLive(false);
    setValues((prev) => prev.map((old, k) => (k === i ? v : old)));
  }

  return (
    <form
      className={`${styles.root} ${live ? styles.isDemo : ""}`}
      style={vars}
      noValidate
      onSubmit={(e: { preventDefault: () => void }) => { e.preventDefault(); setLive(false); setTries((n) => n + 1); }}
    >
      {fields.map((f, i) => (
        // key 에 시도 횟수를 섞어 두면 같은 칸이 다시 마운트되어 흔들림이 매번 새로 돈다
        <div
          key={`${f.label}-${tries}`}
          className={`${styles.row} ${tries && empty[i] ? styles.isBad : ""} ${tries && !empty[i] ? styles.isOk : ""}`}
          data-row={i + 1}
        >
          <label className={styles.label} htmlFor={`sk-${i}`}>{f.label}</label>
          <span className={styles.box}>
            <input
              className={styles.input}
              id={`sk-${i}`}
              type={f.type}
              autoComplete="off"
              required
              aria-invalid={tries > 0 && empty[i]}
              value={values[i]}
              onChange={(e: ChangeEvt) => set(i, e.target.value)}
            />
            <span className={styles.ghost} aria-hidden="true">{f.sample}</span>
          </span>
        </div>
      ))}
      <button className={styles.btn} type="submit">{submitLabel}</button>
      <p className={styles.say} role="status" aria-live="polite">
        {tries === 0 ? "Fill in both fields" : badCount ? `${badCount} field(s) still empty` : "Both fields are filled"}
      </p>
    </form>
  );
}
