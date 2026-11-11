import { useEffect, useRef } from "react";
import styles from "./MgDomainWarpNoiseFlow.module.scss";

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

  // 04 노이즈 좌표 비틀기 — 색을 읽기 전에 시드 고정 값 노이즈 두 겹으로 좌표를 민다
  var REDUCE_MS = 1000;
  var WARP = 0.3;
  var LATTICE = 32;
  var lattice: number[] = [];
  var rnd = seedRand(7);
  for (var li = 0; li < LATTICE * LATTICE; li += 1) { lattice.push(rnd()); }
  function lat(ix: number, iy: number): number {
    return lattice[(((iy % LATTICE) + LATTICE) % LATTICE) * LATTICE + (((ix % LATTICE) + LATTICE) % LATTICE)];
  }
  function vnoise(x: number, y: number): number {
    var ix = Math.floor(x), iy = Math.floor(y);
    var fx = smooth(x - ix), fy = smooth(y - iy);
    return lerp(lerp(lat(ix, iy), lat(ix + 1, iy), fx), lerp(lat(ix, iy + 1), lat(ix + 1, iy + 1), fx), fy);
  }
  var GRID: number[][] = [PAL[0], PAL[2], PAL[1], PAL[3], PAL[5], PAL[0], PAL[1], PAL[4], PAL[2]];
  function meshRead(u: number, v: number, out: number[]): void {
    var gx = clamp(u, 0, 1) * 2, gy = clamp(v, 0, 1) * 2;
    var ix = Math.min(1, Math.floor(gx)), iy = Math.min(1, Math.floor(gy));
    var fx = smooth(gx - ix), fy = smooth(gy - iy);
    var a = GRID[iy * 3 + ix], b = GRID[iy * 3 + ix + 1], c = GRID[(iy + 1) * 3 + ix], e = GRID[(iy + 1) * 3 + ix + 1];
    out[0] = lerp(lerp(a[0], b[0], fx), lerp(c[0], e[0], fx), fy);
    out[1] = lerp(lerp(a[1], b[1], fx), lerp(c[1], e[1], fx), fy);
    out[2] = lerp(lerp(a[2], b[2], fx), lerp(c[2], e[2], fx), fy);
  }
  var warpTmp: number[] = [0, 0, 0];
  function paint(t: number, d: Uint8ClampedArray): void {
    for (var y = 0; y < CALC_H; y += 1) {
      var v = y / (CALC_H - 1);
      for (var x = 0; x < CALC_W; x += 1) {
        var u = x / (CALC_W - 1);
        // 큰 물결 + 잔물결 두 겹
        var wu = (vnoise(u * 2.2 + t * 0.7, v * 2.2 - t * 0.4) - 0.5) * 2 + (vnoise(u * 5 - t * 0.9 + 7.7, v * 5 + t * 0.6) - 0.5) * 0.7;
        var wv = (vnoise(u * 2.2 - t * 0.5 + 3.1, v * 2.2 + t * 0.8 + 5.3) - 0.5) * 2 + (vnoise(u * 5 + t * 0.8 + 1.9, v * 5 - t * 0.7 + 9.1) - 0.5) * 0.7;
        meshRead(u + WARP * wu, v + WARP * wv, warpTmp);
        put(d, x, y, warpTmp[0], warpTmp[1], warpTmp[2]);
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

export default function MgDomainWarpNoiseFlow() {
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
        <canvas className={styles.mg__canvas} ref={canvasRef} width={160} height={100} tabIndex={0} aria-label="색을 읽기 전에 좌표를 두 겹 노이즈로 밀어 보내고 그 자리에서 메쉬를 읽어, 가장자리가 연기처럼 휘어지며 흐르는 모양이 나온다." />
        <p className={styles.mg__status} ref={statusRef} aria-live="polite">시연 중</p>
        <button className={styles.mg__btn} ref={btnRef} type="button">멈춤</button>
        <p className={styles.mg__caption}>색을 읽기 전에 좌표를 두 겹 노이즈로 밀어 보내고 그 자리에서 메쉬를 읽어, 가장자리가 연기처럼 휘어지며 흐르는 모양이 나온다.</p>
      </div>
    </main>
  );
}
