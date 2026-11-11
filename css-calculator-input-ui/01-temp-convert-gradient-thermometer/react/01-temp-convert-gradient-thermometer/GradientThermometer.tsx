import { useEffect, useRef } from "react";
import styles from "./GradientThermometer.module.scss";

export default function GradientThermometer() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const handleRef = useRef<HTMLDivElement | null>(null);
  const readoutRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const input = inputRef.current;
    const handle = handleRef.current;
    const readout = readoutRef.current;
    if (!root || !input || !handle || !readout) return;
    const scale = handle.parentElement as HTMLDivElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;

    function human() {
      if (isDemo) {
        root!.classList.remove("is-demo");
        isDemo = false;
      }
    }

    const MIN_C = -10;
    const MAX_C = 40;
    function celsiusToFahrenheit(c: number) {
      return (c * 9) / 5 + 32;
    }
    function clamp01(v: number) {
      return v < 0 ? 0 : v > 1 ? 1 : v;
    }

    const SENT_PREFIX = "섭씨 ";
    const SENT_MID = "도는 화씨 ";
    const SENT_SUFFIX = "도입니다";

    let targetT = 0;
    let renderedT = 0;
    const LERP_RATE = 0.14;

    function readValue() {
      const c = parseFloat(input!.value);
      return isNaN(c) ? 0 : c;
    }

    function applyValue(c: number) {
      const f = celsiusToFahrenheit(c);
      targetT = clamp01((c - MIN_C) / (MAX_C - MIN_C));
      readout!.textContent = SENT_PREFIX + c.toFixed(1) + SENT_MID + f.toFixed(1) + SENT_SUFFIX;
      if (reduce) {
        renderedT = targetT;
        paint();
      }
    }

    function paint() {
      const trackH = scale.clientHeight - handle!.offsetHeight;
      const y = (1 - renderedT) * trackH;
      handle!.style.transform = "translateY(" + y.toFixed(1) + "px)";
    }

    function onInput() {
      human();
      applyValue(readValue());
    }
    input.addEventListener("input", onInput);
    input.addEventListener("change", onInput);

    const DEMO_VALUES = [-4, 8, 22, 31, 38, 14];
    const DRIVE_PERIOD_MS = 2000;
    let driveStart = 0;
    let lastIdx = -1;
    let rafDrive = 0;
    function driveTick(now: number) {
      if (!driveStart) driveStart = now;
      if (isDemo) {
        const frac = ((now - driveStart) % DRIVE_PERIOD_MS) / DRIVE_PERIOD_MS;
        const idx = Math.floor(frac * DEMO_VALUES.length);
        if (idx !== lastIdx) {
          lastIdx = idx;
          input!.value = String(DEMO_VALUES[idx]);
          applyValue(DEMO_VALUES[idx]);
        }
      }
      rafDrive = requestAnimationFrame(driveTick);
    }

    let rafFrame = 0;
    function frame() {
      renderedT += (targetT - renderedT) * LERP_RATE;
      paint();
      rafFrame = requestAnimationFrame(frame);
    }

    window.addEventListener("resize", paint);
    applyValue(readValue());

    if (!reduce) {
      rafDrive = requestAnimationFrame(driveTick);
      rafFrame = requestAnimationFrame(frame);
    }

    return () => {
      input.removeEventListener("input", onInput);
      input.removeEventListener("change", onInput);
      window.removeEventListener("resize", paint);
      if (rafDrive) cancelAnimationFrame(rafDrive);
      if (rafFrame) cancelAnimationFrame(rafFrame);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.tc} is-demo`}>
      <label className={styles.cap} htmlFor="tcCReact">
        섭씨 값
      </label>
      <div className={styles.body}>
        <input
          ref={inputRef}
          className={styles.input}
          id="tcCReact"
          type="number"
          inputMode="decimal"
          step={0.5}
          min={-10}
          max={40}
          defaultValue={22}
          aria-label="섭씨 값을 입력하면 화씨로 함께 계산해 눈금 손잡이를 옮깁니다"
          aria-describedby="tcReadoutReact"
        />
        <div className={styles.scale} aria-hidden="true">
          <div className={styles.track} />
          <div ref={handleRef} className={styles.handle} />
        </div>
      </div>
      <p ref={readoutRef} className={styles.readout} id="tcReadoutReact" role="status" aria-live="polite" />
    </div>
  );
}
