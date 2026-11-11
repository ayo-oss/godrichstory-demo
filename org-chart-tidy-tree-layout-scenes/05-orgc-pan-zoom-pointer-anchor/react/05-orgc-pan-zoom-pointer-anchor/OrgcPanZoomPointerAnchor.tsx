import { useEffect, useRef } from "react";
import styles from "./OrgcPanZoomPointerAnchor.module.scss";

type OcNode = {
  id: number; label: string; kids: OcNode[]; parent: OcNode | null; depth: number; branch: number; open: boolean;
  w: number; left: number; tx: number; ty: number; x: number; y: number; alpha: number; talpha: number;
  bw: number; bh: number; lit: number; val: number; tval: number; total: number;
};
type OcEvent = { at: number; run: () => void };

function main(root0: HTMLDivElement, canvas: HTMLCanvasElement, statusEl: HTMLElement, btnEl: HTMLButtonElement, inputEl: HTMLInputElement | null): () => void {
  const ctx0 = canvas.getContext('2d');
  if (!ctx0) { return function (): void { return; }; }
  const ctx: CanvasRenderingContext2D = ctx0;
  const rootEl: HTMLDivElement = root0;
  const W = 480, H = 300;
  const FIXED_DT = 16;
  const REDUCE_STEP_MS = 900;
  const MOVE_RATE = 0.09;
  const FADE_RATE = 0.12;
  const NODE_W = 56, NODE_H = 26, GAP_X = 8, LEVEL_DY = 72, TOP_Y = 44;
  const BG = '#211d2b';
  const INK = '#17141a';
  const FONT = '-apple-system, "Segoe UI", "Noto Sans KR", sans-serif';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { rootEl.classList.remove('is-demo'); }
  let paused = false;
  let autoplay = !reduce;
  let interactive = false;
  let elapsed = 0;
  let rafId = 0;
  const cleaners: Array<() => void> = [];

  function listen(target: EventTarget, type: string, fn: (e: Event) => void): void {
    target.addEventListener(type, fn);
    cleaners.push(function (): void { target.removeEventListener(type, fn); });
  }
  function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
  function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
  function smooth(x: number): number { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); }
  function setStatus(msg: string): void { statusEl.textContent = msg; }

  canvas.width = W;
  canvas.height = H;

  // 파스텔 가지 색 — 대표 버터 · 개발 하늘 · 디자인 라일락 · 운영 민트
  const BRANCH_COL: number[][] = [[255, 228, 130], [122, 200, 255], [182, 152, 255], [122, 222, 186]];
  function rgba(c: number[], a: number, mix: number): string {
    return 'rgba(' + Math.round(lerp(c[0], 255, mix)) + ',' + Math.round(lerp(c[1], 255, mix)) + ',' + Math.round(lerp(c[2], 255, mix)) + ',' + a.toFixed(3) + ')';
  }

  // 조직 데이터 — 이름과 부모 번호 (부모가 항상 먼저 나온다)
  const ORG: Array<[string, number]> = [
    ['대표', -1], ['개발', 0], ['디자인', 0], ['운영', 0],
    ['프론트', 1], ['백엔드', 1], ['데이터', 1], ['브랜드', 2], ['제품', 2], ['영업', 3], ['지원', 3]
  ];
  const nodes: OcNode[] = [];
  for (let i = 0; i < ORG.length; i += 1) {
    const pi = ORG[i][1];
    const p: OcNode | null = pi >= 0 ? nodes[pi] : null;
    const nd: OcNode = {
      id: i, label: ORG[i][0], kids: [], parent: p, depth: p ? p.depth + 1 : 0, branch: 0, open: true,
      w: NODE_W, left: 0, tx: 0, ty: 0, x: 0, y: 0, alpha: 1, talpha: 1,
      bw: NODE_W, bh: NODE_H, lit: 0, val: 0, tval: 0, total: 0
    };
    nd.branch = p ? (p.depth === 0 ? i : p.branch) : 0;
    if (p) { p.kids.push(nd); }
    nodes.push(nd);
  }
  const root: OcNode = nodes[0];

  function vis(n: OcNode): OcNode[] { return n.open ? n.kids : []; }
  function isShown(n: OcNode): boolean {
    let p = n.parent;
    while (p) { if (!p.open) { return false; } p = p.parent; }
    return true;
  }
  function setDepth(n: OcNode, d: number): void {
    n.depth = d;
    for (let i = 0; i < n.kids.length; i += 1) { setDepth(n.kids[i], d + 1); }
  }

  // 가지 폭 재기 — 가장 아래 잎에서 위로 올라가며 폭을 더한다
  function measure(n: OcNode): number {
    const v = vis(n);
    if (v.length === 0) { n.w = n.bw; return n.w; }
    let sum = GAP_X * (v.length - 1);
    for (let i = 0; i < v.length; i += 1) { sum += measure(v[i]); }
    n.w = Math.max(n.bw, sum);
    return n.w;
  }
  // 자리 잡기 — 자식 무리를 왼쪽에서 오른쪽으로 놓고, 부모는 첫째와 마지막 자식의 가운데
  function place(n: OcNode, left: number): void {
    const v = vis(n);
    n.left = left;
    if (v.length === 0) { n.tx = left + n.w / 2; return; }
    let span = GAP_X * (v.length - 1);
    for (let i = 0; i < v.length; i += 1) { span += v[i].w; }
    let cur = left + (n.w - span) / 2;
    for (let i = 0; i < v.length; i += 1) {
      place(v[i], cur);
      cur += v[i].w + GAP_X;
    }
    n.tx = (v[0].tx + v[v.length - 1].tx) / 2;
  }
  // 접힌 가지 안의 노드는 가장 가까운 보이는 조상 자리로 모인다
  function gather(n: OcNode, hidden: boolean, anchor: OcNode): void {
    n.ty = TOP_Y + n.depth * LEVEL_DY;
    if (hidden) { n.tx = anchor.tx; n.ty = anchor.ty; n.talpha = 0; } else { n.talpha = 1; }
    for (let i = 0; i < n.kids.length; i += 1) {
      const kidHidden = hidden || !n.open;
      gather(n.kids[i], kidHidden, hidden ? anchor : n);
    }
  }
  function layout(): void {
    measure(root);
    place(root, (W - root.w) / 2);
    gather(root, false, root);
  }
  function settleNodes(rate: number): void {
    for (let i = 0; i < nodes.length; i += 1) {
      const n = nodes[i];
      n.x += (n.tx - n.x) * rate;
      n.y += (n.ty - n.y) * rate;
      n.alpha += (n.talpha - n.alpha) * FADE_RATE;
    }
  }
  function snapNodes(): void {
    for (let i = 0; i < nodes.length; i += 1) {
      const n = nodes[i];
      n.x = n.tx; n.y = n.ty; n.alpha = n.talpha;
    }
  }

  // 카메라 — 화면 좌표 = 세계 좌표 * s + (ox, oy)
  const cam = { s: 1, ox: 0, oy: 0 };
  function worldX(sx: number): number { return (sx - cam.ox) / cam.s; }
  function worldY(sy: number): number { return (sy - cam.oy) / cam.s; }

  // 그리기 도구
  function rr(x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function clearStage(): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
  }
  function beginWorld(): void { ctx.setTransform(cam.s, 0, 0, cam.s, cam.ox, cam.oy); }
  function endWorld(): void { ctx.setTransform(1, 0, 0, 1, 0, 0); }
  function polyLen(q: number[]): number {
    let s = 0;
    for (let i = 2; i < q.length; i += 2) { s += Math.abs(q[i] - q[i - 2]) + Math.abs(q[i + 1] - q[i - 1]); }
    return s;
  }
  // 꺾은선 길이 대비 비율만큼만 긋는다 (점선 길이 = 전체 길이 * ratio)
  function strokeLine(q: number[], ratio: number, col: string, lw: number): void {
    if (ratio <= 0) { return; }
    const total = polyLen(q);
    ctx.beginPath();
    ctx.moveTo(q[0], q[1]);
    for (let i = 2; i < q.length; i += 2) { ctx.lineTo(q[i], q[i + 1]); }
    ctx.lineWidth = lw;
    ctx.strokeStyle = col;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash(ratio >= 1 ? [] : [total * ratio, total * 2]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // 꺾은선 위에서 길이 비율 지점의 좌표
  function pointAt(q: number[], ratio: number): number[] {
    let left = polyLen(q) * clamp(ratio, 0, 1);
    for (let i = 2; i < q.length; i += 2) {
      const seg = Math.abs(q[i] - q[i - 2]) + Math.abs(q[i + 1] - q[i - 1]);
      if (left <= seg || i === q.length - 2) {
        const f = seg > 0 ? Math.min(left / seg, 1) : 1;
        return [lerp(q[i - 2], q[i], f), lerp(q[i - 1], q[i + 1], f)];
      }
      left -= seg;
    }
    return [q[0], q[1]];
  }
  // 부모 아래에서 가로로 갈라져 자식으로 내려가는 꺾은선 (부모 아래 가운데, 가운데 높이, 자식 위 가운데)
  function elbow(p: OcNode, c: OcNode): number[] {
    const ay = p.y + p.bh / 2;
    const dy = c.y - c.bh / 2;
    const my = (ay + dy) / 2;
    return [p.x, ay, p.x, my, c.x, my, c.x, dy];
  }
  function drawBox(n: OcNode, a: number, mix: number, dy: number = 1): void {
    if (a <= 0.01) { return; }
    const col = BRANCH_COL[n.branch];
    ctx.globalAlpha = clamp(a, 0, 1);
    rr(n.x - n.bw / 2, n.y - n.bh / 2, n.bw, n.bh, 6);
    ctx.fillStyle = rgba(col, 1, mix);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.font = '600 10px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(n.label, n.x, n.y + dy);
    ctx.globalAlpha = 1;
  }
  function drawEdgesPlain(lineAlpha: number): void {
    for (let i = 1; i < nodes.length; i += 1) {
      const n = nodes[i];
      const p = n.parent;
      if (!p) { continue; }
      const a = Math.min(p.alpha, n.alpha) * lineAlpha;
      if (a <= 0.01) { continue; }
      strokeLine(elbow(p, n), 1, 'rgba(255,255,255,' + (0.55 * a).toFixed(3) + ')', 1.5);
    }
  }
  function drawBoxesPlain(): void {
    for (let d = 0; d < 4; d += 1) {
      for (let i = 0; i < nodes.length; i += 1) {
        if (nodes[i].depth === d) { drawBox(nodes[i], nodes[i].alpha, d === 2 ? 0.34 : (d === 1 ? 0.1 : 0)); }
      }
    }
  }
  function ring(n: OcNode, col: string, pad: number): void {
    ctx.globalAlpha = 1;
    rr(n.x - n.bw / 2 - pad, n.y - n.bh / 2 - pad, n.bw + pad * 2, n.bh + pad * 2, 8);
    ctx.lineWidth = 2;
    ctx.strokeStyle = col;
    ctx.stroke();
  }

  // 키보드 탐색 — 방향키가 부모·자식·같은 높이의 이웃으로 옮긴다
  let cursor: OcNode = root;
  let showCursor = false;
  function moveCursor(k: string): boolean {
    let t: OcNode | null = null;
    if (k === 'ArrowDown') { const v = vis(cursor); t = v.length > 0 ? v[0] : null; }
    else if (k === 'ArrowUp') { t = cursor.parent; }
    else if (k === 'ArrowLeft' || k === 'ArrowRight') {
      const row: OcNode[] = [];
      for (let i = 0; i < nodes.length; i += 1) { if (nodes[i].depth === cursor.depth && isShown(nodes[i])) { row.push(nodes[i]); } }
      row.sort(function (a: OcNode, b: OcNode): number { return a.tx - b.tx; });
      const j = row.indexOf(cursor) + (k === 'ArrowRight' ? 1 : -1);
      t = (j >= 0 && j < row.length) ? row[j] : null;
    }
    else if (k === 'Home') { t = root; }
    else { return false; }
    if (t) { cursor = t; }
    return true;
  }
  function hitNode(sx: number, sy: number): OcNode | null {
    const x = worldX(sx), y = worldY(sy);
    let best: OcNode | null = null;
    for (let i = 0; i < nodes.length; i += 1) {
      const n = nodes[i];
      if (n.alpha > 0.3 && Math.abs(x - n.x) <= n.bw / 2 + 2 && Math.abs(y - n.y) <= n.bh / 2 + 2) { best = n; }
    }
    return best;
  }
  function toLocal(e: MouseEvent): number[] {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height];
  }

  // 장면이 채우는 자리 — 시연 일정, 시간 함수 여부, 입력 처리
  let script: OcEvent[] = [];
  let period = 4000;
  let timeScene = false;
  let reduceMs = 0;
  let stepFn: (dt: number) => void = function (): void { return; };
  let drawFn: () => void = function (): void { return; };
  let actFn: () => void = function (): void { return; };
  let snapFn: () => void = function (): void { return; };
  let ptrFn: (kind: string, x: number, y: number, d: number) => void = function (): void { return; };
  let keyFn: (k: string) => boolean = function (): boolean { return false; };

  layout();
  snapNodes();

  // 05 포인터 지점을 붙잡고 확대하는 이동·줌 — 확대 비율과 함께 이동량을 풀어 포인터 아래 지점을 고정한다
  interactive = true;
  period = 6000;
  const ZOOM_RATE = 0.07;
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 3.2;
  const FRICTION = 0.94;
  const PAD_X = 90, PAD_Y = 70;
  let zoomTarget = 1;
  let anchorX = W / 2, anchorY = H / 2;
  let vx = 0, vy = 0;
  let homing = false;
  let dragging = false;
  let lastPx = 0, lastPy = 0;
  let ghostOn = false;
  const BY_LABEL: { [k: string]: OcNode } = {};
  for (let i = 0; i < nodes.length; i += 1) { BY_LABEL[nodes[i].label] = nodes[i]; }

  function clampCam(): void {
    cam.ox = clamp(cam.ox, W - W * cam.s - PAD_X, PAD_X);
    cam.oy = clamp(cam.oy, H - H * cam.s - PAD_Y, PAD_Y);
  }
  // 확대 비율이 k 배가 될 때 (px, py) 아래의 세계 점이 그대로이도록 이동량을 푼다
  function zoomAt(px: number, py: number, k: number): void {
    const ns = clamp(cam.s * k, ZOOM_MIN, ZOOM_MAX);
    const real = ns / cam.s;
    cam.ox = px - (px - cam.ox) * real;
    cam.oy = py - (py - cam.oy) * real;
    cam.s = ns;
    clampCam();
  }
  function screenOf(n: OcNode): number[] { return [n.tx * cam.s + cam.ox, n.ty * cam.s + cam.oy]; }
  function aim(label: string, z: number): void {
    const n = BY_LABEL[label];
    const s = screenOf(n);
    anchorX = clamp(s[0], 70, W - 70); anchorY = clamp(s[1], 70, H - 90);
    zoomTarget = z;
    ghostOn = true;
    homing = false;
    cursor = n;
    setStatus(label + ' x' + z.toFixed(1));
  }
  function flick(ax: number, ay: number): void { vx = ax; vy = ay; ghostOn = false; setStatus('관성 이동'); }
  function goHome(): void { homing = true; zoomTarget = 1; ghostOn = false; vx = 0; vy = 0; setStatus('처음 위치'); }
  script = [
    { at: 250, run: function (): void { aim('프론트', 2.6); } },
    { at: 1500, run: function (): void { flick(0.22, 0.05); } },
    { at: 2500, run: function (): void { aim('영업', 2.2); } },
    { at: 3700, run: function (): void { flick(-0.28, -0.04); } },
    { at: 4700, run: function (): void { goHome(); } }
  ];
  stepFn = function (dt: number): void {
    if (Math.abs(zoomTarget - cam.s) > 0.001) { zoomAt(anchorX, anchorY, 1 + (zoomTarget - cam.s) * ZOOM_RATE / cam.s); }
    if (homing) {
      cam.ox += (0 - cam.ox) * 0.1;
      cam.oy += (0 - cam.oy) * 0.1;
    }
    if (!dragging && (Math.abs(vx) > 0.002 || Math.abs(vy) > 0.002)) {
      cam.ox += vx * dt;
      cam.oy += vy * dt;
      vx *= FRICTION;
      vy *= FRICTION;
      clampCam();
    }
  };
  snapFn = function (): void {
    if (homing) { cam.s = 1; cam.ox = 0; cam.oy = 0; return; }
    if (Math.abs(zoomTarget - cam.s) > 0.001) { zoomAt(anchorX, anchorY, zoomTarget / cam.s); }
    cam.ox += vx * 300;
    cam.oy += vy * 300;
    vx = 0; vy = 0;
    clampCam();
  };
  ptrFn = function (kind: string, x: number, y: number, d: number): void {
    if (kind === 'down') { dragging = true; lastPx = x; lastPy = y; vx = 0; vy = 0; homing = false; ghostOn = false; }
    else if (kind === 'move' && dragging && d > 0) {
      cam.ox += x - lastPx; cam.oy += y - lastPy;
      vx = (x - lastPx) / FIXED_DT; vy = (y - lastPy) / FIXED_DT;
      lastPx = x; lastPy = y;
      clampCam();
    }
    else if (kind === 'up') { dragging = false; }
    else if (kind === 'wheel') {
      homing = false; ghostOn = false;
      anchorX = x; anchorY = y;
      zoomTarget = clamp(zoomTarget * Math.exp(-d * 0.0015), ZOOM_MIN, ZOOM_MAX);
    }
  };
  keyFn = function (k: string): boolean {
    homing = false; ghostOn = false;
    anchorX = W / 2; anchorY = H / 2;
    if (k === '+' || k === '=') { zoomTarget = clamp(zoomTarget * 1.3, ZOOM_MIN, ZOOM_MAX); setStatus('x' + zoomTarget.toFixed(1)); return true; }
    if (k === '-' || k === '_') { zoomTarget = clamp(zoomTarget / 1.3, ZOOM_MIN, ZOOM_MAX); setStatus('x' + zoomTarget.toFixed(1)); return true; }
    if (k === '0' || k === 'Enter' || k === ' ') { goHome(); return true; }
    if (k === 'ArrowLeft') { vx = 0.2; return true; }
    if (k === 'ArrowRight') { vx = -0.2; return true; }
    if (k === 'ArrowUp') { vy = 0.2; return true; }
    if (k === 'ArrowDown') { vy = -0.2; return true; }
    return false;
  };
  drawFn = function (): void {
    clearStage();
    beginWorld();
    drawEdgesPlain(1);
    drawBoxesPlain();
    endWorld();
    // 포인터 아래 지점 — 확대해도 이 십자 아래 노드는 움직이지 않는다
    if (ghostOn) {
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(anchorX, anchorY, 9, 0, Math.PI * 2);
      ctx.moveTo(anchorX - 14, anchorY); ctx.lineTo(anchorX + 14, anchorY);
      ctx.moveTo(anchorX, anchorY - 14); ctx.lineTo(anchorX, anchorY + 14);
      ctx.stroke();
    }
    // 작은 지도 — 지금 보이는 영역
    const mw = 64, mh = 40, mx = W - mw - 12, my = 12;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    rr(mx, my, mw, mh, 4);
    ctx.fill();
    for (let i = 0; i < nodes.length; i += 1) {
      ctx.fillStyle = rgba(BRANCH_COL[nodes[i].branch], 1, 0);
      ctx.fillRect(mx + nodes[i].tx / W * mw - 1.5, my + nodes[i].ty / H * mh - 1, 3, 2);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx + (-cam.ox / cam.s) / W * mw, my + (-cam.oy / cam.s) / H * mh, mw / cam.s, mh / cam.s);
  };

  let lastTs: number | null = null;
  let accMs = 0;
  let prevCyc = 0;
  let scriptIdx = 0;
  function runScript(): void {
    const cyc = elapsed % period;
    for (let i = 0; i < script.length; i += 1) {
      const at = script[i].at;
      const due = prevCyc <= cyc ? (at > prevCyc && at <= cyc) : (at > prevCyc || at <= cyc);
      if (due) { script[i].run(); }
    }
    prevCyc = cyc;
  }
  function setMode(): void {
    if (reduce) {
      setStatus('한 장면씩 넘기는 중');
      btnEl.textContent = '다음 장면';
      return;
    }
    setStatus(!autoplay ? '직접 조작 중' : (paused ? '일시정지됨' : '시연 중'));
    btnEl.textContent = (autoplay && !paused) ? '멈춤' : '재생';
  }
  function takeOver(): void {
    if (reduce || !autoplay) { return; }
    autoplay = false;
    paused = false;
    rootEl.classList.remove('is-demo');
    setMode();
  }
  function nextScene(): void {
    if (timeScene) { elapsed += REDUCE_STEP_MS; }
    else if (script.length > 0) { script[scriptIdx % script.length].run(); scriptIdx += 1; }
    snapFn();
    drawFn();
  }
  function afterInput(): void {
    if (reduce) { snapFn(); drawFn(); }
  }
  function onButton(): void {
    if (reduce) { nextScene(); setStatus('한 장면씩 넘기는 중'); return; }
    if (autoplay && !paused) { paused = true; }
    else { paused = false; autoplay = true; prevCyc = elapsed % period; rootEl.classList.add('is-demo'); }
    setMode();
  }
  function tick(ts: number): void {
    if (lastTs === null) { lastTs = ts; }
    const frameDt = Math.min(ts - lastTs, 160);
    lastTs = ts;
    if (!paused) {
      accMs += frameDt;
      while (accMs >= FIXED_DT) {
        elapsed += FIXED_DT;
        accMs -= FIXED_DT;
        if (autoplay) { runScript(); }
        stepFn(FIXED_DT);
      }
      drawFn();
    }
    rafId = requestAnimationFrame(tick);
  }

  listen(btnEl, 'click', function (): void { onButton(); });
  listen(canvas, 'pointerdown', function (e: Event): void {
    if (!interactive) { onButton(); return; }
    takeOver();
    const p = toLocal(e as PointerEvent);
    ptrFn('down', p[0], p[1], 0);
    afterInput();
  });
  listen(canvas, 'pointermove', function (e: Event): void {
    if (!interactive) { return; }
    const p = toLocal(e as PointerEvent);
    ptrFn('move', p[0], p[1], (e as PointerEvent).buttons);
    afterInput();
  });
  listen(canvas, 'pointerup', function (e: Event): void {
    if (!interactive) { return; }
    const p = toLocal(e as PointerEvent);
    ptrFn('up', p[0], p[1], 0);
    afterInput();
  });
  listen(canvas, 'wheel', function (e: Event): void {
    if (!interactive) { return; }
    e.preventDefault();
    takeOver();
    const p = toLocal(e as WheelEvent);
    ptrFn('wheel', p[0], p[1], (e as WheelEvent).deltaY);
    afterInput();
  });
  listen(canvas, 'keydown', function (e: Event): void {
    const k = (e as KeyboardEvent).key;
    if (!interactive) {
      if (k === 'Enter' || k === ' ') { e.preventDefault(); onButton(); }
      return;
    }
    takeOver();
    if (keyFn(k)) { e.preventDefault(); }
    else if (k === 'Enter' || k === ' ') { e.preventDefault(); actFn(); }
    afterInput();
  });
  if (reduce) {
    if (timeScene) { elapsed = reduceMs; } else if (script.length > 0) { script[0].run(); scriptIdx = 1; }
    snapFn();
    drawFn();
    setMode();
  } else {
    drawFn();
    setMode();
    rafId = requestAnimationFrame(tick);
  }

  function destroy(): void {
    cancelAnimationFrame(rafId);
    for (let i = 0; i < cleaners.length; i += 1) { cleaners[i](); }
  }
  return destroy;
}

export default function OrgcPanZoomPointerAnchor() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const statusRef = useRef<HTMLParagraphElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const statusEl = statusRef.current;
    const btnEl = btnRef.current;
    if (!root || !canvas || !statusEl || !btnEl) return;
    return main(root, canvas, statusEl, btnEl, null);
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.oc} is-demo`} ref={rootRef}>
        <canvas className={styles.oc__canvas} ref={canvasRef} width={480} height={300} tabIndex={0} aria-label="확대할 때 포인터 아래 지점이 제자리에 남도록 이동량을 함께 계산하고, 손을 놓은 뒤에는 속도가 비율로 줄며 미끄러진다." />
        <p className={styles.oc__status} ref={statusRef} aria-live="polite">시연 중</p>
        <button className={styles.oc__btn} ref={btnRef} type="button">멈춤</button>
        <p className={styles.oc__caption}>확대할 때 포인터 아래 지점이 제자리에 남도록 이동량을 함께 계산하고, 손을 놓은 뒤에는 속도가 비율로 줄며 미끄러진다.</p>
      </div>
    </main>
  );
}
