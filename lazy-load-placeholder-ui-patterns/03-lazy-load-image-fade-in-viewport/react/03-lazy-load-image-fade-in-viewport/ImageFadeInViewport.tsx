import { useEffect, useRef, useState } from "react";
import styles from "./ImageFadeInViewport.module.scss";

// 스크롤 위치 값 → 교차 비율(IntersectionObserver). 비율 값으로 블러·스케일을 매번
// 다시 계산해 뷰포트에 걸친 정도만큼 또렷해지고, 기준을 넘으면 로드 완료로 고정한다.
const INTERSECTION_THRESHOLD = 0.4;
const STEPS: number[] = [];
for (let s = 0; s <= 20; s += 1) { STEPS.push(s / 20); }
const CARD_KEYS = [1, 2, 3, 4];

type Box<T> = { current: T };
function useBox<T>(initial: T): Box<T> {
  return useRef(initial) as unknown as Box<T>;
}

export default function ImageFadeInViewport() {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const cardRefs = useBox<Array<HTMLDivElement | null>>([null, null, null, null]);
  const imgRefs = useBox<Array<HTMLDivElement | null>>([null, null, null, null]);
  const placeholderRefs = useBox<Array<HTMLDivElement | null>>([null, null, null, null]);
  const loadedRefs = useBox<boolean[]>([false, false, false, false]);
  const [badge, setBadge] = useState("교차 비율 0%");
  const [demo, setDemo] = useState(true);
  const [, forceRender] = useState(0);

  function applyRatio(i: number, ratio: number) {
    const img = imgRefs.current[i];
    const placeholder = placeholderRefs.current[i];
    if (!img || !placeholder) { return; }
    const blur = 10 * (1 - ratio);
    const scale = 0.92 + 0.08 * ratio;
    img.style.opacity = String(ratio);
    img.style.filter = "blur(" + blur.toFixed(1) + "px)";
    img.style.transform = "scale(" + scale.toFixed(3) + ")";
    placeholder.style.opacity = String(Math.max(0, 1 - ratio * 1.4));
    if (ratio >= INTERSECTION_THRESHOLD && !loadedRefs.current[i]) {
      loadedRefs.current[i] = true;
      forceRender((n) => n + 1);
    }
  }

  useEffect(() => {
    const view = viewRef.current;
    const root = rootRef.current;
    if (!view || !root) { return; }

    const io = new IntersectionObserver((entries) => {
      let maxRatio = 0;
      entries.forEach((entry) => {
        const idx = cardRefs.current.indexOf(entry.target as HTMLDivElement);
        if (idx === -1) { return; }
        applyRatio(idx, entry.intersectionRatio);
        if (entry.intersectionRatio >= maxRatio) { maxRatio = entry.intersectionRatio; }
      });
      setBadge("교차 비율 " + Math.round(maxRatio * 100) + "%");
    }, { root: view, threshold: STEPS });

    cardRefs.current.forEach((c) => { if (c) { io.observe(c); } });

    function userTakesOver() {
      if (!root!.classList.contains(styles["is-demo"])) { return; }
      setDemo(false);
      if (autoplayTimer !== null) { window.clearInterval(autoplayTimer); }
    }
    view.addEventListener("wheel", userTakesOver, { passive: true });
    view.addEventListener("touchstart", userTakesOver, { passive: true });

    let dir = 1;
    let autoplayTimer: number | null = null;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDemo(false);
      CARD_KEYS.forEach((_, i) => applyRatio(i, 1));
      setBadge("교차 비율 100%");
    } else {
      autoplayTimer = window.setInterval(() => {
        const max = view.scrollHeight - view.clientHeight;
        view.scrollTop += dir * 2.2;
        if (view.scrollTop >= max - 1) { dir = -1; }
        if (view.scrollTop <= 1) { dir = 1; }
      }, 45);
    }

    return () => {
      io.disconnect();
      view.removeEventListener("wheel", userTakesOver);
      view.removeEventListener("touchstart", userTakesOver);
      if (autoplayTimer !== null) { window.clearInterval(autoplayTimer); }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div ref={rootRef} className={`${styles.lfv} ${demo ? styles["is-demo"] : ""}`}>
        <div className={styles["lfv__badge"]}>{badge}</div>
        <div ref={viewRef} className={styles["lfv__view"]}>
          <div className={styles["lfv__track"]}>
            {CARD_KEYS.map((k, i) => (
              <div
                key={k}
                ref={(el: HTMLDivElement | null) => { cardRefs.current[i] = el; }}
                className={`${styles["lfv__card"]} ${loadedRefs.current[i] ? styles["lfv__card--loaded"] : ""}`}
              >
                <div ref={(el: HTMLDivElement | null) => { placeholderRefs.current[i] = el; }} className={styles["lfv__placeholder"]} />
                <div ref={(el: HTMLDivElement | null) => { imgRefs.current[i] = el; }} className={`${styles["lfv__img"]} ${styles["lfv__img--" + k]}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
