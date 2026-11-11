import { useEffect, useRef, useState } from "react";
import styles from "./MaskWipeImage.module.scss";

// 핵심: animation-timeline: view() + animation-range: entry 로 등록 커스텀 프로퍼티
// --wipe(퍼센트)를 진입 구간 값에 직접 묶고, mask-image 그라디언트 경계를 그 값으로
// 계산해 대각선으로 번지듯 드러낸다. 미지원 환경은 교차 비율로 같은 그라디언트를 계산한다.
export default function MaskWipeImage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const picRef = useRef<HTMLDivElement>(null);
  const [badge, setBadge] = useState("진입 구간 0%~0%");
  const [demo, setDemo] = useState(true);
  const [supportsVt, setSupportsVt] = useState(false);

  useEffect(() => {
    const view = viewRef.current;
    const frame = frameRef.current;
    const pic = picRef.current;
    const root = rootRef.current;
    if (!view || !frame || !pic || !root) { return; }

    const vt = CSS.supports("animation-timeline: view()");
    setSupportsVt(vt);

    function entryRangePct() {
      const elH = frame!.offsetHeight;
      const viewH = view!.clientHeight;
      return Math.round(Math.min(100, (elH / viewH) * 100));
    }
    let rangeEnd = entryRangePct();
    let rangeText = "진입 구간 0%~" + rangeEnd + "%";

    function render(ratio: number) {
      if (!vt) {
        const edge = Math.max(0, ratio * 100 - 12);
        const full = ratio * 100;
        const grad = "linear-gradient(135deg, #000 " + edge.toFixed(1) + "%, transparent " + full.toFixed(1) + "%)";
        pic!.style.maskImage = grad;
        pic!.style.webkitMaskImage = grad;
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
      io.observe(frame);
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
    let frameN = 0;
    const PERIOD = 66;
    let rafId = 0;
    function tick() {
      if (playing) {
        frameN += 1;
        const max = view!.scrollHeight - view!.clientHeight;
        const t = frameN % (PERIOD * 2);
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
        frameN = 0;
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
      pic.style.maskImage = "none";
      pic.style.webkitMaskImage = "none";
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
      <div ref={rootRef} className={`${styles.mwi} ${demo ? styles["is-demo"] : ""} ${supportsVt ? styles["supports-vt"] : styles["no-vt"]}`}>
        <div className={styles["mwi__badge"]}>{badge}</div>
        <button className={styles["mwi__ctrl"]} type="button">{demo ? "일시정지" : "재생"}</button>
        <div ref={viewRef} className={styles["mwi__view"]}>
          <div className={styles["mwi__track"]}>
            <div className={`${styles["mwi__spacer"]} ${styles["mwi__spacer--top"]}`} />
            <div ref={frameRef} className={styles["mwi__frame"]}>
              <div ref={picRef} className={styles["mwi__pic"]} />
            </div>
            <div className={`${styles["mwi__spacer"]} ${styles["mwi__spacer--bottom"]}`} />
          </div>
        </div>
      </div>
    </main>
  );
}
