// SnapSelectDial — vanilla 판(run/374/demo/05-arc-snap-select/index.html) 의 React 포트.
// 계산 겹: nearestNotch 가 놓은 각도와 가장 가까운 눈금(N 등분) 사이의 최단 각거리를 구해
// SNAP_THRESHOLD_DEG 안이면 그 눈금으로 스냅하고, easeOutBack 정착 곡선으로 튕기며 멈춘다.
import { useEffect, useRef, useState } from "react";
import styles from "./SnapSelectDial.module.scss";

type Box<T> = { current: T };

const NOTCHES = [0, 15, 30, 45, 60, 75, 90, 105];
const N = NOTCHES.length;
const NOTCH_DEG = 360 / N;
const SNAP_THRESHOLD_DEG = 20;
const LOOP_MS = 2000;

export default function SnapSelectDial() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const ringRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const handleRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const rafRef = useRef(0) as unknown as Box<number>;
  const [value, setValue] = useState(NOTCHES[1] + "분");

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = rootRef.current;
    const ring = ringRef.current;
    const handle = handleRef.current;
    if (!root || !ring || !handle) return;

    let isDemo = true;
    let angle = 0;
    let dragging = false;
    let settling = false;
    let settleFrom = 0;
    let settleTo = 0;
    let settleStart = 0;
    const SETTLE_MS = reduce ? 0 : 260;

    function human() { if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; } }

    function angleAt(clientX: number, clientY: number) {
      const r = ring!.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI + 90;
    }
    function norm360(d: number) { return ((d % 360) + 360) % 360; }

    function nearestNotch(deg: number) {
      const idx = Math.round(deg / NOTCH_DEG) % N;
      const notchDeg = idx * NOTCH_DEG;
      const dist = Math.abs(((deg - notchDeg + 540) % 360) - 180);
      return { idx, notchDeg, dist };
    }

    function apply(a: number) { ring!.style.setProperty("--angle", String(a)); }

    function startSettle(target: number) {
      settling = true;
      settleFrom = angle;
      settleTo = target;
      settleStart = performance.now();
    }

    function easeOvershoot(t: number) {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      const t1 = t - 1;
      return 1 + c3 * t1 * t1 * t1 + c1 * t1 * t1;
    }

    function readout() {
      const idx = Math.round(norm360(angle) / NOTCH_DEG) % N;
      return NOTCHES[idx] + "분";
    }

    function tickSettle(nowTs: number) {
      if (!settling) return;
      if (SETTLE_MS === 0) { angle = settleTo; settling = false; setValue(readout()); return; }
      const t = Math.min(1, (nowTs - settleStart) / SETTLE_MS);
      angle = settleFrom + (settleTo - settleFrom) * easeOvershoot(t);
      if (t >= 1) { settling = false; angle = settleTo; }
    }

    function onDown(e: PointerEvent) {
      human();
      dragging = true; settling = false;
      handle!.setPointerCapture(e.pointerId);
      angle = angleAt(e.clientX, e.clientY);
      apply(angle);
    }
    function onMove(e: PointerEvent) {
      if (!dragging) return;
      angle = angleAt(e.clientX, e.clientY);
      apply(angle);
      setValue(readout());
    }
    function onUp() {
      dragging = false;
      const n = nearestNotch(norm360(angle));
      if (n.dist <= SNAP_THRESHOLD_DEG) { startSettle(angle + (n.notchDeg - norm360(angle))); }
      setValue(NOTCHES[n.idx] + "분");
    }
    handle.addEventListener("pointerdown", onDown);
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);

    function loop(ts: number) {
      if (isDemo) {
        if (!reduce) {
          const phase = (ts % LOOP_MS) / LOOP_MS;
          if (phase < 0.45) {
            angle = (phase / 0.45) * 250;
            apply(angle);
            setValue(readout());
          } else if (phase < 0.5) {
            if (!settling) {
              const n = nearestNotch(norm360(angle));
              startSettle(angle + (n.notchDeg - norm360(angle)));
            }
          } else {
            tickSettle(ts);
            apply(angle);
            setValue(readout());
          }
        } else {
          apply(0);
        }
      } else {
        tickSettle(ts);
        apply(angle);
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    apply(0);
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      handle.removeEventListener("pointerdown", onDown);
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.ss + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.ring} ref={ringRef}>
          <div className={styles.ticks}>
            {NOTCHES.map(function (n, i) {
              return <span key={n} className={styles.tick} style={{ ["--i" as string]: i }} aria-hidden="true" />;
            })}
          </div>
          <button className={styles.handle} ref={handleRef} type="button" aria-label="타이머 시간 다이얼" />
        </div>
        <p className={styles.value}>{value}</p>
      </div>
    </main>
  );
}
