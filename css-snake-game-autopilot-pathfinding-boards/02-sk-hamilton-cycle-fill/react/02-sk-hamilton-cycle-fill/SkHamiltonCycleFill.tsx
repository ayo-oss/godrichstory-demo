import { useEffect, useRef } from "react";
import styles from "./SkHamiltonCycleFill.module.scss";

const W = 480;
const H = 300;
const PI2 = Math.PI * 2;
const FIXED_DT = 16;
const REDUCE_STEP_MS = 900;
const IDLE_TICKS = 150;
const BTN_PAUSE = '멈춤';
const BTN_PLAY = '재생';
const BTN_NEXT = '다음 장면';

type RGB = [number, number, number];
interface Input { x: number; y: number; idle: number; }
interface Scene {
    step(): void;
    draw(ctx: CanvasRenderingContext2D): void;
    label(): string;
    tap(): void;
    key(k: string): boolean;
}
type Maker = (inp: Input, reduce: boolean) => Scene;

// 파스텔 팔레트 — 어두운 판 위에 밝은 색을 얹어 명도 차로 읽힌다
const BG: RGB = [29, 26, 44];
const TILE_A: RGB = [37, 33, 58];
const TILE_B: RGB = [42, 38, 66];
const MINT: RGB = [126, 226, 192];
const SKY: RGB = [124, 196, 255];
const LILAC: RGB = [190, 164, 255];
const PINK: RGB = [255, 160, 190];
const PEACH: RGB = [255, 208, 168];
const CREAM: RGB = [255, 244, 224];

function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
function smooth(x: number): number { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); }
function rgba(c: RGB, a: number): string {
    return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + clamp(a, 0, 1).toFixed(3) + ')';
}
function mix(a: RGB, b: RGB, k: number): RGB {
    return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
}
// 시드 고정 난수 — 같은 시드면 언제나 같은 수열 (선형 합동 방식)
function lcg(seed: number): () => number {
    let s = seed >>> 0;
    return function (): number {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 4294967296;
    };
}
// 정수 두 개로 0 이상 1 미만의 값을 만드는 해시 (같은 입력은 늘 같은 값)
function hash2(x: number, y: number, seed: number): number {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
}
function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: RGB, a: number): void {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(c, a));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
// 둥근 사각형 경로 (roundRect 가 없는 브라우저에서도 같은 모양)
function rrPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
}

// ---- 판과 뱀 ----
interface Board { cols: number; rows: number; cell: number; ox: number; oy: number; n: number; }
function makeBoard(rows: number): Board {
    const cell = H / rows;
    const cols = Math.floor(W / cell + 1e-6);
    return { cols: cols, rows: rows, cell: cell, ox: (W - cols * cell) / 2, oy: 0, n: cols * rows };
}
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];
// 칸 번호 y*cols+x. 판 밖이면 -1 (wrap 이면 반대편으로 이어진다)
function cellAt(b: Board, x: number, y: number, wrap: boolean): number {
    let xx = x;
    let yy = y;
    if (wrap) {
        xx = (x % b.cols + b.cols) % b.cols;
        yy = (y % b.rows + b.rows) % b.rows;
    } else if (x < 0 || y < 0 || x >= b.cols || y >= b.rows) {
        return -1;
    }
    return yy * b.cols + xx;
}
function neighborCell(b: Board, i: number, d: number, wrap: boolean): number {
    return cellAt(b, (i % b.cols) + DX[d], Math.floor(i / b.cols) + DY[d], wrap);
}
// 목표 칸에서 너비 우선으로 퍼지는 거리장. blocked 칸과 닿지 못하는 칸은 -1
function distField(b: Board, target: number, blocked: Uint8Array, wrap: boolean): Int16Array {
    const dist = new Int16Array(b.n).fill(-1);
    const queue = new Int16Array(b.n);
    let qh = 0;
    let qt = 0;
    dist[target] = 0;
    queue[qt] = target;
    qt += 1;
    while (qh < qt) {
        const c = queue[qh];
        qh += 1;
        for (let d = 0; d < 4; d += 1) {
            const nb = neighborCell(b, c, d, wrap);
            if (nb >= 0 && dist[nb] < 0 && blocked[nb] === 0) {
                dist[nb] = dist[c] + 1;
                queue[qt] = nb;
                qt += 1;
            }
        }
    }
    return dist;
}
// 거리장에서 값이 가장 낮은 이웃 (없으면 -1)
function lowestNeighbor(b: Board, dist: Int16Array, from: number, wrap: boolean): number {
    let best = -1;
    let bv = 32000;
    for (let d = 0; d < 4; d += 1) {
        const nb = neighborCell(b, from, d, wrap);
        if (nb >= 0 && dist[nb] >= 0 && dist[nb] < bv) {
            bv = dist[nb];
            best = nb;
        }
    }
    return best;
}
function pathFrom(b: Board, dist: Int16Array, head: number, wrap: boolean): number[] {
    const path: number[] = [];
    let cur = head;
    for (let k = 0; k < b.n; k += 1) {
        const nx = lowestNeighbor(b, dist, cur, wrap);
        if (nx < 0 || (dist[nx] >= dist[cur] && cur !== head)) {
            return [];
        }
        path.push(nx);
        if (dist[nx] === 0) {
            return path;
        }
        cur = nx;
    }
    return [];
}
interface Game {
    b: Board;
    wrap: boolean;
    body: number[];
    prev: number[];
    food: number;
    rnd: () => number;
    eaten: number;
    dead: boolean;
    resets: number;
}
function placeFood(g: Game): void {
    const used = new Uint8Array(g.b.n);
    for (let i = 0; i < g.body.length; i += 1) {
        used[g.body[i]] = 1;
    }
    const free: number[] = [];
    for (let i = 0; i < g.b.n; i += 1) {
        if (used[i] === 0) {
            free.push(i);
        }
    }
    g.food = free.length > 0 ? free[Math.floor(g.rnd() * free.length)] : -1;
}
function resetGame(g: Game): void {
    const b = g.b;
    const hx = Math.floor(b.cols / 2);
    const hy = Math.floor(b.rows / 2);
    g.body = [hy * b.cols + hx, hy * b.cols + hx - 1, hy * b.cols + hx - 2];
    g.prev = g.body.slice();
    g.dead = false;
    g.resets += 1;
    placeFood(g);
}
function newGame(b: Board, wrap: boolean, seed: number): Game {
    const g: Game = { b: b, wrap: wrap, body: [], prev: [], food: -1, rnd: lcg(seed), eaten: 0, dead: false, resets: -1 };
    resetGame(g);
    return g;
}
// 머리를 next 칸으로 옮긴다. 먹으면 true, 몸에 부딪히면 dead
function moveSnake(g: Game, next: number): boolean {
    g.prev = g.body.slice();
    const ate = next === g.food;
    const tail = g.body[g.body.length - 1];
    for (let i = 0; i < g.body.length; i += 1) {
        if (g.body[i] === next && !(i === g.body.length - 1 && !ate && next === tail)) {
            g.dead = true;
            return false;
        }
    }
    g.body.unshift(next);
    if (ate) {
        g.eaten += 1;
        placeFood(g);
    } else {
        g.body.pop();
    }
    return ate;
}
// 경로를 끝까지 따라가 먹은 뒤의 가상 몸
function simulate(body: number[], path: number[]): number[] {
    const v = body.slice();
    for (let k = 0; k < path.length; k += 1) {
        v.unshift(path[k]);
        if (k < path.length - 1) {
            v.pop();
        }
    }
    return v;
}
// 가상 몸의 머리에서 번져 나가 꼬리에 닿는가. mark 를 주면 닿은 칸을 표시한다
function tailReachable(b: Board, v: number[], wrap: boolean, mark: Uint8Array | null): boolean {
    const blocked = new Uint8Array(b.n);
    for (let i = 1; i < v.length - 1; i += 1) {
        blocked[v[i]] = 1;
    }
    const tail = v[v.length - 1];
    const head = v[0];
    const seen = new Uint8Array(b.n);
    const stack: number[] = [head];
    seen[head] = 1;
    let hit = false;
    while (stack.length > 0) {
        const c = stack.pop() as number;
        for (let d = 0; d < 4; d += 1) {
            const nb = neighborCell(b, c, d, wrap);
            if (nb < 0 || seen[nb] === 1) {
                continue;
            }
            if (nb === tail) {
                hit = true;
                continue;
            }
            if (blocked[nb] === 1 || nb === head) {
                continue;
            }
            seen[nb] = 1;
            stack.push(nb);
        }
    }
    if (mark) {
        mark.set(seen);
    }
    return hit;
}
interface Plan { next: number; path: number[]; rejected: number[]; trap: Uint8Array; chase: boolean; }
// 한 수를 정한다: 먹이까지 최단 경로 → (안전 검사) → 막히면 꼬리를 쫓는다
function planMove(g: Game, safeOn: boolean): Plan {
    const b = g.b;
    const head = g.body[0];
    const tail = g.body[g.body.length - 1];
    const plan: Plan = { next: -1, path: [], rejected: [], trap: new Uint8Array(b.n), chase: false };
    const blocked = new Uint8Array(b.n);
    for (let i = 0; i < g.body.length - 1; i += 1) {
        blocked[g.body[i]] = 1;
    }
    if (g.food >= 0) {
        const dist = distField(b, g.food, blocked, g.wrap);
        const path = pathFrom(b, dist, head, g.wrap);
        plan.path = path;
        if (path.length > 0) {
            if (!safeOn) {
                plan.next = path[0];
                return plan;
            }
            const v = simulate(g.body, path);
            if (tailReachable(b, v, g.wrap, plan.trap)) {
                plan.next = path[0];
                return plan;
            }
            plan.rejected = path;
        }
    }
    plan.chase = true;
    const dist2 = distField(b, tail, blocked, g.wrap);
    const nx = lowestNeighbor(b, dist2, head, g.wrap);
    if (nx >= 0) {
        plan.next = nx;
        return plan;
    }
    for (let d = 0; d < 4; d += 1) {
        const nb = neighborCell(b, head, d, g.wrap);
        if (nb >= 0 && blocked[nb] === 0 && nb !== head) {
            plan.next = nb;
            return plan;
        }
    }
    return plan;
}
// 칸 중심의 화면 좌표
function cellX(b: Board, i: number): number { return b.ox + ((i % b.cols) + 0.5) * b.cell; }
function cellY(b: Board, i: number): number { return b.oy + (Math.floor(i / b.cols) + 0.5) * b.cell; }
function wrapDelta(a: number, c: number, n: number, wrap: boolean): number {
    let d = c - a;
    if (wrap) {
        if (d > n / 2) { d -= n; }
        if (d < -n / 2) { d += n; }
    }
    return d;
}
// 마디 i 의 보간 위치 (칸 좌표). 지난 틱의 자리에서 이번 틱의 자리로 p(0~1) 만큼
function segPos(g: Game, i: number, p: number): [number, number] {
    const b = g.b;
    const cur = g.body[i];
    const pv = i < g.prev.length ? g.prev[i] : cur;
    const cx = cur % b.cols;
    const cy = Math.floor(cur / b.cols);
    const px = pv % b.cols;
    const py = Math.floor(pv / b.cols);
    return [px + wrapDelta(px, cx, b.cols, g.wrap) * p, py + wrapDelta(py, cy, b.rows, g.wrap) * p];
}
function drawTiles(ctx: CanvasRenderingContext2D, b: Board): void {
    ctx.fillStyle = rgba(BG, 1);
    ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < b.rows; y += 1) {
        for (let x = 0; x < b.cols; x += 1) {
            ctx.fillStyle = rgba((x + y) % 2 === 0 ? TILE_A : TILE_B, 1);
            ctx.fillRect(b.ox + x * b.cell, b.oy + y * b.cell, b.cell + 0.5, b.cell + 0.5);
        }
    }
}
function drawFood(ctx: CanvasRenderingContext2D, b: Board, food: number, t: number): void {
    if (food < 0) {
        return;
    }
    const x = cellX(b, food);
    const y = cellY(b, food);
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.12);
    glow(ctx, x, y, b.cell * (1.3 + 0.35 * pulse), PINK, 0.55);
    ctx.fillStyle = rgba(PINK, 1);
    ctx.beginPath();
    ctx.arc(x, y, b.cell * 0.3, 0, PI2);
    ctx.fill();
    ctx.fillStyle = rgba(CREAM, 0.9);
    ctx.beginPath();
    ctx.arc(x - b.cell * 0.08, y - b.cell * 0.09, b.cell * 0.09, 0, PI2);
    ctx.fill();
}
function bodyColor(i: number, len: number): RGB {
    return mix(MINT, SKY, len <= 1 ? 0 : i / (len - 1));
}
// 칸 중심 (x,y 칸 좌표, 소수 허용)에 마디 하나
function drawSeg(ctx: CanvasRenderingContext2D, b: Board, gx: number, gy: number, c: RGB, shrink: number): void {
    const s = b.cell * (1 - shrink);
    const cx = b.ox + (gx + 0.5) * b.cell;
    const cy = b.oy + (gy + 0.5) * b.cell;
    ctx.fillStyle = rgba(c, 1);
    rrPath(ctx, cx - s / 2, cy - s / 2, s, s, s * 0.32);
    ctx.fill();
}
function drawEyes(ctx: CanvasRenderingContext2D, b: Board, gx: number, gy: number, dirx: number, diry: number): void {
    const cx = b.ox + (gx + 0.5) * b.cell;
    const cy = b.oy + (gy + 0.5) * b.cell;
    const px = -diry;
    const py = dirx;
    const r = b.cell * 0.09;
    ctx.fillStyle = rgba(BG, 1);
    for (let s = -1; s <= 1; s += 2) {
        ctx.beginPath();
        ctx.arc(cx + dirx * b.cell * 0.16 + px * s * b.cell * 0.18, cy + diry * b.cell * 0.16 + py * s * b.cell * 0.18, r, 0, PI2);
        ctx.fill();
    }
}
function headDir(g: Game): [number, number] {
    if (g.body.length < 2) {
        return [1, 0];
    }
    const b = g.b;
    const dx = wrapDelta(g.body[1] % b.cols, g.body[0] % b.cols, b.cols, g.wrap);
    const dy = wrapDelta(Math.floor(g.body[1] / b.cols), Math.floor(g.body[0] / b.cols), b.rows, g.wrap);
    return [clamp(dx, -1, 1), clamp(dy, -1, 1)];
}
// 보간 없이 칸 그대로 그리는 기본 뱀
function drawSnakeCells(ctx: CanvasRenderingContext2D, g: Game, dim: number): void {
    const len = g.body.length;
    for (let i = len - 1; i >= 0; i -= 1) {
        const c = g.body[i];
        const col = mix(bodyColor(i, len), BG, dim);
        drawSeg(ctx, g.b, c % g.b.cols, Math.floor(c / g.b.cols), col, 0.08);
    }
    const hd = headDir(g);
    drawEyes(ctx, g.b, g.body[0] % g.b.cols, Math.floor(g.body[0] / g.b.cols), hd[0], hd[1]);
}

function start(root: HTMLElement, canvas: HTMLCanvasElement, statusEl: HTMLElement, btnEl: HTMLElement, make: Maker): () => void {
    const ctx0 = canvas.getContext('2d');
    if (!ctx0) {
        return function (): void { return; };
    }
    const ctx: CanvasRenderingContext2D = ctx0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const inp: Input = { x: W / 2, y: H / 2, idle: 99999 };
    const scene = make(inp, reduce);
    let paused = false;
    let rafId = 0;
    let lastTs = -1;
    let accMs = 0;
    let lastLabel = '';
    const cleaners: Array<() => void> = [];
    function listen(target: EventTarget, type: string, fn: (e: Event) => void): void {
        target.addEventListener(type, fn);
        cleaners.push(function (): void { target.removeEventListener(type, fn); });
    }
    function show(): void {
        scene.draw(ctx);
        const t = scene.label();
        if (t !== lastLabel) {
            lastLabel = t;
            statusEl.textContent = t;
        }
    }
    function advance(ms: number): void {
        const n = Math.round(ms / FIXED_DT);
        for (let i = 0; i < n; i += 1) {
            inp.idle += 1;
            scene.step();
        }
    }
    // 움직임 줄이기에서는 루프가 없으니 입력 직후 한 틱쯤 앞으로 보내 바로 그린다
    function refresh(): void {
        if (reduce) {
            advance(FIXED_DT * 8);
            show();
        }
    }
    function toLocal(e: PointerEvent): void {
        const r = canvas.getBoundingClientRect();
        inp.x = clamp((e.clientX - r.left) * W / r.width, 0, W);
        inp.y = clamp((e.clientY - r.top) * H / r.height, 0, H);
        inp.idle = 0;
    }
    function tick(ts: number): void {
        if (lastTs < 0) {
            lastTs = ts;
        }
        const frameDt = Math.min(ts - lastTs, 160);
        lastTs = ts;
        if (!paused) {
            accMs += frameDt;
            while (accMs >= FIXED_DT) {
                inp.idle += 1;
                scene.step();
                accMs -= FIXED_DT;
            }
            show();
        }
        rafId = requestAnimationFrame(tick);
    }
    btnEl.textContent = reduce ? BTN_NEXT : BTN_PAUSE;
    if (reduce) {
        root.classList.remove('is-demo');
        advance(1400);
        show();
    }
    listen(btnEl, 'click', function (): void {
        if (reduce) {
            advance(REDUCE_STEP_MS);
            show();
            return;
        }
        paused = !paused;
        if (paused) {
            root.classList.remove('is-demo');
        } else {
            root.classList.add('is-demo');
        }
        btnEl.textContent = paused ? BTN_PLAY : BTN_PAUSE;
    });
    listen(canvas, 'pointermove', function (e: Event): void {
        toLocal(e as PointerEvent);
        refresh();
    });
    listen(canvas, 'pointerdown', function (e: Event): void {
        toLocal(e as PointerEvent);
        scene.tap();
        refresh();
    });
    listen(canvas, 'keydown', function (e: Event): void {
        const k = (e as KeyboardEvent).key;
        if (k === 'Enter' || k === ' ') {
            e.preventDefault();
            scene.tap();
            refresh();
            return;
        }
        // 이 장면이 쓰는 키만 막는다. 쓰지 않는 키(Tab 등)는 그대로 둔다
        if (scene.key(k)) {
            e.preventDefault();
            refresh();
        }
    });
    if (!reduce) {
        rafId = requestAnimationFrame(tick);
    }
    return function (): void {
        cancelAnimationFrame(rafId);
        for (let i = 0; i < cleaners.length; i += 1) {
            cleaners[i]();
        }
    };
}

const TICK_MS = 60;
const GRID_N = 8;
const SHORTCUT_MARGIN = 2;
const WARM_FILL = 0.95;
const FULL_HOLD = 14;
const TXT_LEN = '길이';
const TXT_CUT = '지름길';
const TXT_FULL = '판이 가득 참 — 새 판';

function makeScene(inp: Input, reduce: boolean): Scene {
    const b = makeBoard(GRID_N);
    const g = newGame(b, false, 455202);
    const N = b.n;
    // 해밀턴 순환: 맨 윗줄을 가로지른 뒤 나머지 줄을 지그재그로 훑고 왼쪽 열로 올라온다
    const cyc: number[] = [];
    for (let x = 0; x < b.cols; x += 1) {
        cyc.push(x);
    }
    for (let y = 1; y < b.rows; y += 1) {
        for (let k = 1; k < b.cols; k += 1) {
            const x = y % 2 === 1 ? b.cols - k : k;
            cyc.push(y * b.cols + x);
        }
    }
    for (let y = b.rows - 1; y >= 1; y -= 1) {
        cyc.push(y * b.cols);
    }
    const ord = new Int16Array(N);
    for (let i = 0; i < N; i += 1) {
        ord[cyc[i]] = i;
    }
    let acc = 0;
    let t = 0;
    let cuts = 0;
    let hold = 0;
    let jump = 0;
    function cd(from: number, to: number): number {
        return (ord[to] - ord[from] + N) % N;
    }
    function fresh(): void {
        g.body = [cyc[2], cyc[1], cyc[0]];
        g.prev = g.body.slice();
        g.dead = false;
        placeFood(g);
        cuts = 0;
    }
    function logic(): void {
        if (hold > 0) {
            hold -= 1;
            if (hold === 0) {
                fresh();
            }
            return;
        }
        const head = g.body[0];
        const tail = g.body[g.body.length - 1];
        const foodD = cd(head, g.food);
        let tailD = cd(head, tail);
        if (tailD === 0) {
            tailD = N;
        }
        const occupied = new Uint8Array(N);
        for (let i = 0; i < g.body.length - 1; i += 1) {
            occupied[g.body[i]] = 1;
        }
        let best = cyc[(ord[head] + 1) % N];
        let bestD = 1;
        for (let d = 0; d < 4; d += 1) {
            const nb = neighborCell(b, head, d, false);
            if (nb < 0 || occupied[nb] === 1 || nb === tail) {
                continue;
            }
            const dc = cd(head, nb);
            if (dc > bestD && dc <= foodD && dc < tailD - SHORTCUT_MARGIN) {
                best = nb;
                bestD = dc;
            }
        }
        if (bestD > 1) {
            cuts += 1;
            jump = 6;
        }
        moveSnake(g, best);
        if (g.body.length >= N) {
            // 움직임 줄이기에서는 가득 찬 판을 그대로 두고 입력이 있을 때만 새 판을 연다
            hold = reduce ? 100000 : FULL_HOLD;
        }
    }
    const scene: Scene = {
        step(): void {
            t += 1;
            acc += FIXED_DT;
            while (acc >= TICK_MS) {
                acc -= TICK_MS;
                logic();
            }
            if (jump > 0) {
                jump -= 1;
            }
        },
        draw(ctx: CanvasRenderingContext2D): void {
            drawTiles(ctx, b);
            // 순환 선 — 뱀이 지나온 구간은 밝아진다
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = Math.max(2, b.cell * 0.1);
            const inBody = new Uint8Array(N);
            for (let i = 0; i < g.body.length; i += 1) {
                inBody[g.body[i]] = 1;
            }
            for (let i = 0; i < N; i += 1) {
                const a = cyc[i];
                const c = cyc[(i + 1) % N];
                ctx.strokeStyle = rgba(LILAC, inBody[a] === 1 ? 0.55 : 0.22);
                ctx.beginPath();
                ctx.moveTo(cellX(b, a), cellY(b, a));
                ctx.lineTo(cellX(b, c), cellY(b, c));
                ctx.stroke();
            }
            drawFood(ctx, b, g.food, t);
            drawSnakeCells(ctx, g, 0);
            if (jump > 0) {
                glow(ctx, cellX(b, g.body[0]), cellY(b, g.body[0]), b.cell * 1.3, CREAM, 0.12 + 0.05 * jump);
            }
        },
        label(): string {
            if (hold > 0) {
                return TXT_FULL;
            }
            return TXT_LEN + ' ' + g.body.length + '/' + N + ' · ' + TXT_CUT + ' ' + cuts;
        },
        tap(): void {
            hold = 0;
            fresh();
        },
        key(k: string): boolean {
            return false;
        }
    };
    // 판이 어느 정도 찬 상태에서 시작해 마지막 채움이 짧은 시간에 보이게 한다
    fresh();
    for (let i = 0; i < 20000 && g.body.length < Math.floor(N * WARM_FILL); i += 1) {
        logic();
    }
    cuts = 0;
    jump = 0;
    if (reduce) {
        for (let i = 0; i < 4; i += 1) {
            scene.step();
        }
    }
    return scene;
}

export default function SkHamiltonCycleFill() {
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
    return start(root, canvas, statusEl, btnEl, makeScene);
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.sc} is-demo`} ref={rootRef}>
        <canvas className={styles.sc__canvas} ref={canvasRef} width={480} height={300} tabIndex={0} aria-label="판 전체를 한 바퀴 도는 해밀턴 순환으로 판을 끝까지 채우는 뱀" />
        <p className={styles.sc__status} ref={statusRef} aria-live="polite">길이</p>
        <button className={styles.sc__btn} ref={btnRef} type="button">멈춤</button>
        <p className={styles.sc__caption}>판 전체를 한 바퀴 도는 해밀턴 순환으로 판을 끝까지 채우는 뱀</p>
      </div>
    </main>
  );
}
