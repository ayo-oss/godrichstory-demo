// HueShift — vanilla 판(run/370/demo/07-scroll-particle-hue-shift/index.html) 의 React 포트.
// 계산 겹: 색 띠 보간(color-band interpolation) — 직접 구현한 parseHex()/lerpRGB()/bandColor() 로
// 세 앵커 색을 잇는 띠를 만들고, 입자마다 자기 x 위치 + 스크롤 위치를 더한 값으로 띠 위 지점을 골라
// 그 색을 그린다. 여기에 자율 사인 바빙(bobbing)을 얹는다.
import { useEffect, useRef } from "react";
import styles from "./HueShift.module.scss";

type Box<T> = { current: T };
interface RGB { r: number; g: number; b: number; }
interface Dot { bx: number; by: number; phase: number; r: number; }

export default function HueShift() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const viewportRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const canvasRef = useRef(null) as unknown as Box<HTMLCanvasElement>;
  const valRef = useRef(null) as unknown as Box<HTMLElement>;
  const rafFrameRef = useRef(0) as unknown as Box<number>;
  const rafDriveRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const root = rootRef.current;
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    const val = valRef.current;
    if (!root || !viewport || !canvas || !val) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;

    function makeLcg(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rng = makeLcg(577215);

    const css = getComputedStyle(root);
    function readHex(name: string, fallback: string) {
      const v = css.getPropertyValue(name).trim();
      return v || fallback;
    }
    function parseHex(hex: string): RGB {
      hex = hex.replace("#", "");
      return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16),
      };
    }
    const BAND_A = parseHex(readHex("--band-a", "#ff9ebb"));
    const BAND_B = parseHex(readHex("--band-b", "#b9a0ff"));
    const BAND_C = parseHex(readHex("--band-c", "#6ec8ff"));

    function lerpRGB(c1: RGB, c2: RGB, t: number): RGB {
      return { r: c1.r + (c2.r - c1.r) * t, g: c1.g + (c2.g - c1.g) * t, b: c1.b + (c2.b - c1.b) * t };
    }
    function bandColor(t: number) {
      t = ((t % 1) + 1) % 1;
      const c = t < 0.5 ? lerpRGB(BAND_A, BAND_B, t * 2) : lerpRGB(BAND_B, BAND_C, (t - 0.5) * 2);
      return "rgb(" + (c.r | 0) + "," + (c.g | 0) + "," + (c.b | 0) + ")";
    }

    const BOB_FREQ = 1.6;
    const BOB_AMP = 9;
    const COUNT = 60;

    let W = 0, H = 0, dpr = 1;
    let dots: Dot[] = [];

    function layoutDots() {
      dots = [];
      const cols = 10, rows = 6;
      for (let i = 0; i < COUNT; i++) {
        const col = i % cols, row = Math.floor(i / cols) % rows;
        dots.push({
          bx: (col + 0.5) / cols * W,
          by: (row + 0.5) / rows * H,
          phase: rng() * Math.PI * 2,
          r: 2 + rng() * 2.4,
        });
      }
    }

    function fit() {
      const r = viewport!.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      W = r.width; H = r.height;
      canvas!.width = Math.round(W * dpr);
      canvas!.height = Math.round(H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      layoutDots();
    }

    let scrollPos = 0, scrollVel = 0, scrollDir = 0, idleMs = 0, lastTop = 0, lastT = 0;
    function sampleScroll(now: number) {
      const top = viewport!.scrollTop;
      const max = Math.max(1, viewport!.scrollHeight - viewport!.clientHeight);
      scrollPos = top / max;
      const dt = lastT ? Math.max(1, now - lastT) : 16;
      const v = (top - lastTop) / dt * 1000;
      scrollVel += (v - scrollVel) * 0.3;
      if (Math.abs(scrollVel) > 4) { scrollDir = scrollVel > 0 ? 1 : -1; idleMs = 0; } else { idleMs += dt; }
      lastTop = top; lastT = now;
    }

    function onScroll() {
      sampleScroll(performance.now());
      if (reduce) paintStatic();
    }
    viewport.addEventListener("scroll", onScroll);

    function human() { if (isDemo) { isDemo = false; } }
    viewport.addEventListener("wheel", human, { passive: true });
    viewport.addEventListener("touchstart", human, { passive: true });
    viewport.addEventListener("pointerdown", human, { passive: true });

    function paint(now: number) {
      ctx!.clearRect(0, 0, W, H);
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        const y = d.by + Math.sin(now / 1000 * BOB_FREQ * Math.PI * 2 + d.phase) * BOB_AMP;
        const u = d.bx / W + scrollPos;
        ctx!.fillStyle = bandColor(u);
        ctx!.globalAlpha = 0.86;
        ctx!.beginPath(); ctx!.arc(d.bx, y, d.r, 0, Math.PI * 2); ctx!.fill();
      }
      ctx!.globalAlpha = 1;
    }

    function updateVal() { val!.textContent = Math.round(((scrollPos % 1 + 1) % 1) * 100) + "%"; }

    function paintStatic() {
      ctx!.clearRect(0, 0, W, H);
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        const u = d.bx / W + scrollPos;
        ctx!.fillStyle = bandColor(u);
        ctx!.globalAlpha = 0.86;
        ctx!.beginPath(); ctx!.arc(d.bx, d.by, d.r, 0, Math.PI * 2); ctx!.fill();
      }
      ctx!.globalAlpha = 1;
      updateVal();
    }

    function frame(now: number) {
      paint(now);
      updateVal();
      rafFrameRef.current = requestAnimationFrame(frame);
    }

    const DRIVE_PERIOD_MS = 2000;
    let driveStart = 0;
    function triangle(frac: number) { return frac < 0.5 ? frac * 2 : 2 - frac * 2; }
    function driveTick(now: number) {
      if (!driveStart) driveStart = now;
      if (isDemo && !reduce) {
        const frac = ((now - driveStart) % DRIVE_PERIOD_MS) / DRIVE_PERIOD_MS;
        const w = triangle(frac);
        const max = Math.max(1, viewport!.scrollHeight - viewport!.clientHeight);
        viewport!.scrollTop = w * max;
      }
      rafDriveRef.current = requestAnimationFrame(driveTick);
    }

    function onResize() { fit(); }
    window.addEventListener("resize", onResize);
    fit();

    if (reduce) {
      sampleScroll(performance.now());
      paintStatic();
    } else {
      rafFrameRef.current = requestAnimationFrame(frame);
      rafDriveRef.current = requestAnimationFrame(driveTick);
    }

    return () => {
      window.removeEventListener("resize", onResize);
      viewport.removeEventListener("scroll", onScroll);
      viewport.removeEventListener("wheel", human);
      viewport.removeEventListener("touchstart", human);
      viewport.removeEventListener("pointerdown", human);
      cancelAnimationFrame(rafFrameRef.current);
      cancelAnimationFrame(rafDriveRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.root} ref={rootRef}>
        <p className={styles.hint}>
          <svg className={styles.icon} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" /><path d="M232 128a104 104 0 0 1-208 0c0-41 23.81-78.36 60.66-95.27a8 8 0 0 1 6.68 14.54C60.15 61.59 40 93.27 40 128a88 88 0 0 0 176 0c0-34.73-20.15-66.41-51.34-80.73a8 8 0 0 1 6.68-14.54C208.19 49.64 232 87 232 128" /></g></svg>
          <span>스크롤 위치가 색 띠를 가로로 밀어 넣습니다</span>
        </p>
        <div className={styles.viewport} ref={viewportRef} tabIndex={0} role="region" aria-label="입자 색 띠 스크롤 영역">
          <canvas className={styles.canvas} ref={canvasRef} aria-hidden="true" />
          <b className={styles.val} ref={valRef} aria-hidden="true">0%</b>
          <div className={styles.track} aria-hidden="true" />
        </div>
      </div>
    </main>
  );
}
