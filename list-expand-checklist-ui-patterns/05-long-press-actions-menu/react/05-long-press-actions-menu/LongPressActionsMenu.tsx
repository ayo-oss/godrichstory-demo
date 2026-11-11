import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import styles from "./LongPressActionsMenu.module.scss";

export type LongPressActionsMenuProps = {
  title: string;
  /** 메뉴 확대 시간 (기본 220ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const HOLD_MS = 500;

/** pointerdown 후 500ms 유지하면 메뉴가 열린다. "..." 버튼은 길게 누르기 없이도 같은 메뉴를 여는 키보드 대체 수단 */
export default function LongPressActionsMenu({
  title,
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#17141a",
}: LongPressActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    timer.current = setTimeout(() => setOpen(true), HOLD_MS);
  };
  const cancel = () => { if (timer.current) clearTimeout(timer.current); };

  return (
    <div
      className={styles.row}
      style={vars}
      onPointerDown={down}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={(e: any) => { if (e.key === "Escape" && open) { setOpen(false); moreRef.current?.focus(); } }}
    >
      <span className={styles.title}>{title}</span>
      <button ref={moreRef} className={styles.more} type="button" aria-haspopup="true" aria-expanded={open} aria-label="작업 메뉴 열기" onClick={() => setOpen((v) => !v)}>
        <svg viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M176 32v192a16 16 0 0 1-16 16H96a16 16 0 0 1-16-16V32a16 16 0 0 1 16-16h64a16 16 0 0 1 16 16" opacity=".2" /><path d="M140 128a12 12 0 1 1-12-12a12 12 0 0 1 12 12m-12-56a12 12 0 1 0-12-12a12 12 0 0 0 12 12m0 112a12 12 0 1 0 12 12a12 12 0 0 0-12-12" /></g></svg>
      </button>
      <div className={`${styles.menu} ${open ? styles.open : ""}`} role="menu">
        <button className={styles.item} type="button" role="menuitem" aria-label="즐겨찾기">
          <svg viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="m229.06 108.79l-48.7 42l14.88 62.79a8.4 8.4 0 0 1-12.52 9.17L128 189.09l-54.72 33.65a8.4 8.4 0 0 1-12.52-9.17l14.88-62.79l-48.7-42A8.46 8.46 0 0 1 31.73 94l63.91-5.2l24.62-59.6a8.36 8.36 0 0 1 15.48 0l24.62 59.6l63.91 5.2a8.46 8.46 0 0 1 4.79 14.79" opacity=".2" /><path d="M239.18 97.26A16.38 16.38 0 0 0 224.92 86l-59-4.76l-22.78-55.09a16.36 16.36 0 0 0-30.27 0L90.11 81.23L31.08 86a16.46 16.46 0 0 0-9.37 28.86l45 38.83L53 211.75a16.38 16.38 0 0 0 24.5 17.82l50.5-31.08l50.53 31.08A16.4 16.4 0 0 0 203 211.75l-13.76-58.07l45-38.83a16.43 16.43 0 0 0 4.94-17.59m-15.34 5.47l-48.7 42a8 8 0 0 0-2.56 7.91l14.88 62.8a.37.37 0 0 1-.17.48c-.18.14-.23.11-.38 0l-54.72-33.65a8 8 0 0 0-8.38 0l-54.72 33.67c-.15.09-.19.12-.38 0a.37.37 0 0 1-.17-.48l14.88-62.8a8 8 0 0 0-2.56-7.91l-48.7-42c-.12-.1-.23-.19-.13-.5s.18-.27.33-.29l63.92-5.16a8 8 0 0 0 6.72-4.94l24.62-59.61c.08-.17.11-.25.35-.25s.27.08.35.25L153 91.86a8 8 0 0 0 6.75 4.92l63.92 5.16c.15 0 .24 0 .33.29s0 .4-.16.5" /></g></svg>
        </button>
        <button className={styles.item} type="button" role="menuitem" aria-label="보관">
          <svg viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M216 96v96a8 8 0 0 1-8 8H48a8 8 0 0 1-8-8V96Z" opacity=".2" /><path d="M224 48H32a16 16 0 0 0-16 16v24a16 16 0 0 0 16 16v88a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16v-88a16 16 0 0 0 16-16V64a16 16 0 0 0-16-16m-16 144H48v-88h160Zm16-104H32V64h192zM96 136a8 8 0 0 1 8-8h48a8 8 0 0 1 0 16h-48a8 8 0 0 1-8-8" /></g></svg>
        </button>
        <button className={`${styles.item} ${styles.danger}`} type="button" role="menuitem" aria-label="삭제">
          <svg viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M200 56v152a8 8 0 0 1-8 8H64a8 8 0 0 1-8-8V56Z" opacity=".2" /><path d="M216 48h-40v-8a24 24 0 0 0-24-24h-48a24 24 0 0 0-24 24v8H40a8 8 0 0 0 0 16h8v144a16 16 0 0 0 16 16h128a16 16 0 0 0 16-16V64h8a8 8 0 0 0 0-16M96 40a8 8 0 0 1 8-8h48a8 8 0 0 1 8 8v8H96Zm96 168H64V64h128Zm-80-104v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0m48 0v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0" /></g></svg>
        </button>
      </div>
    </div>
  );
}
