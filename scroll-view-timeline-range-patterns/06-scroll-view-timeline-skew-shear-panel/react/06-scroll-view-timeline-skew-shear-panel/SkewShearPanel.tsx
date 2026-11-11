import { useEffect, useRef, useState } from "react";
import styles from "./SkewShearPanel.module.scss";

// 핵심: animation-timeline: view() + animation-range: entry 로 기울기 값을 진입
// 구간 값(0~1)에 직접 묶는다 — 시작 지점에 가까울수록 기울어져 있다가 구간 값이
// 끝에 닿는 순간 0으로 풀린다. 미지원 환경은 교차 비율로 같은 기울기 값을 계산한다.
const SKEW_START = -18;

export default function SkewShearPanel() {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [badge, setBadge] = useState("진입 구간 0%~0%");
  const [demo, setDemo] = useState(true);
  const [supportsVt, setSupportsVt] = useState(false);

  useEffect(() => {
    const view = viewRef.current;
    const panel = panelRef.current;
    const root = rootRef.current;
    if (!view || !panel || !root) { return; }

    const vt = CSS.supports("animation-timeline: view()");
    setSupportsVt(vt);

    function entryRangePct() {
      const elH = panel!.offsetHeight;
      const viewH = view!.clientHeight;
      return Math.round(Math.min(100, (elH / viewH) * 100));
    }
    let rangeEnd = entryRangePct();
    let rangeText = "진입 구간 0%~" + rangeEnd + "%";

    function render(ratio: number) {
      if (!vt) {
        const skew = SKEW_START * (1 - ratio);
        panel!.style.transform = "skewX(" + skew.toFixed(1) + "deg)";
      }
      setBadge(rangeText + " · 진행 " + Math.round(ratio * 100) + "%");
    }

    let io: IntersectionObserver | null = null;
    if (!vt) {
      const STEPS: number[] = [];
      for (let s = 0; s <= 50; s += 1) { STEPS.push(s / 50); }
      io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { render(entry.intersectionRatio); });
      }, { root: view, threshold: STEPS });
      io.observe(panel);
    } else {
      setBadge(rangeText);
    }

    function onScroll() {
      if (vt) {
        const max = view!.scrollHeight - view!.clientHeight;
        const p = max > 0 ? Math.min(1, Math.max(0, view!.scrollTop / max)) : 0;
        setBadge(rangeText + " · 스크롤 " + Math.round(p * 100) + "%");
      }
    }
    view.addEventListener("scroll", onScroll, { passive: true });

    let playing = true;
    let frame = 0;
    const PERIOD = 66;
    let rafId = 0;
    function tick() {
      if (playing) {
        frame += 1;
        const max = view!.scrollHeight - view!.clientHeight;
        const t = frame % (PERIOD * 2);
        const f = t < PERIOD ? (t / PERIOD) : ((PERIOD * 2 - t) / PERIOD);
        view!.scrollTop = f * max;
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    function stopAuto() {
      setDemo(false);
      playing = false;
    }
    view.addEventListener("wheel", stopAuto, { passive: true });
    view.addEventListener("touchstart", stopAuto, { passive: true });

    function onClick() {
      playing = !playing;
      setDemo(playing);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "r" || e.key === "R") {
        frame = 0;
        view!.scrollTop = 0;
        render(0);
        playing = true;
        setDemo(true);
      }
    }
    root.addEventListener("keydown", onKeyDown);

    function onResize() {
      rangeEnd = entryRangePct();
      rangeText = "진입 구간 0%~" + rangeEnd + "%";
    }
    window.addEventListener("resize", onResize);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      playing = false;
      setDemo(false);
      render(1);
      panel.style.transform = "skewX(0deg)";
      setBadge(rangeText + " · 최종 상태");
    }

    const ctrl = root.querySelector("button");
    ctrl?.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(rafId);
      io?.disconnect();
      view.removeEventListener("scroll", onScroll);
      view.removeEventListener("wheel", stopAuto);
      view.removeEventListener("touchstart", stopAuto);
      root.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      ctrl?.removeEventListener("click", onClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div ref={rootRef} className={`${styles.ssp} ${demo ? styles["is-demo"] : ""} ${supportsVt ? styles["supports-vt"] : styles["no-vt"]}`}>
        <div className={styles["ssp__badge"]}>{badge}</div>
        <button className={styles["ssp__ctrl"]} type="button">{demo ? "일시정지" : "재생"}</button>
        <div ref={viewRef} className={styles["ssp__view"]}>
          <div className={styles["ssp__track"]}>
            <div className={`${styles["ssp__spacer"]} ${styles["ssp__spacer--top"]}`} />
            <div ref={panelRef} className={styles["ssp__panel"]}>
              <span className={styles["ssp__label"]}>요금제</span>
            </div>
            <div className={`${styles["ssp__spacer"]} ${styles["ssp__spacer--bottom"]}`} />
          </div>
        </div>
      </div>
    </main>
  );
}
