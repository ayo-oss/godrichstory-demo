import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LiveChatBubble.module.scss";

export type LiveChatBubbleProps = {
  duration?: number;
  easing?: string;
  color?: string;
  unread?: number;
};

export default function LiveChatBubble({ duration = 2000, easing = "ease-out", color = "#b9a0ff", unread = 2 }: LiveChatBubbleProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      setSeen(true);
      requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    }
  }

  return (
    <div className={styles.wrap} style={vars}>
      {open && (
        <div className={styles.panel}>
          <header className={styles.head}>
            <span>실시간 문의</span>
            <button className={styles.close} type="button" aria-label="닫기" onClick={() => setOpen(false)}>
              <svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true"><g fill="currentColor">
                <path opacity=".2" d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" />
                <path d="M165.66 101.66L139.31 128l26.35 26.34a8 8 0 0 1-11.32 11.32L128 139.31l-26.34 26.35a8 8 0 0 1-11.32-11.32L116.69 128l-26.35-26.34a8 8 0 0 1 11.32-11.32L128 116.69l26.34-26.35a8 8 0 0 1 11.32 11.32M232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88" />
              </g></svg>
            </button>
          </header>
          <p className={styles.msg}>안녕하세요! 무엇을 도와드릴까요?</p>
          <div className={styles.inputRow}>
            <input ref={inputRef} className={styles.input} type="text" placeholder="메시지를 입력하세요" aria-label="메시지" />
            <button className={styles.send} type="button">전송</button>
          </div>
        </div>
      )}
      <button className={styles.launcher} type="button" aria-label="채팅 열기" aria-expanded={open} onClick={toggle}>
        <span className={styles.ring} aria-hidden="true" />
        <svg viewBox="0 0 256 256" width="24" height="24" aria-hidden="true"><g fill="currentColor">
          <path opacity=".2" d="M224 128a96 96 0 0 1-144.07 83.11l-37.39 12.47a8 8 0 0 1-10.12-10.12l12.47-37.39A96 96 0 1 1 224 128" />
          <path d="M128 24a104 104 0 0 0-91.82 152.88l-11.35 34.05a16 16 0 0 0 20.24 20.24l34.05-11.35A104 104 0 1 0 128 24m0 192a87.87 87.87 0 0 1-44.06-11.81a8 8 0 0 0-4-1.08a7.9 7.9 0 0 0-2.53.42L40 216l12.47-37.4a8 8 0 0 0-.66-6.54A88 88 0 1 1 128 216m12-88a12 12 0 1 1-12-12a12 12 0 0 1 12 12m-44 0a12 12 0 1 1-12-12a12 12 0 0 1 12 12m88 0a12 12 0 1 1-12-12a12 12 0 0 1 12 12" />
        </g></svg>
        {!seen && <span className={styles.badge}>{unread}</span>}
      </button>
    </div>
  );
}
