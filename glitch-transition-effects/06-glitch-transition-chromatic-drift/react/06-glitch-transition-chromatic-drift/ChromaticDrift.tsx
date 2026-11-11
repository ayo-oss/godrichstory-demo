import { useEffect, useRef } from "react";
import styles from "./ChromaticDrift.module.scss";

export default function ChromaticDrift() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const panel = panelRef.current;
    const cv = cvRef.current;
    if (!root || !panel || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;

    // 결정론 난수 — Math.random 을 쓰지 않는다. LCG(선형합동생성기) 하나로 장면을 만든다.
    function makeLcg(seed: number) {
      let s = seed >>> 0;
      return function () {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
      };
    }

    const css = getComputedStyle(root);
    function tok(name: string, fb: string) {
      const v = css.getPropertyValue(name);
      return v ? v.trim() || fb : fb;
    }
    const BG1 = tok("--scene-bg1", "#2f6df6");
    const BG2 = tok("--scene-bg2", "#9fc3ff");
    const DOT1 = tok("--scene-dot1", "#ff9ebb");
    const DOT2 = tok("--scene-dot2", "#fff7e6");

    let W = 0;
    let H = 0;
    let dpr = 1;
    const buf = document.createElement("canvas");
    const bctx = buf.getContext("2d");
    if (!bctx) return;

    // 장면(라이브 스트림 히어로 배경 자리) — 세로 줄무늬 결로 채널 흔들림이 또렷이 드러나게 한다.
    function paintScene(bc: CanvasRenderingContext2D, w: number, h: number, seed: number) {
      const rng = makeLcg(seed);
      const stripeW = Math.max(5, w * 0.04);
      for (let x = 0; x < w; x += stripeW) {
        bc.fillStyle = Math.floor(x / stripeW) % 2 ? BG1 : BG2;
        bc.fillRect(x, 0, stripeW, h);
      }
      for (let i = 0; i < 6; i++) {
        bc.fillStyle = i % 2 ? DOT1 : DOT2;
        bc.beginPath();
        bc.arc(rng() * w, rng() * h, w * (0.05 + rng() * 0.08), 0, Math.PI * 2);
        bc.fill();
      }
    }

    const SEED = 812;
    const CHROMATIC_DRIFT_AMPLITUDE = 20;
    let data: Uint8ClampedArray | null = null;
    let outImg: ImageData | null = null;
    let iw = 0;
    let ih = 0;

    function PRECOMPUTE() {
      iw = cv!.width;
      ih = cv!.height;
      data = bctx!.getImageData(0, 0, iw, ih).data;
      outImg = ctx!.createImageData(iw, ih);
    }

    function clampI(v: number, lo: number, hi: number) {
      return v < lo ? lo : v > hi ? hi : v;
    }

    const PLAY_MS = 720;
    let phase = 0;

    function RENDER(p: number) {
      phase += 0.42;
      const amp = CHROMATIC_DRIFT_AMPLITUDE * dpr * p;
      const dxR = Math.round(amp * Math.sin(phase));
      const dxB = Math.round(amp * Math.sin(phase + Math.PI));
      const dyG = Math.round(amp * 0.4 * Math.sin(phase * 1.3 + 1.1));
      const o = outImg!.data;
      const d = data!;
      for (let y = 0; y < ih; y++) {
        const base = y * iw;
        const gy = clampI(y + dyG, 0, ih - 1);
        const gBase = gy * iw;
        for (let x = 0; x < iw; x++) {
          const rx = clampI(x - dxR, 0, iw - 1);
          const gx = clampI(x, 0, iw - 1);
          const bx = clampI(x - dxB, 0, iw - 1);
          const k = (base + x) * 4;
          const kr = (base + rx) * 4;
          const kg = (gBase + gx) * 4;
          const kb = (base + bx) * 4;
          o[k] = d[kr];
          o[k + 1] = d[kg + 1];
          o[k + 2] = d[kb + 2];
          o[k + 3] = 255;
        }
      }
      ctx!.putImageData(outImg!, 0, 0);
    }

    function fit() {
      const r = panel!.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      W = r.width;
      H = r.height;
      cv!.width = Math.round(W * dpr);
      cv!.height = Math.round(H * dpr);
      buf.width = cv!.width;
      buf.height = cv!.height;
      paintScene(bctx!, buf.width, buf.height, SEED);
      PRECOMPUTE();
    }

    function human() {
      if (isDemo) {
        root!.classList.remove("is-demo");
        isDemo = false;
      }
    }

    let progress = 0;
    let target = 0;
    let playT0 = 0;
    let playFrom = 0;
    let playing = false;

    function easeInOut(t: number) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    function play() {
      human();
      playFrom = progress;
      target = progress < 0.5 ? 1 : 0;
      playT0 = 0;
      playing = true;
    }

    function stepPlay(now: number) {
      if (!playing) return;
      if (!playT0) playT0 = now;
      const t = Math.min(1, (now - playT0) / PLAY_MS);
      progress = playFrom + (target - playFrom) * easeInOut(t);
      if (t >= 1) {
        playing = false;
        progress = target;
      }
    }

    const DRIVE_PERIOD_MS = 2000;
    let driveStart = 0;
    let rafFrame = 0;
    let rafDrive = 0;

    function triangle(frac: number) {
      return frac < 0.5 ? frac * 2 : 2 - frac * 2;
    }

    function driveTick(now: number) {
      if (!driveStart) driveStart = now;
      if (isDemo) {
        const frac = ((now - driveStart) % DRIVE_PERIOD_MS) / DRIVE_PERIOD_MS;
        progress = triangle(frac);
      }
      rafDrive = requestAnimationFrame(driveTick);
    }

    function frame(now: number) {
      stepPlay(now);
      RENDER(progress);
      rafFrame = requestAnimationFrame(frame);
    }

    function onClick() {
      play();
    }
    function onKeyDown(e: Event) {
      const ke = e as KeyboardEvent;
      if (ke.key === "Enter" || ke.key === " ") {
        ke.preventDefault();
        play();
      }
    }
    function onClickReduce() {
      human();
      progress = progress < 0.5 ? 1 : 0;
      RENDER(progress);
    }
    function onKeyDownReduce(e: Event) {
      const ke = e as KeyboardEvent;
      if (ke.key === "Enter" || ke.key === " ") {
        ke.preventDefault();
        human();
        progress = progress < 0.5 ? 1 : 0;
        RENDER(progress);
      }
    }

    window.addEventListener("resize", fit);
    fit();

    if (reduce) {
      root.classList.add("is-still");
      progress = 0;
      RENDER(progress);
      panel.addEventListener("click", onClickReduce);
      panel.addEventListener("keydown", onKeyDownReduce);
    } else {
      panel.addEventListener("click", onClick);
      panel.addEventListener("keydown", onKeyDown);
      rafFrame = requestAnimationFrame(frame);
      rafDrive = requestAnimationFrame(driveTick);
    }

    return () => {
      window.removeEventListener("resize", fit);
      cancelAnimationFrame(rafFrame);
      cancelAnimationFrame(rafDrive);
      if (reduce) {
        panel.removeEventListener("click", onClickReduce);
        panel.removeEventListener("keydown", onKeyDownReduce);
      } else {
        panel.removeEventListener("click", onClick);
        panel.removeEventListener("keydown", onKeyDown);
      }
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.root} is-demo`} ref={rootRef}>
        <p className={styles.hint}>
          <span>클릭하거나 Enter 를 누르면 색수차 진폭 값이 흔들리다가 감쇠하며 한 겹으로 합쳐집니다</span>
        </p>
        <div
          className={styles.panel}
          ref={panelRef}
          tabIndex={0}
          role="button"
          aria-label="색수차 진폭 값이 감쇠하며 안정되는 배경 전환 다시 재생"
        >
          <canvas className={styles.cv} ref={cvRef} aria-hidden="true" />
        </div>
      </div>
    </main>
  );
}
