import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SettingsSavedToast.module.scss";

export type SettingsSavedToastProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

const KEY = "gd-consent-09";
const BASE = "Analytics cookies only";

function line(n: number, t: string): string {
  return `${BASE} · saved ${n}× · ${t}`;
}

export default function SettingsSavedToast({
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: SettingsSavedToastProps) {
  const [count, setCount] = useState(0);
  const [sub, setSub] = useState(BASE);
  // 0 이면 자동 루프, 1 이상이면 그 번째 한 번짜리 재생 (key 로 갈아끼워 애니메이션을 되감는다)
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { n?: number; t?: string };
        const n = Number(saved.n) || 0;
        setCount(n);
        if (n > 0 && saved.t) {
          setSub(line(n, saved.t));
        }
      }
    } catch {
      /* 샌드박스에서 던질 수 있다 */
    }
  }, []);

  function save() {
    const n = count + 1;
    const t = new Date().toTimeString().slice(0, 5);
    setCount(n);
    setSub(line(n, t));
    try {
      localStorage.setItem(KEY, JSON.stringify({ n: n, t: t }));
    } catch {
      /* 무시 */
    }
    setRunId(runId + 1);
  }

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };

  const demo = runId === 0;

  return (
    <div className={`${styles.ts} ${demo ? styles.isDemo : ""}`} style={vars}>
      <div className={styles.page} aria-hidden="true">
        <div className={styles.topbar}>
          <i className={styles.dot} />
          <i className={styles.slug} />
        </div>
        <div className={styles.lines}>
          <i />
          <i />
          <i />
        </div>
      </div>

      <button type="button" className={styles.save} onClick={save}>
        Save settings
      </button>

      <div
        className={`${styles.toast} ${demo ? "" : styles.isShot}`}
        key={runId}
        role="status"
        aria-live="polite"
      >
        <span className={styles.ic} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="18" height="18">
            <g fill="currentColor">
              <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
              <path d="M173.66 98.34a8 8 0 0 1 0 11.32l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 0M232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88" />
            </g>
          </svg>
        </span>
        <span className={styles.txt}>
          <b className={styles.title}>Settings saved</b>
          <span className={styles.sub}>{sub}</span>
        </span>
        <i className={styles.timer} aria-hidden="true" />
      </div>
    </div>
  );
}
