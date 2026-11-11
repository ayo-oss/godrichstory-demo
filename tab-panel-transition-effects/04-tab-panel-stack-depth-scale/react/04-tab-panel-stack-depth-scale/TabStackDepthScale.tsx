// TabStackDepthScale — vanilla 판(run/394/demo/04-tab-panel-stack-depth-scale/index.html) 의 React 포트.
// apply() 가 |탭 인덱스 - 활성 인덱스| 로 정수 거리(--d)를 구해 각 패널에 심으면, module.scss 의
// calc(var(--d) * ...) 가 scale·translateY·translateZ·opacity·filter 를 유도해 물러난다.
import { useEffect, useRef, CSSProperties } from "react";
import styles from "./TabStackDepthScale.module.scss";

type Box<T> = { current: T };

const SCALE_STEP = 0.08; // 계산 겹 상수: 인덱스 거리 1칸마다 scale 이 이만큼 줄어든다
const HOLD_MS = 780;
const COUNT = 3;

export default function TabStackDepthScale() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const distRef = useRef(null) as unknown as Box<HTMLElement>;
  const scaleRef = useRef(null) as unknown as Box<HTMLElement>;
  const tabRefs = useRef([null, null, null]) as unknown as Box<(HTMLButtonElement | null)[]>;
  const panelRefs = useRef([null, null, null]) as unknown as Box<(HTMLDivElement | null)[]>;
  const timerRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;
    let active = 0;

    function human() {
      if (isDemo) { rootRef.current?.classList.remove(styles.isDemo); isDemo = false; }
    }

    function apply() {
      panelRefs.current.forEach((p, i) => {
        if (!p) return;
        const d = Math.abs(i - active); // 계산 겹: 활성 탭과의 정수 인덱스 거리
        p.style.setProperty("--d", String(d));
        p.setAttribute("aria-hidden", d === 0 ? "false" : "true");
      });
      if (distRef.current) distRef.current.textContent = "1";
      if (scaleRef.current) scaleRef.current.textContent = (1 - SCALE_STEP).toFixed(2);
    }

    function select(idx: number) {
      if (idx === active) return;
      const prevTab = tabRefs.current[active], nextTab = tabRefs.current[idx];
      prevTab?.classList.remove(styles.isActive);
      prevTab?.setAttribute("aria-selected", "false");
      prevTab?.setAttribute("tabindex", "-1");
      nextTab?.classList.add(styles.isActive);
      nextTab?.setAttribute("aria-selected", "true");
      nextTab?.setAttribute("tabindex", "0");
      active = idx;
      apply();
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
      tabRefs.current.forEach((t, i) => t?.removeEventListener("click", clickHandlers[i]));
      rootRef.current?.removeEventListener("keydown", onKeydown);
    };
  }, []);

  const cats = [
    { name: "풍경", num: "01", line: "풍경 12장" },
    { name: "인물", num: "02", line: "인물 8장" },
    { name: "정물", num: "03", line: "정물 5장" },
  ];

  return (
    <main className={styles.stage}>
      <div className={styles.sd + " " + styles.isDemo} ref={rootRef}>
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
              className={styles.panel}
              role="tabpanel"
              tabIndex={0}
              aria-hidden={i === 0 ? "false" : "true"}
              style={{ ["--d" as string]: String(i) } as CSSProperties}
              ref={(el: HTMLDivElement | null) => { panelRefs.current[i] = el; }}
            >
              <span className={styles.num}>{c.num}</span>
              <p className={styles.line}>{c.line}</p>
            </div>
          ))}
        </div>
        <p className={styles.meta}>
          거리 <b ref={distRef}>0</b>칸 · scale <b ref={scaleRef}>1.00</b>
        </p>
      </div>
    </main>
  );
}
