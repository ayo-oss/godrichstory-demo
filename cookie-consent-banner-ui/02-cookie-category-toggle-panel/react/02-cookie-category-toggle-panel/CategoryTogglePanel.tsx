import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CategoryTogglePanel.module.scss";

export type CategoryTogglePanelProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

const KEY = "gd-consent-02";

function Caret() {
  return (
    <span className={styles.caret} aria-hidden="true">
      <svg viewBox="0 0 256 256" width="14" height="14">
        <g fill="currentColor">
          <path d="m208 96l-80 80l-80-80Z" opacity=".2" />
          <path d="M215.39 92.94A8 8 0 0 0 208 88H48a8 8 0 0 0-5.66 13.66l80 80a8 8 0 0 0 11.32 0l80-80a8 8 0 0 0 1.73-8.72M128 164.69L67.31 104h121.38Z" />
        </g>
      </svg>
    </span>
  );
}

export default function CategoryTogglePanel({
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: CategoryTogglePanelProps) {
  const [stats, setStats] = useState<boolean>(true);
  const [ads, setAds] = useState<boolean>(false);
  const [open, setOpen] = useState<string>("");
  const [live, setLive] = useState<boolean>(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const v = JSON.parse(raw) as { stats?: boolean; ads?: boolean };
        setStats(!!v.stats);
        setAds(!!v.ads);
      }
    } catch (e) {
      /* 샌드박스에서 던진다 */
    }
  }, []);

  function save(nextStats: boolean, nextAds: boolean): void {
    try {
      localStorage.setItem(KEY, JSON.stringify({ stats: nextStats, ads: nextAds }));
    } catch (e) {
      /* 샌드박스에서 던진다 */
    }
  }

  function toggleOpen(id: string): void {
    setLive(false);
    setOpen(open === id ? "" : id);
  }

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };

  return (
    <div className={`${styles.ct} ${live ? styles.isDemo : ""}`} style={vars}>
      <h2 className={styles.head}>Cookie settings</h2>

      <div className={styles.row}>
        <span className={styles.ic} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="16" height="16">
            <g fill="currentColor">
              <path d="M216 56v56c0 96-88 120-88 120s-88-24-88-120V56a8 8 0 0 1 8-8h160a8 8 0 0 1 8 8" opacity=".2" />
              <path d="M208 40H48a16 16 0 0 0-16 16v56c0 52.72 25.52 84.67 46.93 102.19c23.06 18.86 46 25.26 47 25.53a8 8 0 0 0 4.2 0c1-.27 23.91-6.67 47-25.53C198.48 196.67 224 164.72 224 112V56a16 16 0 0 0-16-16m0 72c0 37.07-13.66 67.16-40.6 89.42a129.3 129.3 0 0 1-39.4 22.2a128.3 128.3 0 0 1-38.92-21.81C61.82 179.51 48 149.3 48 112V56h160ZM82.34 141.66a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 11.32l-56 56a8 8 0 0 1-11.32 0Z" />
            </g>
          </svg>
        </span>
        <button
          className={styles.name}
          type="button"
          aria-expanded={open === "p1"}
          aria-controls="ct-p1"
          onClick={() => toggleOpen("p1")}
        >
          <span className={styles.label}>Necessary</span>
          <Caret />
        </button>
        <button
          className={`${styles.sw} ${styles.swFixed} ${styles.isOn}`}
          type="button"
          role="switch"
          aria-checked={true}
          aria-disabled={true}
          aria-label="Necessary cookies"
        >
          <span className={styles.knob} />
        </button>
        <div className={`${styles.panel} ${open === "p1" ? styles.isOpen : ""}`} id="ct-p1">
          <div className={styles.inner}>
            <p className={styles.desc}>Required for the site to load at all.</p>
          </div>
        </div>
      </div>

      <div className={`${styles.row} ${styles.rowStats}`}>
        <span className={styles.ic} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="16" height="16">
            <g fill="currentColor">
              <path d="M208 40v168h-56V40Z" opacity=".2" />
              <path d="M224 200h-8V40a8 8 0 0 0-8-8h-56a8 8 0 0 0-8 8v40H96a8 8 0 0 0-8 8v40H48a8 8 0 0 0-8 8v64h-8a8 8 0 0 0 0 16h192a8 8 0 0 0 0-16M160 48h40v152h-40Zm-56 48h40v104h-40Zm-48 48h32v56H56Z" />
            </g>
          </svg>
        </span>
        <button
          className={styles.name}
          type="button"
          aria-expanded={open === "p2"}
          aria-controls="ct-p2"
          onClick={() => toggleOpen("p2")}
        >
          <span className={styles.label}>Analytics</span>
          <Caret />
        </button>
        <button
          className={`${styles.sw} ${stats ? styles.isOn : ""}`}
          type="button"
          role="switch"
          aria-checked={stats}
          aria-label="Analytics cookies"
          onClick={() => {
            setLive(false);
            setStats(!stats);
            save(!stats, ads);
          }}
        >
          <span className={styles.knob} />
        </button>
        <div className={`${styles.panel} ${open === "p2" ? styles.isOpen : ""}`} id="ct-p2">
          <div className={styles.inner}>
            <p className={styles.desc}>Counts which posts get read, and how far.</p>
          </div>
        </div>
      </div>

      <div className={`${styles.row} ${styles.rowAds}`}>
        <span className={styles.ic} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="16" height="16">
            <g fill="currentColor">
              <path d="M240 120a40 40 0 0 1-40 40h-40V80h40a40 40 0 0 1 40 40" opacity=".2" />
              <path d="M248 120a48.05 48.05 0 0 0-48-48h-39.8c-2.91-.17-53.62-3.74-101.91-44.24A16 16 0 0 0 32 40v160a16 16 0 0 0 26.29 12.25c37.77-31.68 77-40.76 93.71-43.3v31.72a16 16 0 0 0 7.12 13.33l11 7.33A16 16 0 0 0 194.5 212l11.77-44.36A48.07 48.07 0 0 0 248 120M48 199.93V40c42.81 35.91 86.63 45 104 47.24v65.48c-17.35 2.28-61.16 11.35-104 47.21m131 8v.11l-11-7.33V168h21.6ZM200 152h-32V88h32a32 32 0 1 1 0 64" />
            </g>
          </svg>
        </span>
        <button
          className={styles.name}
          type="button"
          aria-expanded={open === "p3"}
          aria-controls="ct-p3"
          onClick={() => toggleOpen("p3")}
        >
          <span className={styles.label}>Marketing</span>
          <Caret />
        </button>
        <button
          className={`${styles.sw} ${ads ? styles.isOn : ""}`}
          type="button"
          role="switch"
          aria-checked={ads}
          aria-label="Marketing cookies"
          onClick={() => {
            setLive(false);
            setAds(!ads);
            save(stats, !ads);
          }}
        >
          <span className={styles.knob} />
        </button>
        <div className={`${styles.panel} ${open === "p3" ? styles.isOpen : ""}`} id="ct-p3">
          <div className={styles.inner}>
            <p className={styles.desc}>Shows ads picked from your interests.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
