import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./UndoToast.module.scss";

export type UndoToastProps = {
  files?: string[];
  listLabel?: string;
  deleteLabel?: string;
  message?: string;
  undoLabel?: string;
  grace?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function UndoToast({
  files = ["february-invoice.pdf", "meeting-notes.md", "logo-final.png"],
  listLabel = "File list",
  deleteLabel = "Delete this row",
  message = "Item deleted",
  undoLabel = "Undo",
  grace = 4000,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#4cd4a6",
}: UndoToastProps) {
  const [demo, setDemo] = useState(true);
  const [rows, setRows] = useState<string[]>(files);
  const [gone, setGone] = useState<string>("");
  const timer = useRef<number[]>([0]);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => () => { clearTimeout((timer.current ?? [0])[0]); }, []);

  function drop(name: string) {
    setDemo(false);
    setGone(name);
    const t = timer.current ?? [0];
    clearTimeout(t[0]);
    // 시간이 다 가면 그때 진짜로 목록에서 뺀다 — 그 전까지는 접혀만 있다
    t[0] = setTimeout(() => { setRows((v) => v.filter((n) => n !== name)); setGone(""); }, grace) as unknown as number;
  }
  function undo() {
    clearTimeout((timer.current ?? [0])[0]); // 예약된 삭제를 취소하면 줄이 그대로 살아 있다
    setGone("");
  }

  return (
    <div className={`${styles.un} ${demo ? styles.isDemo : ""}`} style={vars}>
      <ul className={styles.list} aria-label={listLabel}>
        {rows.map((name, i) => (
          <li key={name} className={`${styles.row} ${gone === name ? styles.isGone : ""}`} data-nth={i}>
            <span className={styles.in}>
              <span className={styles.name}>{name}</span>
              <button className={styles.del} type="button" aria-label={deleteLabel} onClick={() => drop(name)}>
                <svg viewBox="0 0 256 256" width="14" height="14"><g fill="currentColor"><path d="M200 56v152a8 8 0 0 1-8 8H64a8 8 0 0 1-8-8V56Z" opacity=".2" /><path d="M216 48h-40v-8a24 24 0 0 0-24-24h-48a24 24 0 0 0-24 24v8H40a8 8 0 0 0 0 16h8v144a16 16 0 0 0 16 16h128a16 16 0 0 0 16-16V64h8a8 8 0 0 0 0-16M96 40a8 8 0 0 1 8-8h48a8 8 0 0 1 8 8v8H96Zm96 168H64V64h128Zm-80-104v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0m48 0v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0" /></g></svg>
              </button>
            </span>
          </li>
        ))}
      </ul>
      <div className={styles.slot}>
        <div className={`${styles.toast} ${gone ? styles.isOn : ""}`}>
          <span className={styles.msg} role="status" aria-live="polite">{gone ? message : ""}</span>
          <button className={styles.undo} type="button" onClick={undo}>
            <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true"><g fill="currentColor"><path d="M216 128a88 88 0 1 1-88-88a88 88 0 0 1 88 88" opacity=".2" /><path d="M224 128a96 96 0 0 1-94.71 96H128a95.38 95.38 0 0 1-65.9-26.2a8 8 0 0 1 11-11.63a80 80 0 1 0-1.67-114.78a3 3 0 0 1-.26.25L44.59 96H72a8 8 0 0 1 0 16H24a8 8 0 0 1-8-8V56a8 8 0 0 1 16 0v29.8L60.25 60A96 96 0 0 1 224 128" /></g></svg>
            {undoLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
