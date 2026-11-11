import type { CSSProperties } from "react";
import styles from "./StaggerUtilList.module.scss";

export type StaggerUtilListProps = {
  items?: string[];
  duration?: number;
  /** 항목 사이 지연, ms — [animation-delay:calc(var(--i)*80ms)] 의 80 */
  step?: number;
  easing?: string;
  color?: string;
};

type ItemVars = CSSProperties & { "--i"?: number };
type Vars = CSSProperties & {
  "--duration"?: string;
  "--step"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export default function StaggerUtilList({
  items = [
    "A new comment was posted",
    "You have a new follower",
    "Payment completed",
  ],
  duration = 400,
  step = 80,
  easing = "ease-out",
  color = "#fff7e6",
}: StaggerUtilListProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--step": `${step}ms`,
    "--easing": easing,
    "--color": color,
  };
  return (
    <ul className={styles.list} style={vars}>
      {items.map((text, i) => {
        const itemVars: ItemVars = { "--i": i };
        return (
          <li key={text} className={styles.list__item} style={itemVars}>
            {text}
          </li>
        );
      })}
    </ul>
  );
}
