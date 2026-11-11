// WaveHandoff — vanilla 판(09-divl-section-handoff-wave-scene) 의 React 포트.
// scrollTop 하나가 파도 위상, 경계선이 그려진 길이, 위 섹션 색이 번진 높이를 한꺼번에 정한다.
import { useEffect, useRef } from "react";
import styles from "./WaveHandoff.module.scss";

type Box<T> = { current: T };

const WAVE_PHASE_PER_PX = 0.07;
const BLEED_PCT = 60;
const SCROLL_SHARE = 0.62;
const DRAW_RANGE_PX = 90;
const WAVE_AMP: number[] = [11, 6];
const WAVE_PERIOD: number[] = [150, 61];
const WAVE_SPEED: number[] = [1, 1.6];
const BASE_Y = 34;
const VIEW_W = 320;
const STEP_PX = 4;
const CYCLE_MS = 2000;

function edgeY(x: number, phase: number): number {
  let y = BASE_Y;
  for (let i = 0; i < WAVE_AMP.length; i += 1) {
    y += WAVE_AMP[i] * Math.sin((2 * Math.PI * x) / WAVE_PERIOD[i] + phase * WAVE_SPEED[i]);
  }
  return y;
}

export default function WaveHandoff() {
  const scrollerRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const fillRef = useRef<SVGPathElement | null>(null) as Box<SVGPathElement | null>;
  const edgeRef = useRef<SVGPathElement | null>(null) as Box<SVGPathElement | null>;
  const bleedRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const phaseRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;

  useEffect(() => {
    const scroller = scrollerRef.current;
    const fill = fillRef.current;
    const edge = edgeRef.current;
    const bleed = bleedRef.current;
    const phaseEl = phaseRef.current;
    if (!scroller || !fill || !edge || !bleed || !phaseEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let demo = !reduce;
    let t0: number | null = null;
    let raf = 0;

    const update = (): void => {
      const top = scroller.scrollTop;
      const phase = top * WAVE_PHASE_PER_PX;
      const pts: string[] = [];
      let lastY = BASE_Y;
      for (let x = 0; x <= VIEW_W; x += STEP_PX) {
        lastY = edgeY(x, phase);
        pts.push(x + " " + lastY.toFixed(1));
      }
      fill.setAttribute("d", "M0 0H" + VIEW_W + "V" + lastY.toFixed(1) + "L" + pts.slice().reverse().join("L") + "Z");
      edge.setAttribute("d", "M" + pts.join("L"));
      const drawn = Math.min(1, Math.max(0, top / DRAW_RANGE_PX));
      edge.style.strokeDasharray = "1";
      edge.style.strokeDashoffset = String(1 - drawn);
      bleed.style.height = (BLEED_PCT * drawn).toFixed(1) + "%";
      phaseEl.textContent = phase.toFixed(1);
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
        scroller.scrollTop = max * SCROLL_SHARE * tri;
      }
      raf = requestAnimationFrame(tick);
    };

    if (reduce) {
      scroller.scrollTop = ((scroller.scrollHeight - scroller.clientHeight) * SCROLL_SHARE) / 2;
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
        <section className={styles.secA}>
          <p className={styles.title}>첫 섹션</p>
        </section>
        <svg className={styles.wave} viewBox="0 0 320 72" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path className={styles.fill} ref={fillRef} d="M0 0H320V36H0Z" />
          <path className={styles.edge} ref={edgeRef} d="M0 36H320" pathLength={1} />
        </svg>
        <section className={styles.secB}>
          <div className={styles.bleed} ref={bleedRef} />
          <p className={styles.title}>다음 섹션</p>
        </section>
      </div>
      <p className={styles.meta}>
        <span className={styles.tag}>PHASE</span> <b ref={phaseRef}>0</b>
        <span>rad</span>
      </p>
    </div>
  );
}
