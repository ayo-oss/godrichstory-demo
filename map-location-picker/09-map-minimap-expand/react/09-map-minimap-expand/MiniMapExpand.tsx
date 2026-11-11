import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MiniMapExpand.module.scss";

export type MiniMapExpandProps = {
  /** 확대 오버레이 제목 */
  panelTitle?: string;
  /** 미니 지도 버튼의 스크린리더 설명 */
  buttonLabel?: string;
  /** 지도 아래 안내 문구 */
  hint?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };

export default function MiniMapExpand({
  panelTitle = "Whole map",
  buttonLabel = "Expand the mini map",
  hint = "Tap the mini map to expand, Esc to collapse",
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: MiniMapExpandProps) {
  const [demo, setDemo] = useState(true);
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function toggle(on: boolean) {
    setDemo(false);           // 사람이 조작하면 자동 루프를 끈다
    setOpen(on);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        toggle(false);
        btnRef.current?.focus({ preventScroll: true });
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className={`${styles.mm} ${demo ? styles.isDemo : ""} ${open ? styles.isOpen : ""}`} style={vars}>
      <div className={styles.map}>
        <span className={`${styles.block} ${styles.blockA}`} aria-hidden="true" />
        <span className={`${styles.block} ${styles.blockB}`} aria-hidden="true" />
        <span className={`${styles.block} ${styles.blockC}`} aria-hidden="true" />
        <span className={styles.you} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="18" height="18"><g fill="currentColor"><path d="M234.35 129L152 152l-23 82.35a8 8 0 0 1-15.21.27l-65.28-176a8 8 0 0 1 10.12-10.16l176 65.28a8 8 0 0 1-.28 15.26" opacity=".2" /><path d="M237.33 106.21L61.41 41l-.16-.05a16 16 0 0 0-20.35 20.3a1 1 0 0 0 .05.16l65.26 175.92A15.77 15.77 0 0 0 121.28 248h.3a15.77 15.77 0 0 0 15-11.29l.06-.2l21.84-78l78-21.84l.2-.06a16 16 0 0 0 .62-30.38Zm-87.49 38.09a8 8 0 0 0-5.54 5.54l-23 82.16l-.06-.17L56 56l175.82 65.22l.16.06Z" /></g></svg>
        </span>

        <div className={styles.panel} id="mm-panel">
          <span className={styles.panelView} aria-hidden="true" />
          <p className={styles.panelTitle}>
            <span className={styles.panelIco} aria-hidden="true">
              <svg viewBox="0 0 256 256" width="12" height="12"><g fill="currentColor"><path d="M96 40v168l-56 24V64Zm120 24l-56-24v168l56 24Z" opacity=".2" /><path d="M228.92 49.69a8 8 0 0 0-6.86-1.45l-61.13 15.28l-61.35-30.68a8 8 0 0 0-5.52-.6l-64 16A8 8 0 0 0 24 56v144a8 8 0 0 0 9.94 7.76l61.13-15.28l61.35 30.68A8 8 0 0 0 160 224a8 8 0 0 0 1.94-.24l64-16A8 8 0 0 0 232 200V56a8 8 0 0 0-3.08-6.31M104 52.94l48 24v126.12l-48-24Zm-64 9.31l48-12v127.5l-48 12Zm176 131.5l-48 12V78.25l48-12Z" /></g></svg>
            </span>
            <span>{panelTitle}</span>
          </p>
        </div>

        <button
          ref={btnRef}
          type="button"
          className={styles.mini}
          aria-expanded={open}
          aria-controls="mm-panel"
          aria-label={buttonLabel}
          onClick={() => toggle(!open)}
          onKeyDown={(e: KeyEvt) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(!open); }
          }}
        >
          <span className={styles.view} aria-hidden="true" />
          <span className={styles.ico} aria-hidden="true">
            <svg viewBox="0 0 256 256" width="12" height="12"><g fill="currentColor"><path d="M208 48v160H48V48Z" opacity=".2" /><path d="M216 48v48a8 8 0 0 1-16 0V67.31l-42.34 42.35a8 8 0 0 1-11.32-11.32L188.69 56H160a8 8 0 0 1 0-16h48a8 8 0 0 1 8 8M98.34 146.34L56 188.69V160a8 8 0 0 0-16 0v48a8 8 0 0 0 8 8h48a8 8 0 0 0 0-16H67.31l42.35-42.34a8 8 0 0 0-11.32-11.32M208 152a8 8 0 0 0-8 8v28.69l-42.34-42.35a8 8 0 0 0-11.32 11.32L188.69 200H160a8 8 0 0 0 0 16h48a8 8 0 0 0 8-8v-48a8 8 0 0 0-8-8M67.31 56H96a8 8 0 0 0 0-16H48a8 8 0 0 0-8 8v48a8 8 0 0 0 16 0V67.31l42.34 42.35a8 8 0 0 0 11.32-11.32Z" /></g></svg>
          </span>
        </button>
      </div>
      <p className={styles.hint}>{hint}</p>
    </div>
  );
}
