import { useEffect, useRef } from "react";
import styles from "./HalftoneDotGrow.module.scss";

export default function HalftoneDotGrow() {
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

    // 결정론 난수 — 이 데모는 Math.random 을 쓰지 않는다. LCG(선형합동생성기) 하나로 장면을 만든다.
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

    const SEED_A = 801;
    const SEED_B = 802;
    const PLAY_MS = 900;
    const DOT_PX = 14; // 점 간격 — 변형: 14px -> 22px(더 굵은 하프톤)
    const DOT_MAX_SCALE = 0.62;
    let dotsX: number[] = [];
    let dotsY: number[] = [];
    let dotR: number[] = [];
    let dotColor: string[] = [];

    function PRECOMPUTE() {
      const data = bctxA!.getImageData(0, 0, cv!.width, cv!.height).data;
      const cols = Math.ceil(W / DOT_PX);
      const rows = Math.ceil(H / DOT_PX);
      dotsX = [];
      dotsY = [];
      dotR = [];
      dotColor = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cx = c * DOT_PX + DOT_PX / 2;
          const cy = r * DOT_PX + DOT_PX / 2;
          const sx = Math.min(cv!.width - 1, Math.round(cx * dpr));
          const sy = Math.min(cv!.height - 1, Math.round(cy * dpr));
          const k = (sy * cv!.width + sx) * 4;
          const rr = data[k];
          const gg = data[k + 1];
          const bb = data[k + 2];
          const bri = (0.299 * rr + 0.587 * gg + 0.114 * bb) / 255; // 밝기 -> 반지름
          dotsX.push(cx);
          dotsY.push(cy);
          dotR.push(bri * DOT_PX * DOT_MAX_SCALE);
          dotColor.push(`rgb(${rr},${gg},${bb})`);
        }
      }
    }

    function RENDER(p: number) {
      ctx!.drawImage(bufB, 0, 0, W, H);
      for (let i = 0; i < dotsX.length; i++) {
        const r = dotR[i] * Math.min(1, p * 1.15);
        if (r < 0.6) continue;
        ctx!.save();
        ctx!.beginPath();
        ctx!.arc(dotsX[i], dotsY[i], r, 0, Math.PI * 2);
        ctx!.clip();
        ctx!.fillStyle = dotColor[i];
        ctx!.fillRect(dotsX[i] - DOT_PX, dotsY[i] - DOT_PX, DOT_PX * 2, DOT_PX * 2);
        ctx!.restore();
      }
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
          <span>클릭하거나 Enter 를 누르면 점이 밝기만큼 커지며 다음 장면을 채웁니다</span>
        </p>
        <div
          className={styles.panel}
          ref={panelRef}
          tabIndex={0}
          role="button"
          aria-label="명암값으로 반지름을 계산하는 망점 리빌 다시 재생"
        >
          <canvas className={styles.cv} ref={cvRef} aria-hidden="true" />
        </div>
      </div>
    </main>
  );
}
