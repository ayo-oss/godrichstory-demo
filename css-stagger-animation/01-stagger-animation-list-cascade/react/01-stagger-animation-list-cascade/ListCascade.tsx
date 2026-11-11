import type { CSSProperties } from "react";
import styles from "./ListCascade.module.scss";

export type ListCascadeProps = {
  items: string[];
  /** 항목 하나가 나타나는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  /** 항목 사이 시차 ms (기본 90ms) */
  stagger?: number;
};

export default function ListCascade({
  items,
  duration = 300,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  stagger = 90,
}: ListCascadeProps) {
  return (
    <ul className={styles.cascade} style={{ "--duration": `${duration}ms`, "--easing": easing } as CSSProperties}>
      {items.map((label, i) => (
        <li key={label} style={{ animationDelay: `${i * stagger}ms` }}>
          {label}
        </li>
      ))}
    </ul>
  );
}
