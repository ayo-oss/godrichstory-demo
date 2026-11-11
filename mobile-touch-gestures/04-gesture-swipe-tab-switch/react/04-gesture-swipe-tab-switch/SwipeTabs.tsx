import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SwipeTabs.module.scss";

export type SwipeTabsProps = {
  tabs?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type PEvt = { clientX: number; clientY: number; pointerId: number; preventDefault(): void; currentTarget: { setPointerCapture(id: number): void } };
type KeyEvt = { key: string; preventDefault(): void };
type Box<T> = { current: T };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SwipeTabs({
  tabs = ["Weekly", "Monthly", "Yearly"],
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: SwipeTabsProps) {
  const [at, setAt] = useState(0);
  const [dx, setDx] = useState(0);
  const viewRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ on: false, x0: 0, lastX: 0, lastT: 0, v: 0 }) as Box<{ on: boolean; x0: number; lastX: number; lastT: number; v: number }>;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function go(i: number) {
    setAt(Math.max(0, Math.min(i, tabs.length - 1)));
    setDx(0);
  }

  function onDown(e: PEvt) {
    drag.current = { on: true, x0: e.clientX, lastX: e.clientX, lastT: Date.now(), v: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onMove(e: PEvt) {
    if (!drag.current.on) return;
    const now = Date.now();
    if (now - drag.current.lastT > 0) {
      drag.current.v = (e.clientX - drag.current.lastX) / Math.max(1, now - drag.current.lastT);
      drag.current.lastX = e.clientX;
      drag.current.lastT = now;
    }
    let d = e.clientX - drag.current.x0;
    if ((at === 0 && d > 0) || (at === tabs.length - 1 && d < 0)) d *= 0.3;
    setDx(d);
  }
  function onUp() {
    if (!drag.current.on) return;
    drag.current.on = false;
    const d = drag.current.lastX - drag.current.x0;
    if (d < -44 || drag.current.v < -0.45) go(at + 1);
    else if (d > 44 || drag.current.v > 0.45) go(at - 1);
    else setDx(0);
  }

  function onKey(e: KeyEvt) {
    const k = e.key === "ArrowRight" ? at + 1
      : e.key === "ArrowLeft" ? at - 1
      : e.key === "Home" ? 0
      : e.key === "End" ? tabs.length - 1
      : at;
    if (k !== at) { go(k); e.preventDefault(); }
  }

  useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    function wheel(e: WheelEvent) { e.preventDefault(); }
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);

  return (
    <div className={styles.wt} style={vars}>
      <div className={styles.tabs} role="tablist" aria-label="Stats period" onKeyDown={onKey}>
        <span className={styles.pill} style={{ transform: `translateX(${at * 72}px)` }} aria-hidden="true" />
        {tabs.map((t, i) => (
          <button
            key={t}
            type="button"
            role="tab"
            className={i === at ? styles.tabOn : styles.tab}
            aria-selected={i === at}
            aria-controls={`wt-p${i}`}
            tabIndex={i === at ? 0 : -1}
            onClick={(): void => go(i)}
          >
            {t}
          </button>
        ))}
      </div>
      <div
        ref={viewRef}
        className={styles.view}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div
          className={styles.track}
          style={{ transform: `translateX(calc(${-at * 100}% + ${dx}px))` }}
        >
          {tabs.map((t, i) => (
            <section key={t} role="tabpanel" id={`wt-p${i}`} className={styles.panel}>
              <strong className={styles.num}>{[32000, 128000, 1480000][i].toLocaleString("en-US")}</strong>
              <span className={styles.cap}>{`Visits ${t.toLowerCase()}`}</span>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
