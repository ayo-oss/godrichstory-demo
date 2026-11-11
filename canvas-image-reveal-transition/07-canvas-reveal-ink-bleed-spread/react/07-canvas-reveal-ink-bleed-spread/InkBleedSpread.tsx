import { useEffect, useRef } from "react";
import styles from "./InkBleedSpread.module.scss";

export default function InkBleedSpread() {
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

    // 결정론 난수 — 이 데모는 Math.random 을 쓰지 않는다. LCG(선형합동생성기) 하나로 장면·잉크점·노이즈를 만든다.
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
    const COLOR_A1 = tok("--img-a1", "#ff5a2e");
    const COLOR_A2 = tok("--img-a2", "#fff3e6");
    const COLOR_B1 = tok("--img-b1", "#2e6bff");
    const COLOR_B2 = tok("--img-b2", "#bfe4ff");

    let W = 0;
    let H = 0;
    let dpr = 1;
    const bufA = document.createElement("canvas");
    const bufB = document.createElement("canvas");
    const bctxA = bufA.getContext("2d");
    const bctxB = bufB.getContext("2d");
    if (!bctxA || !bctxB) return;

    // 장면 A(따뜻한 톤)·B(차가운 톤) — 전부 캔버스로 직접 그린다. 외부 사진·파일 0.
    function paintScene(bctx: CanvasRenderingContext2D, w: number, h: number, seed: number, warm: boolean) {
      const rng = makeLcg(seed);
      const g = bctx.createLinearGradient(0, 0, w, h);
      if (warm) {
        g.addColorStop(0, COLOR_A1);
        g.addColorStop(1, COLOR_A2);
      } else {
        g.addColorStop(0, COLOR_B1);
        g.addColorStop(1, COLOR_B2);
      }
      bctx.fillStyle = g;
      bctx.fillRect(0, 0, w, h);
      bctx.globalAlpha = 0.55;
      if (warm) {
        for (let i = 0; i < 8; i++) {
          bctx.fillStyle = i % 2 ? COLOR_A2 : COLOR_A1;
          bctx.beginPath();
          bctx.arc(rng() * w, rng() * h, 12 + rng() * 30, 0, Math.PI * 2);
          bctx.fill();
        }
      } else {
        const bandW = Math.max(14, w * 0.05);
        for (let x = -h; x < w + h; x += bandW * 2) {
          bctx.fillStyle = COLOR_B2;
          bctx.beginPath();
          bctx.moveTo(x, 0);
          bctx.lineTo(x + bandW, 0);
          bctx.lineTo(x + bandW - h, h);
          bctx.lineTo(x - h, h);
          bctx.closePath();
          bctx.fill();
        }
        for (let j = 0; j < 6; j++) {
          bctx.fillStyle = COLOR_A2;
          bctx.beginPath();
          bctx.arc(rng() * w, rng() * h, 5 + rng() * 9, 0, Math.PI * 2);
          bctx.fill();
        }
      }
      bctx.globalAlpha = 1;
    }

    const SEED_A = 701;
    const SEED_B = 702;
    const SEED_SEED = 703;
    const SEED_NOISE = 704;
    const PLAY_MS = 950;
    const EDGE_SOFT = 0.05; // 얼룩 경계 부드러움 — 변형: 0.05 -> 0.02(더 또렷한 잉크 테두리)
    const INK_DROPS = 5;
    const NOISE_AMT = 0.12;
    let PERM: number[] = [];
    let dataA: Uint8ClampedArray | null = null;
    let dataB: Uint8ClampedArray | null = null;
    let outImg: ImageData | null = null;
    let distField: Float32Array | null = null;

    function buildPerm(seed: number) {
      const rng = makeLcg(seed);
      const p: number[] = [];
      for (let i = 0; i < 256; i++) p.push(i);
      for (let i = 255; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const t = p[i];
        p[i] = p[j];
        p[j] = t;
      }
      return p.concat(p);
    }
    function fadeI(t: number) {
      return t * t * t * (t * (t * 6 - 15) + 10);
    }
    function lerpI(a: number, b: number, t: number) {
      return a + (b - a) * t;
    }
    function gradI(hash: number, x: number, y: number) {
      const h = hash & 3;
      const u = h < 2 ? x : y;
      const v = h < 2 ? y : x;
      return (h & 1 ? -u : u) + (h & 2 ? -v : v);
    }
    function noiseI(x: number, y: number) {
      const xi = Math.floor(x) & 255;
      const yi = Math.floor(y) & 255;
      const xf = x - Math.floor(x);
      const yf = y - Math.floor(y);
      const u = fadeI(xf);
      const v = fadeI(yf);
      const aa = PERM[PERM[xi] + yi];
      const ab = PERM[PERM[xi] + yi + 1];
      const ba = PERM[PERM[xi + 1] + yi];
      const bb = PERM[PERM[xi + 1] + yi + 1];
      const x1 = lerpI(gradI(aa, xf, yf), gradI(ba, xf - 1, yf), u);
      const x2 = lerpI(gradI(ab, xf, yf - 1), gradI(bb, xf - 1, yf - 1), u);
      return (lerpI(x1, x2, v) + 1) / 2;
    }

    function PRECOMPUTE() {
      PERM = buildPerm(SEED_NOISE);
      const iw = cv!.width;
      const ih = cv!.height;
      dataA = bctxA!.getImageData(0, 0, iw, ih).data;
      dataB = bctxB!.getImageData(0, 0, iw, ih).data;
      outImg = ctx!.createImageData(iw, ih);
      const rng = makeLcg(SEED_SEED);
      const drops: number[][] = [];
      for (let i = 0; i < INK_DROPS; i++) drops.push([rng() * iw, rng() * ih]);
      const maxDist = Math.hypot(iw, ih);
      distField = new Float32Array(iw * ih);
      let lo = Infinity;
      let hi = -Infinity;
      for (let y = 0; y < ih; y++) {
        for (let x = 0; x < iw; x++) {
          let md = Infinity;
          for (let d = 0; d < drops.length; d++) {
            const dd = Math.hypot(x - drops[d][0], y - drops[d][1]);
            if (dd < md) md = dd;
          }
          const n = noiseI(x * 0.02, y * 0.02) - 0.5;
          const v = md / maxDist + n * NOISE_AMT;
          distField[y * iw + x] = v;
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
      }
      // 실제 값 범위로 재정규화 — 점 배치에 따라 거리장이 0~1 을 다 못 채우면
      // progress 스윕의 절반 이상이 아무 변화 없이 지나간다(고정 시드라 매번 같은 쏠림).
      const span = Math.max(1e-6, hi - lo);
      for (let i2 = 0; i2 < distField.length; i2++) distField[i2] = Math.max(0, Math.min(1, (distField[i2] - lo) / span));
    }

    function RENDER(p: number) {
      const o = outImg!.data;
      const a = dataA!;
      const b = dataB!;
      const df = distField!;
      for (let i = 0, n = df.length; i < n; i++) {
        const t = df[i];
        const k = i * 4;
        let reveal: number;
        if (t <= p) reveal = 1;
        else if (t <= p + EDGE_SOFT) reveal = 1 - (t - p) / EDGE_SOFT;
        else reveal = 0;
        o[k] = b[k] + (a[k] - b[k]) * reveal;
        o[k + 1] = b[k + 1] + (a[k + 1] - b[k + 1]) * reveal;
        o[k + 2] = b[k + 2] + (a[k + 2] - b[k + 2]) * reveal;
        o[k + 3] = 255;
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
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      bufA.width = bufB.width = cv!.width;
      bufA.height = bufB.height = cv!.height;
      bctxA!.setTransform(dpr, 0, 0, dpr, 0, 0);
      bctxB!.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintScene(bctxA!, W, H, SEED_A, true);
      paintScene(bctxB!, W, H, SEED_B, false);
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
      // 실사용 경로 — 클릭·Enter·Space 로 두 장면을 다시 전환한다.
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
        // .is-demo && !reduce 경로에서만 실행된다(아래 reduce 분기)
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
      // reduce — 자동 루프 없음, 계산은 그대로 두고 즉시 전환만 허용한다.
      root.classList.add("is-still");
      progress = 0.5;
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
          <span>클릭하거나 Enter 를 누르면 잉크가 번지듯 얼룩 경계가 퍼지며 다음 장면을 드러냅니다</span>
        </p>
        <div
          className={styles.panel}
          ref={panelRef}
          tabIndex={0}
          role="button"
          aria-label="거리 필드로 번짐 반경을 계산하는 잉크 리빌 다시 재생"
        >
          <canvas className={styles.cv} ref={cvRef} aria-hidden="true" />
        </div>
      </div>
    </main>
  );
}
