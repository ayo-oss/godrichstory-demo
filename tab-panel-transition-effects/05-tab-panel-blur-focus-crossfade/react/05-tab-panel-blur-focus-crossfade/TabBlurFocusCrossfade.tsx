// TabBlurFocusCrossfade — vanilla 판(run/394/demo/05-tab-panel-blur-focus-crossfade/index.html) 의 React 포트.
// select() 의 frame() 이 rAF 로 실측 경과시간/총시간 = t(0~1) 를 구해, 나가는 패널은 blur(t*BLUR_MAX)·
// opacity(1-t), 들어오는 패널은 blur((1-t)*BLUR_MAX)·opacity(t) 로 매 프레임 직접 스타일을 쓴다.
import { useEffect, useRef } from "react";
import styles from "./TabBlurFocusCrossfade.module.scss";

type Box<T> = { current: T };

const BLUR_MAX = 10; // 계산 겹 상수: 진행률 t=1 에서 나가는 패널이 도달하는 최대 블러(px)
const DUR_MS = 460;
const HOLD_MS = 760;
const COUNT = 3;

export default function TabBlurFocusCrossfade() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const tEl = useRef(null) as unknown as Box<HTMLElement>;
  const tabRefs = useRef([null, null, null]) as unknown as Box<(HTMLButtonElement | null)[]>;
  const panelRefs = useRef([null, null, null]) as unknown as Box<(HTMLDivElement | null)[]>;
  const timerRef = useRef(0) as unknown as Box<number>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;
    let active = 0;

    function human() {
      if (isDemo) { rootRef.current?.classList.remove(styles.isDemo); isDemo = false; }
    }

    function setT(el: HTMLElement, t: number, incoming: boolean) {
      const blur = incoming ? (1 - t) * BLUR_MAX : t * BLUR_MAX; // 계산 겹
      const opacity = incoming ? t : 1 - t;
      el.style.filter = "blur(" + blur.toFixed(2) + "px)";
      el.style.opacity = String(opacity);
    }

    function select(idx: number) {
      if (idx === active || rafRef.current) return;
      const prevIdx = active;
      const outEl = panelRefs.current[prevIdx];
      const inEl = panelRefs.current[idx];
      if (!outEl || !inEl) return;

      const prevTab = tabRefs.current[prevIdx], nextTab = tabRefs.current[idx];
      prevTab?.classList.remove(styles.isActive);
      prevTab?.setAttribute("aria-selected", "false");
      prevTab?.setAttribute("tabindex", "-1");
      nextTab?.classList.add(styles.isActive);
      nextTab?.setAttribute("aria-selected", "true");
      nextTab?.setAttribute("tabindex", "0");

      inEl.removeAttribute("hidden");
      inEl.classList.add(styles.isFront);
      setT(outEl, 0, false);
      setT(inEl, 0, true);

      let start = 0;
      function frame(ts: number) {
        if (!start) start = ts;
        const t = Math.min(1, (ts - start) / DUR_MS); // 계산 겹: 실측 경과시간 / 총 시간 = 진행률 t(0~1)
        setT(outEl!, t, false);
        setT(inEl!, t, true);
        if (tEl.current) tEl.current.textContent = t.toFixed(2);
        if (t < 1) {
          rafRef.current = requestAnimationFrame(frame);
        } else {
          rafRef.current = 0;
          outEl!.setAttribute("hidden", "");
          outEl!.classList.remove(styles.isFront);
          active = idx;
        }
      }
      rafRef.current = requestAnimationFrame(frame);
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
      select(next);
    }

    function onTabClick(i: number) { return () => { human(); select(i); }; }
    const clickHandlers = [0, 1, 2].map(onTabClick);
    tabRefs.current.forEach((t, i) => t?.addEventListener("click", clickHandlers[i]));
    rootRef.current?.addEventListener("keydown", onKeydown);

    function loop() {
      if (!isDemo) return;
      select((active + 1) % COUNT);
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
    };
  }, []);

  const cats = [
    { name: "공지", num: "03", line: "이번 주 공지 3건" },
    { name: "리뷰", num: "128", line: "누적 리뷰 128건" },
    { name: "기록", num: "47", line: "최근 기록 47건" },
  ];

  return (
    <main className={styles.stage}>
      <div className={styles.bf + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.tabs} role="tablist" aria-label="카테고리 탭">
          {cats.map((c, i) => (
            <button
              key={c.name}
              type="button"
              className={styles.tab + (i === 0 ? " " + styles.isActive : "")}
              role="tab"
              aria-selected={i === 0 ? "true" : "false"}
              tabIndex={i === 0 ? 0 : -1}
              ref={(el: HTMLButtonElement | null) => { tabRefs.current[i] = el; }}
            >{c.name}</button>
          ))}
        </div>
        <div className={styles.wrap}>
          {cats.map((c, i) => (
            <div
              key={c.name}
              className={styles.panel + (i === 0 ? " " + styles.isFront : "")}
              role="tabpanel"
              tabIndex={0}
              hidden={i !== 0}
              ref={(el: HTMLDivElement | null) => { panelRefs.current[i] = el; }}
            >
              <span className={styles.num}>{c.num}</span>
              <p className={styles.line}>{c.line}</p>
            </div>
          ))}
        </div>
        <p className={styles.meta}>
          전환 진행률 t=<b ref={tEl}>0.00</b>
        </p>
      </div>
    </main>
  );
}
