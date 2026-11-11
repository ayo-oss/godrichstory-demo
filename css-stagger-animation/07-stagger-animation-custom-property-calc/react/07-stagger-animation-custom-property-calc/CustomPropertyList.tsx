import type { CSSProperties } from "react";
import styles from "./CustomPropertyList.module.scss";

type Vars = CSSProperties & { "--i"?: number };

export type CustomPropertyListProps = {
  items: string[];
  /** --i 1당 시차 ms (기본 80ms) — CSS 쪽 calc(var(--i) * 80ms) 한 줄이 실제 계산을 한다 */
  stagger?: number;
};

export default function CustomPropertyList({ items }: CustomPropertyListProps) {
  return (
    <ul className={styles.list}>
      {items.map((label, i) => (
        <li key={label} style={{ "--i": i } as Vars}>
          {label}
        </li>
      ))}
    </ul>
  );
}
