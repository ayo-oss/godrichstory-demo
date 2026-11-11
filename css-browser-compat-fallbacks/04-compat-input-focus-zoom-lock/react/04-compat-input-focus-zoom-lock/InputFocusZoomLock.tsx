// InputFocusZoomLock — vanilla 판(run/375/demo/04-compat-input-focus-zoom-lock/index.html) 의 React 포트.
// 작은 글자판은 초점을 얻으면 확대되고, 잠금 글자판은 font-size 16px 기법 때문에 배율이 1로 고정된다.
import { useEffect, useRef } from "react";
import styles from "./InputFocusZoomLock.module.scss";

type Box<T> = { current: T };

const LOCK_FONT_PX = 16; // 이 값 이상이면 초점 확대가 걸리지 않는다 — 잠금판의 목표 크기
const STEP_MS = 680;

export default function InputFocusZoomLock() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const inputSmallRef = useRef(null) as unknown as Box<HTMLInputElement>;
  const inputLockRef = useRef(null) as unknown as Box<HTMLInputElement>;
  const simToggleRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const modeLabelRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wrap = rootRef.current;
    const inputSmall = inputSmallRef.current;
    const inputLock = inputLockRef.current;
    const simToggle = simToggleRef.current;
    const modeLabel = modeLabelRef.current;
    if (!wrap || !inputSmall || !inputLock || !simToggle || !modeLabel) return;

    let isDemo = true;

    function human() { if (isDemo) { wrap!.classList.remove(styles.isDemo); isDemo = false; } }

    // 실제 요소 크기에서 확대 배율을 구한다 — 하드코딩 배율이 아니라 현재 폰트 크기 기준
    function zoomScaleFor(el: HTMLInputElement) {
      const css = window.getComputedStyle(el);
      const current = parseFloat(css.fontSize) || LOCK_FONT_PX;
      return Math.max(1, LOCK_FONT_PX / current);
    }

    function applyFocusZoom(el: HTMLInputElement, on: boolean) {
      if (on) {
        const rect = el.getBoundingClientRect();
        const originX = rect.width / 2;
        const originY = rect.height / 2;
        el.style.transformOrigin = originX + "px " + originY + "px";
        el.style.transform = "scale(" + zoomScaleFor(el) + ")";
      } else {
        el.style.transform = "scale(1)";
      }
    }

    function onSmallFocus() { human(); applyFocusZoom(inputSmall!, true); }
    function onSmallBlur() { applyFocusZoom(inputSmall!, false); }
    inputSmall.addEventListener("focus", onSmallFocus);
    inputSmall.addEventListener("blur", onSmallBlur);

    // 잠금판: 실제 font-size 가 이미 LOCK_FONT_PX 이므로 zoomScaleFor 가 1을 반환 — 확대가 걸리지 않는다
    function onLockFocus() { human(); applyFocusZoom(inputLock!, true); }
    function onLockBlur() { applyFocusZoom(inputLock!, false); }
    inputLock.addEventListener("focus", onLockFocus);
    inputLock.addEventListener("blur", onLockBlur);

    let simOn = false;
    function setSim(on: boolean) {
      simOn = on;
      wrap!.classList.toggle(styles.forceFallback, on);
      simToggle!.setAttribute("aria-pressed", String(on));
      modeLabel!.textContent = on ? "확대 잠금 꺼짐" : "확대 잠금 켜짐";
    }
    function onSimClick() { human(); setSim(!simOn); }
    simToggle.addEventListener("click", onSimClick);

    let last = 0;
    let phase = 0;
    function loop(ts: number) {
      if (!last) last = ts;
      if (isDemo && !reduce && ts - last >= STEP_MS) {
        last = ts;
        phase = (phase + 1) % 4;
        if (phase === 1) { applyFocusZoom(inputSmall!, true); applyFocusZoom(inputLock!, true); }
        else if (phase === 3) { applyFocusZoom(inputSmall!, false); applyFocusZoom(inputLock!, false); }
        else if (phase === 0) { setSim(!simOn); }
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      inputSmall!.removeEventListener("focus", onSmallFocus);
      inputSmall!.removeEventListener("blur", onSmallBlur);
      inputLock!.removeEventListener("focus", onLockFocus);
      inputLock!.removeEventListener("blur", onLockBlur);
      simToggle!.removeEventListener("click", onSimClick);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>작은 글자판</span>
            <input className={styles.input + " " + styles.isSmall} ref={inputSmallRef} type="text" defaultValue="검색어" />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>잠금 글자판</span>
            <input className={styles.input + " " + styles.isLock} ref={inputLockRef} type="text" defaultValue="검색어" />
          </label>
        </div>
        <div className={styles.foot}>
          <span className={styles.modeLabel} ref={modeLabelRef}>확대 잠금 켜짐</span>
          <button className={styles.simToggle} ref={simToggleRef} type="button" aria-pressed="false">폴백 흉내내기</button>
        </div>
      </div>
    </main>
  );
}
