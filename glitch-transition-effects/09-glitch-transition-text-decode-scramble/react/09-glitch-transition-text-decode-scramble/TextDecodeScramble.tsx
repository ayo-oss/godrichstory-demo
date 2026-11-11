import { useEffect, useRef } from "react";
import styles from "./TextDecodeScramble.module.scss";

export default function TextDecodeScramble() {
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

    const css = getComputedStyle(root);
    function tok(name: string, fb: string) {
      const v = css.getPropertyValue(name);
      return v ? v.trim() || fb : fb;
    }
    const BG1 = tok("--scene-bg1", "#1c2f66");
    const BG2 = tok("--scene-bg2", "#17141a");
    const TEXT_COLOR = tok("--scene-text", "#fff7e6");
    const GHOST_COLOR = tok("--scene-ghost", "#8ea0d8");
    const BAR_COLOR = tok("--scene-bar", "#8be6c4");

    const TEXT = "로그인 성공했습니다";
    const POOL = "가나다라마바사아자차카타파하ㄱㄴㄷㄹㅁㅂㅅㅇ#@$%&01239".split("");

    let W = 0;
    let H = 0;
    let dpr = 1;
    let iw = 0;
    let ih = 0;

    const SEED = 1133;
    const DECODE_SPEED = 1.7;
    const BLOCK = 6; // 스캔라인/블록 노이즈 격자 폭(px) — SEED 로 흔든다
    const chars = TEXT.split("");
    let charX: number[] = [];
    let fontSize = 20;
    let baselineY = 0;

    function hash01(n: number) {
      n = (n ^ 61) ^ (n >>> 16);
      n = (n + (n << 3)) | 0;
      n = n ^ (n >>> 4);
      n = Math.imul(n, 0x27d4eb2d);
      n = n ^ (n >>> 15);
      return (n >>> 0) / 4294967295;
    }

    function PRECOMPUTE() {
      fontSize = Math.max(18, Math.min(38, iw / 8));
      ctx!.font = "700 " + fontSize + "px ui-monospace, monospace";
      let widths = chars.map((c) => ctx!.measureText(c).width);
      let total = widths.reduce((a, b) => a + b, 0);
      const maxW = iw * 0.94;
      if (total > maxW && total > 0) {
        fontSize = Math.max(14, fontSize * (maxW / total));
        ctx!.font = "700 " + fontSize + "px ui-monospace, monospace";
        widths = chars.map((c) => ctx!.measureText(c).width);
        total = widths.reduce((a, b) => a + b, 0);
      }
      const startX = (iw - total) / 2;
      charX = [];
      let x = startX;
      for (let i = 0; i < chars.length; i++) {
        charX.push(x);
        x += widths[i];
      }
      baselineY = ih / 2 + fontSize * 0.32;
    }

    let frameCounter = 0;
    let phase = 0;

    // 해독 중인 글자 뒤로 깔리는 스캔라인/블록 노이즈 — 진행률만큼 폭이 줄며 면적을 만든다
    function drawNoiseBand(p: number) {
      if (p <= 0.02) return;
      const bandTop = baselineY - fontSize * 1.15;
      const bandH = fontSize * 1.9;
      const rows = Math.max(1, Math.ceil(bandH / BLOCK));
      const cols = Math.max(1, Math.ceil(iw / BLOCK));
      for (let r = 0; r < rows; r++) {
        const by = bandTop + r * BLOCK;
        for (let c = 0; c < cols; c++) {
          const bx = c * BLOCK;
          const s = (Math.imul(c + 1, 668265263) ^ Math.imul(r + 1, 2246822519) ^ Math.imul(frameCounter, 3266489917) ^ SEED) >>> 0;
          const v = hash01(s);
          if (v < 0.34) {
            ctx!.fillStyle = v < 0.14 ? BAR_COLOR : GHOST_COLOR;
            ctx!.globalAlpha = (0.55 + v) * p * 0.85;
            ctx!.fillRect(bx, by, BLOCK - 1, BLOCK - 1);
          }
        }
      }
      ctx!.globalAlpha = 1;
    }

    function RENDER(p: number) {
      frameCounter = (frameCounter + 1) >>> 0;
      phase += 0.3;
      const decodeFrac = 1 - p;
      const n = chars.length;

      const g = ctx!.createLinearGradient(0, 0, 0, ih);
      g.addColorStop(0, BG1);
      g.addColorStop(1, BG2);
      ctx!.fillStyle = g;
      ctx!.fillRect(0, 0, iw, ih);

      drawNoiseBand(p);

      let boundaryX = charX[0];
      ctx!.font = "700 " + fontSize + "px ui-monospace, monospace";
      ctx!.textBaseline = "alphabetic";

      for (let i = 0; i < n; i++) {
        const resolved = decodeFrac * DECODE_SPEED * n >= i + 1;
        const ch = chars[i];
        let drawCh = ch;
        let jy = 0;
        if (!resolved && ch !== " ") {
          const seed = (Math.imul(i + 1, 2654435761) ^ Math.imul(frameCounter, 2246822519) ^ SEED) >>> 0;
          const hIdx = Math.floor(hash01(seed) * POOL.length);
          drawCh = POOL[hIdx];
          jy = Math.round((hash01(seed ^ 0x9e3779b9) - 0.5) * 5 * p);
          ctx!.fillStyle = GHOST_COLOR;
          boundaryX = charX[i];
        } else {
          ctx!.fillStyle = TEXT_COLOR;
        }
        ctx!.fillText(drawCh, charX[i], baselineY + jy);
      }

      if (p > 0.02) {
        const pulse = 0.35 + 0.25 * Math.sin(phase);
        ctx!.fillStyle = BAR_COLOR;
        ctx!.globalAlpha = pulse * p;
        ctx!.fillRect(boundaryX - 2, ih * 0.22, 3, ih * 0.56);
        ctx!.globalAlpha = 1;
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
      iw = W;
      ih = H;
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
    const PLAY_MS = 900;

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
          <span>클릭하거나 Enter 를 누르면 해독 진행률 값이 오르며 왼쪽부터 순서대로 글자가 고정됩니다</span>
        </p>
        <div
          className={styles.panel}
          ref={panelRef}
          tabIndex={0}
          role="button"
          aria-label="해독 진행률 값이 왼쪽부터 고정되는 헤드라인 전환 다시 재생"
        >
          <canvas className={styles.cv} ref={cvRef} aria-hidden="true" />
        </div>
      </div>
    </main>
  );
}
