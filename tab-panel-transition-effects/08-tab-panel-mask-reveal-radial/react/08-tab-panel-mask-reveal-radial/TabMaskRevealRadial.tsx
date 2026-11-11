// TabMaskRevealRadial — vanilla 판(run/394/demo/08-tab-panel-mask-reveal-radial/index.html) 의 React 포트.
// select() 가 클릭(또는 키보드 이동)된 탭 라벨의 중심 좌표를 clip-path circle() 의 중심점으로 쓰고,
// 반경 목표값은 Math.hypot(wrap.width, wrap.height) 로 구한 패널 대각선 길이다.
import { useEffect, useRef } from "react";
import styles from "./TabMaskRevealRadial.module.scss";

type Box<T> = { current: T };

const HOLD_MS = 900;
const COUNT = 3;

export default function TabMaskRevealRadial() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const wrapRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const rEl = useRef(null) as unknown as Box<HTMLElement>;
  const tabRefs = useRef([null, null, null]) as unknown as Box<(HTMLButtonElement | null)[]>;
  const panelRefs = useRef([null, null, null]) as unknown as Box<(HTMLDivElement | null)[]>;
  const timerRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;
    let active = 0;
    let busy = false;

    function human() {
      if (isDemo) { rootRef.current?.classList.remove(styles.isDemo); isDemo = false; }
    }

    function select(idx: number) {
      if (idx === active || busy) return;
      const wrap = wrapRef.current, tab = tabRefs.current[idx];
      const incoming = panelRefs.current[idx], outgoing = panelRefs.current[active];
      if (!wrap || !tab || !incoming || !outgoing) return;
      busy = true;

      const tabRect = tab.getBoundingClientRect();
      const wrapRect = wrap.getBoundingClientRect();
      const cx = tabRect.left + tabRect.width / 2 - wrapRect.left; // 계산 겹: 탭 라벨 중심 좌표 → 마스크 중심
      const cy = tabRect.top + tabRect.height / 2 - wrapRect.top;
      const r = Math.hypot(wrapRect.width, wrapRect.height); // 계산 겹: 패널 대각선 길이 = 반경 목표값

      incoming.style.transition = "none";
      incoming.style.clipPath = "circle(0px at " + cx.toFixed(1) + "px " + cy.toFixed(1) + "px)";
      incoming.removeAttribute("hidden");
      incoming.classList.add(styles.isFront);
      incoming.getBoundingClientRect();
      incoming.style.transition = "";
      if (rEl.current) rEl.current.textContent = "0";

      const prevTab = tabRefs.current[active], nextTab = tabRefs.current[idx];
      prevTab?.classList.remove(styles.isActive);
      prevTab?.setAttribute("aria-selected", "false");
      prevTab?.setAttribute("tabindex", "-1");
      nextTab?.classList.add(styles.isActive);
      nextTab?.setAttribute("aria-selected", "true");
      nextTab?.setAttribute("tabindex", "0");

      requestAnimationFrame(() => {
        incoming.style.clipPath = "circle(" + r.toFixed(1) + "px at " + cx.toFixed(1) + "px " + cy.toFixed(1) + "px)";
        if (rEl.current) rEl.current.textContent = String(Math.round(r));
      });

      function onEnd(e: TransitionEvent) {
        if (e.propertyName !== "clip-path") return;
        incoming!.removeEventListener("transitionend", onEnd as EventListener);
        incoming!.classList.add(styles.isActive);
        incoming!.classList.remove(styles.isFront);
        incoming!.style.clipPath = "none";
        outgoing!.classList.remove(styles.isActive);
        outgoing!.setAttribute("hidden", "");
        active = idx;
        busy = false;
      }
      incoming.addEventListener("transitionend", onEnd as EventListener);
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

  const feats = [
    { name: "속도", num: "01", line: "응답 속도 120ms" },
    { name: "보안", num: "02", line: "2단계 인증 지원" },
    { name: "협업", num: "03", line: "실시간 공동 편집" },
  ];

  return (
    <main className={styles.stage}>
      <div className={styles.mr + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.tabs} role="tablist" aria-label="기능 탭">
          {feats.map((f, i) => (
            <button
              key={f.name}
              type="button"
              className={styles.tab + (i === 0 ? " " + styles.isActive : "")}
              role="tab"
              aria-selected={i === 0 ? "true" : "false"}
              tabIndex={i === 0 ? 0 : -1}
              ref={(el: HTMLButtonElement | null) => { tabRefs.current[i] = el; }}
            >{f.name}</button>
          ))}
        </div>
        <div className={styles.wrap} ref={wrapRef}>
          {feats.map((f, i) => (
            <div
              key={f.name}
              className={styles.panel + (i === 0 ? " " + styles.isActive : "")}
              role="tabpanel"
              tabIndex={0}
              hidden={i !== 0}
              ref={(el: HTMLDivElement | null) => { panelRefs.current[i] = el; }}
            >
              <span className={styles.num}>{f.num}</span>
              <p className={styles.line}>{f.line}</p>
            </div>
          ))}
        </div>
        <p className={styles.meta}>
          반경 <b ref={rEl}>0</b>px
        </p>
      </div>
    </main>
  );
}
