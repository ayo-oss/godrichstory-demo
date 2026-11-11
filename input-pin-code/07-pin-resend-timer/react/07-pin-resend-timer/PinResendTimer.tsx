import { useState, useEffect } from "react";
import type { CSSProperties } from "react";
import styles from "./PinResendTimer.module.scss";

function siblings(el: any): HTMLInputElement[] {
  var row = el.closest("[data-pin-row]");
  return row ? Array.prototype.slice.call(row.querySelectorAll("input")) : [];
}

export type PinResendTimerProps = {
  /** 칸 수 (기본 6) */
  length?: number;
  /** 6칸이 다 채워지면 호출 */
  onComplete?: (code: string) => void;
  /** 강조 색 */
  color?: string;
  className?: string;
  /** 재전송까지 대기 시간(초). 기본 60 */
  resendSeconds?: number;
  onResend?: () => void;
};

type Vars = CSSProperties & { "--color"?: string };

export default function PinResendTimer({
  length = 6,
  onComplete,
  color = "#2f6df6",
  className = "",
  resendSeconds = 60,
  onResend,
}: PinResendTimerProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(""));
  const vars: Vars = { "--color": color };
  const [left, setLeft] = useState(resendSeconds);
  const [scrambling, setScrambling] = useState<boolean[]>(Array(length).fill(false));
  const [scrambleDisplay, setScrambleDisplay] = useState<string[]>(Array(length).fill(""));
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  function runScramble(index: number, finalDigit: string, delayStart = 0) {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!finalDigit || reduced) return;
    window.setTimeout(function start() {
      setScrambling((prev) => {
        const next = prev.slice();
        next[index] = true;
        return next;
      });
      let stepsLeft = 9;
      let delay = 24;
      (function spin() {
        if (stepsLeft > 0) {
          const randomDigit = String(Math.floor(Math.random() * 10));
          setScrambleDisplay((prev) => {
            const next = prev.slice();
            next[index] = randomDigit;
            return next;
          });
          stepsLeft--;
          delay = Math.round(delay * 1.34) + 2;
          window.setTimeout(spin, delay);
        } else {
          setScrambleDisplay((prev) => {
            const next = prev.slice();
            next[index] = finalDigit;
            return next;
          });
          window.setTimeout(() => {
            setScrambling((prev) => {
              const next = prev.slice();
              next[index] = false;
              return next;
            });
          }, 70);
        }
      })();
    }, delayStart);
  }

  function handleChange(e: any, i: number) {
    const el = e.currentTarget;
    const v = String(el.value).replace(/[^0-9]/g, "").slice(-1);
    const next = values.slice();
    next[i] = v;
    setValues(next);
    if (v) {
      runScramble(i, v, 0);
      const boxes = siblings(el);
      if (boxes[i + 1]) boxes[i + 1].focus({ preventScroll: true });
    }
    if (next.every(Boolean)) onComplete?.(next.join(""));
  }

  function handleKeyDown(e: any, i: number) {
    if (e.key === "Backspace" && !values[i]) {
      const boxes = siblings(e.currentTarget);
      if (boxes[i - 1]) boxes[i - 1].focus({ preventScroll: true });
    }
  }

  function handlePaste(e: any) {
    const text = String(e.clipboardData.getData("text")).replace(/[^0-9]/g, "").slice(0, length);
    if (!text) return;
    e.preventDefault();
    const next = text.split("");
    while (next.length < length) next.push("");
    setValues(next);
    next.forEach((ch, k) => {
      if (ch) runScramble(k, ch, k * 70);
    });
    if (text.length === length) onComplete?.(text);
  }

  return (
    <div className={`${styles.pin} ${className}`} style={vars} data-pin-row>
      {values.map((v, i) => (
        <span key={i} className={`${styles.boxWrap} ${scrambling[i] ? styles.scrambling : ""}`}>
          <input
            className={styles.box}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            autoComplete="one-time-code"
            aria-label={`인증번호 ${i + 1}번째 자리`}
            value={v}
            onChange={(e: any) => handleChange(e, i)}
            onKeyDown={(e: any) => handleKeyDown(e, i)}
            onPaste={(e: any) => handlePaste(e)}
          />
          <span className={styles.scramble} aria-hidden="true">
            {scrambling[i] ? scrambleDisplay[i] : ""}
          </span>
        </span>
      ))}
      <button
        type="button"
        className={styles.resend}
        disabled={left > 0}
        onClick={() => {
          setLeft(resendSeconds);
          onResend?.();
        }}
      >
        {left > 0 ? `${left}초 후 재전송` : "재전송"}
      </button>
    </div>
  );
}
