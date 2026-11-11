import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ToastKinds.module.scss";

export type ToastKind = "ok" | "warn" | "bad" | "info";
export type ToastKindsProps = {
  messages?: Record<ToastKind, string>;
  picks?: Record<ToastKind, string>;
  groupLabel?: string;
  duration?: number;
  easing?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string };
const ORDER: ToastKind[] = ["ok", "warn", "bad", "info"];

const ICON: Record<ToastKind, any> = {
  ok: <g fill="currentColor"><path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" /><path d="M173.66 98.34a8 8 0 0 1 0 11.32l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 0M232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88" /></g>,
  warn: <g fill="currentColor"><path d="M215.46 216H40.54c-12.62 0-20.54-13.21-14.41-23.91l87.46-151.87c6.3-11 22.52-11 28.82 0l87.46 151.87c6.13 10.7-1.79 23.91-14.41 23.91" opacity=".2" /><path d="M236.8 188.09L149.35 36.22a24.76 24.76 0 0 0-42.7 0L19.2 188.09a23.51 23.51 0 0 0 0 23.72A24.35 24.35 0 0 0 40.55 224h174.9a24.35 24.35 0 0 0 21.33-12.19a23.51 23.51 0 0 0 .02-23.72m-13.87 15.71a8.5 8.5 0 0 1-7.48 4.2H40.55a8.5 8.5 0 0 1-7.48-4.2a7.59 7.59 0 0 1 0-7.72l87.45-151.87a8.75 8.75 0 0 1 15 0l87.45 151.87a7.59 7.59 0 0 1-.04 7.72M120 144v-40a8 8 0 0 1 16 0v40a8 8 0 0 1-16 0m20 36a12 12 0 1 1-12-12a12 12 0 0 1 12 12" /></g>,
  bad: <g fill="currentColor"><path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" /><path d="M165.66 101.66L139.31 128l26.35 26.34a8 8 0 0 1-11.32 11.32L128 139.31l-26.34 26.35a8 8 0 0 1-11.32-11.32L116.69 128l-26.35-26.34a8 8 0 0 1 11.32-11.32L128 116.69l26.34-26.35a8 8 0 0 1 11.32 11.32M232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88" /></g>,
  info: <g fill="currentColor"><path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" /><path d="M144 176a8 8 0 0 1-8 8a16 16 0 0 1-16-16v-40a8 8 0 0 1 0-16a16 16 0 0 1 16 16v40a8 8 0 0 1 8 8m88-48A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88m-92-32a12 12 0 1 0-12-12a12 12 0 0 0 12 12" /></g>,
};

export default function ToastKinds({
  messages = { ok: "Saved", warn: "Storage almost full", bad: "Sending failed", info: "A new version is out" },
  picks = { ok: "Success", warn: "Warning", bad: "Error", info: "Info" },
  groupLabel = "Pick a toast kind",
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
}: ToastKindsProps) {
  const [demo, setDemo] = useState(true);
  const [kind, setKind] = useState<ToastKind>("ok");
  const [pop, setPop] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing };

  function pick(k: ToastKind) {
    setDemo(false);
    setKind(k);
    setPop((v) => v + 1); // key 를 바꿔 같은 종류를 다시 눌러도 팝이 한 번 더 돈다
  }

  return (
    <div className={`${styles.tk} ${demo ? styles.isDemo : ""}`} style={vars}>
      <div className={styles.box}>
        <div key={pop} className={`${styles.card} ${demo ? "" : styles.isPop}`} data-kind={kind} role="status" aria-live="polite">
          <span className={styles.bar} data-kind={kind} aria-hidden="true" />
          {ORDER.map((k) => (
            <span key={k} className={styles.face} data-kind={k} data-on={!demo && k === kind ? "1" : "0"}>
              <span className={styles.ic} aria-hidden="true">
                <svg viewBox="0 0 256 256" width="26" height="26">{ICON[k]}</svg>
              </span>
              <span className={styles.msg}>{messages[k]}</span>
            </span>
          ))}
        </div>
      </div>
      <div className={styles.row} role="group" aria-label={groupLabel}>
        {ORDER.map((k) => (
          <button key={k} className={styles.pick} type="button" data-pick={k} aria-pressed={!demo && k === kind} onClick={() => pick(k)}>
            {picks[k]}
          </button>
        ))}
      </div>
    </div>
  );
}
