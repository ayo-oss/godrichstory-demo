import { useEffect, useRef, useState } from "react";
import styles from "./ShadowLiftDepth.module.scss";

// 핵심: animation-timeline: view() + animation-range: cover 로 요소가 뷰포트를
// 통과하는 전체 구간 값(0~1)에 그림자 번짐 거리·흐림 값과 들어올림 정도를 함께
// 묶는다. 미지원 환경은 스크롤 위치로 같은 통과 진행 값을 계산해 같은 그림자를 그린다.
// VIEWTL_SHADOW_SPREAD_PX — 변형 3: 24 → 48 로 늘리면 그림자가 더 멀리 번져 보인다.
const VIEWTL_SHADOW_SPREAD_PX = 24;

export default function ShadowLiftDepth() {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [badge, setBadge] = useState("통과 구간 0%~100%");
  const [demo, setDemo] = useState(true);
  const [supportsVt, setSupportsVt] = useState(false);

  useEffect(() => {
    const view = viewRef.current;
    const card = cardRef.current;
    const root = rootRef.current;
    if (!view || !card || !root) { return; }

    card.style.setProperty("--shadow-spread", VIEWTL_SHADOW_SPREAD_PX + "px");
    const vt = CSS.supports("animation-timeline: view()");
    setSupportsVt(vt);

    function coverProgress() {
      const elTop = card!.offsetTop;
      const elH = card!.offsetHeight;
      const viewH = view!.clientHeight;
      const raw = (view!.scrollTop - elTop + viewH) / (elH + viewH);
      return Math.min(1, Math.max(0, raw));
    }

    function render(cov: number) {
      const spread = VIEWTL_SHADOW_SPREAD_PX * cov;
      if (!vt) {
        const y = (6 + spread * 0.3).toFixed(1);
        const blur = (10 + spread * 0.6).toFixed(1);
        card!.style.boxShadow = "0 " + y + "px " + blur + "px " + spread.toFixed(1) + "px rgba(23, 20, 26, .35)";
        card!.style.transform = "translateY(" + (-14 * cov).toFixed(1) + "px)";
      }
      setBadge("통과 진행 " + Math.round(cov * 100) + "% · 번짐 " + spread.toFixed(1) + "px");
    }

    function onScroll() { render(coverProgress()); }
    view.addEventListener("scroll", onScroll, { passive: true });
    render(coverProgress());

    let playing = true;
    let frame = 0;
    const PERIOD = 80;
    let rafId = 0;
    function tick() {
      if (playing) {
        frame += 1;
        const max = view!.scrollHeight - view!.clientHeight;
        const t = frame % (PERIOD * 2);
        const f = t < PERIOD ? (t / PERIOD) : ((PERIOD * 2 - t) / PERIOD);
        view!.scrollTop = f * max;
        render(coverProgress());
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
      render(coverProgress());
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "r" || e.key === "R") {
        frame = 0;
        view!.scrollTop = 0;
        playing = true;
        setDemo(true);
        render(coverProgress());
      }
    }
    root.addEventListener("keydown", onKeyDown);

    function onResize() { render(coverProgress()); }
    window.addEventListener("resize", onResize);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      playing = false;
      setDemo(false);
      render(1);
      setBadge("통과 진행 100% · 번짐 " + VIEWTL_SHADOW_SPREAD_PX.toFixed(1) + "px");
    }

    const ctrl = root.querySelector("button");
    ctrl?.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(rafId);
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
      <div ref={rootRef} className={`${styles.sld} ${demo ? styles["is-demo"] : ""} ${supportsVt ? styles["supports-vt"] : styles["no-vt"]}`}>
        <div className={styles["sld__badge"]}>{badge}</div>
        <button className={styles["sld__ctrl"]} type="button">{demo ? "일시정지" : "재생"}</button>
        <div ref={viewRef} className={styles["sld__view"]}>
          <div className={styles["sld__track"]}>
            <div className={`${styles["sld__spacer"]} ${styles["sld__spacer--top"]}`} />
            <div ref={cardRef} className={styles["sld__card"]}>
              <span className={styles["sld__label"]}>카드</span>
            </div>
            <div className={`${styles["sld__spacer"]} ${styles["sld__spacer--bottom"]}`} />
          </div>
        </div>
      </div>
    </main>
  );
}
