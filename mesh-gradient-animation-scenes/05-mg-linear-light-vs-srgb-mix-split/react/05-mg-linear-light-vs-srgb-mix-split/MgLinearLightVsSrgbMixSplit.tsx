import { useEffect, useRef } from "react";
import styles from "./MgLinearLightVsSrgbMixSplit.module.scss";

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

  // 05 감마 보정 섞기 — 왼쪽 절반은 값 그대로, 오른쪽 절반은 선형 밝기로 되돌려 섞는다 (같은 보라·주황)
  var REDUCE_MS = 800;
  var COLOR_A: number[] = [130, 90, 245];
  var COLOR_B: number[] = [255, 156, 60];
  var GAMMA = 2.2;
  var linA: number[] = [Math.pow(COLOR_A[0] / 255, GAMMA), Math.pow(COLOR_A[1] / 255, GAMMA), Math.pow(COLOR_A[2] / 255, GAMMA)];
  var linB: number[] = [Math.pow(COLOR_B[0] / 255, GAMMA), Math.pow(COLOR_B[1] / 255, GAMMA), Math.pow(COLOR_B[2] / 255, GAMMA)];
  var HALF = CALC_W / 2;
  function paint(t: number, d: Uint8ClampedArray): void {
    for (var y = 0; y < CALC_H; y += 1) {
      var v = y / (CALC_H - 1);
      for (var x = 0; x < CALC_W; x += 1) {
        var right = x >= HALF;
        var lx = (right ? x - HALF : x) / (HALF - 1);
        // 두 색 사이의 비율 s — 양쪽 절반이 같은 값 s 를 쓴다
        var s = smooth(lx + 0.22 * Math.sin(6.2832 * (v * 1.1 + t * 0.5)) + 0.1 * Math.sin(6.2832 * (v * 2.3 - t * 0.35)));
        var r: number, g: number, b: number;
        if (!right) {
          r = lerp(COLOR_A[0], COLOR_B[0], s);
          g = lerp(COLOR_A[1], COLOR_B[1], s);
          b = lerp(COLOR_A[2], COLOR_B[2], s);
        } else {
          r = 255 * Math.pow(lerp(linA[0], linB[0], s), 1 / GAMMA);
          g = 255 * Math.pow(lerp(linA[1], linB[1], s), 1 / GAMMA);
          b = 255 * Math.pow(lerp(linA[2], linB[2], s), 1 / GAMMA);
        }
        if (x === Math.floor(HALF) || x === Math.floor(HALF) - 1) { r = 255; g = 255; b = 255; }
        put(d, x, y, r, g, b);
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

export default function MgLinearLightVsSrgbMixSplit() {
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
        <canvas className={styles.mg__canvas} ref={canvasRef} width={160} height={100} tabIndex={0} aria-label="같은 두 색을 왼쪽은 값 그대로, 오른쪽은 밝기를 선형으로 되돌려 섞고, 가운데 띠가 어둡게 탁해지는 쪽과 맑게 남는 쪽을 한 화면에서 비교한다." />
        <p className={styles.mg__status} ref={statusRef} aria-live="polite">시연 중</p>
        <button className={styles.mg__btn} ref={btnRef} type="button">멈춤</button>
        <p className={styles.mg__caption}>같은 두 색을 왼쪽은 값 그대로, 오른쪽은 밝기를 선형으로 되돌려 섞고, 가운데 띠가 어둡게 탁해지는 쪽과 맑게 남는 쪽을 한 화면에서 비교한다.</p>
      </div>
    </main>
  );
}
