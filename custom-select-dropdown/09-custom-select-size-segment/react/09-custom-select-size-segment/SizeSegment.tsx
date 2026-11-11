import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SizeSegment.module.scss";

export type SizeOption = { label: string; soldOut?: boolean };

export type SizeSegmentProps = {
  label?: string;
  note?: string;
  sizes?: SizeOption[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };
type ChangeEvt = { target: { value: string } };
type ClickEvt = { stopPropagation: () => void };

const CELL = 56;

const DEFAULT_SIZES: SizeOption[] = [
  { label: "S" },
  { label: "M" },
  { label: "L" },
  { label: "XL", soldOut: true },
];

export default function SizeSegment({
  label = "Size",
  note = "XL sold out",
  sizes = DEFAULT_SIZES,
  duration = 180,
  easing = "cubic-bezier(.34,1.56,.64,1)",
  color = "#2f6df6",
}: SizeSegmentProps) {
  const [picked, setPicked] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function pick(i: number) {
    if (i < 0 || i >= sizes.length) return;
    if (sizes[i].soldOut) return;
    setPicked(i);
  }

  return (
    <div className={styles.sg} style={vars}>
      <span className={styles.label} id="sg-label">{label}</span>
      <div
        ref={trackRef}
        id="sg-track"
        className={styles.track}
        role="listbox"
        aria-labelledby="sg-label"
        tabIndex={0}
        aria-activedescendant={`sg-o${picked}`}
        onKeyDown={(e: KeyEvt) => {
          if (e.key === "ArrowRight") { pick(picked + 1); e.preventDefault(); }
          else if (e.key === "ArrowLeft") { pick(picked - 1); e.preventDefault(); }
          else if (e.key === "Home") { pick(0); e.preventDefault(); }
          else if (e.key === "End") { pick(sizes.length - 1); e.preventDefault(); }
        }}
      >
        <span
          className={styles.pill}
          aria-hidden="true"
          style={{ transform: `translateX(${picked * CELL}px)` }}
        />
        {sizes.map((s, i) => (
          <span
            key={s.label}
            id={`sg-o${i}`}
            className={`${styles.cell} ${s.soldOut ? styles.isOut : ""}`}
            role="option"
            aria-selected={i === picked}
            aria-disabled={s.soldOut ? true : undefined}
            onClick={() => pick(i)}
          >
            {s.label}
          </span>
        ))}
      </div>
      <p className={styles.note}>{note}</p>
    </div>
  );
}
