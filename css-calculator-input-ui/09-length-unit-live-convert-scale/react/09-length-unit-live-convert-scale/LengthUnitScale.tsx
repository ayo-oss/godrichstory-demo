import { useEffect, useRef } from "react";
import styles from "./LengthUnitScale.module.scss";

export default function LengthUnitScale() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cmRef = useRef<HTMLInputElement | null>(null);
  const inRef = useRef<HTMLInputElement | null>(null);
  const markCmRef = useRef<HTMLDivElement | null>(null);
  const markInRef = useRef<HTMLDivElement | null>(null);
  const readoutRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const cmInput = cmRef.current;
    const inInput = inRef.current;
    const markCm = markCmRef.current;
    const markIn = markInRef.current;
    const readout = readoutRef.current;
    if (!root || !cmInput || !inInput || !markCm || !markIn || !readout) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;

    function human() {
      if (isDemo) {
        root!.classList.remove("is-demo");
        isDemo = false;
      }
    }

    const CM_MAX = 60;
    const IN_MAX = 24;
    function cmToInch(cm: number) {
      return cm / 2.54;
    }
    function inchToCm(inch: number) {
      return inch * 2.54;
    }
    function clamp01(v: number) {
      return v < 0 ? 0 : v > 1 ? 1 : v;
    }

    const SENT_PREFIX = "센티미터 ";
    const SENT_MID = "는 인치 ";
    const SENT_SUFFIX = "입니다";

    let targetCm = 0;
    let renderedCm = 0;
    let targetIn = 0;
    let renderedIn = 0;
    const LERP_RATE = 0.15;

    function readSentence(cm: number, inch: number) {
      readout!.textContent = SENT_PREFIX + cm.toFixed(1) + SENT_MID + inch.toFixed(2) + SENT_SUFFIX;
    }

    function applyFromCm() {
      let cm = parseFloat(cmInput!.value); if (isNaN(cm) || cm < 0) cm = 0;
      const inch = cmToInch(cm);
      inInput!.value = inch.toFixed(2);
      targetCm = clamp01(cm / CM_MAX);
      targetIn = clamp01(inch / IN_MAX);
      readSentence(cm, inch);
      if (reduce) {
        renderedCm = targetCm;
        renderedIn = targetIn;
        paint();
      }
    }

    function applyFromIn() {
      let inch = parseFloat(inInput!.value); if (isNaN(inch) || inch < 0) inch = 0;
      const cm = inchToCm(inch);
      cmInput!.value = cm.toFixed(1);
      targetCm = clamp01(cm / CM_MAX);
      targetIn = clamp01(inch / IN_MAX);
      readSentence(cm, inch);
      if (reduce) {
        renderedCm = targetCm;
        renderedIn = targetIn;
        paint();
      }
    }

    function paint() {
      const trackCmW = (markCm!.parentElement as HTMLDivElement).clientWidth - markCm!.offsetWidth;
      const trackInW = (markIn!.parentElement as HTMLDivElement).clientWidth - markIn!.offsetWidth;
      markCm!.style.transform = "translateX(" + (renderedCm * trackCmW).toFixed(1) + "px)";
      markIn!.style.transform = "translateX(" + (renderedIn * trackInW).toFixed(1) + "px)";
    }

    function onCmInput() {
      human();
      applyFromCm();
    }
    function onInInput() {
      human();
      applyFromIn();
    }
    cmInput.addEventListener("input", onCmInput);
    cmInput.addEventListener("change", onCmInput);
    inInput.addEventListener("input", onInInput);
    inInput.addEventListener("change", onInInput);

    const DEMO_VALUES = [8, 15, 30, 45.5, 52, 22.5];
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
          cmInput!.value = String(DEMO_VALUES[idx]);
          applyFromCm();
        }
      }
      rafDrive = requestAnimationFrame(driveTick);
    }

    let rafFrame = 0;
    function frame() {
      renderedCm += (targetCm - renderedCm) * LERP_RATE;
      renderedIn += (targetIn - renderedIn) * LERP_RATE;
      paint();
      rafFrame = requestAnimationFrame(frame);
    }

    window.addEventListener("resize", paint);
    applyFromCm();

    if (!reduce) {
      rafDrive = requestAnimationFrame(driveTick);
      rafFrame = requestAnimationFrame(frame);
    }

    return () => {
      cmInput.removeEventListener("input", onCmInput);
      cmInput.removeEventListener("change", onCmInput);
      inInput.removeEventListener("input", onInInput);
      inInput.removeEventListener("change", onInInput);
      window.removeEventListener("resize", paint);
      if (rafDrive) cancelAnimationFrame(rafDrive);
      if (rafFrame) cancelAnimationFrame(rafFrame);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.root} is-demo`}>
      <div className={styles.fields}>
        <label className={styles.field}>
          <span className={styles.cap}>센티미터</span>
          <input
            ref={cmRef}
            className={styles.cm}
            type="number"
            inputMode="decimal"
            step={0.5}
            min={0}
            max={60}
            defaultValue={30}
            aria-label="센티미터 값을 입력하면 인치로 함께 계산해 두 눈금 위 위치를 옮깁니다"
            aria-describedby="luReadoutReact"
          />
        </label>
        <label className={styles.field}>
          <span className={styles.cap}>인치</span>
          <input
            ref={inRef}
            className={styles.inch}
            type="number"
            inputMode="decimal"
            step={0.1}
            min={0}
            max={24}
            defaultValue={11.8}
            aria-label="인치 값을 입력하면 센티미터로 함께 계산해 두 눈금 위 위치를 옮깁니다"
            aria-describedby="luReadoutReact"
          />
        </label>
      </div>
      <div className={styles.rulers} aria-hidden="true">
        <div className={styles.ruler}>
          <div className={styles.track} />
          <div ref={markCmRef} className={styles.marker} />
        </div>
        <div className={styles.ruler}>
          <div className={styles.track} />
          <div ref={markInRef} className={styles.marker} />
        </div>
      </div>
      <p ref={readoutRef} className={styles.readout} id="luReadoutReact" role="status" aria-live="polite" />
    </div>
  );
}
