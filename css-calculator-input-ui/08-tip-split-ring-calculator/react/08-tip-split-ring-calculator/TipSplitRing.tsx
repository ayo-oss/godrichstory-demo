import { useEffect, useRef } from "react";
import styles from "./TipSplitRing.module.scss";

export default function TipSplitRing() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const totalRef = useRef<HTMLInputElement | null>(null);
  const countRef = useRef<HTMLInputElement | null>(null);
  const fillRef = useRef<SVGCircleElement | null>(null);
  const shareRef = useRef<HTMLSpanElement | null>(null);
  const readoutRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const totalInput = totalRef.current;
    const countInput = countRef.current;
    const fill = fillRef.current;
    const shareEl = shareRef.current;
    const readout = readoutRef.current;
    if (!root || !totalInput || !countInput || !fill || !shareEl || !readout) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;

    function human() {
      if (isDemo) {
        root!.classList.remove("is-demo");
        isDemo = false;
      }
    }

    const RADIUS = 30;
    const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
    fill.style.strokeDasharray = CIRCUMFERENCE.toFixed(2);

    function perPersonShare(total: number, n: number) {
      return n > 0 ? total / n : 0;
    }
    function shareFraction(n: number) {
      return n > 0 ? 1 / n : 0;
    }
    function formatNumber(v: number) {
      const s = Math.round(v).toString();
      let out = "";
      for (let i = 0; i < s.length; i++) {
        const pos = s.length - i;
        out = s[i] + out;
        if (pos > 1 && (pos - 1) % 3 === 0) out += ",";
      }
      return out;
    }

    const SENT_PREFIX = "총액 ";
    const SENT_MID1 = "원을 ";
    const SENT_MID2 = "명이 나누면 1인당 ";
    const SENT_MID3 = "원이고 전체의 ";
    const SENT_SUFFIX = "%입니다";

    let targetF = 0;
    let renderedF = 0;
    const LERP_RATE = 0.15;

    function applyValue(total: number, n: number) {
      const share = perPersonShare(total, n);
      const frac = shareFraction(n);
      targetF = frac;
      shareEl!.textContent = "1/" + n;
      readout!.textContent =
        SENT_PREFIX + formatNumber(total) + SENT_MID1 + n + SENT_MID2 + formatNumber(share) + SENT_MID3 + (frac * 100).toFixed(1) + SENT_SUFFIX;
      if (reduce) {
        renderedF = targetF;
        paint();
      }
    }

    function paint() {
      const offset = CIRCUMFERENCE * (1 - renderedF);
      fill!.style.strokeDashoffset = offset.toFixed(2);
    }

    function readValues() {
      let total = parseFloat(totalInput!.value); if (isNaN(total) || total < 0) total = 0;
      let n = parseInt(countInput!.value, 10); if (isNaN(n) || n < 1) n = 1;
      return { total, n };
    }

    function onInput() {
      human();
      const v = readValues();
      applyValue(v.total, v.n);
    }
    totalInput.addEventListener("input", onInput);
    totalInput.addEventListener("change", onInput);
    countInput.addEventListener("input", onInput);
    countInput.addEventListener("change", onInput);

    const DEMO_VALUES = [
      { total: 42000, n: 3 },
      { total: 15000, n: 2 },
      { total: 88000, n: 5 },
      { total: 120000, n: 4 },
      { total: 9600, n: 6 },
      { total: 250000, n: 8 },
    ];
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
          totalInput!.value = String(DEMO_VALUES[idx].total);
          countInput!.value = String(DEMO_VALUES[idx].n);
          applyValue(DEMO_VALUES[idx].total, DEMO_VALUES[idx].n);
        }
      }
      rafDrive = requestAnimationFrame(driveTick);
    }

    let rafFrame = 0;
    function frame() {
      renderedF += (targetF - renderedF) * LERP_RATE;
      paint();
      rafFrame = requestAnimationFrame(frame);
    }

    const init = readValues();
    applyValue(init.total, init.n);

    if (!reduce) {
      rafDrive = requestAnimationFrame(driveTick);
      rafFrame = requestAnimationFrame(frame);
    }

    return () => {
      totalInput.removeEventListener("input", onInput);
      totalInput.removeEventListener("change", onInput);
      countInput.removeEventListener("input", onInput);
      countInput.removeEventListener("change", onInput);
      if (rafDrive) cancelAnimationFrame(rafDrive);
      if (rafFrame) cancelAnimationFrame(rafFrame);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.root} is-demo`}>
      <div className={styles.fields}>
        <div className={styles.field}>
          <span className={styles.cap}>총액</span>
          <input
            ref={totalRef}
            className={styles.total}
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            defaultValue={42000}
            aria-label="총액 값을 입력하면 인원 값과 함께 1인당 분담액을 계산해 링 조각을 채웁니다"
            aria-describedby="tsReadoutReact"
          />
        </div>
        <div className={styles.field}>
          <span className={styles.cap}>인원</span>
          <input
            ref={countRef}
            className={styles.count}
            type="number"
            inputMode="numeric"
            min={1}
            max={12}
            step={1}
            defaultValue={3}
            aria-label="인원 값을 입력하면 총액과 함께 1인당 분담액을 계산해 링 조각을 채웁니다"
            aria-describedby="tsReadoutReact"
          />
        </div>
      </div>
      <div className={styles.ring}>
        <svg viewBox="0 0 72 72" aria-hidden="true">
          <circle className={styles.track} cx={36} cy={36} r={30} />
          <circle ref={fillRef} className={styles.fill} cx={36} cy={36} r={30} />
        </svg>
        <span ref={shareRef} className={styles.share} aria-hidden="true" />
      </div>
      <p ref={readoutRef} className={styles.readout} id="tsReadoutReact" role="status" aria-live="polite" />
    </div>
  );
}
