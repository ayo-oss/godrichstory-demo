import { useState, type CSSProperties } from "react";
import styles from "./ChecklistStrikethroughComplete.module.scss";

export type ChecklistStrikethroughCompleteProps = {
  items: string[];
  /** 체크·취소선 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  /** 캔디 체크 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** 체크박스를 누르면 캔디 색으로 차오르고, 글자엔 왼쪽에서 오른쪽으로 취소선이 그어진다 */
export default function ChecklistStrikethroughComplete({
  items,
  duration = 300,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#ff9ebb",
}: ChecklistStrikethroughCompleteProps) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <ul className={styles.list} style={vars} aria-label="장보기 목록">
      {items.map((text, i) => {
        const done = !!checked[i];
        return (
          <li key={text} className={`${styles.item} ${done ? styles.checked : ""}`}>
            <button
              className={styles.box}
              type="button"
              role="checkbox"
              aria-checked={done}
              onClick={() => setChecked((c) => ({ ...c, [i]: !c[i] }))}
            >
              <svg viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M232 56v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16" opacity=".2" /><path d="m205.66 85.66l-96 96a8 8 0 0 1-11.32 0l-40-40a8 8 0 0 1 11.32-11.32L104 164.69l90.34-90.35a8 8 0 0 1 11.32 11.32" /></g></svg>
            </button>
            <span className={styles.text}>{text}</span>
          </li>
        );
      })}
    </ul>
  );
}
