import { useEffect, useRef, useState } from "react";
import styles from "./Rotate3dFlip.module.scss";

// 핵심: animation-timeline: view() + animation-range: cover 로 요소가 뷰포트를
// 통과하는 전체 구간 값(0~1)을 그대로 각도 값(0~180deg)으로 바꿔 카드를 입체적으로
// 뒤집는다. 미지원 환경은 스크롤 위치로 같은 통과 진행 값을 계산해 같은 각도를 적용한다.
export default function Rotate3dFlip() {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [badge, setBadge] = useState("통과 구간 0%~100%");
  const [demo, setDemo] = useState(true);
  const [supportsVt, setSupportsVt] = useState(false);

  useEffect(() => {
    const view = viewRef.current;
    const flip = flipRef.current;
    const inner = innerRef.current;
    const root = rootRef.current;
    if (!view || !flip || !inner || !root) { return; }

    const vt = CSS.supports("animation-timeline: view()");
    setSupportsVt(vt);

    function coverProgress() {
      const elTop = flip!.offsetTop;
      const elH = flip!.offsetHeight;
      const viewH = view!.clientHeight;
      const raw = (view!.scrollTop - elTop + viewH) / (elH + viewH);
      return Math.min(1, Math.max(0, raw));
    }

    function render(cov: number) {
      const angle = cov * 180;
      if (!vt) {
        inner!.style.transform = "rotateY(" + angle.toFixed(1) + "deg)";
      }
      setBadge("통과 진행 " + Math.round(cov * 100) + "% · 각도 " + Math.round(angle) + "deg");
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
      inner.style.transform = "rotateY(0deg)";
      setBadge("통과 진행 0% · 각도 0deg");
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
      <div ref={rootRef} className={`${styles.r3f} ${demo ? styles["is-demo"] : ""} ${supportsVt ? styles["supports-vt"] : styles["no-vt"]}`}>
        <div className={styles["r3f__badge"]}>{badge}</div>
        <button className={styles["r3f__ctrl"]} type="button">{demo ? "일시정지" : "재생"}</button>
        <div ref={viewRef} className={styles["r3f__view"]}>
          <div className={styles["r3f__track"]}>
            <div className={`${styles["r3f__spacer"]} ${styles["r3f__spacer--top"]}`} />
            <div ref={flipRef} className={styles["r3f__flip"]}>
              <div ref={innerRef} className={styles["r3f__inner"]}>
                <div className={`${styles["r3f__face"]} ${styles["r3f__face--front"]}`}>서비스</div>
                <div className={`${styles["r3f__face"]} ${styles["r3f__face--back"]}`}>자세히</div>
              </div>
            </div>
            <div className={`${styles["r3f__spacer"]} ${styles["r3f__spacer--bottom"]}`} />
          </div>
        </div>
      </div>
    </main>
  );
}
