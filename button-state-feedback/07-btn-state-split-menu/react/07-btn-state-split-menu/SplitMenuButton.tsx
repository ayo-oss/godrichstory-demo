import { useCallback, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SplitMenuButton.module.scss";

export type SplitMenuButtonProps = {
  mainLabel?: string;
  items?: string[];
  groupLabel?: string;
  moreLabel?: string;
  id?: string;
  duration?: number;
  easing?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string };
// DOM 전역 타입을 react 에서 가져오지 않는다 — 쓰는 속성만 여기에 적는다
type KeyEvt = { key: string };

const SEND_ICON = (
  <g fill="currentColor"><path d="m223.69 42.18l-58.22 192a8 8 0 0 1-14.92 1.25L108 148l-87.42-42.55a8 8 0 0 1 1.25-14.92l192-58.22a8 8 0 0 1 9.86 9.87" opacity=".2" /><path d="M227.32 28.68a16 16 0 0 0-15.66-4.08h-.15L19.57 82.84a16 16 0 0 0-2.49 29.8L102 154l41.3 84.87a15.86 15.86 0 0 0 14.44 9.13q.69 0 1.38-.06a15.88 15.88 0 0 0 14-11.51l58.2-191.94v-.15a16 16 0 0 0-4-15.66m-69.49 203.17l-.05.14v-.07l-40.06-82.3l48-48a8 8 0 0 0-11.31-11.31l-48 48l-82.33-40.06h-.07h.14L216 40Z" /></g>
);
const CARET_ICON = (
  <g fill="currentColor"><path d="m208 96l-80 80l-80-80Z" opacity=".2" /><path d="M215.39 92.94A8 8 0 0 0 208 88H48a8 8 0 0 0-5.66 13.66l80 80a8 8 0 0 0 11.32 0l80-80a8 8 0 0 0 1.73-8.72M128 164.69L67.31 104h121.38Z" /></g>
);

export default function SplitMenuButton({
  mainLabel = "Send now",
  items = ["Schedule send", "Save to drafts", "Preview first"],
  groupLabel = "Send options",
  moreLabel = "More ways to send",
  id = "sp",
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
}: SplitMenuButtonProps) {
  const [demo, setDemo] = useState(true); // 처음엔 자동 루프, 사람이 건드리면 끈다
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const moreRef = useRef<HTMLButtonElement | null>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing };
  const menuId = `${id}-menu`;
  const moreId = `${id}-more`;

  // 왼쪽 칸은 목록을 열지 않는다. 오른쪽 화살표 칸만 aria-expanded 를 뒤집는다
  const toggle = useCallback(() => {
    setDemo(false);
    setOpen((v) => !v);
  }, []);

  const send = useCallback(() => {
    setDemo(false);
    setOpen(false);
    setSent(true);
  }, []);

  const onKeyDown = useCallback((e: KeyEvt) => {
    if (e.key !== "Escape") return;
    setOpen(false);
    // preventScroll — iframe 안에서 부모 페이지가 끌려가지 않게
    moreRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div
      className={`${styles.sp} ${demo ? styles.isDemo : ""}`}
      style={vars}
      data-open={open ? "1" : "0"}
      onKeyDown={onKeyDown}
    >
      <div className={styles.wrap}>
        <div className={styles.group} role="group" aria-label={groupLabel}>
          <button className={styles.main} type="button" data-sent={sent ? "1" : "0"} onClick={send}>
            <span className={styles.ic} aria-hidden="true">
              <svg viewBox="0 0 256 256" width="18" height="18">{SEND_ICON}</svg>
            </span>
            <span className={styles.t}>{mainLabel}</span>
          </button>
          <button
            ref={moreRef}
            className={styles.more}
            id={moreId}
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={moreLabel}
            onClick={toggle}
          >
            <span className={styles.caret} aria-hidden="true">
              <svg viewBox="0 0 256 256" width="18" height="18">{CARET_ICON}</svg>
            </span>
          </button>
        </div>
        <ul className={styles.menu} id={menuId} role="menu" aria-labelledby={moreId}>
          {items.map((label) => (
            <li key={label} role="none">
              <button className={styles.item} type="button" role="menuitem">{label}</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
