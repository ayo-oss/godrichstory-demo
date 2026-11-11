import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ChatBubble.module.scss";

export type ChatBubbleProps = {
  avatar: string;
  text: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ChatBubble({
  avatar,
  text,
  duration = 260,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: ChatBubbleProps) {
  const [shown, setShown] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 마운트되면 한 번 등장한다 — 채팅창에 메시지가 도착하는 흐름
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <span className={styles.wrap} style={vars}>
      <span className={styles.avatar} aria-hidden="true">{avatar}</span>
      <p className={styles.bubble} data-open={shown}>{text}</p>
    </span>
  );
}
