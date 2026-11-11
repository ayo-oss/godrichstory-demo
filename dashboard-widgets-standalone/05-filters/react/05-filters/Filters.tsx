import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./Filters.module.scss";

export type FiltersProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const CHIPS = ["진행중", "완료", "보류", "긴급"];

export default function Filters({ duration = 220, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#2f6df6" }: FiltersProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function toggle(chip: string) {
    setSelected((s) => {
      const next = new Set(s);
      next.has(chip) ? next.delete(chip) : next.add(chip);
      return next;
    });
  }

  return (
    <div className={styles.fl} style={vars}>
      <div className={styles.row}>
        {CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            className={styles.chip}
            aria-pressed={selected.has(chip)}
            onClick={() => toggle(chip)}
          >
            {chip}
          </button>
        ))}
        {selected.size > 0 && (
          <button type="button" className={styles.clear} onClick={() => setSelected(new Set())}>
            전체 해제 ✕
          </button>
        )}
      </div>
      <p className={styles.count}><span className={styles.countNum}>{selected.size}</span>개 선택됨</p>
    </div>
  );
}
