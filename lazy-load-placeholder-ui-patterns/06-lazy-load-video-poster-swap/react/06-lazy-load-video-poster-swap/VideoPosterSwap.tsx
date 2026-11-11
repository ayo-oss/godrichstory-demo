import { useEffect, useRef, useCallback, useState } from "react";
import styles from "./VideoPosterSwap.module.scss";

// 재생 시작 여부 값(isPlaying) 이 포스터↔실제 프레임을 판정한다. 버퍼링 중엔
// 경과/전체 시간 진행률로 conic-gradient 각도를 매 프레임 계산해 링이 돈다.
const BUFFER_DURATION_MS = 620;
const PLAY_HOLD_MS = 1600;
const CYCLE_GAP_MS = 700;

type Box<T> = { current: T };
function useBox<T>(initial: T): Box<T> {
  return useRef(initial) as unknown as Box<T>;
}

export default function VideoPosterSwap() {
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [demo, setDemo] = useState(true);
  const [playing, setPlayingState] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const rafRef = useBox<number | null>(null);
  const isPlayingRef = useBox<boolean>(false);

  const setPlaying = useCallback((v: boolean) => {
    isPlayingRef.current = v;
    setPlayingState(v);
  }, [isPlayingRef]);

  const runBuffering = useCallback((onDone: () => void) => {
    const start = performance.now();
    setBuffering(true);
    function step(now: number) {
      const progress = Math.min((now - start) / BUFFER_DURATION_MS, 1);
      if (ringRef.current) {
        ringRef.current.style.background =
          "conic-gradient(from -90deg, #5b8cf8 " + (progress * 360).toFixed(1) + "deg, rgba(255,255,255,.18) 0)";
      }
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setBuffering(false);
        onDone();
      }
    }
    rafRef.current = requestAnimationFrame(step);
  }, [rafRef, ringRef]);

  const startPlay = useCallback(() => {
    if (isPlayingRef.current) { return; }
    if (ringRef.current) {
      ringRef.current.style.background = "conic-gradient(from -90deg, #5b8cf8 0deg, rgba(255,255,255,.18) 0)";
    }
    runBuffering(() => setPlaying(true));
  }, [isPlayingRef, ringRef, runBuffering, setPlaying]);

  const resetToPoster = useCallback(() => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    setBuffering(false);
    setPlaying(false);
  }, [rafRef, setPlaying]);

  const onActivate = useCallback(() => {
    setDemo(false);
    if (isPlayingRef.current) { resetToPoster(); } else { startPlay(); }
  }, [isPlayingRef, resetToPoster, startPlay]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDemo(false);
      setPlaying(true);
      return;
    }
    let cancelled = false;
    let gapTimer: number | null = null;
    let holdTimer: number | null = null;
    function loop() {
      if (cancelled) { return; }
      resetToPoster();
      gapTimer = window.setTimeout(() => {
        if (cancelled || !rootRef.current?.classList.contains(styles["is-demo"])) { return; }
        startPlay();
        holdTimer = window.setTimeout(() => {
          if (!cancelled && rootRef.current?.classList.contains(styles["is-demo"])) { loop(); }
        }, PLAY_HOLD_MS);
      }, CYCLE_GAP_MS);
    }
    loop();
    return () => {
      cancelled = true;
      if (gapTimer !== null) { window.clearTimeout(gapTimer); }
      if (holdTimer !== null) { window.clearTimeout(holdTimer); }
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const frameClass = [
    styles.lvp__frame,
    playing ? styles["lvp__frame--playing"] : "",
    buffering ? styles["lvp__frame--buffering"] : "",
  ].join(" ").trim();

  return (
    <main className={styles.stage}>
      <div ref={rootRef} className={`${styles.lvp} ${demo ? styles["is-demo"] : ""}`}>
        <div ref={frameRef} className={frameClass}>
          <div className={styles["lvp__poster"]} />
          <div className={styles["lvp__playing"]} />
          <div ref={ringRef} className={styles["lvp__ring"]} />
          <button
            type="button"
            className={styles["lvp__play"]}
            aria-label={playing ? "영상 정지" : "영상 재생"}
            onClick={onActivate}
          >
            {playing ? "❚❚" : "▶"}
          </button>
        </div>
      </div>
    </main>
  );
}
