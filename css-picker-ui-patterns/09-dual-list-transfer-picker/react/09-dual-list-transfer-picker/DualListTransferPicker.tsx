import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./DualListTransferPicker.module.scss";

export type DualListTransferPickerProps = {
  items?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--c"?: string };

export default function DualListTransferPicker({
  items = ["CSS", "JS", "HTML", "SCSS", "React"],
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: DualListTransferPickerProps) {
  const [avail, setAvail] = useState(items);
  const [chosen, setChosen] = useState<string[]>([]);
  const [selA, setSelA] = useState<Record<string, boolean>>({});
  const [selC, setSelC] = useState<Record<string, boolean>>({});
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--c": color };

  function toggle(name: string, sel: Record<string, boolean>, setSel: (v: Record<string, boolean>) => void) {
    setSel({ ...sel, [name]: !sel[name] });
  }

  function move(from: string[], setFrom: (v: string[]) => void, to: string[], setTo: (v: string[]) => void,
    sel: Record<string, boolean>, setSel: (v: Record<string, boolean>) => void) {
    const moved = from.filter((n) => sel[n]);
    setFrom(from.filter((n) => !sel[n]));
    setTo([...to, ...moved]);
    setSel({});
  }

  function list(names: string[], sel: Record<string, boolean>, setSel: (v: Record<string, boolean>) => void, label: string) {
    return (
      <ul className={styles.list} role="listbox" aria-label={label} aria-multiselectable="true">
        {names.map((n, i) => (
          <li key={n} role="option" aria-selected={!!sel[n]} data-sel={!!sel[n]} className={styles.item}
            tabIndex={i === 0 ? 0 : -1}
            onClick={() => toggle(n, sel, setSel)}
            onKeyDown={(e: any) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(n, sel, setSel); } }}>
            {n}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className={styles.tf} style={vars}>
      <div className={styles.col}>
        <div className={styles.h}>Available</div>
        {list(avail, selA, (v) => setSelA(v), "Available items")}
      </div>
      <div className={styles.mid}>
        <button type="button" className={styles.btn} aria-label="Move to selected"
          onClick={() => move(avail, setAvail, chosen, setChosen, selA, setSelA)}>→</button>
        <button type="button" className={styles.btn} aria-label="Move to available"
          onClick={() => move(chosen, setChosen, avail, setAvail, selC, setSelC)}>←</button>
      </div>
      <div className={styles.col}>
        <div className={styles.h}>Selected</div>
        {list(chosen, selC, (v) => setSelC(v), "Selected items")}
      </div>
    </div>
  );
}
