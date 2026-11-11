import { useEffect, useRef, useState } from "react";
import styles from "./ColorMorphBadge.module.scss";

// 핵심: animation-timeline: view() + animation-range: entry 로 배지 배경색을 진입
// 구간 값(0~1)을 보간 지점 삼아 한 색에서 다른 색으로 옮긴다. 미지원 환경은 교차
// 비율을 같은 보간 지점으로 써서 RGB 값을 직접 계산한다.
const COLOR_FROM = [10, 79, 232];
const COLOR_TO = [201, 48, 0];

function lerp(a: number, b: number, t: number) { return Math.round(a + (b - a) * t); }

export default function ColorMorphBadge() {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const [badge, setBadge] = useState("진입 구간 0%~0%");
  const [demo, setDemo] = useState(true);
  const [supportsVt, setSupportsVt] = useState(false);

  useEffect(() => {
    const view = viewRef.current;
    const pill = pillRef.current;
    const root = rootRef.current;
    if (!view || !pill || !root) { return; }

    const vt = CSS.supports("animation-timeline: view()");
    setSupportsVt(vt);

    function entryRangePct() {
      const elH = pill!.offsetHeight;
      const viewH = view!.clientHeight;
      return Math.round(Math.min(100, (elH / viewH) * 100));
    }
    let rangeEnd = entryRangePct();
    let rangeText = "진입 구간 0%~" + rangeEnd + "%";

    function render(ratio: number) {
      if (!vt) {
        const r = lerp(COLOR_FROM[0], COLOR_TO[0], ratio);
        const g = lerp(COLOR_FROM[1], COLOR_TO[1], ratio);
        const b = lerp(COLOR_FROM[2], COLOR_TO[2], ratio);
        pill!.style.backgroundColor = "rgb(" + r + ", " + g + ", " + b + ")";
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
      io.observe(pill);
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
      pill.style.backgroundColor = "rgb(201, 48, 0)";
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
      <div ref={rootRef} className={`${styles.cmb} ${demo ? styles["is-demo"] : ""} ${supportsVt ? styles["supports-vt"] : styles["no-vt"]}`}>
        <div className={styles["cmb__badge"]}>{badge}</div>
        <button className={styles["cmb__ctrl"]} type="button">{demo ? "일시정지" : "재생"}</button>
        <div ref={viewRef} className={styles["cmb__view"]}>
          <div className={styles["cmb__track"]}>
            <div className={`${styles["cmb__spacer"]} ${styles["cmb__spacer--top"]}`} />
            <div ref={pillRef} className={styles["cmb__pill"]}>
              <span className={styles["cmb__label"]}>신규</span>
            </div>
            <div className={`${styles["cmb__spacer"]} ${styles["cmb__spacer--bottom"]}`} />
          </div>
        </div>
      </div>
    </main>
  );
}
