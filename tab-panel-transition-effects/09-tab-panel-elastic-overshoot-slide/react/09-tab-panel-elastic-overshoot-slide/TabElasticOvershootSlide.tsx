// TabElasticOvershootSlide — vanilla 판(run/394/demo/09-tab-panel-elastic-overshoot-slide/index.html) 의 React 포트.
// frame() 이 매 프레임 실측 dt 로 스프링 힘 = 변위*STIFFNESS - 속도*DAMPING 을 적분해 track 을 목표 위치로
// 당긴다. DAMPING 이 작을수록 목표를 지나쳤다가 되돌아오는 초과분(px)이 커진다. transition 없이 매 프레임
// transform 을 직접 쓴다(진짜 물리 계산).
import { useEffect, useRef } from "react";
import styles from "./TabElasticOvershootSlide.module.scss";

type Box<T> = { current: T };

const HOLD_MS = 900;
const COUNT = 3;
const STIFFNESS = 210;
const DAMPING = 20; // 계산 겹 상수: 스프링 감쇠 — 값이 작을수록 튕기는 폭이 커진다

export default function TabElasticOvershootSlide() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const viewportRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const trackRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const overEl = useRef(null) as unknown as Box<HTMLElement>;
  const tabRefs = useRef([null, null, null]) as unknown as Box<(HTMLButtonElement | null)[]>;
  const panelRefs = useRef([null, null, null]) as unknown as Box<(HTMLDivElement | null)[]>;
  const timerRef = useRef(0) as unknown as Box<number>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;
    let active = 0;
    let pos = 0, vel = 0, target = 0;
    let lastTs = 0;
    let crossed = false, overshootPeak = 0, startErr = 0;

    function human() {
      if (isDemo) { rootRef.current?.classList.remove(styles.isDemo); isDemo = false; }
    }

    function widths() {
      const viewport = viewportRef.current;
      const w = viewport ? viewport.clientWidth : 0;
      panelRefs.current.forEach((p) => { if (p) p.style.width = w + "px"; });
      return w;
    }

    function settleInstant() {
      const w = widths();
      pos = -active * w;
      target = pos;
      if (trackRef.current) trackRef.current.style.transform = "translateX(" + pos.toFixed(2) + "px)";
    }

    function frame(ts: number) {
      if (!lastTs) lastTs = ts;
      const dt = Math.min(0.032, (ts - lastTs) / 1000);
      lastTs = ts;
      const err = target - pos;
      if (!crossed && Math.sign(err) !== Math.sign(startErr) && startErr !== 0) crossed = true; // 계산 겹
      if (crossed) overshootPeak = Math.max(overshootPeak, Math.abs(pos - target));
      const force = err * STIFFNESS - vel * DAMPING; // 계산 겹: 스프링 힘
      vel += force * dt;
      pos += vel * dt;
      if (trackRef.current) trackRef.current.style.transform = "translateX(" + pos.toFixed(2) + "px)";
      if (overEl.current) overEl.current.textContent = overshootPeak.toFixed(1);
      if (Math.abs(target - pos) < 0.4 && Math.abs(vel) < 2) {
        pos = target; vel = 0; lastTs = 0;
        if (trackRef.current) trackRef.current.style.transform = "translateX(" + pos.toFixed(2) + "px)";
        rafRef.current = 0;
        return;
      }
      rafRef.current = requestAnimationFrame(frame);
    }

    function select(idx: number) {
      if (idx === active) return;
      const w = widths();
      target = -idx * w;
      startErr = target - pos;
      crossed = false;
      overshootPeak = 0;
      if (overEl.current) overEl.current.textContent = "0.0";

      const prevTab = tabRefs.current[active], nextTab = tabRefs.current[idx];
      prevTab?.classList.remove(styles.isActive);
      prevTab?.setAttribute("aria-selected", "false");
      prevTab?.setAttribute("tabindex", "-1");
      nextTab?.classList.add(styles.isActive);
      nextTab?.setAttribute("aria-selected", "true");
      nextTab?.setAttribute("tabindex", "0");
      active = idx;

      if (reduce) {
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
        pos = target; vel = 0;
        if (trackRef.current) trackRef.current.style.transform = "translateX(" + pos.toFixed(2) + "px)";
        return;
      }
      if (!rafRef.current) { lastTs = 0; rafRef.current = requestAnimationFrame(frame); }
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

    function onResize() {
      if (!rafRef.current) settleInstant();
    }

    function onTabClick(i: number) { return () => { human(); select(i); }; }
    const clickHandlers = [0, 1, 2].map(onTabClick);
    tabRefs.current.forEach((t, i) => t?.addEventListener("click", clickHandlers[i]));
    rootRef.current?.addEventListener("keydown", onKeydown);
    window.addEventListener("resize", onResize);

    settleInstant();

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
      window.removeEventListener("resize", onResize);
      tabRefs.current.forEach((t, i) => t?.removeEventListener("click", clickHandlers[i]));
      rootRef.current?.removeEventListener("keydown", onKeydown);
    };
  }, []);

  const cats = [
    { name: "인기", num: "128", line: "인기 상품 128종" },
    { name: "신상", num: "32", line: "이번 주 신상 32종" },
    { name: "할인", num: "54", line: "할인 진행 54종" },
  ];

  return (
    <main className={styles.stage}>
      <div className={styles.es + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.tabs} role="tablist" aria-label="메뉴 탭">
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
        <div className={styles.viewport} ref={viewportRef}>
          <div className={styles.track} ref={trackRef}>
            {cats.map((c, i) => (
              <div
                key={c.name}
                className={styles.panel}
                role="tabpanel"
                tabIndex={0}
                ref={(el: HTMLDivElement | null) => { panelRefs.current[i] = el; }}
              >
                <span className={styles.num}>{c.num}</span>
                <p className={styles.line}>{c.line}</p>
              </div>
            ))}
          </div>
        </div>
        <p className={styles.meta}>
          초과분 <b ref={overEl}>0.0</b>px
        </p>
      </div>
    </main>
  );
}
