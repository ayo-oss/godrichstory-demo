// BoxModel — vanilla 판(run/376/demo/02-box-model/index.html) 의 React 포트.
// 슬라이더로 선언 너비를 바꾸면 border-box·content-box 두 박스에 같은 width 를 넣고,
// 실제 렌더 결과(getBoundingClientRect)를 이론값(선언+테두리·패딩)과 나란히 보여준다.
import { useEffect, useRef } from "react";
import styles from "./BoxModel.module.scss";

type Box<T> = { current: T };

const BORDER_PX = 8;
const PADDING_PX = 12;

export default function BoxModel() {
  const wrapRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const guideRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const borderBoxRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const contentBoxRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const widthRangeRef = useRef(null) as unknown as Box<HTMLInputElement>;
  const readoutRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wrap = wrapRef.current;
    const guide = guideRef.current;
    const borderBox = borderBoxRef.current;
    const contentBox = contentBoxRef.current;
    const widthRange = widthRangeRef.current;
    const readout = readoutRef.current;
    if (!wrap || !guide || !borderBox || !contentBox || !widthRange || !readout) return;

    let isDemo = true;
    let declared = 140;

    function human() { if (isDemo) { wrap!.classList.remove(styles.isDemo); isDemo = false; } }
    function onInput() { human(); declared = Number(widthRange!.value); }
    function onPointerDown() { human(); }
    widthRange.addEventListener("input", onInput);
    widthRange.addEventListener("pointerdown", onPointerDown);

    function apply() {
      borderBox!.style.width = declared + "px";
      contentBox!.style.width = declared + "px";
      const bRect = borderBox!.getBoundingClientRect();
      const cRect = contentBox!.getBoundingClientRect();
      guide!.style.transform = "translateX(" + declared + "px)";
      widthRange!.value = String(Math.round(declared));
      const theory = declared + 2 * (BORDER_PX + PADDING_PX);
      readout!.textContent = "선언 " + Math.round(declared) + "px · border-box 실제 " +
        Math.round(bRect.width) + "px · content-box 실제 " + Math.round(cRect.width) +
        "px (이론값 " + Math.round(theory) + "px)";
    }

    let start = 0;
    function loop(ts: number) {
      if (!start) start = ts;
      if (isDemo && !reduce) { declared = 160 + 38 * Math.sin((ts - start) / 900); }
      apply();
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      widthRange!.removeEventListener("input", onInput);
      widthRange!.removeEventListener("pointerdown", onPointerDown);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={wrapRef}>
        <div className={styles.track}>
          <div className={styles.guide} ref={guideRef}></div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>border-box</span>
            <div className={styles.box + " " + styles.borderBox} ref={borderBoxRef}></div>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>content-box</span>
            <div className={styles.box + " " + styles.contentBox} ref={contentBoxRef}></div>
          </div>
        </div>
        <input className={styles.widthRange} ref={widthRangeRef} type="range" min="120" max="200" defaultValue="140" aria-label="선언 너비" />
        <div className={styles.readout} ref={readoutRef}>선언 너비 —px</div>
      </div>
    </main>
  );
}
