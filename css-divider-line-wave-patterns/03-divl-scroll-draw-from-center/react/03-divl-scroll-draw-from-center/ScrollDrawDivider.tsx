// ScrollDrawDivider — vanilla 판(03-divl-scroll-draw-from-center) 의 React 포트.
// scroll 이벤트마다 선의 위치를 getBoundingClientRect 로 재서 진행도를 구하고 clip-path 를 양쪽에서 연다.
import { useEffect, useRef } from "react";
import styles from "./ScrollDrawDivider.module.scss";

type Box<T> = { current: T };

const DRAW_RANGE_PX = 80;
const DRAW_MIN_PCT = 0;
const CYCLE_MS = 2000;

export default function ScrollDrawDivider() {
  const scrollerRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const lineRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const pctRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;

  useEffect(() => {
    const scroller = scrollerRef.current;
    const line = lineRef.current;
    const pctEl = pctRef.current;
    if (!scroller || !line || !pctEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let demo = !reduce;
    let t0: number | null = null;
    let raf = 0;

    const update = (): void => {
      const box = scroller.getBoundingClientRect();
      const lineBox = line.getBoundingClientRect();
      const risen = box.bottom - lineBox.top;
      const p = Math.min(1, Math.max(0, risen / DRAW_RANGE_PX));
      const pct = DRAW_MIN_PCT + (100 - DRAW_MIN_PCT) * p;
      const edge = (100 - pct) / 2;
      line.style.clipPath = "inset(0 " + edge.toFixed(2) + "% 0 " + edge.toFixed(2) + "% round 6px)";
      pctEl.textContent = String(Math.round(pct));
    };
    const stopDemo = (): void => { demo = false; };
    scroller.addEventListener("scroll", update);
    scroller.addEventListener("wheel", stopDemo, { passive: true });
    scroller.addEventListener("pointerdown", stopDemo);
    scroller.addEventListener("keydown", stopDemo);

    const tick = (ts: number): void => {
      if (t0 === null) t0 = ts;
      if (demo) {
        const max = scroller.scrollHeight - scroller.clientHeight;
        const phase = ((ts - t0) % CYCLE_MS) / CYCLE_MS;
        const tri = phase < 0.5 ? phase * 2 : 2 - phase * 2;
        scroller.scrollTop = max * tri;
      }
      raf = requestAnimationFrame(tick);
    };

    if (reduce) {
      scroller.scrollTop = (scroller.scrollHeight - scroller.clientHeight) / 2;
      update();
    } else {
      update();
      raf = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(raf);
      scroller.removeEventListener("scroll", update);
      scroller.removeEventListener("wheel", stopDemo);
      scroller.removeEventListener("pointerdown", stopDemo);
      scroller.removeEventListener("keydown", stopDemo);
    };
  }, []);

  return (
    <div className={styles.dv}>
      <div className={styles.scroller} ref={scrollerRef} tabIndex={0} aria-label="스크롤 영역">
        <div className={styles.block}>위 단락</div>
        <div className={styles.blockTall}>위 단락</div>
        <div className={styles.line} ref={lineRef} role="separator" />
        <div className={styles.block}>아래 단락</div>
        <div className={styles.blockTall}>아래 단락</div>
      </div>
      <p className={styles.meta}>
        <span className={styles.tag}>DRAW</span> <b ref={pctRef}>0</b>%
      </p>
    </div>
  );
}
