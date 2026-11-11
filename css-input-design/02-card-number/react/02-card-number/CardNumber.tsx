import { useRef, useState } from "react";
import styles from "./CardNumber.module.scss";

export type CardNumberProps = {
  label?: string;
};

function brandOf(d: string): string {
  if (d[0] === "4") return "VISA";
  if (/^5[1-5]/.test(d)) return "Mastercard";
  if (/^3[47]/.test(d)) return "AMEX";
  return "";
}

function format(raw: string): { value: string; brand: string } {
  const d = raw.replace(/\D/g, "").slice(0, 16);
  const groups = d.match(/.{1,4}/g) || [];
  return { value: groups.join(" "), brand: brandOf(d) };
}

export default function CardNumber({ label = "카드 번호" }: CardNumberProps) {
  const [value, setValue] = useState("");
  const [brand, setBrand] = useState("");
  const id = useRef("card-input-" + Math.random().toString(36).slice(2)).current;

  return (
    <div className={styles.field}>
      <div className={styles.top}>
        <label className={styles.label} htmlFor={id}>{label}</label>
        <span className={styles.brand}>{brand}</span>
      </div>
      <input
        className={styles.input}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="cc-number"
        placeholder="0000 0000 0000 0000"
        maxLength={19}
        value={value}
        onChange={(e: any) => {
          const r = format(e.target.value);
          setValue(r.value);
          setBrand(r.brand);
        }}
      />
    </div>
  );
}
