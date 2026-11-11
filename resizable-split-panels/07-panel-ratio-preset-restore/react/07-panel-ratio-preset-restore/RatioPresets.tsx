import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./RatioPresets.module.scss";

export type RatioPresetsProps = {
  /** localStorage 키 */
  storageKey?: string;
  presets?: { label: string; value: number }[];
  duration?: number;
  easing?: string;
  color?: string;
};

type PEvt = { clientX: number; pointerId: number; preventDefault(): void; currentTarget: { setPointerCapture(id: number): void } };
type KeyEvt = { key: string; preventDefault(): void };
type Vars = CSSProperties & { "--split"?: string; "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function RatioPresets({
  storageKey = "godrich-split-250",
  presets = [{ label: "1:2", value: 34 }, { label: "1:1", value: 50 }, { label: "2:1", value: 66 }],
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: RatioPresetsProps) {
  const [split, setSplit] = useState(50);
  const [glide, setGlide] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // 열 때 한 번 복원한다 — 값이 깨졌으면 기본값 그대로
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const saved = raw ? JSON.parse(raw) : null;
      if (saved && typeof saved.split === "number") setSplit(saved.split);
    } catch (err) { /* 사생활 보호 모드 */ }
  }, [storageKey]);

  function save(v: number): void {
    try { localStorage.setItem(storageKey, JSON.stringify({ split: Math.round(v) })); } catch (err) { /* 저장 불가 */ }
  }
  function set(pct: number): void {
    const v = Math.max(20, Math.min(pct, 80));
    setSplit(v);
    save(v);
  }

  function onDown(e: PEvt): void {
    setGlide(false);
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function onMove(e: PEvt): void {
    const box = boxRef.current;
    if (!dragging.current || !box) return;
    set(((e.clientX - box.getBoundingClientRect().left) / box.clientWidth) * 100);
  }
  function onUp(): void { dragging.current = false; }
  function onKey(e: KeyEvt): void {
    const d = e.key === "ArrowLeft" ? -4 : e.key === "ArrowRight" ? 4 : 0;
    if (!d) return;
    setGlide(false);
    set(split + d);
    e.preventDefault();
  }

  const vars: Vars = {
    "--split": `${split.toFixed(1)}%`,
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };

  return (
    <div className={glide ? `${styles.rp} ${styles.isGlide}` : styles.rp} style={vars}>
      <div className={styles.box} ref={boxRef}>
        <section className={`${styles.pane} ${styles.paneL}`} aria-label="Left pane">
          <span className={styles.ln} />
          <span className={`${styles.ln} ${styles.lnShort}`} />
        </section>
        <div
          className={styles.bar}
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-label="Split ratio"
          aria-valuemin={20}
          aria-valuemax={80}
          aria-valuenow={Math.round(split)}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onKeyDown={onKey}
        >
          <i className={styles.grip} aria-hidden="true" />
        </div>
        <section className={`${styles.pane} ${styles.paneR}`} aria-label="Right pane">
          <span className={styles.ln} />
          <span className={`${styles.ln} ${styles.lnShort}`} />
        </section>
      </div>
      <div className={styles.row}>
        <span className={styles.save} aria-hidden="true">
          <svg viewBox="0 0 256 256"><g fill="currentColor"><path d="M216 83.31V208a8 8 0 0 1-8 8h-32v-64a8 8 0 0 0-8-8H88a8 8 0 0 0-8 8v64H48a8 8 0 0 1-8-8V48a8 8 0 0 1 8-8h124.69a8 8 0 0 1 5.65 2.34l35.32 35.32a8 8 0 0 1 2.34 5.65" opacity=".2" /><path d="M219.31 72L184 36.69A15.86 15.86 0 0 0 172.69 32H48a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V83.31A15.86 15.86 0 0 0 219.31 72M168 208H88v-56h80Zm40 0h-24v-56a16 16 0 0 0-16-16H88a16 16 0 0 0-16 16v56H48V48h124.69L208 83.31ZM160 72a8 8 0 0 1-8 8H96a8 8 0 0 1 0-16h56a8 8 0 0 1 8 8" /></g></svg>
        </span>
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            className={Math.round(split) === p.value ? `${styles.btn} ${styles.isOn}` : styles.btn}
            aria-pressed={Math.round(split) === p.value}
            onClick={(): void => { setGlide(true); set(p.value); }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className={styles.cap}>The ratio is stored in the browser for next time</p>
    </div>
  );
}
