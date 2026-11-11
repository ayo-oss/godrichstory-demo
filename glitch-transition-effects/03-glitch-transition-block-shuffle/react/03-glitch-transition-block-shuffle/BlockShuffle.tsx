import { useEffect, useRef } from "react";
import styles from "./BlockShuffle.module.scss";

export default function BlockShuffle() {
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

    // 결정론 난수 — Math.random 을 쓰지 않는다. LCG(선형합동생성기) 하나로 장면·블록 좌표 값을 만든다.
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
    const BG = tok("--scene-bg", "#fff7e6");
    const CARD1 = tok("--scene-card1", "#2f6df6");
    const CARD2 = tok("--scene-card2", "#b9a0ff");
    const CARD3 = tok("--scene-card3", "#4cd4a6");

    let W = 0;
    let H = 0;
    let dpr = 1;
    const buf = document.createElement("canvas");
    const bctx = buf.getContext("2d");
    if (!bctx) return;

    // 장면(갤러리 카드 그리드 자리) — 전부 캔버스로 직접 그린다. 외부 사진·파일 0.
    function paintScene(bc: CanvasRenderingContext2D, w: number, h: number, seed: number) {
      const rng = makeLcg(seed);
      bc.fillStyle = BG;
      bc.fillRect(0, 0, w, h);
      const cols = 4;
      const rows = 3;
      const pad = w * 0.03;
      const cw = (w - pad * (cols + 1)) / cols;
      const ch = (h - pad * (rows + 1)) / rows;
      const palette = [CARD1, CARD2, CARD3];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          bc.fillStyle = palette[Math.floor(rng() * palette.length)];
          const x = pad + c * (cw + pad);
          const y = pad + r * (ch + pad);
          bc.beginPath();
          const rr = (bc as CanvasRenderingContext2D & { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect;
          if (rr) rr.call(bc, x, y, cw, ch, Math.min(cw, ch) * 0.12);
          else bc.rect(x, y, cw, ch);
          bc.fill();
        }
      }
    }

    const SEED = 501;
    const PLAY_MS = 640;
    const BLOCK_COLS = 8;
    const BLOCK_ROWS = 6;
    const BLOCK_OFFSET_MAX = 46; // 블록 뒤섞임 좌표 최댓값(px) — 변형: 46 -> 70(더 멀리 흩어졌다 모인다)
    let data: Uint8ClampedArray | null = null;
    let outImg: ImageData | null = null;
    let iw = 0;
    let ih = 0;
    let blockW = 0;
    let blockH = 0;
    let blockDx: Float32Array | null = null;
    let blockDy: Float32Array | null = null;

    function PRECOMPUTE() {
      iw = cv!.width;
      ih = cv!.height;
      data = bctx!.getImageData(0, 0, iw, ih).data;
      outImg = ctx!.createImageData(iw, ih);
      blockW = iw / BLOCK_COLS;
      blockH = ih / BLOCK_ROWS;
      const n = BLOCK_COLS * BLOCK_ROWS;
      const rng = makeLcg(SEED + 13);
      blockDx = new Float32Array(n);
      blockDy = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        blockDx[i] = (rng() * 2 - 1) * BLOCK_OFFSET_MAX * dpr;
        blockDy[i] = (rng() * 2 - 1) * BLOCK_OFFSET_MAX * dpr;
      }
    }

    function clampI(v: number, lo: number, hi: number) {
      return v < lo ? lo : v > hi ? hi : v;
    }

    function RENDER(p: number) {
      const o = outImg!.data;
      const d = data!;
      const dx = blockDx!;
      const dy = blockDy!;
      for (let y = 0; y < ih; y++) {
        const by = Math.min(BLOCK_ROWS - 1, Math.floor(y / blockH));
        for (let x = 0; x < iw; x++) {
          const bx = Math.min(BLOCK_COLS - 1, Math.floor(x / blockW));
          const bi = by * BLOCK_COLS + bx;
          const sx = clampI(Math.round(x - dx[bi] * p), 0, iw - 1);
          const sy = clampI(Math.round(y - dy[bi] * p), 0, ih - 1);
          const k = (y * iw + x) * 4;
          const sk = (sy * iw + sx) * 4;
          o[k] = d[sk];
          o[k + 1] = d[sk + 1];
          o[k + 2] = d[sk + 2];
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
          <span>클릭하거나 Enter 를 누르면 블록마다 좌표 값이 원래 자리로 수렴하며 화면이 맞춰집니다</span>
        </p>
        <div
          className={styles.panel}
          ref={panelRef}
          tabIndex={0}
          role="button"
          aria-label="블록 좌표 값이 흩어졌다 맞춰지는 화면 전환 다시 재생"
        >
          <canvas className={styles.cv} ref={cvRef} aria-hidden="true" />
        </div>
      </div>
    </main>
  );
}
