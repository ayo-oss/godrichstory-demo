import { useEffect, useRef, useState } from "react";
import styles from "./FadeScaleCard.module.scss";

// 핵심: animation-timeline: view() + animation-range: entry 로 진입 구간 값(0~1)에
// 투명도·크기를 직접 묶는다. 미지원 환경은 IntersectionObserver 교차 비율로 같은 값을
// 계산한다. VIEWTL_FADE_SCALE_START — 변형 1: 0.8 → 0.6 로 낮추면 등장이 더 강조된다.
const VIEWTL_FADE_SCALE_START = 0.8;

export default function FadeScaleCard() {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [badge, setBadge] = useState("진입 구간 0%~0%");
  const [demo, setDemo] = useState(true);
  const [supportsVt, setSupportsVt] = useState(false);

  useEffect(() => {
    const view = viewRef.current;
    const card = cardRef.current;
    const root = rootRef.current;
    if (!view || !card || !root) { return; }

    card.style.setProperty("--fade-scale-start", String(VIEWTL_FADE_SCALE_START));
    const vt = CSS.supports("animation-timeline: view()");
    setSupportsVt(vt);

    function entryRangePct() {
      const elH = card!.offsetHeight;
      const viewH = view!.clientHeight;
      return Math.round(Math.min(100, (elH / viewH) * 100));
    }
    let rangeEnd = entryRangePct();
    let rangeText = "진입 구간 0%~" + rangeEnd + "%";

    function render(ratio: number) {
      if (!vt) {
        const start = VIEWTL_FADE_SCALE_START;
        const scale = start + (1 - start) * ratio;
        card!.style.opacity = String(ratio);
        card!.style.transform = "scale(" + scale.toFixed(3) + ")";
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
      io.observe(card);
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
      card.style.opacity = "1";
      card.style.transform = "scale(1)";
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
      <div ref={rootRef} className={`${styles.fsc} ${demo ? styles["is-demo"] : ""} ${supportsVt ? styles["supports-vt"] : styles["no-vt"]}`}>
        <div className={styles["fsc__badge"]}>{badge}</div>
        <button className={styles["fsc__ctrl"]} type="button">{demo ? "일시정지" : "재생"}</button>
        <div ref={viewRef} className={styles["fsc__view"]}>
          <div className={styles["fsc__track"]}>
            <div className={`${styles["fsc__spacer"]} ${styles["fsc__spacer--top"]}`} />
            <div ref={cardRef} className={styles["fsc__card"]}>
              <span className={styles["fsc__label"]}>기능 카드</span>
            </div>
            <div className={`${styles["fsc__spacer"]} ${styles["fsc__spacer--bottom"]}`} />
          </div>
        </div>
      </div>
    </main>
  );
}
