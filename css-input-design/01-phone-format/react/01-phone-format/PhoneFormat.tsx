import { useRef, useState } from "react";
import styles from "./PhoneFormat.module.scss";

export type PhoneFormatProps = {
  label?: string;
  hint?: string;
  color?: string;
};

function format(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

export default function PhoneFormat({
  label = "전화번호",
  hint = "숫자만 입력해도 하이픈이 자동으로 들어갑니다",
  color = "#2f6df6",
}: PhoneFormatProps) {
  const [value, setValue] = useState("");
  const id = useRef("phone-input-" + Math.random().toString(36).slice(2)).current;

  return (
    <div className={styles.field} style={{ ["--color" as string]: color }}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <input
        className={styles.input}
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="010-0000-0000"
        maxLength={13}
        value={value}
        aria-describedby={id + "-hint"}
        onChange={(e: any) => setValue(format(e.target.value))}
      />
      <p className={styles.hint} id={id + "-hint"}>{hint}</p>
    </div>
  );
}
