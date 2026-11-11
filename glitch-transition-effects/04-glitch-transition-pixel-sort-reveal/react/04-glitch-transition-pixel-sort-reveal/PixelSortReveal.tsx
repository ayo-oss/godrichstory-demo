import { useEffect, useRef } from "react";
import styles from "./PixelSortReveal.module.scss";

export default function PixelSortReveal() {
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
    const BG1 = tok("--scene-bg1", "#17141a");
    const BG2 = tok("--scene-bg2", "#2f6df6");
    const BLOB1 = tok("--scene-blob1", "#ff9ebb");
    const BLOB2 = tok("--scene-blob2", "#fff7e6");

    let W = 0;
    let H = 0;
    let dpr = 1;
    const buf = document.createElement("canvas");
    const bctx = buf.getContext("2d");
    if (!bctx) return;

    // 장면(전시 갤러리 아트워크 자리) — 전부 캔버스로 직접 그린다. 외부 사진·파일 0.
    function paintScene(bc: CanvasRenderingContext2D, w: number, h: number, seed: number) {
      const rng = makeLcg(seed);
      const g = bc.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, BG1);
      g.addColorStop(1, BG2);
      bc.fillStyle = g;
      bc.fillRect(0, 0, w, h);
      for (let i = 0; i < 7; i++) {
        bc.fillStyle = i % 2 ? BLOB1 : BLOB2;
        bc.beginPath();
        bc.arc(rng() * w, rng() * h, w * (0.06 + rng() * 0.1), 0, Math.PI * 2);
        bc.fill();
      }
    }

    const SEED = 601;
    const PLAY_MS = 680;
    let data: Uint8ClampedArray | null = null;
    let outImg: ImageData | null = null;
    let iw = 0;
    let ih = 0;
    let sortedIdx: Int32Array[] = [];

    function brightness(d: Uint8ClampedArray, k: number) {
      return 0.299 * d[k] + 0.587 * d[k + 1] + 0.114 * d[k + 2];
    }

    function PRECOMPUTE() {
      iw = cv!.width;
      ih = cv!.height;
      data = bctx!.getImageData(0, 0, iw, ih).data;
      outImg = ctx!.createImageData(iw, ih);
      const d = data!;
      sortedIdx = [];
      for (let y = 0; y < ih; y++) {
        const row = new Int32Array(iw);
        const order: number[] = [];
        for (let x = 0; x < iw; x++) order.push(x);
        const base = y * iw;
        order.sort((a, b) => brightness(d, (base + a) * 4) - brightness(d, (base + b) * 4));
        for (let j = 0; j < iw; j++) row[j] = order[j];
        sortedIdx.push(row);
      }
    }

    function clampI(v: number, lo: number, hi: number) {
      return v < lo ? lo : v > hi ? hi : v;
    }

    function RENDER(p: number) {
      const o = outImg!.data;
      const d = data!;
      for (let y = 0; y < ih; y++) {
        const row = sortedIdx[y];
        const base = y * iw;
        for (let x = 0; x < iw; x++) {
          const si = row[x];
          const sx = clampI(Math.round(x + (si - x) * p), 0, iw - 1);
          const k = (base + x) * 4;
          const sk = (base + sx) * 4;
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
          <span>클릭하거나 Enter 를 누르면 밝기 정렬 진행률 값이 줄며 픽셀이 원래 자리로 돌아갑니다</span>
        </p>
        <div
          className={styles.panel}
          ref={panelRef}
          tabIndex={0}
          role="button"
          aria-label="밝기 정렬 진행률 값이 되돌리는 이미지 전환 다시 재생"
        >
          <canvas className={styles.cv} ref={cvRef} aria-hidden="true" />
        </div>
      </div>
    </main>
  );
}
