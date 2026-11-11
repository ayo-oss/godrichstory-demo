import { useRef, useState, useCallback } from "react";
import type { CSSProperties } from "react";
import styles from "./WheelScrollSnapNumberPicker.module.scss";

export type WheelScrollSnapNumberPickerProps = {
  count?: number;
  itemHeight?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--c"?: string; "--h"?: string };

export default function WheelScrollSnapNumberPicker({
  count = 12,
  itemHeight = 40,
  duration = 300,
  easing = "ease-out",
  color = "#6ec8ff",
}: WheelScrollSnapNumberPickerProps) {
  const [centered, setCentered] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--c": color, "--h": `${itemHeight}px` };

  const onScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const idx = Math.max(0, Math.min(count - 1, Math.round(el.scrollTop / itemHeight)));
    setCentered(idx);
  }, [count, itemHeight]);

  function onKeyDown(e: any) {
    const el = trackRef.current;
    if (!el) return;
    if (e.key === "ArrowDown") { e.preventDefault(); el.scrollBy({ top: itemHeight, behavior: "smooth" }); }
    else if (e.key === "ArrowUp") { e.preventDefault(); el.scrollBy({ top: -itemHeight, behavior: "smooth" }); }
  }

  return (
    <div className={styles.wheel} style={vars}>
      <div className={styles.mask}>
        <div className={styles.track} ref={trackRef} tabIndex={0} role="listbox" aria-label="Select hour"
          onScroll={onScroll} onKeyDown={onKeyDown}>
          <div className={styles.pad} aria-hidden="true" />
          {Array.from({ length: count }, (_, i) => i + 1).map((n, i) => (
            <div key={n} className={styles.item} data-center={centered === i} role="option">{n}</div>
          ))}
          <div className={styles.pad} aria-hidden="true" />
        </div>
        <div className={styles.hl} aria-hidden="true" />
      </div>
      <div className={styles.label}>hr</div>
    </div>
  );
}
