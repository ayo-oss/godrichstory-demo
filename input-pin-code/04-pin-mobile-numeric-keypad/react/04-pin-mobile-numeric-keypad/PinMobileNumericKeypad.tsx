import { useState, useRef, useEffect } from "react";
import type { CSSProperties } from "react";
import styles from "./PinMobileNumericKeypad.module.scss";

function siblings(el: any): HTMLInputElement[] {
  var row = el.closest("[data-pin-row]");
  return row ? Array.prototype.slice.call(row.querySelectorAll("input")) : [];
}

export type PinMobileNumericKeypadProps = {
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
type TimerList = Array<ReturnType<typeof setTimeout> | undefined>;
// useState setter — 스텁 환경에 Dispatch/SetStateAction 이 없어 로컬로 같은 모양을 쓴다
type ListSetter<T> = (v: T[] | ((prev: T[]) => T[])) => void;

export default function PinMobileNumericKeypad({
  length = 6,
  onComplete,
  color = "#2f6df6",
  className = "",
}: PinMobileNumericKeypadProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(""));
  const [displayValues, setDisplayValues] = useState<string[]>(Array(length).fill(""));
  const [animState, setAnimState] = useState<Array<"idle" | "scrambling" | "settle">>(Array(length).fill("idle"));
  const vars: Vars = { "--color": color };
  const reduceMotionRef = useRef(false) as Box<boolean>;
  const timersRef = useRef<TimerList>([]) as Box<TimerList>;

  useEffect(() => {
    reduceMotionRef.current = typeof window !== "undefined" && !!window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;
    return () => { timersRef.current.forEach((t) => t && clearTimeout(t)); };
  }, []);

  function updateAt<T>(setter: ListSetter<T>, index: number, val: T) {
    setter((prev) => {
      const next = prev.slice();
      next[index] = val;
      return next;
    });
  }

  function scrambleToDigit(index: number, finalDigit: string, onSettle: () => void) {
    if (reduceMotionRef.current) {
      updateAt(setDisplayValues, index, finalDigit);
      onSettle();
      return;
    }
    updateAt(setAnimState, index, "scrambling");
    let step = 0;
    const steps = 7;
    let delay = 22;
    const tick = () => {
      if (step >= steps) {
        updateAt(setDisplayValues, index, finalDigit);
        updateAt(setAnimState, index, "settle");
        timersRef.current[index] = setTimeout(() => {
          updateAt(setAnimState, index, "idle");
        }, 200);
        onSettle();
        return;
      }
      updateAt(setDisplayValues, index, String(Math.floor(Math.random() * 10)));
      step++;
      delay = Math.round(delay * 1.4);
      timersRef.current[index] = setTimeout(tick, delay);
    };
    tick();
  }

  function handleChange(e: any, i: number) {
    const el = e.currentTarget;
    const v = String(el.value).replace(/[^0-9]/g, "").slice(-1);
    if (!v) {
      const next = values.slice();
      next[i] = "";
      setValues(next);
      updateAt(setDisplayValues, i, "");
      return;
    }
    const committed = values.slice();
    committed[i] = v;
    setValues(committed);
    scrambleToDigit(i, v, () => {
      const boxes = siblings(el);
      if (boxes[i + 1]) boxes[i + 1].focus({ preventScroll: true });
      if (committed.every(Boolean)) onComplete?.(committed.join(""));
    });
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
    setDisplayValues(next.slice());
    if (text.length === length) onComplete?.(text);
  }

  return (
    <div className={`${styles.pin} ${className}`} style={vars} data-pin-row>
      {displayValues.map((v, i) => (
        <input
          key={i}
          className={[
            styles.box,
            animState[i] === "scrambling" ? styles.scrambling : "",
            animState[i] === "settle" ? styles.settle : "",
          ].join(" ").trim()}
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
      ))}
    </div>
  );
}
