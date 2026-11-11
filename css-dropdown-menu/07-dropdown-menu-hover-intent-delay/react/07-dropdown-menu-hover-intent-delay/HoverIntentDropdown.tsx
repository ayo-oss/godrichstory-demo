import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./HoverIntentDropdown.module.scss";

export type HoverIntentDropdownProps = {
  triggerLabel: string;
  items: string[];
  /** 열리고 닫히는 시간 (기본 220ms) */
  duration?: number;
  easing?: string;
  /** 진입 후 기다리는 시간 (기본 150ms, 닫힐 땐 지연 없음) */
  delay?: number;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--delay"?: string; "--color"?: string };

export default function HoverIntentDropdown({
  triggerLabel,
  items,
  duration = 220,
  easing = "ease-out",
  delay = 150,
  color = "#fff7e6",
}: HoverIntentDropdownProps) {
  const [open, setOpen] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--delay": `${delay}ms`, "--color": color };

  return (
    // 데스크톱은 CSS :hover 만으로 지연 열림이 동작한다. 터치 화면을 위해 클릭 토글도 겸한다.
    <nav className={styles.menu} style={vars} onClick={() => setOpen((v) => !v)}>
      <button type="button" className={styles.trigger} aria-expanded={open}>{triggerLabel}</button>
      <ul className={open ? `${styles.panel} ${styles.panelOpen}` : styles.panel}>
        {items.map((label) => (
          <li key={label}><a href="#">{label}</a></li>
        ))}
      </ul>
    </nav>
  );
}
