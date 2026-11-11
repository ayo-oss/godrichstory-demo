import { useEffect, useRef } from "react";
import styles from "./RgbSplit.module.scss";

export default function RgbSplit() {
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
    const BG2 = tok("--scene-bg2", "#6ec8ff");
    const CARD = tok("--scene-card", "#fff7e6");
    const DOT1 = tok("--scene-dot1", "#ff9ebb");
    const DOT2 = tok("--scene-dot2", "#4cd4a6");

    let W = 0;
    let H = 0;
    let dpr = 1;
    const buf = document.createElement("canvas");
    const bctx = buf.getContext("2d");
    if (!bctx) return;

    // 장면(제품 상세 이미지 자리) — 전부 캔버스로 직접 그린다. 외부 사진·파일 0.
    function paintScene(bc: CanvasRenderingContext2D, w: number, h: number, seed: number) {
      const rng = makeLcg(seed);
      const g = bc.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, BG1);
      g.addColorStop(1, BG2);
      bc.fillStyle = g;
      bc.fillRect(0, 0, w, h);
      const cw = w * 0.62;
      const ch = h * 0.62;
      const cx = (w - cw) / 2;
      const cy = (h - ch) / 2;
      bc.fillStyle = CARD;
      bc.beginPath();
      const rr = (bc as CanvasRenderingContext2D & { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect;
      if (rr) rr.call(bc, cx, cy, cw, ch, Math.min(cw, ch) * 0.08);
      else bc.rect(cx, cy, cw, ch);
      bc.fill();
      for (let i = 0; i < 5; i++) {
        bc.fillStyle = i % 2 ? DOT1 : DOT2;
        const r = Math.min(cw, ch) * (0.06 + rng() * 0.07);
        bc.beginPath();
        bc.arc(cx + r + rng() * (cw - r * 2), cy + r + rng() * (ch - r * 2), r, 0, Math.PI * 2);
        bc.fill();
      }
    }

    const SEED = 301;
    const PLAY_MS = 700;
    const RGB_OFFSET_MAX = 24; // 채널 어긋남 최대치(px) — 변형: 24 -> 60(로드 순간 더 크게 벌어졌다 돌아온다)
    const ROW_JITTER = 0.55; // 행마다 어긋남 배율을 흔드는 진폭(0~1) — 채널 분리가 장면 전체에 걸치게
    const BRIGHT_PULSE = 0.22; // 전환 중 배경 밝기 펄스 진폭
    const GHOST_MIX = 0.28; // 분리된 채널의 고스트 겹침 비율(알파 겹침 강화)
    let data: Uint8ClampedArray | null = null;
    let outImg: ImageData | null = null;
    let rowJitter: Float32Array | null = null;

    function PRECOMPUTE() {
      const iw = cv!.width;
      const ih = cv!.height;
      data = bctx!.getImageData(0, 0, iw, ih).data;
      outImg = ctx!.createImageData(iw, ih);
      const rng = makeLcg(SEED + 7);
      const rj = new Float32Array(ih);
      for (let y = 0; y < ih; y++) rj[y] = 1 + (rng() * 2 - 1) * ROW_JITTER;
      rowJitter = rj;
    }

    function clampI(v: number, lo: number, hi: number) {
      return v < lo ? lo : v > hi ? hi : v;
    }

    function RENDER(p: number) {
      const iw = cv!.width;
      const ih = cv!.height;
      const offset = Math.round(RGB_OFFSET_MAX * dpr * p);
      const voffset = Math.round(offset / 2);
      const o = outImg!.data;
      const d = data!;
      const rj = rowJitter!;
      if (offset === 0) {
        for (let i = 0; i < d.length; i++) o[i] = d[i];
        ctx!.putImageData(outImg!, 0, 0);
        return;
      }
      const pulse = 1 + BRIGHT_PULSE * Math.sin(Math.PI * p);
      for (let y = 0; y < ih; y++) {
        const rowOffset = Math.round(offset * rj[y]);
        const gy = clampI(y - voffset, 0, ih - 1);
        for (let x = 0; x < iw; x++) {
          const rx = clampI(x - rowOffset, 0, iw - 1);
          const bx = clampI(x + rowOffset, 0, iw - 1);
          const rx2 = clampI(x - Math.round(rowOffset * 1.6), 0, iw - 1);
          const bx2 = clampI(x + Math.round(rowOffset * 1.6), 0, iw - 1);
          const k = (y * iw + x) * 4;
          const kr = (y * iw + rx) * 4;
          const kr2 = (y * iw + rx2) * 4;
          const kg = (gy * iw + x) * 4;
          const kb = (y * iw + bx) * 4;
          const kb2 = (y * iw + bx2) * 4;
          o[k] = clampI(Math.round((d[kr] * (1 - GHOST_MIX) + d[kr2] * GHOST_MIX) * pulse), 0, 255);
          o[k + 1] = clampI(Math.round(d[kg + 1] * pulse), 0, 255);
          o[k + 2] = clampI(Math.round((d[kb + 2] * (1 - GHOST_MIX) + d[kb2 + 2] * GHOST_MIX) * pulse), 0, 255);
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
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      buf.width = cv!.width;
      buf.height = cv!.height;
      bctx!.setTransform(1, 0, 0, 1, 0, 0);
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
      // 실사용 경로 — 클릭·Enter·Space 로 채널 어긋남 값을 다시 흔든다.
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

    const DRIVE_PERIOD_MS = 2000; // 렌더 캐처 창(설정 초=2.0)과 같은 주기 — 시연 전용
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
          <span>클릭하거나 Enter 를 누르면 채널 어긋남 값이 커졌다가 0 으로 줄며 이미지가 다시 맞춰집니다</span>
        </p>
        <div
          className={styles.panel}
          ref={panelRef}
          tabIndex={0}
          role="button"
          aria-label="채널 어긋남 값으로 갈라졌다 합쳐지는 이미지 전환 다시 재생"
        >
          <canvas className={styles.cv} ref={cvRef} aria-hidden="true" />
        </div>
      </div>
    </main>
  );
}
