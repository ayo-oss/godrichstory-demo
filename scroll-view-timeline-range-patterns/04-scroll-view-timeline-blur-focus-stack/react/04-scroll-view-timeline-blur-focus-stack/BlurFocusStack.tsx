import { useEffect, useRef, useState } from "react";
import styles from "./BlurFocusStack.module.scss";

// 핵심: animation-timeline: view() + animation-range: cover 로 요소가 뷰포트를
// 통과하는 전체 구간 값(0~1)에 흐림 정도를 묶는다 — 시작·끝에서 흐리고 중간에서
// 또렷해진다. 미지원 환경은 스크롤 위치로 같은 통과 진행 값을 직접 계산한다.
// VIEWTL_BLUR_MAX_PX — 변형 2: 12 → 24 로 늘리면 흐려지는 정도가 더 뚜렷해진다.
const VIEWTL_BLUR_MAX_PX = 12;

export default function BlurFocusStack() {
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

    card.style.setProperty("--blur-max", VIEWTL_BLUR_MAX_PX + "px");
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
      const hump = 1 - Math.abs(cov * 2 - 1);
      const blurPx = VIEWTL_BLUR_MAX_PX * (1 - hump);
      if (!vt) {
        card!.style.filter = "blur(" + blurPx.toFixed(1) + "px)";
        card!.style.opacity = String(0.55 + 0.45 * hump);
      }
      setBadge("통과 진행 " + Math.round(cov * 100) + "% · 흐림 " + blurPx.toFixed(1) + "px");
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
      card.style.filter = "blur(0px)";
      card.style.opacity = "1";
      setBadge("통과 진행 50% · 흐림 0.0px");
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
      <div ref={rootRef} className={`${styles.bfs} ${demo ? styles["is-demo"] : ""} ${supportsVt ? styles["supports-vt"] : styles["no-vt"]}`}>
        <div className={styles["bfs__badge"]}>{badge}</div>
        <button className={styles["bfs__ctrl"]} type="button">{demo ? "일시정지" : "재생"}</button>
        <div ref={viewRef} className={styles["bfs__view"]}>
          <div className={styles["bfs__track"]}>
            <div className={`${styles["bfs__spacer"]} ${styles["bfs__spacer--top"]}`} />
            <div ref={cardRef} className={styles["bfs__card"]}>
              <span className={styles["bfs__label"]}>제품</span>
            </div>
            <div className={`${styles["bfs__spacer"]} ${styles["bfs__spacer--bottom"]}`} />
          </div>
        </div>
      </div>
    </main>
  );
}
