import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./DebounceStatusIcon.module.scss";

export type DebounceStatusIconProps = {
  label?: string;
  placeholder?: string;
  waitMessage?: string;
  okMessage?: string;
  noMessage?: string;
  /** 타이핑이 멎고 나서 판정까지 기다리는 시간 (ms) */
  debounce?: number;
  /** 자동 재생 루프 (갤러리용). 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type ChangeEvt = { target: { value: string } };
type State = "idle" | "wait" | "ok" | "no";

const RULE = /^[a-z][a-z0-9_]{4,}$/;

function Ring() {
  return (
    <svg viewBox="0 0 256 256" width="20" height="20" aria-hidden="true">
      <g fill="currentColor">
        <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
        <path d="M232 128a104 104 0 0 1-208 0c0-41 23.81-78.36 60.66-95.27a8 8 0 0 1 6.68 14.54C60.15 61.59 40 93.27 40 128a88 88 0 0 0 176 0c0-34.73-20.15-66.41-51.34-80.73a8 8 0 0 1 6.68-14.54C208.19 49.64 232 87 232 128" />
      </g>
    </svg>
  );
}
function CheckCircle() {
  return (
    <svg viewBox="0 0 256 256" width="20" height="20" aria-hidden="true">
      <g fill="currentColor">
        <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
        <path d="M173.66 98.34a8 8 0 0 1 0 11.32l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 0M232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88" />
      </g>
    </svg>
  );
}
function XCircle() {
  return (
    <svg viewBox="0 0 256 256" width="20" height="20" aria-hidden="true">
      <g fill="currentColor">
        <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
        <path d="M165.66 101.66L139.31 128l26.35 26.34a8 8 0 0 1-11.32 11.32L128 139.31l-26.34 26.35a8 8 0 0 1-11.32-11.32L116.69 128l-26.35-26.34a8 8 0 0 1 11.32-11.32L128 116.69l26.34-26.35a8 8 0 0 1 11.32 11.32M232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88" />
      </g>
    </svg>
  );
}

export default function DebounceStatusIcon({
  label = "Username",
  placeholder = "Type more than four characters",
  waitMessage = "Checking",
  okMessage = "This username is available",
  noMessage = "This username does not fit the rule",
  debounce = 400,
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#fff7e6",
}: DebounceStatusIconProps) {
  const [value, setValue] = useState("");
  const [state, setState] = useState<State>("idle");
  const [live, setLive] = useState(demo);
  const timer = useRef<number>(0);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function onType(next: string) {
    setLive(false);
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    if (!next) { setState("idle"); return; }
    setState("wait");
    timer.current = setTimeout(() => setState(RULE.test(next) ? "ok" : "no"), debounce) as unknown as number;
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={`${styles.root} ${live ? styles.isDemo : ""}`} style={vars} data-state={state}>
      <label className={styles.label} htmlFor="dm-input">{label}</label>
      <div className={styles.field}>
        <input
          className={styles.input}
          id="dm-input"
          type="text"
          autoComplete="off"
          placeholder={placeholder}
          aria-describedby="dm-say"
          aria-invalid={state === "no"}
          value={value}
          onChange={(e: ChangeEvt) => onType(e.target.value)}
        />
        <span className={styles.ghost} aria-hidden="true">bitna shop</span>
        <span className={styles.icons} aria-hidden="true">
          <span className={`${styles.ic} ${styles.icWait}`}><Ring /></span>
          <span className={`${styles.ic} ${styles.icOk}`}><CheckCircle /></span>
          <span className={`${styles.ic} ${styles.icNo}`}><XCircle /></span>
        </span>
      </div>
      <p className={styles.out}>
        <span className={styles.msgs} aria-hidden="true">
          <span className={styles.m} data-m="wait">{waitMessage}</span>
          <span className={styles.m} data-m="ok">{okMessage}</span>
          <span className={styles.m} data-m="no">{noMessage}</span>
        </span>
        <span className={styles.say} id="dm-say" role="status" aria-live="polite">
          {state === "ok" ? okMessage : state === "no" ? noMessage : state === "wait" ? waitMessage : "Enter a username"}
        </span>
      </p>
    </div>
  );
}
