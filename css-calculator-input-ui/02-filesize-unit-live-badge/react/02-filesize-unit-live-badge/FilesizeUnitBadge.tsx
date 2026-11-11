import { useEffect, useRef } from "react";
import styles from "./FilesizeUnitBadge.module.scss";

export default function FilesizeUnitBadge() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const unitRef = useRef<HTMLSpanElement | null>(null);
  const readoutRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const input = inputRef.current;
    const bar = barRef.current;
    const unitEl = unitRef.current;
    const readout = readoutRef.current;
    if (!root || !input || !bar || !unitEl || !readout) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;

    function human() {
      if (isDemo) {
        root!.classList.remove("is-demo");
        isDemo = false;
      }
    }

    function clamp01(v: number) {
      return v < 0 ? 0 : v > 1 ? 1 : v;
    }

    type Unit = { name: string; pow: number };
    function digitsOf(n: number) {
      n = Math.floor(Math.abs(n));
      return n === 0 ? 1 : String(n).length;
    }
    function pickUnit(bytes: number): Unit {
      const d = digitsOf(bytes);
      if (d <= 3) return { name: "B", pow: 0 };
      if (d <= 6) return { name: "KB", pow: 1 };
      if (d <= 9) return { name: "MB", pow: 2 };
      return { name: "GB", pow: 3 };
    }
    function fillRatio(bytes: number, unit: Unit) {
      const v = bytes / Math.pow(1024, unit.pow);
      return clamp01(v / 1024);
    }

    const SENT_PREFIX = "입력한 ";
    const SENT_MID1 = " 바이트는 ";
    const SENT_MID2 = " 단위 기준 ";
    const SENT_SUFFIX = " 만큼입니다";

    let targetR = 0;
    let renderedR = 0;
    const LERP_RATE = 0.16;

    function readValue() {
      const n = parseFloat(input!.value);
      return isNaN(n) || n < 0 ? 0 : n;
    }

    function applyValue(bytes: number) {
      const unit = pickUnit(bytes);
      const valueInUnit = bytes / Math.pow(1024, unit.pow);
      targetR = fillRatio(bytes, unit);
      unitEl!.textContent = unit.name;
      readout!.textContent =
        SENT_PREFIX + bytes + SENT_MID1 + unit.name + SENT_MID2 + valueInUnit.toFixed(2) + SENT_SUFFIX;
      if (reduce) {
        renderedR = targetR;
        paint();
      }
    }

    function paint() {
      bar!.style.transform = "scaleX(" + renderedR.toFixed(4) + ")";
    }

    function onInput() {
      human();
      applyValue(readValue());
    }
    input.addEventListener("input", onInput);
    input.addEventListener("change", onInput);

    const DEMO_VALUES = [7, 320, 4821, 88320, 2748000, 91000000, 1200000000, 15000000000];
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
      renderedR += (targetR - renderedR) * LERP_RATE;
      paint();
      rafFrame = requestAnimationFrame(frame);
    }

    applyValue(readValue());

    if (!reduce) {
      rafDrive = requestAnimationFrame(driveTick);
      rafFrame = requestAnimationFrame(frame);
    }

    return () => {
      input.removeEventListener("input", onInput);
      input.removeEventListener("change", onInput);
      if (rafDrive) cancelAnimationFrame(rafDrive);
      if (rafFrame) cancelAnimationFrame(rafFrame);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.fb} is-demo`}>
      <label className={styles.cap} htmlFor="fbBytesReact">
        바이트 값
      </label>
      <div className={styles.body}>
        <input
          ref={inputRef}
          className={styles.input}
          id="fbBytesReact"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          defaultValue={483}
          aria-label="바이트 값을 입력하면 자릿수를 계산해 단위를 고르고 막대를 채웁니다"
          aria-describedby="fbReadoutReact"
        />
        <div className={styles.badge} aria-hidden="true">
          <div ref={barRef} className={styles.bar} />
          <span ref={unitRef} className={styles.unit}>B</span>
        </div>
      </div>
      <p ref={readoutRef} className={styles.readout} id="fbReadoutReact" role="status" aria-live="polite" />
    </div>
  );
}
