import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./RequirementChecklist.module.scss";

export type Requirement = { text: string; test: RegExp };

export type RequirementChecklistProps = {
  placeholder?: string;
  rules?: Requirement[];
  /** 자동 재생 루프 (갤러리용). 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type ChangeEvt = { target: { value: string } };

const DEFAULT_RULES: Requirement[] = [
  { text: "Over eight characters", test: /^.{9,}$/ },
  { text: "Include a digit", test: /\d/ },
  { text: "Include a symbol", test: /[^\w\s]/ },
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 256 256" width="12" height="12" aria-hidden="true">
      <g fill="currentColor">
        <path d="M232 56v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16" opacity=".2" />
        <path d="m205.66 85.66l-96 96a8 8 0 0 1-11.32 0l-40-40a8 8 0 0 1 11.32-11.32L104 164.69l90.34-90.35a8 8 0 0 1 11.32 11.32" />
      </g>
    </svg>
  );
}

export default function RequirementChecklist({
  placeholder = "Create a password",
  rules = DEFAULT_RULES,
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: RequirementChecklistProps) {
  const [value, setValue] = useState("");
  const [live, setLive] = useState(demo);

  const passed = rules.map((r) => r.test.test(value));
  const allDone = passed.every(Boolean);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={`${styles.root} ${live ? styles.isDemo : ""}`} style={vars}>
      <div className={styles.field}>
        <input
          className={styles.input}
          id="rq-input"
          type="text"
          autoComplete="off"
          placeholder={placeholder}
          aria-describedby="rq-list"
          aria-invalid={!allDone}
          value={value}
          onChange={(e: ChangeEvt) => { setValue(e.target.value); setLive(false); }}
          onFocus={() => setLive(false)}
        />
        <span className={styles.ghost} aria-hidden="true">••••••••</span>
      </div>
      <ul className={styles.list} id="rq-list">
        {rules.map((r, i) => (
          <li key={r.text} className={`${styles.row} ${passed[i] ? styles.isPass : ""}`} data-rule={i}>
            <span className={styles.mark} aria-hidden="true"><CheckIcon /></span>
            <span className={styles.txt}>{r.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
