import { useState } from "react";
import styles from "./DateAutoSlashInput.module.scss";

export type DateAutoSlashInputProps = {
  label?: string;
  hint?: string;
};

function formatDate(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  let out = digits.slice(0, 4);
  if (digits.length > 4) out += "/" + digits.slice(4, 6);
  if (digits.length > 6) out += "/" + digits.slice(6, 8);
  return out;
}

export default function DateAutoSlashInput({
  label = "생년월일",
  hint = "숫자만 입력하면 슬래시가 자동으로 붙어요",
}: DateAutoSlashInputProps) {
  const [value, setValue] = useState("");

  const onChange = (e: any) => {
    setValue(formatDate(e.target.value));
  };

  return (
    <div className={styles.dt}>
      <label className={styles.label} htmlFor="dt-input">
        {label}
      </label>
      <input
        className={styles.input}
        id="dt-input"
        type="text"
        inputMode="numeric"
        placeholder="YYYY/MM/DD"
        aria-describedby="dt-hint"
        value={value}
        onChange={onChange}
      />
      <p className={styles.hint} id="dt-hint">
        {hint}
      </p>
    </div>
  );
}
