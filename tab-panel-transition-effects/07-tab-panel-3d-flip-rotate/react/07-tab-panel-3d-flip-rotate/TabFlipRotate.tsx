// TabFlipRotate — vanilla 판(run/394/demo/07-tab-panel-3d-flip-rotate/index.html) 의 React 포트.
// tickAngle() 이 실측 경과시간/총시간 = t(0~1) 을 0~180도 rotateY 각도로 바꿔 표시하고, 실제 회전은
// card 의 transform: rotateY(dir*180deg) transition 이 구동한다(dir 은 목표 인덱스 부호).
import { useEffect, useRef } from "react";
import styles from "./TabFlipRotate.module.scss";

type Box<T> = { current: T };

const DUR_MS = 600;
const HOLD_MS = 900;
const COUNT = 3;

const cats = [
  { name: "요약", num: "01", line: "핵심 지표 한눈에" },
  { name: "상세", num: "02", line: "항목별 수치 전체" },
  { name: "메모", num: "03", line: "작성한 메모 목록" },
];

export default function TabFlipRotate() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const cardRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const angleEl = useRef(null) as unknown as Box<HTMLElement>;
  const frontEl = useRef(null) as unknown as Box<HTMLDivElement>;
  const frontNumEl = useRef(null) as unknown as Box<HTMLElement>;
  const frontLineEl = useRef(null) as unknown as Box<HTMLElement>;
  const backNumEl = useRef(null) as unknown as Box<HTMLElement>;
  const backLineEl = useRef(null) as unknown as Box<HTMLElement>;
  const tabRefs = useRef([null, null, null]) as unknown as Box<(HTMLButtonElement | null)[]>;
  const timerRef = useRef(0) as unknown as Box<number>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;
    let active = 0;
    let busy = false;

    function human() {
      if (isDemo) { rootRef.current?.classList.remove(styles.isDemo); isDemo = false; }
    }

    function renderFace(numEl: HTMLElement | null, lineEl: HTMLElement | null, idx: number) {
      if (numEl) numEl.textContent = cats[idx].num;
      if (lineEl) lineEl.textContent = cats[idx].line;
    }

    function tickAngle(start: number) {
      function step(ts: number) {
        const t = Math.min(1, (ts - start) / DUR_MS); // 계산 겹: 실측 경과시간 / 총 시간 = 진행률 t(0~1)
        const angle = Math.round(t * 180); // 계산 겹: 진행률을 0~180도 rotateY 각도 값으로 변환
        if (angleEl.current) angleEl.current.textContent = String(angle);
        if (t < 1 && busy) { rafRef.current = requestAnimationFrame(step); } else { rafRef.current = 0; }
      }
      rafRef.current = requestAnimationFrame(step);
    }

    function onEnd(e: TransitionEvent) {
      if (e.propertyName !== "transform") return;
      const card = cardRef.current;
      card.removeEventListener("transitionend", onEnd as EventListener);
      card.style.transition = "none";
      card.style.transform = "rotateY(0deg)";
      card.getBoundingClientRect();
      card.style.transition = "";
      renderFace(frontNumEl.current, frontLineEl.current, pendingIdx);
      frontEl.current?.setAttribute("aria-labelledby", "fp-tab-" + pendingIdx);
      active = pendingIdx;
      busy = false;
      if (angleEl.current) angleEl.current.textContent = "0";
    }

    let pendingIdx = 0;

    function flipTo(idx: number) {
      if (idx === active || busy) return;
      busy = true;
      pendingIdx = idx;
      const dir = idx > active ? 1 : -1; // 계산 겹: 목표 인덱스와의 부호로 회전 방향 결정
      renderFace(backNumEl.current, backLineEl.current, idx);

      const prevTab = tabRefs.current[active], nextTab = tabRefs.current[idx];
      prevTab?.classList.remove(styles.isActive);
      prevTab?.setAttribute("aria-selected", "false");
      prevTab?.setAttribute("tabindex", "-1");
      nextTab?.classList.add(styles.isActive);
      nextTab?.setAttribute("aria-selected", "true");
      nextTab?.setAttribute("tabindex", "0");

      const startTs = performance.now();
      const card = cardRef.current;
      requestAnimationFrame(() => {
        card.style.transform = "rotateY(" + dir * 180 + "deg)";
      });
      tickAngle(startTs);
      card.addEventListener("transitionend", onEnd as EventListener);
    }

    function onKeydown(e: KeyboardEvent) {
      const idx = tabRefs.current.indexOf(document.activeElement as HTMLButtonElement);
      if (idx === -1) return;
      let next: number | null = null;
      if (e.key === "ArrowRight") next = (idx + 1) % COUNT;
      else if (e.key === "ArrowLeft") next = (idx - 1 + COUNT) % COUNT;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = COUNT - 1;
      if (next === null) return;
      e.preventDefault();
      human();
      tabRefs.current[next]?.focus({ preventScroll: true });
      flipTo(next);
    }

    function onTabClick(i: number) { return () => { human(); flipTo(i); }; }
    const clickHandlers = [0, 1, 2].map(onTabClick);
    tabRefs.current.forEach((t, i) => t?.addEventListener("click", clickHandlers[i]));
    rootRef.current?.addEventListener("keydown", onKeydown);

    function loop() {
      if (!isDemo) return;
      flipTo((active + 1) % COUNT);
      timerRef.current = window.setTimeout(loop, HOLD_MS);
    }

    if (!reduce) {
      timerRef.current = window.setTimeout(loop, HOLD_MS);
    } else {
      rootRef.current?.classList.remove(styles.isDemo);
    }

    return () => {
      window.clearTimeout(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      tabRefs.current.forEach((t, i) => t?.removeEventListener("click", clickHandlers[i]));
      rootRef.current?.removeEventListener("keydown", onKeydown);
      cardRef.current?.removeEventListener("transitionend", onEnd as EventListener);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.fp + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.tabs} role="tablist" aria-label="대시보드 탭">
          {cats.map((c, i) => (
            <button
              key={c.name}
              type="button"
              className={styles.tab + (i === 0 ? " " + styles.isActive : "")}
              role="tab"
              id={"fp-tab-" + i}
              aria-selected={i === 0 ? "true" : "false"}
              aria-controls="fpFrontReact"
              tabIndex={i === 0 ? 0 : -1}
              ref={(el: HTMLButtonElement | null) => { tabRefs.current[i] = el; }}
            >{c.name}</button>
          ))}
        </div>
        <div className={styles.persp}>
          <div className={styles.card} ref={cardRef}>
            <div
              className={styles.face + " " + styles.faceFront}
              id="fpFrontReact"
              role="tabpanel"
              tabIndex={0}
              aria-labelledby="fp-tab-0"
              ref={frontEl}
            >
              <span className={styles.num} ref={frontNumEl}>01</span>
              <p className={styles.line} ref={frontLineEl}>핵심 지표 한눈에</p>
            </div>
            <div className={styles.face + " " + styles.faceBack} aria-hidden="true">
              <span className={styles.num} ref={backNumEl}>02</span>
              <p className={styles.line} ref={backLineEl}>항목별 수치 전체</p>
            </div>
          </div>
        </div>
        <p className={styles.meta}>
          회전각 <b ref={angleEl}>0</b>도
        </p>
      </div>
    </main>
  );
}
