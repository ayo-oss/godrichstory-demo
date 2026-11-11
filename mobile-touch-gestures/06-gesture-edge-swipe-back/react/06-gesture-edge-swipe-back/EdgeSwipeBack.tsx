import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./EdgeSwipeBack.module.scss";

export type EdgeSwipeBackProps = {
  currentLabel?: string;
  backLabel?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type PEvt = { clientX: number; clientY: number; pointerId: number; preventDefault(): void; currentTarget: { setPointerCapture(id: number): void } };
type Box<T> = { current: T };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const IconBack = () => (
  <svg viewBox="0 0 256 256" width="14" height="14"><g fill="currentColor"><path d="M112 56v144l-72-72Z" opacity=".2"/><path d="M216 120h-96V56a8 8 0 0 0-13.66-5.66l-72 72a8 8 0 0 0 0 11.32l72 72A8 8 0 0 0 120 200v-64h96a8 8 0 0 0 0-16m-112 60.69L51.31 128L104 75.31Z"/></g></svg>
);

export default function EdgeSwipeBack({
  currentLabel = "Detail page",
  backLabel = "List",
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: EdgeSwipeBackProps) {
  const [p, setP] = useState(0);         // 0..1 진행
  const [atDetail, setAtDetail] = useState(true);
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ on: false, x0: 0 }) as Box<{ on: boolean; x0: number }>;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const shown = atDetail ? p : 1 - p;    // 화면에 보이는 당김 정도

  function onDown(e: PEvt) {
    const r = (frameRef.current as HTMLDivElement).getBoundingClientRect();
    if (e.clientX - r.left > 28) return;
    drag.current = { on: true, x0: e.clientX };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function onMove(e: PEvt) {
    if (!drag.current.on) return;
    const r = (frameRef.current as HTMLDivElement).getBoundingClientRect();
    setP(Math.max(0, Math.min(1, (e.clientX - drag.current.x0) / (r.width * 0.55))));
  }
  function onUp() {
    if (!drag.current.on) return;
    drag.current.on = false;
    if (p > 0.72) setAtDetail(false);
    setP(0);
  }

  function goBack() {
    setAtDetail((d) => !d);
    setP(0);
  }

  return (
    <div className={styles.eb} style={vars}>
      <div
        ref={frameRef}
        className={styles.frame}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div
          className={styles.prev}
          style={{ transform: `translateX(${-46 + shown * 46}%)`, opacity: 0.45 + shown * 0.55 }}
          aria-hidden="true"
        >
          <span className={styles.ptitle}>{backLabel}</span>
          <i className={styles.ln} /><i className={`${styles.ln} ${styles.lnS}`} /><i className={`${styles.ln} ${styles.lnM}`} /><i className={styles.ln} />
        </div>
        <div className={styles.cur} style={{ transform: `translateX(${shown * 38}%)` }}>
          <div className={styles.bar}>
            <button type="button" className={styles.back} aria-label="Go back" onClick={goBack}>
              <IconBack />
            </button>
            <span className={styles.ctitle}>{atDetail ? currentLabel : backLabel}</span>
          </div>
          <div className={styles.body}>
            <span className={styles.hero} />
            <i className={`${styles.ln} ${styles.lnDark}`} /><i className={`${styles.ln} ${styles.lnDark} ${styles.lnS}`} />
          </div>
        </div>
        <span className={styles.edge} aria-hidden="true" style={{ opacity: 1 - shown }} />
      </div>
      <p className={styles.hint}>Drag in from the left edge</p>
    </div>
  );
}
