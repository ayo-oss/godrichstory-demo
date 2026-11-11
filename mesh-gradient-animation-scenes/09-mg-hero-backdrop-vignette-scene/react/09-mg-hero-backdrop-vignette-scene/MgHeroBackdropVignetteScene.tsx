import { useEffect, useRef } from "react";
import styles from "./MgHeroBackdropVignetteScene.module.scss";

function main(root: HTMLDivElement, canvas: HTMLCanvasElement, statusEl: HTMLElement, btnEl: HTMLButtonElement): () => void {
  var ctx0 = canvas.getContext('2d');
  if (!ctx0) { return function (): void { return; }; }
  var ctx: CanvasRenderingContext2D = ctx0;
  var CALC_W = 160, CALC_H = 100;
  var FIXED_DT = 16;
  var REDUCE_STEP_MS = 900;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) root.classList.remove('is-demo');
  var paused = false;
  var elapsed = 0, rafId = 0;
  var cleaners: Array<() => void> = [];

  function listen(target: EventTarget, type: string, fn: (e: Event) => void): void {
    target.addEventListener(type, fn);
    cleaners.push(function (): void { target.removeEventListener(type, fn); });
  }
  function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
  function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
  function smooth(x: number): number { var c = clamp(x, 0, 1); return c * c * (3 - 2 * c); }
  function setStatus(msg: string): void { statusEl.textContent = msg; }
  // 시드 고정 난수 (mulberry32) — 같은 시드는 언제나 같은 수열이다
  function seedRand(seed: number): () => number {
    var s = seed >>> 0;
    return function (): number {
      s = (s + 0x6D2B79F5) >>> 0;
      var z = s;
      z = Math.imul(z ^ (z >>> 15), z | 1);
      z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
      return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    };
  }
  // 파스텔 여섯 색 — 분홍·라일락·하늘·민트·살구·버터
  var PAL: number[][] = [[255, 152, 178], [182, 152, 255], [122, 200, 255], [122, 222, 186], [255, 196, 140], [255, 228, 130]];
  // 색 목록을 원형으로 읽는다. pos 의 정수부는 몇 번째 색, 소수부는 다음 색으로 넘어가는 정도
  function pick(pal: number[][], pos: number, out: number[]): void {
    var n = pal.length;
    var i0 = Math.floor(pos);
    var f = pos - i0;
    var a = pal[((i0 % n) + n) % n];
    var b = pal[(((i0 + 1) % n) + n) % n];
    out[0] = lerp(a[0], b[0], f);
    out[1] = lerp(a[1], b[1], f);
    out[2] = lerp(a[2], b[2], f);
  }
  function put(d: Uint8ClampedArray, x: number, y: number, r: number, g: number, b: number): void {
    var o = (y * CALC_W + x) * 4;
    d[o] = r;
    d[o + 1] = g;
    d[o + 2] = b;
    d[o + 3] = 255;
  }

  canvas.width = CALC_W;
  canvas.height = CALC_H;
  var img = ctx.createImageData(CALC_W, CALC_H);
  var px = img.data;

  // 09 제목 뒤 히어로 — 역거리 메쉬 + 시드 고정 알갱이 + 가장자리 어둠. 글자 쪽(가운데)은 밝게 둔다
  var REDUCE_MS = 1000;
  var POWER = 2;
  var VIGNETTE = 0.22;
  var GRAIN_AMOUNT = 5;
  var ASPECT = CALC_W / CALC_H;
  var SEED_FX = [0.23, 0.34, 0.29, 0.41, 0.31];
  var SEED_FY = [0.3, 0.26, 0.37, 0.28, 0.35];
  var SEED_PH = [0.0, 0.21, 0.43, 0.62, 0.81];
  var HERO_PAL: number[][] = [PAL[1], PAL[2], PAL[0], PAL[3], PAL[5]];
  var dotX: number[] = [0, 0, 0, 0, 0];
  var dotY: number[] = [0, 0, 0, 0, 0];
  var NOISE_N = CALC_W * CALC_H;
  var noiseTab: number[] = [];
  var rnd = seedRand(99);
  for (var ni = 0; ni < NOISE_N; ni += 1) { noiseTab.push(rnd()); }
  function paint(t: number, d: Uint8ClampedArray): void {
    for (var k = 0; k < 5; k += 1) {
      dotX[k] = (0.5 + 0.42 * Math.sin(6.2832 * (t * SEED_FX[k] + SEED_PH[k]))) * ASPECT;
      dotY[k] = 0.5 + 0.4 * Math.cos(6.2832 * (t * SEED_FY[k] + SEED_PH[k] * 1.6));
    }
    var halfP = POWER / 2;
    var frame = Math.floor(t * 30);
    for (var y = 0; y < CALC_H; y += 1) {
      var v = y / (CALC_H - 1);
      for (var x = 0; x < CALC_W; x += 1) {
        var u = (x / (CALC_W - 1)) * ASPECT;
        var wr = 0, wg = 0, wb = 0, ws = 0;
        for (var j = 0; j < 5; j += 1) {
          var dx = u - dotX[j], dy = v - dotY[j];
          var w = 1 / (Math.pow(dx * dx + dy * dy, halfP) + 0.003);
          wr += w * HERO_PAL[j][0];
          wg += w * HERO_PAL[j][1];
          wb += w * HERO_PAL[j][2];
          ws += w;
        }
        // 가장자리 어둠 — 중심에서 멀수록 곱하는 값이 1 에서 1 - VIGNETTE 로 내려간다
        var ex = (x / (CALC_W - 1) - 0.5) * 2, ey = (y / (CALC_H - 1) - 0.5) * 2;
        var vig = 1 - VIGNETTE * smooth((Math.sqrt(ex * ex * 0.6 + ey * ey) - 0.55) / 0.9);
        var grain = (noiseTab[(y * CALC_W + x + frame * 991) % NOISE_N] - 0.5) * GRAIN_AMOUNT;
        put(d, x, y,
          clamp((wr / ws) * vig + grain, 0, 255),
          clamp((wg / ws) * vig + grain, 0, 255),
          clamp((wb / ws) * vig + grain, 0, 255));
      }
    }
  }

  function draw(): void {
    paint(elapsed / 1000, px);
    ctx.putImageData(img, 0, 0);
  }
  var lastTs: number | null = null;
  var accMs = 0;
  function tick(ts: number): void {
    if (lastTs === null) { lastTs = ts; }
    var frameDt = Math.min(ts - lastTs, 48);
    lastTs = ts;
    if (!paused) {
      accMs += frameDt;
      while (accMs >= FIXED_DT) {
        elapsed += FIXED_DT;
        accMs -= FIXED_DT;
      }
      draw();
    }
    rafId = requestAnimationFrame(tick);
  }
  function onButton(): void {
    root.classList.remove('is-demo');
    if (reduce) {
      elapsed += REDUCE_STEP_MS;
      draw();
      setStatus('한 장면씩 넘기는 중');
      return;
    }
    paused = !paused;
    btnEl.textContent = paused ? '재생' : '멈춤';
    setStatus(paused ? '일시정지됨' : '시연 중');
  }
  draw();
  listen(btnEl, 'click', function (): void { onButton(); });
  listen(canvas, 'pointerdown', function (): void { onButton(); });
  listen(canvas, 'keydown', function (e: Event): void {
    var k = (e as KeyboardEvent).key;
    if (k === 'Enter' || k === ' ') { e.preventDefault(); onButton(); }
  });
  if (reduce) {
    elapsed = REDUCE_MS;
    draw();
    btnEl.textContent = '다음 장면';
    setStatus('한 장면씩 넘기는 중');
  } else {
    rafId = requestAnimationFrame(tick);
  }

  function destroy(): void {
    cancelAnimationFrame(rafId);
    for (var i = 0; i < cleaners.length; i += 1) { cleaners[i](); }
  }
  return destroy;
}

export default function MgHeroBackdropVignetteScene() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const statusRef = useRef<HTMLParagraphElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const statusEl = statusRef.current;
    const btnEl = btnRef.current;
    if (!root || !canvas || !statusEl || !btnEl) return;
    return main(root, canvas, statusEl, btnEl);
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.mg} is-demo`} ref={rootRef}>
        <canvas className={styles.mg__canvas} ref={canvasRef} width={160} height={100} tabIndex={0} aria-label="움직이는 메쉬와 알갱이, 가장자리 어둠을 합쳐 제목 뒤에 깔고, 글자 밑의 색이 바뀌어도 읽기 쉬운 밝기 차가 유지되는지 한 장면으로 본다." />
        <div className={styles.mg__hero}>
          <h1 className={styles.mg__title}>부드러운 색이 흐르는 첫 화면</h1>
          <p className={styles.mg__sub}>글자 뒤에서 메쉬가 계속 움직여도 읽히는지 본다</p>
        </div>
        <p className={styles.mg__status} ref={statusRef} aria-live="polite">시연 중</p>
        <button className={styles.mg__btn} ref={btnRef} type="button">멈춤</button>
        <p className={styles.mg__caption}>움직이는 메쉬와 알갱이, 가장자리 어둠을 합쳐 제목 뒤에 깔고, 글자 밑의 색이 바뀌어도 읽기 쉬운 밝기 차가 유지되는지 한 장면으로 본다.</p>
      </div>
    </main>
  );
}
