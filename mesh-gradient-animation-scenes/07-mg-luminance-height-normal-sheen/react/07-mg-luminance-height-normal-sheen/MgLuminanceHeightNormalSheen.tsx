import { useEffect, useRef } from "react";
import styles from "./MgLuminanceHeightNormalSheen.module.scss";

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

  // 07 밝기를 높이로 읽는 광택 — 메쉬 밝기 → 높이 → 이웃 차이 기울기 → 움직이는 광원의 확산광·반짝임
  var REDUCE_MS = 1000;
  var HEIGHT = 0.9;
  var SLOPE_GAIN = 0.045;
  var SHINE = 24;
  var SHEEN = 0.85;
  var ASPECT = CALC_W / CALC_H;
  var SEED_FX = [0.27, 0.38, 0.33, 0.45];
  var SEED_FY = [0.35, 0.29, 0.41, 0.31];
  var SEED_PH = [0.0, 0.27, 0.55, 0.8];
  var dotX: number[] = [0, 0, 0, 0];
  var dotY: number[] = [0, 0, 0, 0];
  var colR = new Float32Array(CALC_W * CALC_H);
  var colG = new Float32Array(CALC_W * CALC_H);
  var colB = new Float32Array(CALC_W * CALC_H);
  var hgt = new Float32Array(CALC_W * CALC_H);
  var TONE: number[][] = [PAL[1], PAL[0], PAL[2], PAL[4]];
  function paint(t: number, d: Uint8ClampedArray): void {
    for (var k = 0; k < 4; k += 1) {
      dotX[k] = (0.5 + 0.38 * Math.sin(6.2832 * (t * SEED_FX[k] + SEED_PH[k]))) * ASPECT;
      dotY[k] = 0.5 + 0.38 * Math.cos(6.2832 * (t * SEED_FY[k] + SEED_PH[k] * 1.3));
    }
    for (var y = 0; y < CALC_H; y += 1) {
      var v = y / (CALC_H - 1);
      for (var x = 0; x < CALC_W; x += 1) {
        var u = (x / (CALC_W - 1)) * ASPECT;
        var wr = 0, wg = 0, wb = 0, ws = 0;
        for (var j = 0; j < 4; j += 1) {
          var dx = u - dotX[j], dy = v - dotY[j];
          var w = 1 / (dx * dx + dy * dy + 0.004);
          wr += w * TONE[j][0];
          wg += w * TONE[j][1];
          wb += w * TONE[j][2];
          ws += w;
        }
        var i = y * CALC_W + x;
        colR[i] = wr / ws;
        colG[i] = wg / ws;
        colB[i] = wb / ws;
        // 밝기(0~1)에서 가까운 점의 가중 비율을 한 번 더 제곱해 높이로 쓴다
        var lum = (0.299 * colR[i] + 0.587 * colG[i] + 0.114 * colB[i]) / 255;
        hgt[i] = lum * lum * HEIGHT * CALC_H;
      }
    }
    var ang = 6.2832 * t * 0.35;
    var lx = Math.cos(ang) * 0.7, ly = Math.sin(ang) * 0.7, lz = 0.6;
    var ln = Math.sqrt(lx * lx + ly * ly + lz * lz);
    lx /= ln; ly /= ln; lz /= ln;
    // 반사 벡터 대신 절반 벡터(광원 + 시선)로 반짝임을 잰다
    var hx = lx, hy = ly, hz = lz + 1;
    var hn = Math.sqrt(hx * hx + hy * hy + hz * hz);
    hx /= hn; hy /= hn; hz /= hn;
    for (var y2 = 0; y2 < CALC_H; y2 += 1) {
      var ya = Math.max(0, y2 - 1), yb = Math.min(CALC_H - 1, y2 + 1);
      for (var x2 = 0; x2 < CALC_W; x2 += 1) {
        var xa = Math.max(0, x2 - 1), xb = Math.min(CALC_W - 1, x2 + 1);
        var gx = (hgt[y2 * CALC_W + xa] - hgt[y2 * CALC_W + xb]) * SLOPE_GAIN * 10;
        var gy = (hgt[ya * CALC_W + x2] - hgt[yb * CALC_W + x2]) * SLOPE_GAIN * 10;
        var nn = Math.sqrt(gx * gx + gy * gy + 1);
        var nx = gx / nn, ny = gy / nn, nz = 1 / nn;
        var diff = clamp(nx * lx + ny * ly + nz * lz, 0, 1);
        var spec = Math.pow(clamp(nx * hx + ny * hy + nz * hz, 0, 1), SHINE) * SHEEN;
        var j2 = y2 * CALC_W + x2;
        var shade = 0.72 + 0.4 * diff;
        put(d, x2, y2,
          clamp(colR[j2] * shade + 255 * spec, 0, 255),
          clamp(colG[j2] * shade + 255 * spec, 0, 255),
          clamp(colB[j2] * shade + 255 * spec, 0, 255));
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

export default function MgLuminanceHeightNormalSheen() {
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
        <canvas className={styles.mg__canvas} ref={canvasRef} width={160} height={100} tabIndex={0} aria-label="메쉬의 밝기를 높이로 보고 이웃 픽셀 차이로 기울기를 구해, 움직이는 광원이 닿는 자리에 반짝임이 얹힌 젖은 젤리 같은 면이 보인다." />
        <p className={styles.mg__status} ref={statusRef} aria-live="polite">시연 중</p>
        <button className={styles.mg__btn} ref={btnRef} type="button">멈춤</button>
        <p className={styles.mg__caption}>메쉬의 밝기를 높이로 보고 이웃 픽셀 차이로 기울기를 구해, 움직이는 광원이 닿는 자리에 반짝임이 얹힌 젖은 젤리 같은 면이 보인다.</p>
      </div>
    </main>
  );
}
