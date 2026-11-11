import type { CSSProperties } from "react";
import styles from "./ToastStack3.module.scss";

export type ToastStack3Props = {
  /** 앞(맨 위)부터 순서대로 3개 */
  items: [string, string, string];
  color?: string;
  duration?: number;
  easing?: string;
};

type ItemVars = CSSProperties & { "--i"?: number };

export default function ToastStack3({
  items,
  color = "#fff7e6",
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
}: ToastStack3Props) {
  const vars = { "--color": color, "--duration": `${duration}ms`, "--easing": easing } as CSSProperties;
  const withIndex = items.map((text, i) => ({ text, i }));
  const backToFront = [...withIndex].reverse(); // DOM은 뒤(i 큰 값)부터 써야 앞(i=0)이 맨 위에 그려진다

  return (
    <div
      className={styles.stack}
      style={vars}
      tabIndex={0}
      role="status"
      aria-live="polite"
      aria-label={`알림 ${items.length}개`}
    >
      {backToFront.map(({ text, i }) => {
        const itemVars: ItemVars = { "--i": i };
        return (
          <div key={i} className={styles.item} style={itemVars}>
            {text}
          </div>
        );
      })}
    </div>
  );
}
