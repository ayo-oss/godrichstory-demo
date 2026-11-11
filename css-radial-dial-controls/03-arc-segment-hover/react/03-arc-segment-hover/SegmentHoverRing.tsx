// SegmentHoverRing — vanilla 판(run/374/demo/03-arc-segment-hover/index.html) 의 React 포트.
// 계산 겹: 포인터 좌표를 링 중심 기준 atan2 각도로 바꾼 뒤(12시를 0도로), 360/N 폭 구간 중 어디에 속하는지 판정한다.
import { useEffect, useRef, useState } from "react";
import styles from "./SegmentHoverRing.module.scss";

type Box<T> = { current: T };

type Segment = { label: string; pct: number };

const SEGMENTS: Segment[] = [
  { label: "CPU", pct: 42 },
  { label: "GPU", pct: 68 },
  { label: "RAM", pct: 55 },
  { label: "네트워크", pct: 27 },
  { label: "디스크", pct: 81 },
  { label: "전원", pct: 34 },
];
const N = SEGMENTS.length;
const GAP_DEG = 3;
const SEG_DEG = 360 / N - GAP_DEG;
const LOOP_MS = 2000;

export default function SegmentHoverRing() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const ringRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const rafRef = useRef(0) as unknown as Box<number>;
  const [active, setActiveState] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = rootRef.current;
    const ring = ringRef.current;
    if (!root || !ring) return;

    const segEls: HTMLDivElement[] = Array.prototype.slice.call(ring.querySelectorAll("[data-seg]"));
    segEls.forEach(function (el, i) {
      el.style.setProperty("--start", String((i * 360) / N));
      el.style.setProperty("--span", String(SEG_DEG));
    });

    let isDemo = true;

    function human() { if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; } }

    function angleAt(clientX: number, clientY: number) {
      const r = ring!.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const deg = (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI + 90;
      return ((deg % 360) + 360) % 360;
    }
    function segmentIndexAt(deg: number) {
      return Math.floor(deg / (360 / N)) % N;
    }

    function setActive(idx: number) {
      segEls.forEach(function (el, i) { el.classList.toggle(styles.segActive, i === idx); });
      setActiveState(idx);
    }

    function onMove(e: PointerEvent) { human(); setActive(segmentIndexAt(angleAt(e.clientX, e.clientY))); }
    function onLeave() { human(); }
    ring.addEventListener("pointermove", onMove);
    ring.addEventListener("pointerleave", onLeave);

    function loop(ts: number) {
      if (isDemo) {
        if (!reduce) {
          const phase = (ts % LOOP_MS) / LOOP_MS;
          setActive(segmentIndexAt(phase * 360));
        } else {
          setActive(0);
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    setActive(0);
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      ring.removeEventListener("pointermove", onMove);
      ring.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const activeData = SEGMENTS[active];

  return (
    <main className={styles.stage}>
      <div className={styles.sh + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.ring} ref={ringRef}>
          {SEGMENTS.map(function (s, i) {
            return <div key={s.label} data-seg className={styles.seg} aria-hidden="true" />;
          })}
          <div className={styles.center}>
            <b className={styles.pct}>{activeData.pct}%</b>
            <span className={styles.label}>{activeData.label}</span>
          </div>
        </div>
      </div>
    </main>
  );
}
