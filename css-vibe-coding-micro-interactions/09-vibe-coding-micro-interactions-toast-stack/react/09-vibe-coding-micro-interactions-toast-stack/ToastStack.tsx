import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ToastStack.module.scss";

export type ToastStackProps = {
  messages: string[];
  triggerLabel: string;
  /** 세 개가 다 쌓이는 시간 (기본 260ms 씩 순차) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ToastStack({
  messages,
  triggerLabel,
  duration = 260,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: ToastStackProps) {
  const [visible, setVisible] = useState<number[]>([]);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const push = () => {
    setVisible([]);
    messages.forEach((_, i) => {
      setTimeout(() => setVisible((v) => [...v, i]), i * duration);
    });
  };

  return (
    <div className={styles.toasts} style={vars}>
      <button type="button" className={styles.trigger} onClick={push}>{triggerLabel}</button>
      <div className={styles.list} aria-live="polite">
        {messages.map((msg, i) => {
          const shown = visible.includes(i);
          const depth = visible.length - 1 - i;   // 도착 순서가 곧 인덱스 순서라 뺄셈만으로 깊이가 나온다
          return (
            <div
              key={msg}
              className={i === messages.length - 1 ? `${styles.toast} ${styles.newest}` : styles.toast}
              style={{
                opacity: shown ? Math.max(1 - depth * .12, 0) : 0,
                transform: shown ? `translateY(${-depth * 42}px) scale(${1 - depth * .04})` : "translateY(16px) scale(1)",
              }}
            >
              {msg}
            </div>
          );
        })}
      </div>
    </div>
  );
}
