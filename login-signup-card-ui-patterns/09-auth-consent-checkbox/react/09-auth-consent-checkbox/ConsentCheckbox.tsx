import { useState, type CSSProperties, type ChangeEvent } from "react";
import styles from "./ConsentCheckbox.module.scss";

export type ConsentCheckboxProps = {
  label: string;
  /** 체크 선이 그려지는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  color?: string;
  onChange?: (checked: boolean) => void;
};

/** 실제 input[type=checkbox] 을 감춰 쓴다 — 스크린리더·키보드는 그 checkbox 를 그대로 읽고 조작한다 */
export default function ConsentCheckbox({
  label,
  duration = 300,
  easing = "ease-out",
  color = "#2f6df6",
  onChange,
}: ConsentCheckboxProps) {
  const [checked, setChecked] = useState(false);
  const style = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <div className={styles.card} data-checked={checked} style={style}>
      <label className={styles.consent}>
        <input
          className={styles.input}
          type="checkbox"
          checked={checked}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            setChecked(e.target.checked);
            onChange?.(e.target.checked);
          }}
        />
        <span className={styles.box}>
          <svg className={styles.svg} viewBox="0 0 20 20" aria-hidden="true">
            <path className={styles.check} d="M4 10.5l4 4 8-9" pathLength={1} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        {label}
      </label>
    </div>
  );
}
