import { useEffect, useRef } from "react";
import styles from "./ShardFractureFall.module.scss";

type Shard = { tri: number[][]; dist: number };

export default function ShardFractureFall() {
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

    const SEED_A = 501;
    const SEED_B = 502;
    const PLAY_MS = 1100;
    const SHARD_PX = 30; // 조각 크기 — 변형: 30px -> 46px(더 굵은 파편)
    const FALL_WINDOW = 0.22;
    const FALL_DIST_PX = 60;
    let shards: Shard[] = [];

    function PRECOMPUTE() {
      const cols = Math.ceil(W / SHARD_PX);
      const rows = Math.ceil(H / SHARD_PX);
      const maxDist = Math.hypot(W, H);
      shards = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x0 = c * SHARD_PX;
          const y0 = r * SHARD_PX;
          const x1 = x0 + SHARD_PX;
          const y1 = y0 + SHARD_PX;
          const tris: number[][][] = [
            [[x0, y0], [x1, y0], [x0, y1]],
            [[x1, y0], [x1, y1], [x0, y1]],
          ];
          for (let i = 0; i < tris.length; i++) {
            const tri = tris[i];
            const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3;
            const cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
            shards.push({ tri, dist: Math.hypot(cx, cy) / maxDist });
          }
        }
      }
    }

    function clipTri(tri: number[][]) {
      ctx!.beginPath();
      ctx!.moveTo(tri[0][0], tri[0][1]);
      ctx!.lineTo(tri[1][0], tri[1][1]);
      ctx!.lineTo(tri[2][0], tri[2][1]);
      ctx!.closePath();
      ctx!.clip();
    }

    function RENDER(p: number) {
      ctx!.drawImage(bufB, 0, 0, W, H);
      for (let i = 0; i < shards.length; i++) {
        const s = shards[i];
        if (s.dist > p) {
          ctx!.save();
          clipTri(s.tri);
          ctx!.drawImage(bufA, 0, 0, cv!.width, cv!.height, 0, 0, W, H);
          ctx!.restore();
        } else {
          const u = Math.min(1, (p - s.dist) / FALL_WINDOW);
          if (u < 1) {
            const off = u * u * FALL_DIST_PX;
            ctx!.save();
            ctx!.globalAlpha = 1 - u;
            ctx!.translate(0, off);
            clipTri(s.tri);
            ctx!.drawImage(bufA, 0, 0, cv!.width, cv!.height, 0, -off, W, H);
            ctx!.restore();
          }
        }
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
          <span>클릭하거나 Enter 를 누르면 삼각 조각이 거리 순으로 부서져 떨어지며 아래 장면이 드러납니다</span>
        </p>
        <div
          className={styles.panel}
          ref={panelRef}
          tabIndex={0}
          role="button"
          aria-label="삼각 조각마다 낙하를 계산하는 파편 전환 다시 재생"
        >
          <canvas className={styles.cv} ref={cvRef} aria-hidden="true" />
        </div>
      </div>
    </main>
  );
}
