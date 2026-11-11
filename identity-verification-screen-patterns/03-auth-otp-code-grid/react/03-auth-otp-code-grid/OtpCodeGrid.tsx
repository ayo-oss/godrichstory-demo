import { useRef, useState } from "react";
import styles from "./OtpCodeGrid.module.scss";

export type OtpCodeGridProps = {
  length?: number;
  onComplete?: (code: string) => void;
};

/** 인증번호 입력 그리드 — 자동 이동 + 붙여넣기 분배 */
export default function OtpCodeGrid({ length = 6, onComplete }: OtpCodeGridProps) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(""));
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const setDigit = (i: number, value: string) => {
    const next = [...digits];
    next[i] = value;
    setDigits(next);
    if (next.every((d) => d)) onComplete?.(next.join(""));
  };

  return (
    <div className={styles.card}>
      <span className={styles.icon} aria-hidden="true">
        <svg viewBox="0 0 256 256">
          <g fill="currentColor">
            <path d="M208 88H48a8 8 0 0 0-8 8v112a8 8 0 0 0 8 8h160a8 8 0 0 0 8-8V96a8 8 0 0 0-8-8m-80 72a20 20 0 1 1 20-20a20 20 0 0 1-20 20" opacity=".2" />
            <path d="M208 80h-32V56a48 48 0 0 0-96 0v24H48a16 16 0 0 0-16 16v112a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V96a16 16 0 0 0-16-16M96 56a32 32 0 0 1 64 0v24H96Zm112 152H48V96h160zm-80-96a28 28 0 0 0-8 54.83V184a8 8 0 0 0 16 0v-17.17a28 28 0 0 0-8-54.83m0 40a12 12 0 1 1 12-12a12 12 0 0 1-12 12" />
          </g>
        </svg>
      </span>
      <p className={styles.desc}>Enter the {length}-digit code we texted you</p>
      <div className={styles.otp} role="group" aria-label="One-time code">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el: HTMLInputElement | null) => { refs.current![i] = el; }}
            className={styles.box}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={d}
            aria-label={`Digit ${i + 1}`}
            onChange={(e: any) => {
              const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 1);
              setDigit(i, v);
              if (v && refs.current![i + 1]) refs.current![i + 1]!.focus({ preventScroll: true });
            }}
            onKeyDown={(e: any) => {
              if (e.key === "Backspace" && !digits[i] && refs.current![i - 1]) refs.current![i - 1]!.focus({ preventScroll: true });
            }}
            onPaste={(e: any) => {
              e.preventDefault();
              const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "").split("");
              const next = Array(length).fill("").map((_, j) => pasted[j] || "");
              setDigits(next);
              if (next.every((n) => n)) onComplete?.(next.join(""));
              refs.current![Math.min(pasted.length, length) - 1]?.focus({ preventScroll: true });
            }}
          />
        ))}
      </div>
    </div>
  );
}
