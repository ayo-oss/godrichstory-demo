import { useRef, useState, type ChangeEvent } from "react";
import styles from "./ClearButtonInput.module.scss";

export type ClearButtonInputProps = {
  label?: string;
};

export default function ClearButtonInput({ label = "검색" }: ClearButtonInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const clear = () => {
    setValue("");
    inputRef.current?.focus({ preventScroll: true });
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value);

  const onKeyDown = (e: any) => {
    if (e.key === "Escape" && value) {
      clear();
    }
  };

  return (
    <div className={styles.cb}>
      <label className={styles.label} htmlFor="cb-input-react">
        {label}
      </label>
      <div className={styles.field}>
        <input
          id="cb-input-react"
          ref={inputRef}
          className={styles.input}
          type="text"
          placeholder="검색어를 입력하세요"
          autoComplete="off"
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          className={value ? `${styles.clear} ${styles.visible}` : styles.clear}
          aria-label="지우기"
          onClick={clear}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
            <line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            <line x1="13" y1="3" x2="3" y2="13" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
