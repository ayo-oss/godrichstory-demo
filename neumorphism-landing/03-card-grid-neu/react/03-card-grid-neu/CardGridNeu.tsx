import type { CSSProperties } from "react";
import styles from "./CardGridNeu.module.scss";

export type CardGridNeuItem = { label: string };
export type CardGridNeuProps = {
  items?: CardGridNeuItem[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CardGridNeu({
  items = [{ label: "빠른 검색" }, { label: "자동 정리" }, { label: "팀 채팅" }, { label: "리포트" }],
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: CardGridNeuProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.grid} style={vars}>
      {items.map((it, i) => (
        <div key={it.label} className={styles.item} style={{ animationDelay: `${-i * 0.5}s` }}>
          <span className={styles.icon} aria-hidden="true" />
          <p className={styles.label}>{it.label}</p>
        </div>
      ))}
    </div>
  );
}
