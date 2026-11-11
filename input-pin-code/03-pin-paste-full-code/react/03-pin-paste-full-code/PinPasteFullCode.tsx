import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PinPasteFullCode.module.scss";

function siblings(el: any): HTMLInputElement[] {
  var row = el.closest("[data-pin-row]");
  return row ? Array.prototype.slice.call(row.querySelectorAll("input")) : [];
}

export type PinPasteFullCodeProps = {
  /** 칸 수 (기본 6) */
  length?: number;
  /** 6칸이 다 채워지면 호출 */
  onComplete?: (code: string) => void;
  /** 강조 색 */
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--color"?: string };
// useRef 는 T | null 을 돌려준다. 값이 항상 있는 상자는 이렇게 좁혀 쓴다 (077 관례)
type Box<T> = { current: T };
type TimerMap = Record<number, ReturnType<typeof setTimeout> | null>;

export default function PinPasteFullCode({
  length = 6,
  onComplete,
  color = "#2f6df6",
  className = "",
}: PinPasteFullCodeProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(""));
  const [scrambleText, setScrambleText] = useState<string[]>(Array(length).fill(""));
  const [scrambling, setScrambling] = useState<boolean[]>(Array(length).fill(false));
  const scrambleTimers = useRef<TimerMap>({}) as Box<TimerMap>;
  const vars: Vars = { "--color": color };

  // 슬롯머신 스크램블: 최종 숫자를 바로 보여주지 않고 무작위 숫자가 지나가다 감속하며 정착한다
  function cancelScramble(i: number) {
    const timer = scrambleTimers.current[i];
    if (timer) {
      clearTimeout(timer);
      scrambleTimers.current[i] = null;
    }
  }
  function setScramblingAt(i: number, on: boolean) {
    setScrambling((prev) => {
      const next = prev.slice();
      next[i] = on;
      return next;
    });
  }
  function setScrambleTextAt(i: number, text: string) {
    setScrambleText((prev) => {
      const next = prev.slice();
      next[i] = text;
      return next;
    });
  }
  function runScramble(i: number, finalDigit: string) {
    cancelScramble(i);
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setScramblingAt(i, false);
      setScrambleTextAt(i, "");
      return;
    }
    setScramblingAt(i, true);
    const startedAt = Date.now();
    const totalMs = 280;   // 스크램블 총 지속시간
    const growth = 1.35;   // 감속 배율
    const maxDelay = 200;  // 최대 간격(느려짐)
    let delay = 24;        // 초기 간격(빠름)
    function tick() {
      const elapsed = Date.now() - startedAt;
      if (elapsed >= totalMs) {
        setScrambleTextAt(i, finalDigit);
        scrambleTimers.current[i] = setTimeout(() => {
          setScramblingAt(i, false);
          setScrambleTextAt(i, "");
          scrambleTimers.current[i] = null;
        }, 70);
        return;
      }
      setScrambleTextAt(i, String(Math.floor(Math.random() * 10)));
      delay = Math.min(delay * growth, maxDelay);
      scrambleTimers.current[i] = setTimeout(tick, delay);
    }
    tick();
  }
  useEffect(() => {
    const timers: TimerMap = scrambleTimers.current;
    return () => {
      Object.keys(timers).forEach((key) => {
        const timer = timers[Number(key)];
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  function handleChange(e: any, i: number) {
    const el = e.currentTarget;
    const v = String(el.value).replace(/[^0-9]/g, "").slice(-1);
    const next = values.slice();
    next[i] = v;
    setValues(next);
    if (v) {
      runScramble(i, v);
      const boxes = siblings(el);
      if (boxes[i + 1]) boxes[i + 1].focus({ preventScroll: true });
    } else {
      cancelScramble(i);
      setScramblingAt(i, false);
      setScrambleTextAt(i, "");
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
    text.split("").forEach((ch, k) => runScramble(k, ch));
    if (text.length === length) onComplete?.(text);
  }

  return (
    <div className={`${styles.pin} ${className}`} style={vars} data-pin-row>
      {values.map((v, i) => (
        <span
          key={i}
          className={scrambling[i] ? `${styles.boxWrap} ${styles.isScrambling}` : styles.boxWrap}
        >
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
          <span className={styles.scramble} aria-hidden="true">{scrambleText[i]}</span>
        </span>
      ))}
    </div>
  );
}
