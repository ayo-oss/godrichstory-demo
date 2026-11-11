import { useEffect, useRef } from "react";
import styles from "./WaveformBars.module.scss";

type Bar = { el: HTMLDivElement | null; f1: number; p1: number; f2: number; p2: number; w2: number; idle: number };

export default function WaveformBars() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const playRef = useRef<HTMLButtonElement | null>(null);
  const barsElRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const playBtn = playRef.current;
    const barsEl = barsElRef.current;
    if (!root || !playBtn || !barsEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;

    // 결정론 난수 — Math.random 을 쓰지 않는다. LCG(선형합동생성기) 하나로 막대별 위상·진폭을 만든다.
    function makeLcg(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }

    const BAR_COUNT = 20;
    const rng = makeLcg(2909);
    const bars: Bar[] = [];
    for (let i = 0; i < BAR_COUNT; i++) {
      bars.push({
        el: null,
        // 사인 곡선 두 겹을 겹쳐 막대마다 다른 위상·주파수로 높이를 합성한다 — 291 편처럼 AudioContext/AnalyserNode 로
        // 실제 소리를 분석해 얻는 값이 아니라, 여기서는 사인 합성만으로 만든 장식용 값이다.
        f1: 0.55 + rng() * 0.35,
        p1: rng() * Math.PI * 2,
        f2: 1.4 + rng() * 0.6,
        p2: rng() * Math.PI * 2,
        w2: 0.25 + rng() * 0.2,
        idle: 0.14 + rng() * 0.08,
      });
    }

    for (let i = 0; i < BAR_COUNT; i++) {
      const b = document.createElement("div");
      b.className = styles.bar;
      barsEl.appendChild(b);
      bars[i].el = b;
    }

    function synth(bar: Bar, tSec: number) {
      const s1 = Math.sin(tSec * bar.f1 * Math.PI * 2 + bar.p1);
      const s2 = Math.sin(tSec * bar.f2 * Math.PI * 2 + bar.p2) * bar.w2;
      const v = (s1 + s2) / (1 + bar.w2); // -1..1 범위로 정규화
      return 0.5 + v * 0.5; // 0..1
    }

    function human() { if (isDemo) { root!.classList.remove(styles["is-demo"]); isDemo = false; } }

    let playing = true, t0 = 0;

    function render(now: number, playingNow: boolean) {
      const tSec = (now - t0) / 1000;
      for (let i = 0; i < BAR_COUNT; i++) {
        const bar = bars[i];
        const h = playingNow ? synth(bar, tSec) : bar.idle;
        // 막대는 바닥이 기준점이라 아래쪽 원점으로 세로로만 자란다 — 중심 기준이 아닌 실제 앵커 지점
        bar.el!.style.transform = "scaleY(" + Math.max(0.06, h) + ")";
      }
    }

    function setPlaying(next: boolean) {
      playing = next;
      root!.classList.toggle(styles["is-playing"], next);
    }

    function onPlayClick() { human(); setPlaying(!playing); }
    function onPlayKeydown(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); human(); setPlaying(!playing); }
    }

    let raf = 0;
    function frame(now: number) {
      if (!t0) t0 = now;
      render(now, isDemo ? true : playing);
      raf = requestAnimationFrame(frame);
    }

    function onReduceClick() { human(); setPlaying(!playing); render(performance.now(), playing); }
    function onReduceKeydown(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault(); human(); setPlaying(!playing); render(performance.now(), playing);
      }
    }

    if (reduce) {
      root.classList.add(styles["is-still"]);
      t0 = performance.now();
      render(t0, false);
      playBtn.addEventListener("click", onReduceClick);
      playBtn.addEventListener("keydown", onReduceKeydown);
    } else {
      playBtn.addEventListener("click", onPlayClick);
      playBtn.addEventListener("keydown", onPlayKeydown);
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      if (reduce) {
        playBtn.removeEventListener("click", onReduceClick);
        playBtn.removeEventListener("keydown", onReduceKeydown);
      } else {
        playBtn.removeEventListener("click", onPlayClick);
        playBtn.removeEventListener("keydown", onPlayKeydown);
      }
      barsEl.innerHTML = "";
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.eq + " " + styles["is-demo"] + " " + styles["is-playing"]} ref={rootRef}>
        <p className={styles.hint}><span>재생을 누르면 사인 곡선으로 미리 계산한 높이 값이 막대마다 다르게 흔들립니다</span></p>
        <div className={styles.panel}>
          <button className={styles.play} ref={playRef} type="button" aria-label="재생">
            <svg className={`${styles.ico} ${styles.icoPlay}`} aria-hidden="true"><use href="#ico-play" /></svg>
            <svg className={`${styles.ico} ${styles.icoPause}`} aria-hidden="true"><use href="#ico-pause" /></svg>
          </button>
          <div className={styles.bars} ref={barsElRef} aria-hidden="true" />
        </div>
      </div>
    </main>
  );
}
