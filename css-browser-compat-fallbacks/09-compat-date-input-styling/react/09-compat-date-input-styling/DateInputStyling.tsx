// DateInputStyling — vanilla 판(run/375/demo/09-compat-date-input-styling/index.html) 의 React 포트.
// 진짜 input[type=date] 를 그대로 쓰고, 남은 일수 비율을 원 둘레의 stroke-dashoffset 로 잡아 보여준다.
import { useEffect, useRef } from "react";
import styles from "./DateInputStyling.module.scss";

type Box<T> = { current: T };

const RANGE_DAYS = 30; // 링이 가득 찰 때 기준이 되는 최대 남은 일수
const REFERENCE_DATE = new Date("2026-09-22T00:00:00");
const STEP_MS = 320;

export default function DateInputStyling() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const dateInputRef = useRef(null) as unknown as Box<HTMLInputElement>;
  const pickBtnRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const ringFillRef = useRef(null) as unknown as Box<SVGCircleElement>;
  const ringNumRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const daysLabelRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const simToggleRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wrap = rootRef.current;
    const dateInput = dateInputRef.current;
    const pickBtn = pickBtnRef.current;
    const ringFill = ringFillRef.current;
    const ringNum = ringNumRef.current;
    const daysLabel = daysLabelRef.current;
    const simToggle = simToggleRef.current;
    if (!wrap || !dateInput || !pickBtn || !ringFill || !ringNum || !daysLabel || !simToggle) return;

    let isDemo = true;

    const CIRC = 2 * Math.PI * 30; // 실제 반지름에서 계산한 둘레 — 하드코딩 아님
    ringFill.style.strokeDasharray = String(CIRC);

    function human() { if (isDemo) { wrap!.classList.remove(styles.isDemo); isDemo = false; } }

    function daysBetween(a: Date, b: Date) {
      const ms = b.getTime() - a.getTime();
      return Math.round(ms / 86400000);
    }

    function render() {
      const picked = new Date(dateInput!.value + "T00:00:00");
      const days = daysBetween(REFERENCE_DATE, picked);
      const ratio = Math.max(0, Math.min(1, days / RANGE_DAYS));
      ringFill!.style.strokeDashoffset = String(CIRC * (1 - ratio));
      ringNum!.textContent = String(days);
      daysLabel!.textContent = days >= 0 ? ("D-" + days) : ("D+" + Math.abs(days));
    }
    render();

    function onChange() { human(); render(); }
    dateInput.addEventListener("change", onChange);

    // 표준 showPicker() 를 아는 환경이면 버튼이 진짜 달력을 띄우고, 모르는 환경은 입력에 초점만 준다
    const hasShowPicker = "showPicker" in HTMLInputElement.prototype;
    function onPickClick() {
      human();
      if (hasShowPicker && !wrap!.classList.contains(styles.forceFallback)) {
        try { dateInput!.showPicker(); } catch (err) { dateInput!.focus({ preventScroll: true }); }
      } else {
        dateInput!.focus({ preventScroll: true });
      }
    }
    pickBtn.addEventListener("click", onPickClick);

    let simOn = false;
    function setSim(on: boolean) {
      simOn = on;
      wrap!.classList.toggle(styles.forceFallback, on);
      simToggle!.setAttribute("aria-pressed", String(on));
      pickBtn!.textContent = on ? "달력 초점만" : "달력 열기";
    }
    function onSimClick() { human(); setSim(!simOn); }
    simToggle.addEventListener("click", onSimClick);

    const DATES = ["2026-10-01", "2026-10-08", "2026-09-25", "2026-11-05", "2026-09-23"];
    let di = 0;
    let last = 0;
    let phase = 0;
    function loop(ts: number) {
      if (!last) last = ts;
      if (isDemo && !reduce && ts - last >= STEP_MS) {
        last = ts;
        phase = (phase + 1) % 3;
        if (phase !== 1) {
          dateInput!.value = DATES[di % DATES.length];
          di += 1;
          render();
        } else {
          setSim(!simOn);
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      dateInput!.removeEventListener("change", onChange);
      pickBtn!.removeEventListener("click", onPickClick);
      simToggle!.removeEventListener("click", onSimClick);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.ringWrap}>
          <svg className={styles.ring} viewBox="0 0 72 72" aria-hidden="true">
            <circle className={styles.ringTrack} cx="36" cy="36" r="30"></circle>
            <circle className={styles.ringFill} ref={ringFillRef} cx="36" cy="36" r="30"></circle>
          </svg>
          <span className={styles.ringNum} ref={ringNumRef}>0</span>
        </div>
        <div className={styles.row}>
          <input className={styles.dateInput} ref={dateInputRef} type="date" defaultValue="2026-10-01" />
          <button className={styles.pickBtn} ref={pickBtnRef} type="button">달력 열기</button>
        </div>
        <div className={styles.foot}>
          <span className={styles.daysLabel} ref={daysLabelRef}>D-9</span>
          <button className={styles.simToggle} ref={simToggleRef} type="button" aria-pressed="false">폴백 흉내내기</button>
        </div>
      </div>
    </main>
  );
}
