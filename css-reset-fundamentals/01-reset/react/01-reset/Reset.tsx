// Reset — vanilla 판(run/376/demo/01-reset/index.html) 의 React 포트.
// 패널에 .reset 클래스를 토글해 브라우저 기본값(h3·ul·p 여백)이 지워지는 전후를 보여주고,
// 룰러 막대는 실제 렌더 높이(getBoundingClientRect)를 매 프레임 다시 재 채운다.
import { useEffect, useRef } from "react";
import styles from "./Reset.module.scss";

type Box<T> = { current: T };

const RESET_SCOPE: "minimal" | "full" = "minimal";
const STEP_MS = 320;
const CLEARED_MINIMAL = ["heading-margin", "paragraph-margin", "list-style"];
const CLEARED_FULL = CLEARED_MINIMAL.concat(["link-decoration"]);
const MAX_HEIGHT_PX = 130;

export default function Reset() {
  const wrapRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const panelRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const toggleBtnRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const stateLabelRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const readoutRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const rulerFillRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const demoLinkRef = useRef(null) as unknown as Box<HTMLAnchorElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wrap = wrapRef.current;
    const panel = panelRef.current;
    const toggleBtn = toggleBtnRef.current;
    const stateLabel = stateLabelRef.current;
    const readout = readoutRef.current;
    const rulerFill = rulerFillRef.current;
    const demoLink = demoLinkRef.current;
    if (!wrap || !panel || !toggleBtn || !stateLabel || !readout || !rulerFill || !demoLink) return;

    let isDemo = true;
    let on = false;

    function clearedList() {
      return RESET_SCOPE === "full" ? CLEARED_FULL : CLEARED_MINIMAL;
    }

    function measure() {
      const h = panel!.getBoundingClientRect().height;
      const ratio = Math.min(1, h / MAX_HEIGHT_PX);
      rulerFill!.style.transform = "scaleY(" + ratio.toFixed(3) + ")";
      readout!.textContent = "높이 " + Math.round(h) + "px · 지워진 기본값 " + (on ? clearedList().length : 0) + "개";
    }

    function apply(next: boolean) {
      on = next;
      panel!.classList.toggle(styles.reset, on);
      panel!.classList.toggle(styles.full, on && RESET_SCOPE === "full");
      stateLabel!.textContent = on ? "리셋 후" : "리셋 전";
      toggleBtn!.setAttribute("aria-pressed", String(on));
    }

    function human() { if (isDemo) { wrap!.classList.remove(styles.isDemo); isDemo = false; } }
    function onToggleClick() { human(); apply(!on); }
    function onLinkClick(e: MouseEvent) { human(); e.preventDefault(); }
    toggleBtn.addEventListener("click", onToggleClick);
    demoLink.addEventListener("click", onLinkClick);

    let last = 0;
    function loop(ts: number) {
      if (!last) last = ts;
      if (isDemo && !reduce && ts - last >= STEP_MS) { last = ts; apply(!on); }
      measure();
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      toggleBtn!.removeEventListener("click", onToggleClick);
      demoLink!.removeEventListener("click", onLinkClick);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={wrapRef}>
        <div className={styles.head}>
          <span className={styles.stateLabel} ref={stateLabelRef}>리셋 전</span>
          <button className={styles.toggleBtn} ref={toggleBtnRef} type="button" aria-pressed="false">리셋 적용</button>
        </div>
        <div className={styles.body}>
          <div className={styles.panel} ref={panelRef}>
            <h3 className={styles.demoHeading}>제목 영역</h3>
            <ul className={styles.demoList}>
              <li>항목 하나</li>
              <li>항목 둘</li>
              <li>항목 셋</li>
            </ul>
            <p className={styles.demoPara}>문단 여백은 브라우저마다 다릅니다. <a href="#" className={styles.demoLink} ref={demoLinkRef}>관련 링크</a></p>
          </div>
          <div className={styles.ruler}>
            <div className={styles.rulerFill} ref={rulerFillRef}></div>
          </div>
        </div>
        <div className={styles.readout} ref={readoutRef}>높이 —px · 지워진 기본값 —개</div>
      </div>
    </main>
  );
}
