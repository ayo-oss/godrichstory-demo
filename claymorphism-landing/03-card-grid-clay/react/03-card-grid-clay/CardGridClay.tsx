import type { CSSProperties } from "react";
import styles from "./CardGridClay.module.scss";

export type CardGridClayItem = { label: string };

export type CardGridClayProps = {
  items?: CardGridClayItem[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const DELAYS = ["0s", "-0.5s", "-1s", "-1.5s"];

export default function CardGridClay({
  items = [
    { label: "빠른 검색" },
    { label: "자동 정리" },
    { label: "팀 채팅" },
    { label: "리포트" },
  ],
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: CardGridClayProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.grid} style={vars}>
      {items.map((it, i) => (
        <div
          key={it.label}
          className={styles.item}
          style={{ animationDelay: DELAYS[i % DELAYS.length] }}
        >
          <span className={styles.icon} aria-hidden="true" />
          <p className={styles.label}>{it.label}</p>
        </div>
      ))}
    </div>
  );
}
