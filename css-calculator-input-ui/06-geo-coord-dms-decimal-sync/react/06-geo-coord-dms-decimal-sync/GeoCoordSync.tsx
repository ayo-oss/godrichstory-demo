import { useEffect, useRef } from "react";
import styles from "./GeoCoordSync.module.scss";

export default function GeoCoordSync() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const degRef = useRef<HTMLInputElement | null>(null);
  const minRef = useRef<HTMLInputElement | null>(null);
  const secRef = useRef<HTMLInputElement | null>(null);
  const decRef = useRef<HTMLInputElement | null>(null);
  const markerRef = useRef<HTMLDivElement | null>(null);
  const readoutRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const degInput = degRef.current;
    const minInput = minRef.current;
    const secInput = secRef.current;
    const decInput = decRef.current;
    const marker = markerRef.current;
    const readout = readoutRef.current;
    if (!root || !degInput || !minInput || !secInput || !decInput || !marker || !readout) return;
    const track = marker.parentElement as HTMLDivElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;

    function human() {
      if (isDemo) {
        root!.classList.remove("is-demo");
        isDemo = false;
      }
    }

    const RANGE = 90;
    function dmsToDecimal(deg: number, min: number, sec: number) {
      const sign = deg < 0 ? -1 : 1;
      return sign * (Math.abs(deg) + min / 60 + sec / 3600);
    }
    function decimalToDms(dec: number) {
      const sign = dec < 0 ? -1 : 1;
      const abs = Math.abs(dec);
      const deg = Math.floor(abs);
      const minFull = (abs - deg) * 60;
      const min = Math.floor(minFull);
      const sec = (minFull - min) * 60;
      return { deg: sign * deg, min, sec };
    }
    function clamp01(v: number) {
      return v < 0 ? 0 : v > 1 ? 1 : v;
    }

    const SENT_PREFIX = "도분초 ";
    const SENT_MID = "는 십진수로 ";
    const SENT_SUFFIX = "도입니다";

    let targetX = 0;
    let renderedX = 0;
    const LERP_RATE = 0.15;

    function paintCommon(dec: number) {
      targetX = clamp01((dec + RANGE) / (RANGE * 2));
      if (reduce) {
        renderedX = targetX;
        paint();
      }
    }

    function readSentence(deg: number, min: number, sec: number, dec: number) {
      readout!.textContent =
        SENT_PREFIX + deg + "°" + min + "'" + sec.toFixed(1) + '"' + SENT_MID + dec.toFixed(4) + SENT_SUFFIX;
    }

    function applyFromDms() {
      let deg = parseFloat(degInput!.value); if (isNaN(deg)) deg = 0;
      let min = parseFloat(minInput!.value); if (isNaN(min)) min = 0;
      let sec = parseFloat(secInput!.value); if (isNaN(sec)) sec = 0;
      const dec = dmsToDecimal(deg, min, sec);
      decInput!.value = dec.toFixed(4);
      readSentence(deg, min, sec, dec);
      paintCommon(dec);
    }

    function applyFromDecimal() {
      let dec = parseFloat(decInput!.value); if (isNaN(dec)) dec = 0;
      const dms = decimalToDms(dec);
      degInput!.value = String(dms.deg);
      minInput!.value = String(dms.min);
      secInput!.value = dms.sec.toFixed(1);
      readSentence(dms.deg, dms.min, dms.sec, dec);
      paintCommon(dec);
    }

    function paint() {
      const trackW = track.clientWidth - marker!.offsetWidth;
      const x = renderedX * trackW;
      marker!.style.transform = "translateX(" + x.toFixed(1) + "px)";
    }

    function onDmsInput() {
      human();
      applyFromDms();
    }
    function onDecInput() {
      human();
      applyFromDecimal();
    }
    degInput.addEventListener("input", onDmsInput);
    degInput.addEventListener("change", onDmsInput);
    minInput.addEventListener("input", onDmsInput);
    minInput.addEventListener("change", onDmsInput);
    secInput.addEventListener("input", onDmsInput);
    secInput.addEventListener("change", onDmsInput);
    decInput.addEventListener("input", onDecInput);
    decInput.addEventListener("change", onDecInput);

    const DEMO_VALUES = [12.5, 45.75, -8.333, 63.104, -51.9, 29.7801];
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
          decInput!.value = String(DEMO_VALUES[idx]);
          applyFromDecimal();
        }
      }
      rafDrive = requestAnimationFrame(driveTick);
    }

    let rafFrame = 0;
    function frame() {
      renderedX += (targetX - renderedX) * LERP_RATE;
      paint();
      rafFrame = requestAnimationFrame(frame);
    }

    window.addEventListener("resize", paint);
    applyFromDecimal();

    if (!reduce) {
      rafDrive = requestAnimationFrame(driveTick);
      rafFrame = requestAnimationFrame(frame);
    }

    return () => {
      degInput.removeEventListener("input", onDmsInput);
      degInput.removeEventListener("change", onDmsInput);
      minInput.removeEventListener("input", onDmsInput);
      minInput.removeEventListener("change", onDmsInput);
      secInput.removeEventListener("input", onDmsInput);
      secInput.removeEventListener("change", onDmsInput);
      decInput.removeEventListener("input", onDecInput);
      decInput.removeEventListener("change", onDecInput);
      window.removeEventListener("resize", paint);
      if (rafDrive) cancelAnimationFrame(rafDrive);
      if (rafFrame) cancelAnimationFrame(rafFrame);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.root} is-demo`}>
      <div className={styles.fields}>
        <div className={styles.field}>
          <span className={styles.cap}>도·분·초</span>
          <div className={styles.dms}>
            <input
              ref={degRef}
              className={styles.deg}
              type="number"
              step={1}
              min={-90}
              max={90}
              defaultValue={37}
              aria-label="도 값 — 분·초와 함께 십진수 좌표로 계산해 눈금 위치를 옮깁니다"
              aria-describedby="gcReadoutReact"
            />
            <span aria-hidden="true">°</span>
            <input
              ref={minRef}
              className={styles.min}
              type="number"
              step={1}
              min={0}
              max={59}
              defaultValue={33}
              aria-label="분 값 — 도·초와 함께 십진수 좌표로 계산해 눈금 위치를 옮깁니다"
              aria-describedby="gcReadoutReact"
            />
            <span aria-hidden="true">'</span>
            <input
              ref={secRef}
              className={styles.sec}
              type="number"
              step={0.1}
              min={0}
              max={59.9}
              defaultValue={12.0}
              aria-label="초 값 — 도·분과 함께 십진수 좌표로 계산해 눈금 위치를 옮깁니다"
              aria-describedby="gcReadoutReact"
            />
            <span aria-hidden="true">"</span>
          </div>
        </div>
        <div className={styles.field}>
          <span className={styles.cap}>십진수</span>
          <input
            ref={decRef}
            className={styles.dec}
            type="number"
            step={0.0001}
            min={-90}
            max={90}
            defaultValue={37.5533}
            aria-label="십진수 좌표 값을 입력하면 도·분·초로 함께 계산해 눈금 위치를 옮깁니다"
            aria-describedby="gcReadoutReact"
          />
        </div>
      </div>
      <div className={styles.scale} aria-hidden="true">
        <div className={styles.track} />
        <div ref={markerRef} className={styles.marker} />
      </div>
      <p ref={readoutRef} className={styles.readout} id="gcReadoutReact" role="status" aria-live="polite" />
    </div>
  );
}
