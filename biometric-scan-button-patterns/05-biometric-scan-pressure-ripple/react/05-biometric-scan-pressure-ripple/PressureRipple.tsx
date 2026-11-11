// PressureRipple — vanilla 판(run/371/demo/05-biometric-scan-pressure-ripple/index.html) 의 React 포트.
// 계산 겹(물결 진폭)은 usePressureRipple 훅 안에 있다: 각도(θ)마다 반지름을
// BASE_R + AMPLITUDE*pressure*sin(WAVE_K*θ - t*WAVE_SPEED) 로 계산해 매 프레임 점을 다시 찍는다.
// pressure 는 실 포인터 압력(e.pressure) 또는 자동 루프의 누르기-떼기 사인 곡선에서 온다.
import { useEffect, useRef, useState } from "react";
import styles from "./PressureRipple.module.scss";

type Box<T> = { current: T };

function usePressureRipple(
  rootRef: Box<HTMLButtonElement>,
  waveRef: Box<SVGPathElement>,
  setPressure: (p: number) => void,
  setPressed: (b: boolean) => void
) {
  useEffect(() => {
    const BASE_R = 30;
    const AMPLITUDE = 11;
    const WAVE_K = 5;
    const WAVE_SPEED = 0.0032;
    const M = 32;
    const PRESS_CYCLE_MS = 1400;
    const GAP_MS = 500;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const root = rootRef.current;
    const wave = waveRef.current;
    if (!root || !wave) return;

    let isDemo = true;
    let pointerPressure = 0;
    let pointerDown = false;
    let autoStart = 0;
    let rafId = 0;

    function buildPath(t: number, pressure: number) {
      let d = "";
      for (let i = 0; i <= M; i++) {
        const theta = (i / M) * Math.PI * 2;
        const r = BASE_R + AMPLITUDE * pressure * Math.sin(WAVE_K * theta - t * WAVE_SPEED);
        const x = 60 + r * Math.cos(theta);
        const y = 60 + r * Math.sin(theta);
        d += (i === 0 ? "M" : "L") + x.toFixed(2) + "," + y.toFixed(2) + " ";
      }
      return d + "Z";
    }

    function autoPressure(now: number) {
      if (!autoStart) autoStart = now;
      const phase = (now - autoStart) % (PRESS_CYCLE_MS + GAP_MS);
      if (phase > PRESS_CYCLE_MS) return 0;
      return Math.max(0, Math.sin((phase / PRESS_CYCLE_MS) * Math.PI));
    }

    function human() { if (isDemo) { root.classList.remove(styles.isDemo); isDemo = false; } }

    function onPointerDown(e: PointerEvent) {
      human();
      pointerDown = true;
      pointerPressure = e.pressure > 0 ? e.pressure : 0.6;
      setPressed(true);
    }
    function onPointerMove(e: PointerEvent) {
      if (!pointerDown) return;
      pointerPressure = e.pressure > 0 ? e.pressure : pointerPressure;
    }
    function onPointerUp() {
      if (!pointerDown) return;
      pointerDown = false;
      pointerPressure = 0;
      setPressed(false);
    }
    function onKeyDown(e: KeyboardEvent) { if (e.key === " " || e.key === "Enter") human(); }

    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    root.addEventListener("keydown", onKeyDown);

    function loop(ts: number) {
      const reduceNow = reduce && isDemo;
      let pressure = pointerDown ? pointerPressure : (isDemo && !reduce ? autoPressure(ts) : 0);
      if (reduceNow) pressure = 0;
      wave.setAttribute("d", buildPath(ts, pressure));
      setPressure(pressure);
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);

    return () => {
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      root.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(rafId);
    };
  }, []);
}

export default function PressureRipple() {
  const rootRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const waveRef = useRef(null) as unknown as Box<SVGPathElement>;
  const [pressure, setPressure] = useState(0);
  const [pressed, setPressed] = useState(false);

  usePressureRipple(rootRef, waveRef, setPressure, setPressed);

  return (
    <main className={styles.stage}>
      <div className={styles.rippleWrap}>
        <button
          type="button"
          className={styles.ripple + " " + styles.isDemo}
          ref={rootRef}
          aria-pressed={pressed}
        >
          <svg className={styles.rippleIcon} viewBox="0 0 120 120" aria-hidden="true">
            <path className={styles.rippleWave} ref={waveRef} />
            <circle className={styles.rippleCore} cx={60} cy={60} r={10} />
          </svg>
          <span className={styles.rippleLabel}>눌러서 인증</span>
        </button>
        <p className={styles.rippleStatus}>{"누르는 힘 " + Math.round(pressure * 100) + "%"}</p>
      </div>
    </main>
  );
}
