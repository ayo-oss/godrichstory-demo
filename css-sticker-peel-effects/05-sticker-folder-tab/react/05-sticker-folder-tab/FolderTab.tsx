// FolderTab — vanilla 판(run/378/demo/05-sticker-folder-tab/index.html) 의 React 포트.
// 숨은 canvas 로 라벨 글자 폭을 실측해(measureWidth) 탭 폭(--tab-w)을 정한다 — 실제 상자 width 는
// 최대치로 고정하고 clip-path 로만 드러내는 폭을 바꿔 레이아웃 재계산을 피한다.
import { useEffect, useRef } from "react";
import styles from "./FolderTab.module.scss";

type Box<T> = { current: T };

const LABELS = ["문서", "색상", "자료 보관함"];
const TAB_PADDING = 28;
const TAB_MIN = 60;
const TAB_MAX = 156;
const LERP_RATE = 0.15;
const STEP_MS = 500;

export default function FolderTab() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const tabRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const labelRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const prevRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const nextRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wrap = rootRef.current;
    const tab = tabRef.current;
    const tabLabel = labelRef.current;
    const btnPrev = prevRef.current;
    const btnNext = nextRef.current;
    if (!wrap || !tab || !tabLabel || !btnPrev || !btnNext) return;

    const measureCanvas = document.createElement("canvas");
    const ctx = measureCanvas.getContext("2d");

    function measureWidth(text: string) {
      if (!ctx) return TAB_MIN;
      ctx.font = '600 13px -apple-system, "Segoe UI", "Noto Sans KR", sans-serif';
      const w = ctx.measureText(text).width;
      return Math.max(TAB_MIN, Math.min(TAB_MAX, w + TAB_PADDING));
    }

    let isDemo = true;
    let index = 0;
    let target = measureWidth(LABELS[0]);
    let shown = target;

    function human() { if (isDemo) { wrap!.classList.remove(styles.isDemo); isDemo = false; } }
    function setLabel(i: number) {
      index = (i + LABELS.length) % LABELS.length;
      tabLabel!.textContent = LABELS[index];
      target = measureWidth(LABELS[index]);
    }
    function onPrev() { human(); setLabel(index - 1); }
    function onNext() { human(); setLabel(index + 1); }
    btnPrev.addEventListener("click", onPrev);
    btnNext.addEventListener("click", onNext);

    let last = 0;
    function autoAdvance(ts: number) {
      if (ts - last < STEP_MS) return;
      last = ts;
      setLabel(index + 1);
    }

    function loop(ts: number) {
      if (!last) last = ts;
      if (isDemo && !reduce) autoAdvance(ts);
      if (reduce) { shown = target; } else { shown += (target - shown) * LERP_RATE; }
      tab!.style.setProperty("--tab-w", shown.toFixed(2) + "px");
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      btnPrev!.removeEventListener("click", onPrev);
      btnNext!.removeEventListener("click", onNext);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.folder}>
          <div className={styles.tab} ref={tabRef}>
            <span className={styles.tabLabel} ref={labelRef}>문서</span>
          </div>
          <div className={styles.body}><span className={styles.cardMark} aria-hidden="true"></span></div>
        </div>
        <div className={styles.switchRow}>
          <button type="button" ref={prevRef}>이전 이름표</button>
          <button type="button" ref={nextRef}>다음 이름표</button>
        </div>
      </div>
    </main>
  );
}
