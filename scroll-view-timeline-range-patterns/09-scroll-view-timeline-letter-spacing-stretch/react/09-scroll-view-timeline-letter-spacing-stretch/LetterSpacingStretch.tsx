import { useEffect, useRef, useState } from "react";
import styles from "./LetterSpacingStretch.module.scss";

// 핵심: animation-timeline: view() + animation-range: entry 로 글자 사이 간격 값을
// 진입 구간 값(0~1)에 직접 묶는다 — 좁게 뭉쳐 있다가 값이 채워질수록 넓게 벌어지며
// 함께 밝아진다. 미지원 환경은 교차 비율로 같은 글자 간격·투명도 값을 계산한다.
const SPACING_START = -0.04;
const SPACING_END = 0.4;

export default function LetterSpacingStretch() {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [badge, setBadge] = useState("진입 구간 0%~0%");
  const [demo, setDemo] = useState(true);
  const [supportsVt, setSupportsVt] = useState(false);

  useEffect(() => {
    const view = viewRef.current;
    const title = titleRef.current;
    const root = rootRef.current;
    if (!view || !title || !root) { return; }

    const vt = CSS.supports("animation-timeline: view()");
    setSupportsVt(vt);

    function entryRangePct() {
      const elH = title!.offsetHeight;
      const viewH = view!.clientHeight;
      return Math.round(Math.min(100, (elH / viewH) * 100));
    }
    let rangeEnd = entryRangePct();
    let rangeText = "진입 구간 0%~" + rangeEnd + "%";

    function render(ratio: number) {
      if (!vt) {
        const spacing = SPACING_START + (SPACING_END - SPACING_START) * ratio;
        title!.style.letterSpacing = spacing.toFixed(3) + "em";
        title!.style.opacity = String(0.35 + 0.65 * ratio);
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
      io.observe(title);
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
      title.style.letterSpacing = SPACING_END.toFixed(3) + "em";
      title.style.opacity = "1";
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
      <div ref={rootRef} className={`${styles.lss} ${demo ? styles["is-demo"] : ""} ${supportsVt ? styles["supports-vt"] : styles["no-vt"]}`}>
        <div className={styles["lss__badge"]}>{badge}</div>
        <button className={styles["lss__ctrl"]} type="button">{demo ? "일시정지" : "재생"}</button>
        <div ref={viewRef} className={styles["lss__view"]}>
          <div className={styles["lss__track"]}>
            <div className={`${styles["lss__spacer"]} ${styles["lss__spacer--top"]}`} />
            <h2 ref={titleRef} className={styles["lss__title"]}>섹션 타이틀</h2>
            <div className={`${styles["lss__spacer"]} ${styles["lss__spacer--bottom"]}`} />
          </div>
        </div>
      </div>
    </main>
  );
}
