import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ManageModalReopen.module.scss";

export type ManageModalReopenProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

const KEY = "gd-consent-03";

export default function ManageModalReopen({
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: ManageModalReopenProps) {
  const [open, setOpen] = useState<boolean>(false);
  const [live, setLive] = useState<boolean>(true);
  const reopenRef = useRef<HTMLButtonElement>(null);
  const firstRef = useRef<HTMLButtonElement>(null);

  // 열 때는 모달 안 첫 버튼으로, 닫을 때는 재열기 버튼으로 포커스를 돌려준다
  useEffect(() => {
    const el = open ? firstRef.current : reopenRef.current;
    if (el && !live) el.focus({ preventScroll: true });
  }, [open, live]);

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function show(): void {
    setLive(false);
    setOpen(true);
  }
  function hide(): void {
    setLive(false);
    setOpen(false);
  }
  function keep(): void {
    try {
      localStorage.setItem(KEY, new Date().toISOString());
    } catch (e) {
      /* 샌드박스에서 던진다 */
    }
    hide();
  }

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };

  return (
    <div
      className={`${styles.mo} ${live ? styles.isDemo : ""} ${open ? styles.isOpen : ""}`}
      style={vars}
    >
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

      <button
        ref={reopenRef}
        className={styles.reopen}
        type="button"
        aria-label="Open cookie settings"
        onClick={show}
      >
        <svg viewBox="0 0 256 256" width="20" height="20">
          <g fill="currentColor">
            <path
              d="M224 128a96 96 0 1 1-96-96a48 48 0 0 0 48 48a48 48 0 0 0 48 48"
              opacity=".2"
            />
            <path d="M164.49 163.51a12 12 0 1 1-17 0a12 12 0 0 1 17 0m-81-8a12 12 0 1 0 17 0a12 12 0 0 0-16.98 0Zm9-39a12 12 0 1 0-17 0a12 12 0 0 0 17-.02Zm48-1a12 12 0 1 0 0 17a12 12 0 0 0 0-17M232 128A104 104 0 1 1 128 24a8 8 0 0 1 8 8a40 40 0 0 0 40 40a8 8 0 0 1 8 8a40 40 0 0 0 40 40a8 8 0 0 1 8 8m-16.31 7.39A56.13 56.13 0 0 1 168.5 87.5a56.13 56.13 0 0 1-47.89-47.19a88 88 0 1 0 95.08 95.08" />
          </g>
        </svg>
      </button>

      <div className={styles.backdrop} onClick={hide} />

      <div className={styles.wrap}>
        <div
          className={styles.modal}
          role="dialog"
          aria-modal="true"
          aria-label="Manage cookie settings"
        >
          <button
            ref={firstRef}
            className={styles.x}
            type="button"
            aria-label="Close"
            onClick={hide}
          >
            <svg viewBox="0 0 256 256" width="14" height="14">
              <g fill="currentColor">
                <path
                  d="M216 56v144a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16"
                  opacity=".2"
                />
                <path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128L50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z" />
              </g>
            </svg>
          </button>

          <h2 className={styles.title}>Manage cookie settings</h2>
          <p className={styles.desc}>You can reopen this any time to change it.</p>

          <div className={styles.acts}>
            <button className={`${styles.btn} ${styles.btnOk}`} type="button" onClick={keep}>
              Save
            </button>
            <button className={styles.btn} type="button" onClick={hide}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
