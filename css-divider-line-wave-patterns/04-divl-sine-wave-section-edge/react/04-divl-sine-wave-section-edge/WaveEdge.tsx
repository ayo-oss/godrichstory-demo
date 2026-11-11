// WaveEdge — vanilla 판(04-divl-sine-wave-section-edge) 의 React 포트.
// 경계 높이를 주기가 다른 사인 WAVE_LAYERS 개의 합으로 계산해 SVG path 의 d 를 직접 만든다.
import { useEffect, useRef } from "react";
import styles from "./WaveEdge.module.scss";

type Box<T> = { current: T };

const WAVE_AMP: number[] = [16, 9, 5];
const WAVE_PERIOD: number[] = [190, 83, 47];
const WAVE_SPEED: number[] = [1, 1.7, 2.3];
const BASE_Y = 62;
const VIEW_W = 320;
const STEP_PX = 4;
const RATE_RAD_PER_S = 2.4;

export default function WaveEdge() {
  const pathRef = useRef<SVGPathElement | null>(null) as Box<SVGPathElement | null>;
  const btnRef = useRef<HTMLButtonElement | null>(null) as Box<HTMLButtonElement | null>;
  const layersRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;

  useEffect(() => {
    const pathEl = pathRef.current;
    const btn = btnRef.current;
    const layersEl = layersRef.current;
    if (!pathEl || !btn || !layersEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let demo = !reduce;
    let layers = 2;
    let phase = 0;
    let lastTs: number | null = null;
    let raf = 0;

    const edgeY = (x: number): number => {
      let y = BASE_Y;
      for (let i = 0; i < layers; i += 1) {
        y += WAVE_AMP[i] * Math.sin((2 * Math.PI * x) / WAVE_PERIOD[i] + phase * WAVE_SPEED[i]);
      }
      return y;
    };
    const draw = (): void => {
      let d = "M0 0H" + VIEW_W + "V" + edgeY(VIEW_W).toFixed(1);
      for (let x = VIEW_W - STEP_PX; x >= 0; x -= STEP_PX) d += "L" + x + " " + edgeY(x).toFixed(1);
      d += "L0 " + edgeY(0).toFixed(1) + "Z";
      pathEl.setAttribute("d", d);
      layersEl.textContent = String(layers);
    };
    const onClick = (): void => {
      layers = (layers % 3) + 1;
      draw();
    };
    btn.addEventListener("click", onClick);

    function tick(ts: number): void {
      const dt = lastTs === null ? 0.016 : Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      if (demo) {
        phase += RATE_RAD_PER_S * dt;
        draw();
      }
      raf = requestAnimationFrame(tick);
    }

    draw();
    if (!reduce) raf = requestAnimationFrame(tick);
    return () => {
      demo = false;
      cancelAnimationFrame(raf);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div className={styles.dv}>
      <svg className={styles.svg} viewBox="0 0 320 110" aria-hidden="true" focusable="false">
        <rect className={styles.under} x="0" y="0" width="320" height="110" />
        <path className={styles.over} ref={pathRef} d="M0 0H320V55H0Z" />
      </svg>
      <div className={styles.bar}>
      <button className={styles.btn} ref={btnRef} type="button">파도 겹 수 바꾸기</button>
      <p className={styles.meta}>
        <span className={styles.tag}>WAVE_LAYERS</span> <b ref={layersRef}>2</b>
      </p>
      </div>
    </div>
  );
}
