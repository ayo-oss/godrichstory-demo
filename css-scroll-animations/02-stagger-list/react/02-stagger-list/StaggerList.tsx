import type { CSSProperties } from "react";
import styles from "./StaggerList.module.scss";

export type StaggerListProps = {
  items: string[];
  /** 항목 사이 진입 범위 간격 (기본 80ms, 문서용 — 실제 진행은 목록 배치가 만든다) */
  stagger?: number;
  /** 올라오는 거리 (기본 16px) */
  distance?: number;
  /** 글자 색 배경 (기본 #17141a) */
  color?: string;
  className?: string;
};

type ItemVars = CSSProperties & { "--i"?: number };
type ListVars = CSSProperties & { "--stagger"?: string; "--distance"?: string; "--color"?: string };

export default function StaggerList({
  items,
  stagger = 80,
  distance = 16,
  color = "#17141a",
  className = "",
}: StaggerListProps) {
  const vars: ListVars = { "--stagger": `${stagger}ms`, "--distance": `${distance}px`, "--color": color };

  return (
    <ul className={`${styles.list} ${className}`} style={vars}>
      {items.map((label, i) => {
        const itemVars: ItemVars = { "--i": i };
        return (
          <li key={label} className={styles.item} style={itemVars}>
            {label}
          </li>
        );
      })}
    </ul>
  );
}
