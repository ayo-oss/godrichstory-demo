import { useEffect, useRef } from "react";
import styles from "./MgGrainDitherBandingRemoval.module.scss";

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

  // 06 알갱이 디더 — 같은 어두운 그라데이션을 8비트보다 거친 STEP 단계로 반올림해, 왼쪽은 그대로 오른쪽은 알갱이를 더한다
  var REDUCE_MS = 900;
  var STEP = 10;
  var GRAIN = 1;
  var DARK: number[] = [30, 34, 66];
  var LIGHT: number[] = [112, 100, 170];
  var NOISE_N = CALC_W * CALC_H;
  var noiseTab: number[] = [];
  var rnd = seedRand(2026);
  for (var ni = 0; ni < NOISE_N; ni += 1) { noiseTab.push(rnd()); }
  function paint(t: number, d: Uint8ClampedArray): void {
    var cx = 0.5 + 0.28 * Math.sin(6.2832 * t * 0.4);
    var cy = 0.5 + 0.2 * Math.cos(6.2832 * t * 0.31);
    var frame = Math.floor(t * 30);
    for (var y = 0; y < CALC_H; y += 1) {
      var v = y / (CALC_H - 1);
      for (var x = 0; x < CALC_W; x += 1) {
        var u = x / (CALC_W - 1);
        var dx = (u - cx) * 1.6, dy = v - cy;
        var k = 1 - clamp(Math.sqrt(dx * dx + dy * dy) * 1.05, 0, 1);
        var right = x >= CALC_W / 2;
        var n = noiseTab[(y * CALC_W + x + frame * 997) % NOISE_N];
        // 반올림 문턱을 픽셀마다 0.5 ± GRAIN/2 단계 안에서 흔든다 (왼쪽은 문턱 0.5 고정)
        var th = right ? 0.5 + (n - 0.5) * GRAIN : 0.5;
        var ch: number[] = [0, 0, 0];
        for (var c = 0; c < 3; c += 1) {
          var val = lerp(DARK[c], LIGHT[c], k);
          ch[c] = Math.floor(val / STEP + th) * STEP;
        }
        if (x === Math.floor(CALC_W / 2) || x === Math.floor(CALC_W / 2) - 1) { ch = [236, 232, 255]; }
        put(d, x, y, ch[0], ch[1], ch[2]);
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

export default function MgGrainDitherBandingRemoval() {
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
        <canvas className={styles.mg__canvas} ref={canvasRef} width={160} height={100} tabIndex={0} aria-label="명암 차가 작은 메쉬는 단계가 띠로 보이는데, 픽셀마다 시드 고정 노이즈를 한 단계 안에서 더해 반올림 경계를 흩어 띠를 지운다." />
        <p className={styles.mg__status} ref={statusRef} aria-live="polite">시연 중</p>
        <button className={styles.mg__btn} ref={btnRef} type="button">멈춤</button>
        <p className={styles.mg__caption}>명암 차가 작은 메쉬는 단계가 띠로 보이는데, 픽셀마다 시드 고정 노이즈를 한 단계 안에서 더해 반올림 경계를 흩어 띠를 지운다.</p>
      </div>
    </main>
  );
}
