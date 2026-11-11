import { useEffect, useRef } from "react";
import styles from "./ScanlineDisplace.module.scss";

export default function ScanlineDisplace() {
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

    // 결정론 난수 — Math.random 을 쓰지 않는다. LCG(선형합동생성기) 하나로 장면·줄 밀림 값을 만든다.
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
    const BG1 = tok("--scene-bg1", "#b9a0ff");
    const BG2 = tok("--scene-bg2", "#4cd4a6");
    const BAR = tok("--scene-bar", "#fff7e6");
    const DOT = tok("--scene-dot", "#17141a");

    let W = 0;
    let H = 0;
    let dpr = 1;
    const buf = document.createElement("canvas");
    const bctx = buf.getContext("2d");
    if (!bctx) return;

    // 장면(섹션 슬라이드 배경 자리) — 전부 캔버스로 직접 그린다. 외부 사진·파일 0.
    // 세로 줄무늬 바탕 — 가로줄이 옆으로 밀리면 줄무늬 경계가 어긋나 보이도록 가로 방향 결을 준다.
    function paintScene(bc: CanvasRenderingContext2D, w: number, h: number, seed: number) {
      const rng = makeLcg(seed);
      const stripeW = Math.max(6, w * 0.045);
      for (let x = 0; x < w; x += stripeW) {
        bc.fillStyle = Math.floor(x / stripeW) % 2 ? BG1 : BG2;
        bc.fillRect(x, 0, stripeW + 1, h);
      }
      bc.fillStyle = BAR;
      bc.fillRect(w * 0.1, h * 0.18, w * 0.8, h * 0.18);
      bc.fillRect(w * 0.1, h * 0.62, w * 0.5, h * 0.1);
      for (let i = 0; i < 10; i++) {
        bc.fillStyle = DOT;
        bc.globalAlpha = 0.5;
        bc.fillRect(rng() * w, h * 0.8 + rng() * h * 0.12, w * 0.03, w * 0.03);
      }
      bc.globalAlpha = 1;
    }

    const SEED = 401;
    const PLAY_MS = 620;
    const ROW_OFFSET_MAX = 34; // 줄 밀림 최댓값(px) — 변형: 34 -> 60(첫 프레임 어긋남이 더 크게 튄다)
    let data: Uint8ClampedArray | null = null;
    let outImg: ImageData | null = null;
    let iw = 0;
    let ih = 0;
    let rowOffsets: Float32Array | null = null;

    function PRECOMPUTE() {
      iw = cv!.width;
      ih = cv!.height;
      data = bctx!.getImageData(0, 0, iw, ih).data;
      outImg = ctx!.createImageData(iw, ih);
      const rng = makeLcg(SEED + 7);
      rowOffsets = new Float32Array(ih);
      for (let y = 0; y < ih; y++) rowOffsets[y] = (rng() * 2 - 1) * ROW_OFFSET_MAX * dpr;
    }

    function clampI(v: number, lo: number, hi: number) {
      return v < lo ? lo : v > hi ? hi : v;
    }

    function RENDER(p: number) {
      const o = outImg!.data;
      const d = data!;
      const ro = rowOffsets!;
      for (let y = 0; y < ih; y++) {
        const shift = Math.round(ro[y] * p);
        const rowBase = y * iw;
        for (let x = 0; x < iw; x++) {
          const sx = clampI(x - shift, 0, iw - 1);
          const k = (rowBase + x) * 4;
          const sk = (rowBase + sx) * 4;
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
          <span>클릭하거나 Enter 를 누르면 줄마다 밀림 값이 0 으로 줄며 화면이 다시 맞춰집니다</span>
        </p>
        <div
          className={styles.panel}
          ref={panelRef}
          tabIndex={0}
          role="button"
          aria-label="가로줄 밀림 값이 자리를 되찾는 화면 전환 다시 재생"
        >
          <canvas className={styles.cv} ref={cvRef} aria-hidden="true" />
        </div>
      </div>
    </main>
  );
}
