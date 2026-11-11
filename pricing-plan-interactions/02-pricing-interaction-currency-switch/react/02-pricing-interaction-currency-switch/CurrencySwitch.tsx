import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CurrencySwitch.module.scss";

export type Currency = { id: string; code: string; sym: string; amt: string };
export type CurrencySwitchProps = {
  planName?: string;
  note?: string;
  pickLabel?: string;
  unit?: string;
  items?: Currency[];
  duration?: number;
  easing?: string;
  color?: string;
};

// React 이벤트 타입은 import 하지 않는다 — 필요한 모양만 여기서 적는다
type KeyEvt = { key: string; preventDefault(): void };

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

const DEFAULT_ITEMS: Currency[] = [
  { id: "usd", code: "USD", sym: "$", amt: "29" },
  { id: "krw", code: "KRW", sym: "₩", amt: "39,000" },
  { id: "jpy", code: "JPY", sym: "¥", amt: "4,400" },
  { id: "eur", code: "EUR", sym: "€", amt: "27" },
];

export default function CurrencySwitch({
  planName = "Standard plan",
  note = "Tax not included",
  pickLabel = "Pick a currency",
  unit = "/ mo",
  items = DEFAULT_ITEMS,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#4cd4a6",
}: CurrencySwitchProps) {
  const [demo, setDemo] = useState(true);
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState(items[0].id);
  const trigRef = useRef<HTMLButtonElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const now = items.find((c) => c.id === cur) || items[0];
  const at = Math.max(0, items.findIndex((c) => c.id === cur));

  function toggle() {
    setDemo(false);
    setOpen((v) => !v);
  }
  function pick(c: Currency) {
    setDemo(false);
    setCur(c.id);
    setOpen(false);
    trigRef.current?.focus({ preventScroll: true });
  }
  function onKey(e: KeyEvt) {
    if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
      trigRef.current?.focus({ preventScroll: true });
    }
  }

  return (
    <div
      className={`${styles.cs} ${demo ? styles.isDemo : ""}`}
      data-cur={cur}
      style={vars}
      onKeyDown={onKey}
    >
      <div className={styles.left}>
        <p className={styles.plan}>{planName}</p>
        <div className={styles.priceline} aria-live="polite">
          {items.map((c) => (
            <span key={c.id} className={styles.face} data-cur={c.id} data-on={!demo && c.id === cur ? "1" : "0"}>
              <span className={styles.sym}>{c.sym}</span>
              <span className={styles.amt}>{c.amt}</span>
              <span className={styles.unit}>{unit}</span>
            </span>
          ))}
        </div>
        <p className={styles.note}>{note}</p>
      </div>
      <div className={styles.pick}>
        <button
          ref={trigRef}
          className={styles.trig}
          type="button"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={pickLabel}
          onClick={toggle}
        >
          <span className={styles.code}>{now.code}</span>
          <span className={styles.tsym}>{now.sym}</span>
          <span className={styles.caret} aria-hidden="true">
            <svg viewBox="0 0 256 256" width="14" height="14">
              <g fill="currentColor">
                <path d="m208 96l-80 80l-80-80Z" opacity=".2" />
                <path d="M215.39 92.94A8 8 0 0 0 208 88H48a8 8 0 0 0-5.66 13.66l80 80a8 8 0 0 0 11.32 0l80-80a8 8 0 0 0 1.73-8.72M128 164.69L67.31 104h121.38Z" />
              </g>
            </svg>
          </span>
        </button>
        <div className={styles.pop} data-open={open ? "1" : "0"}>
          {/* 표시 띠만 부드럽게 미끄러진다 — 컷 옆에서 움직인 프레임을 채우는 몫 */}
          <span className={styles.hl} style={{ transform: `translateY(calc(var(--row) * ${at}))` }} aria-hidden="true" />
          <ul className={styles.list} role="listbox" aria-label={pickLabel}>
            {items.map((c) => (
              <li
                key={c.id}
                className={styles.opt}
                role="option"
                aria-selected={!demo && c.id === cur}
                tabIndex={0}
                data-cur={c.id}
                onClick={() => pick(c)}
                onKeyDown={(e: KeyEvt) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    pick(c);
                  }
                }}
              >
                <span className={styles.dot} data-on={!demo && c.id === cur ? "1" : "0"} aria-hidden="true" />
                <span className={styles.oc}>{c.code}</span>
                <span className={styles.os}>{c.sym}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
