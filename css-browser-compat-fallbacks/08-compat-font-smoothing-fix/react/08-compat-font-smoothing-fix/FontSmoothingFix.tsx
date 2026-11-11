// FontSmoothingFix — vanilla 판(run/375/demo/08-compat-font-smoothing-fix/index.html) 의 React 포트.
// 벤더 스무딩을 몰라도 폰트 굵기·자간 수동 교정으로 글자를 또렷하게 하고, 슬라이더로 두 판을 오간다.
import { useEffect, useRef } from "react";
import styles from "./FontSmoothingFix.module.scss";

type Box<T> = { current: T };

const STEP_MS = 40;

export default function FontSmoothingFix() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const compareBoxRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const handleRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const simToggleRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const modeLabelRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wrap = rootRef.current;
    const compareBox = compareBoxRef.current;
    const handle = handleRef.current;
    const simToggle = simToggleRef.current;
    const modeLabel = modeLabelRef.current;
    if (!wrap || !compareBox || !handle || !simToggle || !modeLabel) return;

    let isDemo = true;

    function human() { if (isDemo) { wrap!.classList.remove(styles.isDemo); isDemo = false; } }

    let split = 50;
    function setSplit(v: number) {
      split = Math.max(0, Math.min(100, v));
      compareBox!.style.setProperty("--split", split + "%");
      handle!.setAttribute("aria-valuenow", String(Math.round(split)));
    }
    setSplit(split);

    let dragging = false;
    function onPointerDown(e: PointerEvent) {
      human();
      dragging = true;
      handle!.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      const rect = compareBox!.getBoundingClientRect();
      setSplit(((e.clientX - rect.left) / rect.width) * 100);
    }
    function onPointerUp() { dragging = false; }
    function onKeyDown(e: KeyboardEvent) {
      human();
      if (e.key === "ArrowLeft") setSplit(split - 5);
      else if (e.key === "ArrowRight") setSplit(split + 5);
    }
    handle.addEventListener("pointerdown", onPointerDown);
    handle.addEventListener("pointermove", onPointerMove);
    handle.addEventListener("pointerup", onPointerUp);
    handle.addEventListener("keydown", onKeyDown);

    let simOn = false;
    function setSim(on: boolean) {
      simOn = on;
      wrap!.classList.toggle(styles.forceFallback, on);
      simToggle!.setAttribute("aria-pressed", String(on));
      modeLabel!.textContent = on ? "보정 없는판" : "보정 적용판";
    }
    function onSimClick() { human(); setSim(!simOn); }
    simToggle.addEventListener("click", onSimClick);

    // 자동 재생: 삼각파(사인이 아니라 선형 왕복)로 손잡이를 오간다 — 난수 없이 결정론적
    let last = 0;
    let dir = 1;
    function loop(ts: number) {
      if (!last) last = ts;
      if (isDemo && !reduce && ts - last >= STEP_MS) {
        last = ts;
        let next = split + dir * 3.4;
        if (next >= 92) { next = 92; dir = -1; }
        else if (next <= 8) { next = 8; dir = 1; }
        setSplit(next);
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      handle!.removeEventListener("pointerdown", onPointerDown);
      handle!.removeEventListener("pointermove", onPointerMove);
      handle!.removeEventListener("pointerup", onPointerUp);
      handle!.removeEventListener("keydown", onKeyDown);
      simToggle!.removeEventListener("click", onSimClick);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.compareBox} ref={compareBoxRef}>
          <div className={styles.textLayer + " " + styles.isRaw}>Aa 본문 글자</div>
          <div className={styles.textLayer + " " + styles.isFixed}>Aa 본문 글자</div>
          <div className={styles.handle} ref={handleRef} tabIndex={0} role="slider" aria-valuemin={0} aria-valuemax={100} aria-valuenow={50}></div>
        </div>
        <div className={styles.foot}>
          <span className={styles.modeLabel} ref={modeLabelRef}>보정 적용판</span>
          <button className={styles.simToggle} ref={simToggleRef} type="button" aria-pressed="false">폴백 흉내내기</button>
        </div>
      </div>
    </main>
  );
}
