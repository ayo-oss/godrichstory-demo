// ProximityOrnament — vanilla 판(08-divl-ornament-proximity-open) 의 React 포트.
// 포인터와 장식 사이 거리를 NEAR_RANGE 로 정규화한 값이 열림이 되고, 열림은 매 프레임 일부(OPEN_RATE)씩 따라간다.
import { useEffect, useRef, useState } from "react";
import styles from "./ProximityOrnament.module.scss";

type Box<T> = { current: T };
type Point = { x: number; y: number };

const NEAR_RANGE = 120;
const OPEN_RATE = 9;
const OPEN_MAX_PX = 72;
const CYCLE_MS = 2000;

const smooth = (t: number): number => t * t * (3 - 2 * t);

export default function ProximityOrnament() {
  const fieldRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const ornRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const leftRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const rightRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const ghostRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const openRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;
  const pinnedRef = useRef(false) as Box<boolean>;
  const stopRef = useRef<() => void>(() => undefined) as Box<() => void>;
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const field = fieldRef.current;
    const orn = ornRef.current;
    const left = leftRef.current;
    const right = rightRef.current;
    const ghost = ghostRef.current;
    const openEl = openRef.current;
    if (!field || !orn || !left || !right || !ghost || !openEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let demo = !reduce;
    let open = 0;
    let pointer: Point | null = null;
    let lastTs: number | null = null;
    let t0: number | null = null;
    let raf = 0;

    const paint = (): void => {
      const half = (OPEN_MAX_PX * open) / 2;
      left.style.transform = "translateX(" + (-half).toFixed(2) + "px)";
      right.style.transform = "translateX(" + half.toFixed(2) + "px)";
      orn.style.transform = "rotate(" + (open * 135).toFixed(1) + "deg) scale(" + (0.5 + open * 0.9).toFixed(3) + ")";
      openEl.textContent = String(Math.round(open * 100));
    };
    const goalOf = (): number => {
      if (pinnedRef.current) return 1;
      if (!pointer) return 0;
      const box = orn.getBoundingClientRect();
      const dx = pointer.x - (box.left + box.width / 2);
      const dy = pointer.y - (box.top + box.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      return smooth(Math.min(1, Math.max(0, 1 - dist / NEAR_RANGE)));
    };
    const stopDemo = (): void => {
      demo = false;
      ghost.style.opacity = "0";
    };
    stopRef.current = () => {
      stopDemo();
      if (reduce) {
        open = goalOf();
        paint();
      }
    };
    const onMove = (e: { clientX: number; clientY: number }): void => {
      stopDemo();
      pointer = { x: e.clientX, y: e.clientY };
      if (reduce) {
        open = goalOf();
        paint();
      }
    };
    const onLeave = (): void => {
      pointer = null;
      if (reduce) {
        open = goalOf();
        paint();
      }
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", onLeave);

    const tick = (ts: number): void => {
      if (t0 === null) t0 = ts;
      const dt = lastTs === null ? 0.016 : Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      if (demo) {
        const fb = field.getBoundingClientRect();
        const ob = orn.getBoundingClientRect();
        const phase = (((ts - t0) % CYCLE_MS) / CYCLE_MS) * Math.PI * 2;
        const gx = ob.left + ob.width / 2 + 170 * Math.cos(phase);
        const gy = ob.top + ob.height / 2 + 22 * Math.sin(phase);
        pointer = { x: gx, y: gy };
        ghost.style.transform = "translate(" + (gx - fb.left - 6).toFixed(1) + "px," + (gy - fb.top - 6).toFixed(1) + "px)";
      }
      const k = 1 - Math.exp(-dt * OPEN_RATE);
      open += (goalOf() - open) * k;
      paint();
      raf = requestAnimationFrame(tick);
    };

    paint();
    if (!reduce) {
      ghost.style.opacity = "1";
      raf = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const toggle = (): void => {
    pinnedRef.current = !pinnedRef.current;
    setPinned(pinnedRef.current);
    stopRef.current();
  };

  return (
    <div className={styles.dv}>
      <div className={styles.field} ref={fieldRef}>
        <div className={styles.row} role="separator">
          <span className={styles.line} ref={leftRef} />
          <span className={styles.orn} ref={ornRef} />
          <span className={styles.line} ref={rightRef} />
        </div>
        <span className={styles.ghost} ref={ghostRef} />
      </div>
      <div className={styles.bar}>
        <button className={styles.btn} type="button" aria-pressed={pinned} onClick={toggle}>장식 열기</button>
        <p className={styles.meta}>
          <span className={styles.tag}>OPEN</span> <b ref={openRef}>0</b>%
        </p>
      </div>
    </div>
  );
}
