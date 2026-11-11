import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CollapsedGroup.module.scss";

export type CollapsedGroupProps = {
  items?: string[];
  listLabel?: string;
  toggleLabel?: string;
  step?: number;
  fold?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--step"?: string; "--fold"?: string; "--duration"?: string; "--easing"?: string; "--color"?: string };
type ItemVars = CSSProperties & { "--i"?: number };

const RING = <g fill="currentColor"><path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" /><path d="M173.66 98.34a8 8 0 0 1 0 11.32l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 0M232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88" /></g>;

export default function CollapsedGroup({
  items = ["Payment approved", "Shipping started", "A coupon arrived", "Points credited"],
  listLabel = "Grouped notifications",
  toggleLabel = "Open the grouped notifications",
  step = 36,
  fold = 12,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: CollapsedGroupProps) {
  const [demo, setDemo] = useState(true);
  const [open, setOpen] = useState(false);
  const vars: Vars = {
    "--step": `${step}px`, "--fold": `${fold}px`,
    "--duration": `${duration}ms`, "--easing": easing, "--color": color,
  };

  function toggle() {
    setDemo(false);
    setOpen((v) => !v);
  }

  // 맨 앞 카드가 --i 0 이 되도록 뒤집어 그린다
  const deck = items.slice(0, 4).map((text, i) => ({ text, i: items.length - 1 - i })).reverse();

  return (
    <div className={`${styles.cg} ${demo ? styles.isDemo : ""}`} style={vars}>
      <div className={styles.box}>
        <ul className={`${styles.list} ${open ? styles.isOpen : ""}`} id="cg-list" aria-label={listLabel}>
          {deck.map((row) => {
            const iv: ItemVars = { "--i": row.i };
            return (
              <li key={row.text} className={styles.item} style={iv} onClick={toggle}>
                <span className={styles.in}>
                  <span className={styles.ic} aria-hidden="true"><svg viewBox="0 0 256 256" width="16" height="16">{RING}</svg></span>
                  <span className={styles.msg}>{row.text}</span>
                  {row.i === 0 ? <span className={styles.more} aria-hidden="true">{`+${deck.length - 1}`}</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <button className={styles.toggle} type="button" aria-expanded={open} aria-controls="cg-list" onClick={toggle}>
        <span className={styles.caret} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="14" height="14"><g fill="currentColor"><path d="m208 96l-80 80l-80-80Z" opacity=".2" /><path d="M215.39 92.94A8 8 0 0 0 208 88H48a8 8 0 0 0-5.66 13.66l80 80a8 8 0 0 0 11.32 0l80-80a8 8 0 0 0 1.73-8.72M128 164.69L67.31 104h121.38Z" /></g></svg>
        </span>
        {toggleLabel}
      </button>
    </div>
  );
}
