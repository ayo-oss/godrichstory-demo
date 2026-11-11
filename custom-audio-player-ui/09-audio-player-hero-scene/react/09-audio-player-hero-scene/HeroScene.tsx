import { useEffect, useRef } from "react";
import styles from "./HeroScene.module.scss";

type RingPoint = { f: number; p: number; w: number };
type Bar = { el: HTMLDivElement | null; f: number; p: number; base: number };
type BandDef = { f1: number; p1: number; f2: number; p2: number; w2: number };

export default function HeroScene() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const playRef = useRef<HTMLButtonElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const artRef = useRef<HTMLDivElement | null>(null);
  const colorRefEl = useRef<HTMLSpanElement | null>(null);
  const blobARef = useRef<HTMLDivElement | null>(null);
  const blobBRef = useRef<HTMLDivElement | null>(null);
  const blobCRef = useRef<HTMLDivElement | null>(null);
  const barsElRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const playBtn = playRef.current;
    const canvas = canvasRef.current;
    const art = artRef.current;
    const colorRef = colorRefEl.current;
    const blobA = blobARef.current;
    const blobB = blobBRef.current;
    const blobC = blobCRef.current;
    const barsEl = barsElRef.current;
    if (!root || !playBtn || !canvas || !art || !colorRef || !blobA || !blobB || !blobC || !barsEl) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;

    // 결정론 난수 — Math.random 을 쓰지 않는다. LCG(선형합동생성기) 하나로 대역·막대·링 점의 위상을 만든다.
    function makeLcg(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rng = makeLcg(5527);

    // 배경 블러·링·막대가 같은 저·중·고음 대역 값에 맞물리도록, 대역마다 사인 두 겹을 겹쳐 값을 하나씩만 계산한다.
    const bandDefs: { bass: BandDef; mid: BandDef; treble: BandDef } = {
      bass: { f1: 0.28 + rng() * 0.08, p1: rng() * Math.PI * 2, f2: 0.7 + rng() * 0.2, p2: rng() * Math.PI * 2, w2: 0.3 },
      mid: { f1: 0.75 + rng() * 0.15, p1: rng() * Math.PI * 2, f2: 1.6 + rng() * 0.3, p2: rng() * Math.PI * 2, w2: 0.32 },
      treble: { f1: 1.6 + rng() * 0.3, p1: rng() * Math.PI * 2, f2: 2.6 + rng() * 0.4, p2: rng() * Math.PI * 2, w2: 0.34 },
    };
    function bandValue(def: BandDef, tSec: number) {
      const s1 = Math.sin(tSec * def.f1 * Math.PI * 2 + def.p1);
      const s2 = Math.sin(tSec * def.f2 * Math.PI * 2 + def.p2) * def.w2;
      const v = (s1 + s2) / (1 + def.w2); // -1..1
      return 0.5 + v * 0.5; // 0..1
    }

    const RING_POINTS = 32;
    const ringPts: RingPoint[] = [];
    for (let i = 0; i < RING_POINTS; i++) {
      ringPts.push({ f: 2 + rng() * 1.4, p: rng() * Math.PI * 2, w: 0.35 + rng() * 0.3 });
    }

    const BAR_COUNT = 14;
    const bars: Bar[] = [];
    for (let i = 0; i < BAR_COUNT; i++) {
      const el = document.createElement("div");
      el.className = styles.bar;
      barsEl.appendChild(el);
      bars.push({ el, f: 3 + rng() * 1.6, p: rng() * Math.PI * 2, base: 0.18 + rng() * 0.1 });
    }

    function human() { if (isDemo) { root!.classList.remove(styles["is-demo"]); isDemo = false; } }

    let playing = true, t0 = 0;
    let ringColor = "#3a3a3a";

    function drawRing(tSec: number, treb: number) {
      const w = canvas!.width, h = canvas!.height, cx = w / 2, cy = h / 2;
      const innerR = 34, rangeR = 16;
      ctx!.clearRect(0, 0, w, h);
      ctx!.lineCap = "round";
      ctx!.strokeStyle = ringColor;
      for (let i = 0; i < RING_POINTS; i++) {
        const pt = ringPts[i];
        const s = Math.sin(tSec * pt.f + pt.p) * 0.5 + 0.5;
        const v = 0.15 + s * pt.w * (0.4 + treb * 0.9);
        const angle = (i / RING_POINTS) * Math.PI * 2 - Math.PI / 2;
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const r2 = innerR + rangeR * Math.max(0.05, v);
        ctx!.globalAlpha = 0.3 + v * 0.6;
        ctx!.lineWidth = 2;
        ctx!.beginPath();
        ctx!.moveTo(cx + cos * innerR, cy + sin * innerR);
        ctx!.lineTo(cx + cos * r2, cy + sin * r2);
        ctx!.stroke();
      }
      ctx!.globalAlpha = 1;
    }

    function render(now: number, playingNow: boolean) {
      const tSec = (now - t0) / 1000;
      const bass = playingNow ? bandValue(bandDefs.bass, tSec) : 0.2;
      const mid = playingNow ? bandValue(bandDefs.mid, tSec) : 0.2;
      const treb = playingNow ? bandValue(bandDefs.treble, tSec) : 0.2;

      // 배경 블러 세 덩이는 서로 다른 대역 값을 따라 각자 다른 방향으로 흐른다 — transform/opacity 만 사용
      blobA!.style.transform = "translate(" + (Math.cos(tSec * 0.6) * 18 * (0.4 + bass)).toFixed(1) + "px," + (Math.sin(tSec * 0.5) * 14 * (0.4 + bass)).toFixed(1) + "px)";
      blobA!.style.opacity = String(0.35 + bass * 0.35);
      blobB!.style.transform = "translate(" + (Math.cos(tSec * 0.4 + 2) * 16 * (0.4 + mid)).toFixed(1) + "px," + (Math.sin(tSec * 0.7 + 1) * 18 * (0.4 + mid)).toFixed(1) + "px)";
      blobB!.style.opacity = String(0.3 + mid * 0.35);
      blobC!.style.transform = "translate(" + (Math.cos(tSec * 0.9 + 4) * 14 * (0.4 + treb)).toFixed(1) + "px," + (Math.sin(tSec * 0.8 + 3) * 12 * (0.4 + treb)).toFixed(1) + "px)";
      blobC!.style.opacity = String(0.28 + treb * 0.32);

      // 앨범 아트는 저음 값에 맞춰 살짝 커졌다 줄어든다 — 킥 펄스
      art!.style.transform = "scale(" + (1 + bass * 0.08).toFixed(3) + ")";

      drawRing(tSec, treb);

      for (let i = 0; i < bars.length; i++) {
        const bar = bars[i];
        const s = Math.sin(tSec * bar.f + bar.p) * 0.5 + 0.5;
        const h = playingNow ? Math.max(0.08, bar.base + s * treb * 0.9) : bar.base;
        bar.el!.style.transform = "scaleY(" + h.toFixed(3) + ")";
      }
    }

    function setPlaying(next: boolean) { playing = next; root!.classList.toggle(styles["is-playing"], next); }
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

    ringColor = getComputedStyle(colorRef).color || ringColor;

    function onReduceClick() { human(); setPlaying(!playing); render(performance.now(), playing); }
    function onReduceKeydown(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault(); human(); setPlaying(!playing);
        render(performance.now(), playing);
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
      <div className={styles.hero + " " + styles["is-demo"] + " " + styles["is-playing"]} ref={rootRef}>
        <p className={styles.hint}><span>재생하면 저·중·고음 값이 배경 블러·링·막대에 동시에 맞물려 번집니다</span></p>
        <div className={styles.panel}>
          <div className={styles.backdrop} aria-hidden="true">
            <div className={styles.blob + " " + styles.blobA} ref={blobARef} />
            <div className={styles.blob + " " + styles.blobB} ref={blobBRef} />
            <div className={styles.blob + " " + styles.blobC} ref={blobCRef} />
          </div>
          <button className={styles.play} ref={playRef} type="button" aria-label="재생">
            <svg className={`${styles.ico} ${styles.icoPlay}`} aria-hidden="true"><use href="#ico-play" /></svg>
            <svg className={`${styles.ico} ${styles.icoPause}`} aria-hidden="true"><use href="#ico-pause" /></svg>
          </button>
          <div className={styles.core}>
            <div className={styles.ringWrap}>
              <canvas className={styles.ring} ref={canvasRef} width={128} height={128} aria-hidden="true" />
              <div className={styles.art} ref={artRef} />
              <span className={styles.colorref} ref={colorRefEl} aria-hidden="true" />
            </div>
          </div>
          <div className={styles.bars} ref={barsElRef} aria-hidden="true" />
        </div>
      </div>
    </main>
  );
}
