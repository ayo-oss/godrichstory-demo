// TabClipWipeProgress — vanilla 판(run/394/demo/03-tab-panel-clip-wipe-progress/index.html) 의 React 포트.
// select() 가 클릭 x 좌표를 탭바 폭 대비 비율(0~1)로 바꿔 그 지점에서 폭 0인 clip-path 슬릿으로
// 새 패널을 시작한 뒤 inset(0)으로 넓혀 그 지점부터 좌우로 닦아낸다.
import { useEffect, useRef } from "react";
import styles from "./TabClipWipeProgress.module.scss";

type Box<T> = { current: T };

const HOLD_MS = 720; // 전환(css $dur-enter) 뒤 자동 순환이 머무는 시간
const COUNT = 3;

export default function TabClipWipeProgress() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const tabsBarRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const rEl = useRef(null) as unknown as Box<HTMLElement>;
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

    function select(idx: number, originX?: number) {
      if (idx === active) return;
      const tabsBar = tabsBarRef.current;
      const tab = tabRefs.current[idx];
      if (!tabsBar || !tab) return;
      const barRect = tabsBar.getBoundingClientRect();
      const x = typeof originX === "number" ? originX : tab.getBoundingClientRect().left + tab.getBoundingClientRect().width / 2;
      const r = barRect.width > 0 ? Math.min(1, Math.max(0, (x - barRect.left) / barRect.width)) : 0.5; // 계산 겹: 클릭 x 좌표 → 탭바 폭 대비 비율(0~1)
      const pct = (r * 100).toFixed(1) + "%";

      const prevTab = tabRefs.current[active], nextTab = tabRefs.current[idx];
      const prevPanel = panelRefs.current[active], nextPanel = panelRefs.current[idx];
      prevTab?.classList.remove(styles.isActive);
      prevTab?.setAttribute("aria-selected", "false");
      prevTab?.setAttribute("tabindex", "-1");
      prevPanel?.classList.remove(styles.isVisible);
      prevPanel?.setAttribute("hidden", "");

      if (nextPanel) {
        nextPanel.style.transition = "none";
        nextPanel.style.clipPath = "inset(0 calc(100% - " + pct + ") 0 " + pct + ")"; // 계산 겹: 비율 지점에서 폭 0 인 슬릿으로 시작
        nextPanel.removeAttribute("hidden");
        nextPanel.getBoundingClientRect();
        nextPanel.style.transition = "";
        requestAnimationFrame(() => {
          nextPanel.style.clipPath = "inset(0 0 0 0)";
          nextPanel.classList.add(styles.isVisible);
        });
      }

      nextTab?.classList.add(styles.isActive);
      nextTab?.setAttribute("aria-selected", "true");
      nextTab?.setAttribute("tabindex", "0");

      if (rEl.current) rEl.current.textContent = (r * 100).toFixed(0);
      active = idx;
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
      const t = tabRefs.current[next];
      t?.focus({ preventScroll: true });
      const rect = t?.getBoundingClientRect();
      select(next, rect ? rect.left + rect.width / 2 : undefined);
    }

    function onTabClick(i: number) {
      return () => {
        human();
        const t = tabRefs.current[i];
        const rect = t?.getBoundingClientRect();
        select(i, rect ? rect.left + rect.width / 2 : undefined);
      };
    }
    const clickHandlers = [0, 1, 2].map(onTabClick);
    tabRefs.current.forEach((t, i) => t?.addEventListener("click", clickHandlers[i]));
    rootRef.current?.addEventListener("keydown", onKeydown);

    function loop() {
      if (!isDemo) return;
      const next = (active + 1) % COUNT;
      const t = tabRefs.current[next];
      const rect = t?.getBoundingClientRect();
      select(next, rect ? rect.left + rect.width / 2 : undefined);
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

  const plans = [
    { name: "베이직", price: "9,900", line: "개인 프로젝트용" },
    { name: "스탠다드", price: "29,900", line: "소규모 팀용" },
    { name: "프로", price: "79,900", line: "전체 기능" },
  ];

  return (
    <main className={styles.stage}>
      <div className={styles.cw + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.tabs} ref={tabsBarRef} role="tablist" aria-label="플랜 탭">
          {plans.map((p, i) => (
            <button
              key={p.name}
              type="button"
              className={styles.tab + (i === 0 ? " " + styles.isActive : "")}
              role="tab"
              aria-selected={i === 0 ? "true" : "false"}
              tabIndex={i === 0 ? 0 : -1}
              ref={(el: HTMLButtonElement | null) => { tabRefs.current[i] = el; }}
            >{p.name}</button>
          ))}
        </div>
        <div className={styles.wrap}>
          {plans.map((p, i) => (
            <div
              key={p.name}
              className={styles.panel + (i === 0 ? " " + styles.isVisible : "")}
              role="tabpanel"
              tabIndex={0}
              hidden={i !== 0}
              ref={(el: HTMLDivElement | null) => { panelRefs.current[i] = el; }}
            >
              <span className={styles.num}>{p.price}</span>
              <p className={styles.line}>{p.line}</p>
            </div>
          ))}
        </div>
        <p className={styles.meta}>
          닦아낸 시작점 <b ref={rEl}>0</b>%
        </p>
      </div>
    </main>
  );
}
