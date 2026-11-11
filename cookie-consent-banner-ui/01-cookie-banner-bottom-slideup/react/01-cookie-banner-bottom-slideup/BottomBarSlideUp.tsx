import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./BottomBarSlideUp.module.scss";

export type BottomBarSlideUpProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

const KEY = "gd-consent-01";
const LABEL: { [k: string]: string } = {
  min: "Necessary only",
  all: "Accept all",
};

function load(): string {
  try {
    return localStorage.getItem(KEY) || "";
  } catch (e) {
    return "";
  }
}

export default function BottomBarSlideUp({
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: BottomBarSlideUpProps) {
  const [saved, setSaved] = useState<string>("");
  const [out, setOut] = useState<boolean>(false);
  const [live, setLive] = useState<boolean>(true);

  // 저장값이 있어도 배너는 다시 띄운다(루프가 필요하다) — 이전 선택만 칩으로 보여준다
  useEffect(() => {
    setSaved(load());
  }, []);

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };

  function pick(v: string): void {
    try {
      localStorage.setItem(KEY, v);
    } catch (e) {
      /* 샌드박스에서 던진다 */
    }
    setSaved(v);
    setLive(false);
    setOut(true);
  }

  return (
    <div className={`${styles.cb} ${live ? styles.isDemo : ""}`} style={vars}>
      <div className={styles.page} aria-hidden="true">
        <div className={styles.topbar}>
          <span className={styles.brand} />
          <span className={styles.nav} />
          <span className={styles.nav} />
        </div>
        <div className={styles.lines}>
          <span className={`${styles.line} ${styles.lineHead}`} />
          <span className={styles.line} />
          <span className={styles.line} />
          <span className={`${styles.line} ${styles.lineShort}`} />
        </div>
      </div>

      {saved ? (
        <p className={styles.chip}>
          <span className={styles.chipK}>Saved</span>
          <b className={styles.chipV}>{LABEL[saved]}</b>
        </p>
      ) : null}

      <section
        className={`${styles.banner} ${out ? styles.isOut : ""}`}
        aria-label="Cookie consent"
      >
        <span className={styles.ic} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="20" height="20">
            <g fill="currentColor">
              <path
                d="M224 128a96 96 0 1 1-96-96a48 48 0 0 0 48 48a48 48 0 0 0 48 48"
                opacity=".2"
              />
              <path d="M164.49 163.51a12 12 0 1 1-17 0a12 12 0 0 1 17 0m-81-8a12 12 0 1 0 17 0a12 12 0 0 0-16.98 0Zm9-39a12 12 0 1 0-17 0a12 12 0 0 0 17-.02Zm48-1a12 12 0 1 0 0 17a12 12 0 0 0 0-17M232 128A104 104 0 1 1 128 24a8 8 0 0 1 8 8a40 40 0 0 0 40 40a8 8 0 0 1 8 8a40 40 0 0 0 40 40a8 8 0 0 1 8 8m-16.31 7.39A56.13 56.13 0 0 1 168.5 87.5a56.13 56.13 0 0 1-47.89-47.19a88 88 0 1 0 95.08 95.08" />
            </g>
          </svg>
        </span>

        <div className={styles.text}>
          <strong className={styles.title}>This site uses cookies</strong>
          <span className={styles.desc}>For analytics and personalised content</span>
        </div>

        <div className={styles.acts}>
          <button className={styles.btn} type="button" onClick={() => pick("min")}>
            {LABEL.min}
          </button>
          <button
            className={`${styles.btn} ${styles.btnOk}`}
            type="button"
            onClick={() => pick("all")}
          >
            {LABEL.all}
          </button>
        </div>
      </section>
    </div>
  );
}
