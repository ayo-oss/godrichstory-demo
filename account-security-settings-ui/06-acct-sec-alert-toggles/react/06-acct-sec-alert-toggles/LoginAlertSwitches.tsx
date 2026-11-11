import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./LoginAlertSwitches.module.scss";

export type ChannelKey = "mail" | "push" | "sms";
export type LoginAlertSwitchesProps = {
  heading?: string;
  labels?: Record<ChannelKey, string>;
  savedLabel?: string;
  initial?: Record<ChannelKey, boolean>;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault(): void };

const ENVELOPE: ReactNode = (
  <g fill="currentColor">
    <path d="m224 56l-96 88l-96-88Z" opacity=".2" />
    <path d="M224 48H32a8 8 0 0 0-8 8v136a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a8 8 0 0 0-8-8m-20.57 16L128 133.15L52.57 64ZM216 192H40V74.19l82.59 75.71a8 8 0 0 0 10.82 0L216 74.19z" />
  </g>
);

const BELL: ReactNode = (
  <g fill="currentColor">
    <path d="M208 192H48a8 8 0 0 1-6.88-12C47.71 168.6 56 139.81 56 104a72 72 0 0 1 144 0c0 35.82 8.3 64.6 14.9 76a8 8 0 0 1-6.9 12" opacity=".2" />
    <path d="M221.8 175.94c-5.55-9.56-13.8-36.61-13.8-71.94a80 80 0 1 0-160 0c0 35.34-8.26 62.38-13.81 71.94A16 16 0 0 0 48 200h40.81a40 40 0 0 0 78.38 0H208a16 16 0 0 0 13.8-24.06M128 216a24 24 0 0 1-22.62-16h45.24A24 24 0 0 1 128 216m-80-32c7.7-13.24 16-43.92 16-80a64 64 0 1 1 128 0c0 36.05 8.28 66.73 16 80Z" />
  </g>
);

const CHAT: ReactNode = (
  <g fill="currentColor">
    <path d="M224 128a96 96 0 0 1-144.07 83.11l-37.39 12.47a8 8 0 0 1-10.12-10.12l12.47-37.39A96 96 0 1 1 224 128" opacity=".2" />
    <path d="M128 24a104 104 0 0 0-91.82 152.88l-11.35 34.05a16 16 0 0 0 20.24 20.24l34.05-11.35A104 104 0 1 0 128 24m0 192a87.87 87.87 0 0 1-44.06-11.81a8 8 0 0 0-4-1.08a7.9 7.9 0 0 0-2.53.42L40 216l12.47-37.4a8 8 0 0 0-.66-6.54A88 88 0 1 1 128 216m40-104a8 8 0 0 1-8 8H96a8 8 0 0 1 0-16h64a8 8 0 0 1 8 8m0 32a8 8 0 0 1-8 8H96a8 8 0 0 1 0-16h64a8 8 0 0 1 8 8" />
  </g>
);

const CHECK: ReactNode = (
  <g fill="currentColor">
    <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
    <path d="M173.66 98.34a8 8 0 0 1 0 11.32l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 0M232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88" />
  </g>
);

const ROWS: { key: ChannelKey; icon: ReactNode }[] = [
  { key: "mail", icon: ENVELOPE },
  { key: "push", icon: BELL },
  { key: "sms", icon: CHAT },
];

export default function LoginAlertSwitches({
  heading = "New device sign-in alerts",
  labels = { mail: "Send by email", push: "Send by push", sms: "Send by text" },
  savedLabel = "Saved",
  initial = { mail: true, push: false, sms: false },
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: LoginAlertSwitchesProps) {
  const [demo, setDemo] = useState(true);
  const [on, setOn] = useState<Record<ChannelKey, boolean>>(initial);
  const [saved, setSaved] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function toggle(key: ChannelKey) {
    setDemo(false); // 사람이 만졌으니 자동 루프를 끈다
    setOn((p) => ({ ...p, [key]: !p[key] }));
    setSaved(true); // 저장 줄은 사라지지 않고 다음 변경까지 남는다
  }

  // <button> 이라 Space·Enter 는 그대로 click 으로 온다 — Space 의 스크롤만 막는다
  function onKeyDown(e: KeyEvt) {
    if (e.key === " ") e.preventDefault();
  }

  return (
    <section
      className={`${styles.al} ${demo ? styles.isDemo : ""}`}
      data-saved={String(saved)}
      style={vars}
    >
      <div className={styles.card}>
        <p className={styles.head}>{heading}</p>

        <ul className={styles.list}>
          {ROWS.map((row) => (
            <li className={styles.row} data-row={row.key} key={row.key}>
              <span className={styles.ic} aria-hidden="true">
                <svg viewBox="0 0 256 256" width="20" height="20">{row.icon}</svg>
              </span>
              <span className={styles.lab} id={`al-lab-${row.key}`}>{labels[row.key]}</span>
              <button
                className={styles.sw}
                type="button"
                role="switch"
                aria-checked={on[row.key]}
                aria-labelledby={`al-lab-${row.key}`}
                data-sw={row.key}
                onClick={() => toggle(row.key)}
                onKeyDown={onKeyDown}
              >
                <span className={styles.knob} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>

        <p className={styles.saved} role="status" aria-live="polite">
          <span className={styles.savedIc} aria-hidden="true">
            <svg viewBox="0 0 256 256" width="16" height="16">{CHECK}</svg>
          </span>
          <span className={styles.savedTxt}>{savedLabel}</span>
        </p>
      </div>
    </section>
  );
}
