// TabHeightAutoMorph — vanilla 판(run/394/demo/01-tab-panel-height-auto-morph/index.html) 의 React 포트.
// select() 가 getBoundingClientRect 로 숨은/보이는 패널의 실측 높이를 재 그 차이(px)를
// BASE_MS + diff*MS_PER_PX 식에 넣어 전환 시간을 정하고, wrap 의 height 를 그 시간 동안 트랜지션한다.
import { useEffect, useRef } from "react";
import styles from "./TabHeightAutoMorph.module.scss";

type Box<T> = { current: T };

const BASE_MS = 180; // 계산 겹 상수: 높이 차이가 0px 이어도 최소한의 스무딩을 준다
const MS_PER_PX = 1.1; // 계산 겹 상수: 높이 차이 1px 마다 전환 시간이 이만큼 늘어난다
const MIN_MS = 180, MAX_MS = 620;
const HOLD_MS = 760; // 자동 순환이 탭 하나에 머무는 시간
const COUNT = 3;

export default function TabHeightAutoMorph() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const wrapRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const diffRef = useRef(null) as unknown as Box<HTMLElement>;
  const durRef = useRef(null) as unknown as Box<HTMLElement>;
  const tabRefs = useRef([null, null, null]) as unknown as Box<(HTMLButtonElement | null)[]>;
  const panelRefs = useRef([null, null, null]) as unknown as Box<(HTMLDivElement | null)[]>;
  const timerRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;
    let active = 0;
    let busy = false;

    function rectHeight(idx: number): number {
      const p = panelRefs.current[idx];
      const wrap = wrapRef.current;
      if (!p || !wrap) return 0;
      const wasHidden = p.hasAttribute("hidden");
      if (wasHidden) {
        p.style.visibility = "hidden";
        p.style.position = "absolute";
        p.style.width = wrap.clientWidth + "px";
        p.removeAttribute("hidden");
      }
      const h = p.getBoundingClientRect().height;
      if (wasHidden) {
        p.setAttribute("hidden", "");
        p.style.visibility = "";
        p.style.position = "";
        p.style.width = "";
      }
      return h;
    }

    function human() {
      if (isDemo) { rootRef.current?.classList.remove(styles.isDemo); isDemo = false; }
    }

    function select(idx: number) {
      if (idx === active || busy) return;
      busy = true;
      const wrap = wrapRef.current;
      const fromH = rectHeight(active);
      const toH = rectHeight(idx);
      if (!wrap) return;
      const diff = Math.abs(toH - fromH); // 계산 겹: 두 패널의 실측 높이 차이(px)
      const dur = Math.min(MAX_MS, Math.max(MIN_MS, BASE_MS + diff * MS_PER_PX)); // 계산 겹: 차이가 클수록 전환이 길다

      wrap.style.setProperty("--tp-dur", dur.toFixed(0) + "ms");
      wrap.style.height = fromH.toFixed(2) + "px";
      wrap.getBoundingClientRect(); // 강제 리플로우

      const prevTab = tabRefs.current[active], nextTab = tabRefs.current[idx];
      const prevPanel = panelRefs.current[active], nextPanel = panelRefs.current[idx];
      prevTab?.classList.remove(styles.isActive);
      prevTab?.setAttribute("aria-selected", "false");
      prevTab?.setAttribute("tabindex", "-1");
      prevPanel?.setAttribute("hidden", "");
      nextTab?.classList.add(styles.isActive);
      nextTab?.setAttribute("aria-selected", "true");
      nextTab?.setAttribute("tabindex", "0");
      nextPanel?.removeAttribute("hidden");

      requestAnimationFrame(() => { wrap.style.height = toH.toFixed(2) + "px"; });

      if (diffRef.current) diffRef.current.textContent = String(Math.round(diff));
      if (durRef.current) durRef.current.textContent = String(Math.round(dur));
      active = idx;
      window.setTimeout(() => {
        busy = false;
        const p = panelRefs.current[active];
        if (wrap && p) wrap.style.height = p.getBoundingClientRect().height + "px";
      }, dur + 40);
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

    const wrap = wrapRef.current;
    if (wrap) wrap.style.height = rectHeight(0) + "px";
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

  return (
    <main className={styles.stage}>
      <div className={styles.tp + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.tabs} role="tablist" aria-label="설정 탭">
          <button type="button" className={styles.tab + " " + styles.isActive} role="tab" aria-selected="true" aria-controls="rtp-panel-0" data-idx="0"
            ref={(el: HTMLButtonElement | null) => { tabRefs.current[0] = el; }}>요약</button>
          <button type="button" className={styles.tab} role="tab" aria-selected="false" aria-controls="rtp-panel-1" data-idx="1" tabIndex={-1}
            ref={(el: HTMLButtonElement | null) => { tabRefs.current[1] = el; }}>세부</button>
          <button type="button" className={styles.tab} role="tab" aria-selected="false" aria-controls="rtp-panel-2" data-idx="2" tabIndex={-1}
            ref={(el: HTMLButtonElement | null) => { tabRefs.current[2] = el; }}>이력</button>
        </div>
        <div className={styles.wrap} ref={wrapRef}>
          <div className={styles.panel} id="rtp-panel-0" role="tabpanel" tabIndex={0}
            ref={(el: HTMLDivElement | null) => { panelRefs.current[0] = el; }}>
            <p className={styles.lineA} />
            <p className={styles.lineB} />
          </div>
          <div className={styles.panel} id="rtp-panel-1" role="tabpanel" tabIndex={0} hidden
            ref={(el: HTMLDivElement | null) => { panelRefs.current[1] = el; }}>
            <p className={styles.lineA} />
            <p className={styles.lineB} />
            <p className={styles.lineC} />
            <div className={styles.bars}><span /><span /><span /><span /></div>
          </div>
          <div className={styles.panel} id="rtp-panel-2" role="tabpanel" tabIndex={0} hidden
            ref={(el: HTMLDivElement | null) => { panelRefs.current[2] = el; }}>
            <p className={styles.lineA} />
            <ul className={styles.list}>
              <li /><li /><li /><li /><li />
            </ul>
          </div>
        </div>
        <p className={styles.meta}>
          높이 차이 <b ref={diffRef}>0</b>px · 전환 <b ref={durRef}>0</b>ms
        </p>
      </div>
    </main>
  );
}
