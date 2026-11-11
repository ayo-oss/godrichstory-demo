import { useEffect, useRef } from "react";
import styles from "./NoiseBurst.module.scss";

export default function NoiseBurst() {
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
    const BG1 = tok("--scene-bg1", "#1c2f66");
    const BG2 = tok("--scene-bg2", "#2f6df6");
    const CARD = tok("--scene-card", "#fff7e6");
    const ICON = tok("--scene-icon", "#8be6c4");
    const LINE = tok("--scene-line", "#9fc3ff");

    let W = 0;
    let H = 0;
    let dpr = 1;
    const buf = document.createElement("canvas");
    const bctx = buf.getContext("2d");
    if (!bctx) return;

    // 장면(알림 배너가 탭 위에 뜬 자리) — 전부 캔버스로 직접 그린다. 외부 사진·파일 0.
    function paintScene(bc: CanvasRenderingContext2D, w: number, h: number, seed: number) {
      const rng = makeLcg(seed);
      const g = bc.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, BG1);
      g.addColorStop(1, BG2);
      bc.fillStyle = g;
      bc.fillRect(0, 0, w, h);

      const bx = w * 0.1;
      const by = h * 0.2;
      const bw = w * 0.8;
      const bh = h * 0.6;
      const r = Math.min(bw, bh) * 0.12;
      bc.fillStyle = CARD;
      if ((bc as any).roundRect) {
        bc.beginPath();
        (bc as any).roundRect(bx, by, bw, bh, r);
        bc.fill();
      } else {
        bc.fillRect(bx, by, bw, bh);
      }

      bc.fillStyle = ICON;
      bc.beginPath();
      bc.arc(bx + bh * 0.24, by + bh * 0.5, bh * 0.16, 0, Math.PI * 2);
      bc.fill();

      bc.fillStyle = LINE;
      for (let i = 0; i < 4; i++) {
        const lw = bw * (0.42 - rng() * 0.14);
        const ly = by + bh * 0.28 + i * bh * 0.14;
        bc.fillRect(bx + bh * 0.46, ly, lw, bh * 0.07);
      }
    }

    const SEED = 705;
    const NOISE_BURST_DURATION = 560;
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

    function hash01(n: number) {
      n = (n ^ 61) ^ (n >>> 16);
      n = (n + (n << 3)) | 0;
      n = n ^ (n >>> 4);
      n = Math.imul(n, 0x27d4eb2d);
      n = n ^ (n >>> 15);
      return (n >>> 0) / 4294967295;
    }

    let frameCounter = 0;

    function clamp255(v: number) {
      return v < 0 ? 0 : v > 255 ? 255 : v;
    }

    function RENDER(p: number) {
      frameCounter = (frameCounter + 1) >>> 0;
      const o = outImg!.data;
      const d = data!;
      const fSalt = Math.imul(frameCounter, 2246822519) >>> 0;
      for (let y = 0; y < ih; y++) {
        const ySalt = Math.imul(y, 668265263) >>> 0;
        const base = y * iw;
        for (let x = 0; x < iw; x++) {
          const seed = (Math.imul(x, 374761393) ^ ySalt ^ fSalt) >>> 0;
          const h0 = hash01(seed);
          const h1 = hash01(seed ^ 0x9e3779b9);
          const h2 = hash01(seed ^ 0x85ebca6b);
          const h3 = hash01(seed ^ 0xc2b2ae35);
          const g = 198 + h0 * 57;
          const nr = clamp255(g + (h1 - 0.5) * 60);
          const ng = clamp255(g + (h2 - 0.5) * 60);
          const nb = clamp255(g + (h3 - 0.5) * 60);
          const k = (base + x) * 4;
          o[k] = d[k] * (1 - p) + nr * p;
          o[k + 1] = d[k + 1] * (1 - p) + ng * p;
          o[k + 2] = d[k + 2] * (1 - p) + nb * p;
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
      const t = Math.min(1, (now - playT0) / NOISE_BURST_DURATION);
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
          <span>클릭하거나 Enter 를 누르면 노이즈 버스트 값이 최댓값까지 튀었다가 0 으로 잦아듭니다</span>
        </p>
        <div
          className={styles.panel}
          ref={panelRef}
          tabIndex={0}
          role="button"
          aria-label="노이즈 버스트 값이 사그라드는 알림 배너 전환 다시 재생"
        >
          <canvas className={styles.cv} ref={cvRef} aria-hidden="true" />
        </div>
      </div>
    </main>
  );
}
