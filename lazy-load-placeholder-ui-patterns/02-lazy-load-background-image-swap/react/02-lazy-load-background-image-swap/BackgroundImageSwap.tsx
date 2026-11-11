import { useEffect, useRef, useState, useCallback } from "react";
import styles from "./BackgroundImageSwap.module.scss";

// 화면 너비 값 → 해상도 등급. ResizeObserver 가 프레임 폭을 재고, 기준값보다 좁으면
// 저해상도, 넓으면 고해상도 배경을 고른 뒤 진행률로 블러·불투명도를 계산한다.
const BREAKPOINT_PX = 240;
const WIDTH_NARROW = 180;
const WIDTH_WIDE = 300;
const LOAD_DELAY_MS = 480;
const CROSSFADE_MS = 480;
const CYCLE_MS = 2200;

export default function BackgroundImageSwap() {
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const bgLowRef = useRef<HTMLDivElement>(null);
  const bgHighRef = useRef<HTMLDivElement>(null);
  const [demo, setDemo] = useState(true);
  const [wideState, setWideState] = useState(false);
  const [badge, setBadge] = useState("폭 180px · 저해상도");
  const lastTierRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const loadTimerRef = useRef<number | null>(null);
  const wideRef = useRef(false);

  const crossfadeIn = useCallback((el: HTMLDivElement, duration: number) => {
    const start = performance.now();
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); }
    function step(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      el.style.opacity = String(progress);
      el.style.filter = "blur(" + (6 * (1 - progress)) + "px)";
      if (progress < 1) { rafRef.current = requestAnimationFrame(step); }
    }
    rafRef.current = requestAnimationFrame(step);
  }, []);

  const applyTier = useCallback((widthPx: number) => {
    const tier = widthPx < BREAKPOINT_PX ? "low" : "high";
    setBadge("폭 " + Math.round(widthPx) + "px · " + (tier === "low" ? "저해상도" : "고해상도"));
    if (tier === lastTierRef.current) { return; }
    lastTierRef.current = tier;
    const low = bgLowRef.current;
    const high = bgHighRef.current;
    const placeholder = placeholderRef.current;
    if (!low || !high || !placeholder) { return; }
    low.style.opacity = "0";
    high.style.opacity = "0";
    placeholder.classList.remove(styles["lbs__placeholder--hidden"]);
    if (loadTimerRef.current !== null) { window.clearTimeout(loadTimerRef.current); }
    loadTimerRef.current = window.setTimeout(() => {
      const target = tier === "low" ? low : high;
      placeholder.classList.add(styles["lbs__placeholder--hidden"]);
      crossfadeIn(target, CROSSFADE_MS);
    }, LOAD_DELAY_MS);
  }, [crossfadeIn]);

  const toggle = useCallback(() => {
    wideRef.current = !wideRef.current;
    setWideState(wideRef.current);
    setDemo(false);
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) { return; }
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) { applyTier(entry.contentRect.width); }
    });
    ro.observe(frame);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let autoplayTimer: number | null = null;
    if (reduce) {
      setDemo(false);
      wideRef.current = true;
      setWideState(true);
      lastTierRef.current = "high";
      placeholderRef.current?.classList.add(styles["lbs__placeholder--hidden"]);
      if (bgHighRef.current) {
        bgHighRef.current.style.opacity = "1";
        bgHighRef.current.style.filter = "blur(0px)";
      }
      setBadge("폭 " + WIDTH_WIDE + "px · 고해상도");
    } else {
      autoplayTimer = window.setInterval(() => {
        if (!rootRef.current?.classList.contains(styles["is-demo"])) {
          if (autoplayTimer !== null) { window.clearInterval(autoplayTimer); }
          return;
        }
        wideRef.current = !wideRef.current;
        setWideState(wideRef.current);
      }, CYCLE_MS);
    }
    return () => {
      ro.disconnect();
      if (autoplayTimer !== null) { window.clearInterval(autoplayTimer); }
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); }
      if (loadTimerRef.current !== null) { window.clearTimeout(loadTimerRef.current); }
    };
  }, [applyTier]);

  useEffect(() => {
    const root = rootRef.current;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
    }
    root?.addEventListener("keydown", onKeyDown);
    return () => root?.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  return (
    <main className={styles.stage}>
      <div
        ref={rootRef}
        className={`${styles.lbs} ${demo ? styles["is-demo"] : ""}`}
        tabIndex={0}
        onClick={toggle}
      >
        <div className={styles["lbs__badge"]}>{badge}</div>
        <div
          ref={frameRef}
          className={styles["lbs__frame"]}
          style={{ width: (wideState ? WIDTH_WIDE : WIDTH_NARROW) + "px" }}
        >
          <div ref={placeholderRef} className={styles["lbs__placeholder"]} />
          <div ref={bgLowRef} className={`${styles["lbs__bg"]} ${styles["lbs__bg--low"]}`} />
          <div ref={bgHighRef} className={`${styles["lbs__bg"]} ${styles["lbs__bg--high"]}`} />
        </div>
        <p className={styles["lbs__hint"]}>클릭하면 폭이 바뀝니다</p>
      </div>
    </main>
  );
}
