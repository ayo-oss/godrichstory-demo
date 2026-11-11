import { useEffect, useRef } from "react";
import styles from "./DpFlipTimeColorMapFractalGrid.module.scss";

function main(root: HTMLDivElement, canvas: HTMLCanvasElement, statusEl: HTMLElement, btnEl: HTMLButtonElement): () => void {
  type Pt = { x: number; y: number };
  var ctx0 = canvas.getContext('2d');
  if (!ctx0) { return function (): void { return; }; }
  var ctx: CanvasRenderingContext2D = ctx0;
  var wrap: HTMLElement = canvas.parentElement ? canvas.parentElement : root;
  var CALC_W = 320, CALC_H = 200;
  var FIXED_DT = 16;
  var REDUCE_STEP_FRAMES = 40;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var demo = !reduce;
  if (!demo) root.classList.remove('is-demo');
  function stopDemo(): void { demo = false; root.classList.remove('is-demo'); }
  var paused = false;
  var ownInput = false;
  var cw = 480, ch = 300, sc = 1.5, elapsed = 0, rafId = 0;
  var cleaners: Array<() => void> = [];

  function listen(target: EventTarget, type: string, fn: (e: Event) => void): void {
    target.addEventListener(type, fn);
    cleaners.push(function (): void { target.removeEventListener(type, fn); });
  }
  function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
  function setStatus(msg: string): void { statusEl.textContent = msg; }
  function hsl(h: number, s: number, l: number, a: number): string {
    return 'hsla(' + (h % 360) + ',' + s + '%,' + l + '%,' + a + ')';
  }
  function canvasPoint(e: PointerEvent): Pt {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * CALC_W, y: (e.clientY - r.top) / r.height * CALC_H };
  }

  // 배경 — 어두운 잉크색 위에 방사형 빛무리를 (gx, gy) 에 깐다
  function beginDraw(inner: string, outer: string, gx: number, gy: number): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1d1a2b';
    ctx.fillRect(0, 0, cw, ch);
    ctx.setTransform(sc, 0, 0, sc, 0, 0);
    var g = ctx.createRadialGradient(gx, gy, 8, gx, gy, 230);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CALC_W, CALC_H);
  }
  function seg(x1: number, y1: number, x2: number, y2: number, w: number, col: string): void {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineCap = 'round';
    ctx.lineWidth = w;
    ctx.strokeStyle = col;
    ctx.stroke();
  }
  function disc(x: number, y: number, r: number, col: string): void {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 6.2832);
    ctx.fillStyle = col;
    ctx.fill();
  }
  function glow(x: number, y: number, r: number, rgb: string, a: number): void {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function drawTrail(arr: Pt[], rgb: string, w: number, alpha: number): void {
    ctx.lineCap = 'round';
    for (var i = 1; i < arr.length; i += 1) {
      var f = i / arr.length;
      ctx.beginPath();
      ctx.moveTo(arr[i - 1].x, arr[i - 1].y);
      ctx.lineTo(arr[i].x, arr[i].y);
      ctx.strokeStyle = 'rgba(' + rgb + ',' + (alpha * f * f) + ')';
      ctx.lineWidth = w * (0.3 + 0.7 * f);
      ctx.stroke();
    }
  }
  function pushTrail(arr: Pt[], x: number, y: number, max: number): void {
    arr.push({ x: x, y: y });
    if (arr.length > max) { arr.shift(); }
  }

  function defaultToggle(): void {
    if (reduce) {
      for (var i = 0; i < REDUCE_STEP_FRAMES; i += 1) { elapsed += FIXED_DT; stepFrame(); }
      draw();
      setStatus('한 장면씩 넘기는 중');
      return;
    }
    paused = !paused;
    btnEl.textContent = paused ? '재생' : '멈춤';
    setStatus(paused ? '일시정지됨' : '시연 중');
  }
  var onButton: () => void = defaultToggle;
  // 기법: 출발 각도 격자의 칸마다 진자를 돌려 둘째 팔이 처음 뒤집히는 시간(flipTime)을 재고, 프레임마다 CELLS_PER_FRAME 칸씩 색칠한다
  var GRID = 48;
  var CELLS_PER_FRAME = 36;
  var FLIP_DT = 0.02;
  var FLIP_STEPS = 500;
  var HOLD_FRAMES = 80;
  var CELL_PX = 3.5;
  var MAP_X = 14, MAP_Y = 22;
  var DT = 0.01;
  var SUBSTEPS = 3;
  var TRAIL_LEN = 60;
  var SEL_HOLD_MS = 1500;
  var DEMO_CELLS: number[][] = [[30, 14], [12, 20], [24, 24], [36, 34], [8, 8], [40, 24]];
  var L1 = 1.0;
  var L2 = 1.0;
  var M1 = 1.0;
  var M2 = 1.0;
  var G = 9.81;
  var UNIT = 24, PIVOT_X = 252, PIVOT_Y = 62;
  var PREROLL_FRAMES = 0;
  // 라그랑주 운동방정식 — 각도는 아래 방향이 0, 시계 방향이 양수
  function accTheta1(t1: number, t2: number, w1: number, w2: number): number {
    var d = t1 - t2;
    var den = L1 * (2 * M1 + M2 - M2 * Math.cos(2 * d));
    return (-G * (2 * M1 + M2) * Math.sin(t1) - M2 * G * Math.sin(t1 - 2 * t2)
      - 2 * Math.sin(d) * M2 * (w2 * w2 * L2 + w1 * w1 * L1 * Math.cos(d))) / den;
  }
  function accTheta2(t1: number, t2: number, w1: number, w2: number): number {
    var d = t1 - t2;
    var den = L2 * (2 * M1 + M2 - M2 * Math.cos(2 * d));
    return (2 * Math.sin(d) * (w1 * w1 * L1 * (M1 + M2) + G * (M1 + M2) * Math.cos(t1)
      + w2 * w2 * L2 * M2 * Math.cos(d))) / den;
  }
  // 룽게-쿠타 4단계 — 한 걸음을 네 번 기울기로 평균 낸다 (s = [t1, t2, w1, w2])
  function rk4Step(s: number[], h: number): void {
    var t1 = s[0], t2 = s[1], w1 = s[2], w2 = s[3];
    var h2 = h * 0.5;
    var k1a = w1, k1b = w2, k1c = accTheta1(t1, t2, w1, w2), k1d = accTheta2(t1, t2, w1, w2);
    var u1 = t1 + h2 * k1a, u2 = t2 + h2 * k1b, u3 = w1 + h2 * k1c, u4 = w2 + h2 * k1d;
    var k2a = u3, k2b = u4, k2c = accTheta1(u1, u2, u3, u4), k2d = accTheta2(u1, u2, u3, u4);
    u1 = t1 + h2 * k2a; u2 = t2 + h2 * k2b; u3 = w1 + h2 * k2c; u4 = w2 + h2 * k2d;
    var k3a = u3, k3b = u4, k3c = accTheta1(u1, u2, u3, u4), k3d = accTheta2(u1, u2, u3, u4);
    u1 = t1 + h * k3a; u2 = t2 + h * k3b; u3 = w1 + h * k3c; u4 = w2 + h * k3d;
    var k4a = u3, k4b = u4, k4c = accTheta1(u1, u2, u3, u4), k4d = accTheta2(u1, u2, u3, u4);
    s[0] = t1 + h / 6 * (k1a + 2 * k2a + 2 * k3a + k4a);
    s[1] = t2 + h / 6 * (k1b + 2 * k2b + 2 * k3b + k4b);
    s[2] = w1 + h / 6 * (k1c + 2 * k2c + 2 * k3c + k4c);
    s[3] = w2 + h / 6 * (k1d + 2 * k2d + 2 * k3d + k4d);
  }
  function bobOne(s: number[], ox: number, oy: number): Pt {
    return { x: ox + UNIT * L1 * Math.sin(s[0]), y: oy + UNIT * L1 * Math.cos(s[0]) };
  }
  function bobTwo(s: number[], ox: number, oy: number): Pt {
    var a = bobOne(s, ox, oy);
    return { x: a.x + UNIT * L2 * Math.sin(s[1]), y: a.y + UNIT * L2 * Math.cos(s[1]) };
  }
  function drawArms(s: number[], ox: number, oy: number, c1: string, c2: string, w: number): void {
    var a = bobOne(s, ox, oy), b = bobTwo(s, ox, oy);
    seg(ox, oy, a.x, a.y, w, c1);
    seg(a.x, a.y, b.x, b.y, w, c2);
  }

  ownInput = true;
  var PI = Math.PI;
  var STOPS: number[][] = [[255, 241, 201], [255, 179, 199], [201, 184, 255], [159, 216, 255], [168, 230, 207]];
  var mapCv = document.createElement('canvas');
  mapCv.width = GRID;
  mapCv.height = GRID;
  var mctx0 = mapCv.getContext('2d');
  if (!mctx0) { return function (): void { return; }; }
  var mctx: CanvasRenderingContext2D = mctx0;
  var img: ImageData = mctx.createImageData(GRID, GRID);
  var flipAt = new Float32Array(GRID * GRID);
  var done = 0;
  var holdLeft = 0;
  var selI = 30, selJ = 14;
  var mini: number[] = [0, 0, 0, 0];
  var trail: Pt[] = [];

  function startOf(i: number): number { return -PI + (i + 0.5) * 2 * PI / GRID; }
  function startOfRow(j: number): number { return PI - (j + 0.5) * 2 * PI / GRID; }
  function flipTime(t1: number, t2: number): number {
    var s = [t1, t2, 0, 0];
    for (var n = 0; n < FLIP_STEPS; n += 1) {
      rk4Step(s, FLIP_DT);
      if (Math.abs(s[1]) > PI) { return (n + 1) * FLIP_DT; }
    }
    return -1;
  }
  function flipColor(t: number): number[] {
    if (t < 0) { return [42, 36, 66]; }
    var u = clamp(Math.log(1 + t * 3) / Math.log(1 + FLIP_STEPS * FLIP_DT * 3), 0, 0.999) * (STOPS.length - 1);
    var k = Math.floor(u), f = u - k;
    var c0 = STOPS[k], c1 = STOPS[k + 1];
    return [c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f, c0[2] + (c1[2] - c0[2]) * f];
  }
  function paintCell(idx: number): void {
    var i = idx % GRID, j = Math.floor(idx / GRID);
    var t = flipTime(startOf(i), startOfRow(j));
    flipAt[idx] = t;
    var c = flipColor(t);
    img.data[idx * 4] = c[0];
    img.data[idx * 4 + 1] = c[1];
    img.data[idx * 4 + 2] = c[2];
    img.data[idx * 4 + 3] = 255;
  }
  function select(i: number, j: number): void {
    selI = clamp(i, 0, GRID - 1);
    selJ = clamp(j, 0, GRID - 1);
    mini = [startOf(selI), startOfRow(selJ), 0, 0];
    trail = [];
  }
  function recompute(): void {
    done = 0;
    holdLeft = 0;
    for (var p = 0; p < img.data.length; p += 1) { img.data[p] = 0; }
    setStatus('계산 중 — 칸마다 뒤집힘 시간을 잰다');
    if (reduce) {
      for (var idx = 0; idx < GRID * GRID; idx += 1) { paintCell(idx); }
      done = GRID * GRID;
      setStatus('계산 끝 — 칸을 눌러 진자를 본다');
    }
  }

  function stepFrame(): void {
    if (done < GRID * GRID) {
      var end = Math.min(GRID * GRID, done + CELLS_PER_FRAME);
      for (var idx = done; idx < end; idx += 1) { paintCell(idx); }
      done = end;
      if (done >= GRID * GRID) { holdLeft = HOLD_FRAMES; setStatus('계산 끝 — 칸을 눌러 진자를 본다'); }
    } else if (demo) {
      holdLeft -= 1;
      if (holdLeft <= 0) { recompute(); }
    }
    if (demo) {
      var k = Math.floor(elapsed / SEL_HOLD_MS) % DEMO_CELLS.length;
      if (DEMO_CELLS[k][0] !== selI || DEMO_CELLS[k][1] !== selJ) { select(DEMO_CELLS[k][0], DEMO_CELLS[k][1]); }
    }
    if (!reduce) {
      for (var i = 0; i < SUBSTEPS; i += 1) { rk4Step(mini, DT); }
      var p = bobTwo(mini, PIVOT_X, PIVOT_Y);
      pushTrail(trail, p.x, p.y, TRAIL_LEN);
    }
  }
  function previewPath(): void {
    var s = [mini[0], mini[1], 0, 0];
    trail = [];
    for (var n = 0; n < 90; n += 1) {
      for (var k = 0; k < SUBSTEPS; k += 1) { rk4Step(s, DT); }
      var p = bobTwo(s, PIVOT_X, PIVOT_Y);
      trail.push({ x: p.x, y: p.y });
    }
  }
  function choose(i: number, j: number): void {
    stopDemo();
    select(i, j);
    if (reduce) { previewPath(); }
    setStatus('선택한 출발각으로 진자를 돌렸다');
    draw();
  }
  listen(canvas, 'pointerdown', function (e: Event): void {
    var pt = canvasPoint(e as PointerEvent);
    var i = Math.floor((pt.x - MAP_X) / CELL_PX), j = Math.floor((pt.y - MAP_Y) / CELL_PX);
    if (i < 0 || j < 0 || i >= GRID || j >= GRID) { return; }
    choose(i, j);
  });
  listen(canvas, 'keydown', function (e: Event): void {
    var k = (e as KeyboardEvent).key;
    if (k === 'ArrowLeft') { e.preventDefault(); choose(selI - 1, selJ); }
    else if (k === 'ArrowRight') { e.preventDefault(); choose(selI + 1, selJ); }
    else if (k === 'ArrowUp') { e.preventDefault(); choose(selI, selJ - 1); }
    else if (k === 'ArrowDown') { e.preventDefault(); choose(selI, selJ + 1); }
    else if (k === 'Enter' || k === ' ') { e.preventDefault(); stopDemo(); recompute(); draw(); }
  });
  onButton = function (): void { stopDemo(); recompute(); draw(); };
  select(selI, selJ);
  recompute();
  if (reduce) { previewPath(); }

  function draw(): void {
    var b = bobTwo(mini, PIVOT_X, PIVOT_Y);
    beginDraw('#463e68', '#28223f', 90, 100);
    var size = GRID * CELL_PX;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(MAP_X - 3, MAP_Y - 3, size + 6, size + 6);
    mctx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(mapCv, MAP_X, MAP_Y, size, size);
    if (done < GRID * GRID) {
      var row = Math.floor(done / GRID);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(MAP_X, MAP_Y + row * CELL_PX, size, CELL_PX);
    }
    var sx = MAP_X + selI * CELL_PX, sy = MAP_Y + selJ * CELL_PX;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sx - 2, sy - 2, CELL_PX + 4, CELL_PX + 4);
    glow(b.x, b.y, 54, '255,238,252', 0.3);
    drawTrail(trail, '255,179,199', 3, 0.85);
    drawArms(mini, PIVOT_X, PIVOT_Y, '#c9b8ff', '#9fd8ff', 3.5);
    var a = bobOne(mini, PIVOT_X, PIVOT_Y);
    disc(PIVOT_X, PIVOT_Y, 4, '#fff1c9');
    disc(a.x, a.y, 5, '#c9b8ff');
    disc(b.x, b.y, 6.5, '#ffb3c7');
    // 색 막대 — 짧은 시간에서 긴 시간으로
    var lx = 204, ly = 128, lw = 100;
    for (var q = 0; q < lw; q += 2) {
      var tt = (Math.exp(q / lw * Math.log(1 + FLIP_STEPS * FLIP_DT * 3)) - 1) / 3;
      var c = flipColor(tt);
      ctx.fillStyle = 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')';
      ctx.fillRect(lx + q, ly, 2, 8);
    }
    var ft = flipAt[selI + selJ * GRID];
    if (done >= GRID * GRID || selJ * GRID + selI < done) {
      var tu = ft < 0 ? 1 : Math.log(1 + ft * 3) / Math.log(1 + FLIP_STEPS * FLIP_DT * 3);
      disc(lx + clamp(tu, 0, 1) * lw, ly + 4, 3.5, '#ffffff');
    }
    ctx.fillStyle = 'rgb(42,36,66)';
    ctx.fillRect(lx + lw + 6, ly, 8, 8);
  }

  function fit(): void {
    var r = wrap.getBoundingClientRect();
    cw = Math.max(1, Math.round(r.width));
    ch = Math.max(1, Math.round(r.height));
    canvas.width = cw;
    canvas.height = ch;
    sc = cw / CALC_W;
    draw();
  }
  var lastTs: number | null = null;
  var accMs = 0;
  function tick(ts: number): void {
    if (lastTs === null) { lastTs = ts; }
    var frameDt = Math.min(ts - lastTs, 48);
    lastTs = ts;
    if (!paused) {
      accMs += frameDt;
      while (accMs >= FIXED_DT) { elapsed += FIXED_DT; stepFrame(); accMs -= FIXED_DT; }
    }
    draw();
    rafId = requestAnimationFrame(tick);
  }
  for (var w0 = 0; w0 < PREROLL_FRAMES; w0 += 1) { elapsed += FIXED_DT; stepFrame(); }
  fit();
  listen(window, 'resize', fit);
  listen(btnEl, 'click', function (): void { onButton(); });
  if (!ownInput) {
    listen(canvas, 'pointerdown', function (): void { onButton(); });
    listen(canvas, 'keydown', function (e: Event): void {
      var k = (e as KeyboardEvent).key;
      if (k === 'Enter' || k === ' ') { e.preventDefault(); onButton(); }
    });
  }
  if (reduce) {
    if (!ownInput) { btnEl.textContent = '다음 장면'; setStatus('한 장면씩 넘기는 중'); }
  } else {
    rafId = requestAnimationFrame(tick);
  }

  function destroy(): void {
    cancelAnimationFrame(rafId);
    for (var i = 0; i < cleaners.length; i += 1) { cleaners[i](); }
  }
  return destroy;
}


export default function DpFlipTimeColorMapFractalGrid() {
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
      <div className={`${styles.bp} is-demo`} ref={rootRef}>
        <canvas className={styles.bp__canvas} ref={canvasRef} width={480} height={300} tabIndex={0} aria-label="출발 각도 격자 48×48 칸마다 진자를 돌려 둘째 팔이 처음 뒤집힐 때까지 걸린 시간을 색으로 칠하면, 경계가 끝없이 엉키는 프랙털 지도가 나온다." />
        <p className={styles.bp__status} ref={statusRef} aria-live="polite">계산 중 — 칸마다 뒤집힘 시간을 잰다</p>
        <button className={styles.bp__btn} ref={btnRef} type="button">다시 계산</button>
        <p className={styles.bp__caption}>출발 각도 격자 48×48 칸마다 진자를 돌려 둘째 팔이 처음 뒤집힐 때까지 걸린 시간을 색으로 칠하면, 경계가 끝없이 엉키는 프랙털 지도가 나온다.</p>
      </div>
    </main>
  );
}
