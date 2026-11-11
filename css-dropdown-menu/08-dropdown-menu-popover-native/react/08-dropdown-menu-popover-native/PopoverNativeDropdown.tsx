import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PopoverNativeDropdown.module.scss";

export type PopoverNativeDropdownProps = {
  triggerLabel: string;
  items: string[];
  /** 내용이 접혔다 펴지는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PopoverNativeDropdown({
  triggerLabel,
  items,
  duration = 300,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: PopoverNativeDropdownProps) {
  const [open, setOpen] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.menu} style={vars}>
      <button type="button" className={styles.trigger} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {triggerLabel}
      </button>
      {/* React 는 showPopover() 를 ref 로 직접 불러야 해서 상태로 대신한다. 실제 zip 의 vanilla 판은 popover 속성 + popovertarget 을 그대로 쓴다 */}
      <ul className={open ? `${styles.panel} ${styles.panelOpen}` : styles.panel}>
        {items.map((label) => (
          <li key={label}><a href="#">{label}</a></li>
        ))}
      </ul>
    </div>
  );
}
