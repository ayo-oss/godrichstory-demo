import { useRef, useState } from "react";
import styles from "./CurrencyInput.module.scss";

export type CurrencyInputProps = {
  label?: string;
  hint?: string;
  symbol?: string;
};

function format(raw: string): string {
  const d = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 12);
  return d ? Number(d).toLocaleString("ko-KR") : "";
}

export default function CurrencyInput({
  label = "후원 금액",
  hint = "숫자만 입력하면 천 단위 콤마가 자동으로 붙습니다",
  symbol = "₩",
}: CurrencyInputProps) {
  const [value, setValue] = useState("");
  const id = useRef("amount-input-" + Math.random().toString(36).slice(2)).current;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <div className={styles.frame}>
        <span className={styles.prefix} aria-hidden="true">{symbol}</span>
        <input
          className={styles.input}
          id={id}
          type="text"
          inputMode="numeric"
          placeholder="0"
          aria-describedby={id + "-hint"}
          value={value}
          onChange={(e: any) => setValue(format(e.target.value))}
        />
      </div>
      <p className={styles.hint} id={id + "-hint"}>{hint}</p>
    </div>
  );
}
