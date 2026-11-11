import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SegmentedControlIconViewToggle.module.scss";

export type SegmentedControlIconViewToggleProps = {
  legend?: string;
  duration?: number;
  easing?: string;
  pillColor?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--pill"?: string };

export default function SegmentedControlIconViewToggle({
  legend = "View mode",
  duration = 180,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  pillColor = "#fff7e6",
}: SegmentedControlIconViewToggleProps) {
  const [isGrid, setIsGrid] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--pill": pillColor };

  return (
    <fieldset className={styles.iv} style={vars}>
      <legend className={styles.srOnly}>{legend}</legend>
      <div className={styles.track}>
        <span className={styles.pill} style={{ transform: `translateX(${isGrid ? 100 : 0}%)` }} aria-hidden="true" />
        <label className={styles.tab} data-active={!isGrid} aria-label="List view">
          <input type="radio" name="iv" className={styles.srInput} checked={!isGrid} onChange={() => setIsGrid(false)} />
          <svg viewBox="0 0 20 20" width={18} height={18} aria-hidden="true">
            <rect x={3} y={4} width={14} height={2.4} rx={1.2} fill="currentColor" />
            <rect x={3} y={8.8} width={14} height={2.4} rx={1.2} fill="currentColor" />
            <rect x={3} y={13.6} width={14} height={2.4} rx={1.2} fill="currentColor" />
          </svg>
        </label>
        <label className={styles.tab} data-active={isGrid} aria-label="Grid view">
          <input type="radio" name="iv" className={styles.srInput} checked={isGrid} onChange={() => setIsGrid(true)} />
          <svg viewBox="0 0 20 20" width={18} height={18} aria-hidden="true">
            <rect x={3} y={3} width={6} height={6} rx={1.4} fill="currentColor" />
            <rect x={11} y={3} width={6} height={6} rx={1.4} fill="currentColor" />
            <rect x={3} y={11} width={6} height={6} rx={1.4} fill="currentColor" />
            <rect x={11} y={11} width={6} height={6} rx={1.4} fill="currentColor" />
          </svg>
        </label>
      </div>
    </fieldset>
  );
}
