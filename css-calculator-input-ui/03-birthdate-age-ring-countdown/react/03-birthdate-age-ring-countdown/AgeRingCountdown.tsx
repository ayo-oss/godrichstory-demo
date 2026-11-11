import { useEffect, useRef } from "react";
import styles from "./AgeRingCountdown.module.scss";

type Ymd = { y: number; m: number; d: number };

export default function AgeRingCountdown() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const birthRef = useRef<HTMLInputElement | null>(null);
  const refRef = useRef<HTMLInputElement | null>(null);
  const fillRef = useRef<SVGCircleElement | null>(null);
  const ageRef = useRef<HTMLSpanElement | null>(null);
  const readoutRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const birthInput = birthRef.current;
    const refInput = refRef.current;
    const fill = fillRef.current;
    const ageEl = ageRef.current;
    const readout = readoutRef.current;
    if (!root || !birthInput || !refInput || !fill || !ageEl || !readout) return;
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

    function clamp01(v: number) {
      return v < 0 ? 0 : v > 1 ? 1 : v;
    }
    function parseYmd(s: string): Ymd {
      const p = s.split("-");
      return { y: parseInt(p[0], 10), m: parseInt(p[1], 10), d: parseInt(p[2], 10) };
    }
    function daysBetween(a: Ymd, b: Ymd) {
      const msPerDay = 86400000;
      const da = Date.UTC(a.y, a.m - 1, a.d);
      const db = Date.UTC(b.y, b.m - 1, b.d);
      return Math.round((db - da) / msPerDay);
    }
    function ageAt(birth: Ymd, ref: Ymd) {
      let age = ref.y - birth.y;
      const hadBirthdayThisYear = ref.m > birth.m || (ref.m === birth.m && ref.d >= birth.d);
      if (!hadBirthdayThisYear) age -= 1;
      return age;
    }
    function nextBirthdayGap(birth: Ymd, ref: Ymd) {
      let nextY = ref.y;
      const thisYearBday: Ymd = { y: ref.y, m: birth.m, d: birth.d };
      const gapThisYear = daysBetween(ref, thisYearBday);
      if (gapThisYear < 0) nextY = ref.y + 1;
      const target: Ymd = { y: nextY, m: birth.m, d: birth.d };
      return daysBetween(ref, target);
    }

    const SENT_PREFIX = "만 ";
    const SENT_MID = "세이고, 다음 생일까지 ";
    const SENT_SUFFIX = "일 남았습니다";

    let targetT = 0;
    let renderedT = 0;
    const LERP_RATE = 0.13;

    function applyValues() {
      const birth = parseYmd(birthInput!.value);
      const ref = parseYmd(refInput!.value);
      const age = ageAt(birth, ref);
      const gap = nextBirthdayGap(birth, ref);
      const yearLen = 365.2425;
      targetT = clamp01(1 - gap / yearLen);
      ageEl!.textContent = String(age);
      readout!.textContent = SENT_PREFIX + age + SENT_MID + gap + SENT_SUFFIX;
      if (reduce) {
        renderedT = targetT;
        paint();
      }
    }

    function paint() {
      const offset = CIRCUMFERENCE * (1 - renderedT);
      fill!.style.strokeDashoffset = offset.toFixed(2);
    }

    function onInput() {
      human();
      applyValues();
    }
    birthInput.addEventListener("input", onInput);
    birthInput.addEventListener("change", onInput);
    refInput.addEventListener("input", onInput);
    refInput.addEventListener("change", onInput);

    const DEMO_BIRTHDAYS = ["1996-04-12", "1990-12-30", "2001-09-24", "1988-02-05", "2015-06-18"];
    const DRIVE_PERIOD_MS = 2000;
    let driveStart = 0;
    let lastIdx = -1;
    let rafDrive = 0;
    function driveTick(now: number) {
      if (!driveStart) driveStart = now;
      if (isDemo) {
        const frac = ((now - driveStart) % DRIVE_PERIOD_MS) / DRIVE_PERIOD_MS;
        const idx = Math.floor(frac * DEMO_BIRTHDAYS.length);
        if (idx !== lastIdx) {
          lastIdx = idx;
          birthInput!.value = DEMO_BIRTHDAYS[idx];
          applyValues();
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

    applyValues();

    if (!reduce) {
      rafDrive = requestAnimationFrame(driveTick);
      rafFrame = requestAnimationFrame(frame);
    }

    return () => {
      birthInput.removeEventListener("input", onInput);
      birthInput.removeEventListener("change", onInput);
      refInput.removeEventListener("input", onInput);
      refInput.removeEventListener("change", onInput);
      if (rafDrive) cancelAnimationFrame(rafDrive);
      if (rafFrame) cancelAnimationFrame(rafFrame);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.ar} is-demo`}>
      <div className={styles.fields}>
        <label className={styles.field}>
          <span className={styles.cap}>생년월일</span>
          <input ref={birthRef} className={styles.input} type="date" defaultValue="1996-04-12" aria-describedby="arReadoutReact" />
        </label>
        <label className={styles.field}>
          <span className={styles.cap}>기준 날짜</span>
          <input ref={refRef} className={styles.input} type="date" defaultValue="2026-09-23" aria-describedby="arReadoutReact" />
        </label>
      </div>
      <div className={styles.ring} aria-hidden="true">
        <svg viewBox="0 0 72 72">
          <circle className={styles.track} cx={36} cy={36} r={30} />
          <circle ref={fillRef} className={styles.fill} cx={36} cy={36} r={30} />
        </svg>
        <span ref={ageRef} className={styles.age}>30</span>
      </div>
      <p ref={readoutRef} className={styles.readout} id="arReadoutReact" role="status" aria-live="polite" />
    </div>
  );
}
