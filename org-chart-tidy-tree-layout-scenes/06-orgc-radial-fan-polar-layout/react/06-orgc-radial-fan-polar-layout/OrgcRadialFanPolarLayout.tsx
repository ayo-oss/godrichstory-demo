import { useEffect, useRef } from "react";
import styles from "./OrgcRadialFanPolarLayout.module.scss";

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

  // 06 같은 트리를 부채꼴로 펼치는 극좌표 배치 — 잎 수에 비례해 각도를 나누고 깊이를 반지름으로 바꾼다
  interactive = true;
  period = 4400;
  const FAN_SPAN = 2.62;
  const RING = 78;
  const FAN_RATE = 0.04;
  const ORIGIN_X = W / 2, ORIGIN_Y = TOP_Y;
  let fan = 0;
  let fanTarget = 0;
  const fanAngle: number[] = [];
  const fanRadius: number[] = [];
  const flatAngle: number[] = [];
  const flatRadius: number[] = [];
  // 잎에 차례로 같은 폭의 각도를 주고, 부모는 첫째와 마지막 자식의 가운데 각도
  let leafCount = 0;
  for (let i = 0; i < nodes.length; i += 1) { if (nodes[i].kids.length === 0) { leafCount += 1; } }
  let leafNo = 0;
  for (let i = 0; i < nodes.length; i += 1) { fanAngle.push(0); fanRadius.push(0); flatAngle.push(0); flatRadius.push(0); }
  function assignAngle(n: OcNode): void {
    if (n.kids.length === 0) {
      fanAngle[n.id] = -FAN_SPAN / 2 + (leafNo + 0.5) * FAN_SPAN / leafCount;
      leafNo += 1;
    } else {
      for (let i = 0; i < n.kids.length; i += 1) { assignAngle(n.kids[i]); }
      fanAngle[n.id] = (fanAngle[n.kids[0].id] + fanAngle[n.kids[n.kids.length - 1].id]) / 2;
    }
    fanRadius[n.id] = n.depth * RING;
  }
  assignAngle(root);
  // 가로 배치도 같은 원점에서 본 (각도, 반지름) 으로 바꿔 두면 두 배치 사이를 호로 잇는다
  for (let i = 0; i < nodes.length; i += 1) {
    const dx = nodes[i].tx - ORIGIN_X, dy = nodes[i].ty - ORIGIN_Y;
    flatRadius[i] = Math.sqrt(dx * dx + dy * dy);
    flatAngle[i] = Math.atan2(dx, dy);
  }
  function polarX(r: number, a: number): number { return ORIGIN_X + r * Math.sin(a); }
  function polarY(r: number, a: number): number { return ORIGIN_Y + r * Math.cos(a); }
  function place2(k: number): void {
    for (let i = 0; i < nodes.length; i += 1) {
      const r = lerp(flatRadius[i], fanRadius[i], k);
      const a = lerp(flatAngle[i], fanAngle[i], k);
      nodes[i].x = polarX(r, a);
      nodes[i].y = polarY(r, a);
    }
  }
  function setFan(v: number): void {
    fanTarget = v;
    setStatus(v > 0.5 ? '부채꼴' : '가로 배치');
  }
  script = [
    { at: 250, run: function (): void { setFan(1); } },
    { at: 1350, run: function (): void { setFan(0); } },
    { at: 2450, run: function (): void { setFan(1); } },
    { at: 3550, run: function (): void { setFan(0); } }
  ];
  stepFn = function (): void {
    fan += (fanTarget - fan) * FAN_RATE;
    place2(smooth(fan));
  };
  snapFn = function (): void { fan = fanTarget; place2(smooth(fan)); };
  actFn = function (): void { setFan(fanTarget > 0.5 ? 0 : 1); };
  ptrFn = function (kind: string): void { if (kind === 'down') { actFn(); } };
  place2(0);
  drawFn = function (): void {
    clearStage();
    const k = smooth(fan);
    for (let i = 1; i < nodes.length; i += 1) {
      const n = nodes[i];
      const p = n.parent;
      if (!p) { continue; }
      const mr = (Math.sqrt((p.x - ORIGIN_X) * (p.x - ORIGIN_X) + (p.y - ORIGIN_Y) * (p.y - ORIGIN_Y)) + Math.sqrt((n.x - ORIGIN_X) * (n.x - ORIGIN_X) + (n.y - ORIGIN_Y) * (n.y - ORIGIN_Y))) / 2;
      const pa = lerp(flatAngle[p.id], fanAngle[p.id], k);
      const na = lerp(flatAngle[i], fanAngle[i], k);
      const my = (p.y + n.y) / 2;
      const c1x = lerp(p.x, polarX(mr, pa), k), c1y = lerp(my, polarY(mr, pa), k);
      const c2x = lerp(n.x, polarX(mr, na), k), c2y = lerp(my, polarY(mr, na), k);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.bezierCurveTo(c1x, c1y, c2x, c2y, n.x, n.y);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.stroke();
    }
    drawBoxesPlain();
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

export default function OrgcRadialFanPolarLayout() {
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
        <canvas className={styles.oc__canvas} ref={canvasRef} width={480} height={300} tabIndex={0} aria-label="잎 수에 비례해 각도를 나누고 깊이를 반지름으로 바꿔, 같은 트리를 가로 배치에서 부채꼴로 옮기며 노드가 호를 그리며 이동한다." />
        <p className={styles.oc__status} ref={statusRef} aria-live="polite">시연 중</p>
        <button className={styles.oc__btn} ref={btnRef} type="button">멈춤</button>
        <p className={styles.oc__caption}>잎 수에 비례해 각도를 나누고 깊이를 반지름으로 바꿔, 같은 트리를 가로 배치에서 부채꼴로 옮기며 노드가 호를 그리며 이동한다.</p>
      </div>
    </main>
  );
}
