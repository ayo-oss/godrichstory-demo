// TttNestedBoardZoomFocus - vanilla 판(06-ttt-nested-board-zoom-focus) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./TttNestedBoardZoomFocus.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function TttNestedBoardZoomFocus() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const root: HTMLElement = rootEl;
    const W = 480;
    const H = 300;
    const PI2 = Math.PI * 2;
    const FIXED_DT = 16;
    const REDUCE_STEP_MS = 900;
    const IDLE_TICKS = 150;
    const BTN_PAUSE = '멈춤';
    const BTN_PLAY = '재생';
    const BTN_NEXT = '다음 장면';
    const TXT_CELL = '칸';

    type RGB = [number, number, number];
    interface Input { x: number; y: number; cur: number; key: boolean; idle: number; }
    interface Scene {
        step(): void;
        draw(ctx: CanvasRenderingContext2D): void;
        label(): string;
        hit(x: number, y: number): number;
        hover(i: number): void;
        tap(i: number): void;
        auto(): void;
        rect(i: number): [number, number, number, number];
        n(): number;
    }
    type Maker = (inp: Input, reduce: boolean) => Scene;

    // 파스텔 팔레트 — 어두운 판 위에 밝은 색을 얹어 명도 차로 읽힌다
    const BG: RGB = [29, 26, 44];
    const TILE: RGB = [40, 36, 62];
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
    // 값 노이즈 — 격자점 해시 네 개를 부드럽게 섞는다
    function noise2(x: number, y: number, seed: number): number {
        const xi = Math.floor(x);
        const yi = Math.floor(y);
        const fx = smooth(x - xi);
        const fy = smooth(y - yi);
        const a = hash2(xi, yi, seed);
        const b = hash2(xi + 1, yi, seed);
        const c = hash2(xi, yi + 1, seed);
        const d = hash2(xi + 1, yi + 1, seed);
        return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
    }
    function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
        const rr = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + rr, y);
        ctx.lineTo(x + w - rr, y);
        ctx.arcTo(x + w, y, x + w, y + rr, rr);
        ctx.lineTo(x + w, y + h - rr);
        ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
        ctx.lineTo(x + rr, y + h);
        ctx.arcTo(x, y + h, x, y + h - rr, rr);
        ctx.lineTo(x, y + rr);
        ctx.arcTo(x, y, x + rr, y, rr);
        ctx.closePath();
    }
    // 말 하나를 (cx, cy) 에 그린다. p(0~1) 만큼 대시 오프셋으로 획을 긋는다 — who 1 은 X(두 획), 2 는 O(원)
    function drawMark(ctx: CanvasRenderingContext2D, who: number, cx: number, cy: number, r: number, p: number, w: number, col: string): void {
        ctx.save();
        ctx.lineWidth = w;
        ctx.lineCap = 'round';
        ctx.strokeStyle = col;
        if (who === 1) {
            const d = r * 2 * Math.SQRT2;
            for (let k = 0; k < 2; k += 1) {
                const pk = clamp(p * 2 - k, 0, 1);
                if (pk <= 0.001) { continue; }
                ctx.setLineDash([d, d]);
                ctx.lineDashOffset = d * (1 - pk);
                ctx.beginPath();
                if (k === 0) { ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r); }
                else { ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r); }
                ctx.stroke();
            }
        } else {
            const L = PI2 * r;
            if (p > 0.001) {
                ctx.setLineDash([L, L]);
                ctx.lineDashOffset = L * (1 - clamp(p, 0, 1));
                ctx.beginPath();
                ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + PI2);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    function mount(root: HTMLElement, make: Maker): () => void {
        const canvas = root.querySelector('[data-role="canvas"]') as HTMLCanvasElement | null;
        const statusEl = root.querySelector('[data-role="status"]') as HTMLElement | null;
        const btnEl = root.querySelector('[data-role="btn"]') as HTMLButtonElement | null;
        if (!canvas || !statusEl || !btnEl) { return function (): void { return; }; }
        const ctx0 = canvas.getContext('2d');
        if (!ctx0) { return function (): void { return; }; }
        const ctx: CanvasRenderingContext2D = ctx0;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const inp: Input = { x: -1, y: -1, cur: -1, key: false, idle: 99999 };
        const scene = make(inp, reduce);
        let paused = false;
        let focused = false;
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
            if (inp.key && focused && inp.cur >= 0) {
                const r = scene.rect(inp.cur);
                ctx.save();
                ctx.lineWidth = 2.5;
                ctx.strokeStyle = 'rgba(255,255,255,0.92)';
                rrect(ctx, r[0] + 2, r[1] + 2, r[2] - 4, r[3] - 4, 8);
                ctx.stroke();
                ctx.restore();
            }
            let t = scene.label();
            if (inp.key && inp.cur >= 0) {
                const n = scene.n();
                t += ' · ' + TXT_CELL + ' ' + (Math.floor(inp.cur / n) + 1) + '-' + ((inp.cur % n) + 1);
            }
            if (t !== lastLabel) {
                lastLabel = t;
                statusEl!.textContent = t;
            }
        }
        function localPoint(e: PointerEvent): void {
            const r = canvas!.getBoundingClientRect();
            inp.x = clamp((e.clientX - r.left) * W / r.width, 0, W);
            inp.y = clamp((e.clientY - r.top) * H / r.height, 0, H);
            inp.idle = 0;
            inp.key = false;
        }
        function tick(ts: number): void {
            if (lastTs < 0) { lastTs = ts; }
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
            scene.auto();
            scene.auto();
            scene.auto();
            show();
        }
        listen(btnEl, 'click', function (): void {
            if (reduce) { scene.auto(); show(); return; }
            paused = !paused;
            if (paused) { root.classList.remove('is-demo'); } else { root.classList.add('is-demo'); }
            btnEl.textContent = paused ? BTN_PLAY : BTN_PAUSE;
        });
        listen(canvas, 'focus', function (): void { focused = true; });
        listen(canvas, 'blur', function (): void { focused = false; if (reduce) { show(); } });
        listen(canvas, 'pointermove', function (e: Event): void {
            localPoint(e as PointerEvent);
            scene.hover(scene.hit(inp.x, inp.y));
            if (reduce) { show(); }
        });
        listen(canvas, 'pointerleave', function (): void { scene.hover(-1); if (reduce) { show(); } });
        listen(canvas, 'pointerdown', function (e: Event): void {
            localPoint(e as PointerEvent);
            const i = scene.hit(inp.x, inp.y);
            if (i >= 0) { scene.tap(i); }
            if (reduce) { show(); }
        });
        listen(canvas, 'keydown', function (e: Event): void {
            const ev = e as KeyboardEvent;
            const k = ev.key;
            const n = scene.n();
            const mid = Math.floor((n * n) / 2);
            if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') {
                ev.preventDefault();
                if (inp.cur < 0) { inp.cur = mid; }
                else {
                    let r = Math.floor(inp.cur / n);
                    let c = inp.cur % n;
                    if (k === 'ArrowLeft') { c = Math.max(0, c - 1); }
                    if (k === 'ArrowRight') { c = Math.min(n - 1, c + 1); }
                    if (k === 'ArrowUp') { r = Math.max(0, r - 1); }
                    if (k === 'ArrowDown') { r = Math.min(n - 1, r + 1); }
                    inp.cur = r * n + c;
                }
                inp.key = true;
                inp.idle = 0;
                scene.hover(inp.cur);
                if (reduce) { show(); }
                return;
            }
            if (k === 'Enter' || k === ' ') {
                ev.preventDefault();
                if (inp.cur < 0) { inp.cur = mid; }
                inp.key = true;
                inp.idle = 0;
                scene.tap(inp.cur);
                if (reduce) { show(); }
            }
        });
        if (!reduce) { rafId = requestAnimationFrame(tick); }
        return function (): void {
            cancelAnimationFrame(rafId);
            for (let i = 0; i < cleaners.length; i += 1) { cleaners[i](); }
        };
    }

    const LINES: number[][] = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    const SCORE_WIN = 10;
    const TXT_X_TURN = 'X 차례';
    const TXT_O_TURN = 'O 차례';
    const TXT_X_WIN = 'X 승';
    const TXT_O_WIN = 'O 승';
    const TXT_DRAW = '무승부';

    interface Game { b: number[]; turn: number; over: boolean; line: number; }
    interface Counter { n: number; x: number; o: number; }

    function newGame(): Game { return { b: [0, 0, 0, 0, 0, 0, 0, 0, 0], turn: 1, over: false, line: -1 }; }
    // 완성된 줄의 번호(LINES 안의 위치). 없으면 -1
    function lineOf(b: number[]): number {
        for (let k = 0; k < LINES.length; k += 1) {
            const l = LINES[k];
            if (b[l[0]] !== 0 && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) { return k; }
        }
        return -1;
    }
    function emptyCells(b: number[]): number[] {
        const out: number[] = [];
        for (let i = 0; i < 9; i += 1) { if (b[i] === 0) { out.push(i); } }
        return out;
    }
    function place(g: Game, i: number): boolean {
        if (g.over || g.b[i] !== 0) { return false; }
        g.b[i] = g.turn;
        g.line = lineOf(g.b);
        if (g.line >= 0 || emptyCells(g.b).length === 0) { g.over = true; } else { g.turn = 3 - g.turn; }
        return true;
    }
    function gameLabel(g: Game): string {
        if (g.over) { return g.line >= 0 ? (g.b[LINES[g.line][0]] === 1 ? TXT_X_WIN : TXT_O_WIN) : TXT_DRAW; }
        return g.turn === 1 ? TXT_X_TURN : TXT_O_TURN;
    }
    // 전수 탐색 — X 시점 점수. depth 가 0 이 되면 더 보지 않고 0 으로 친다. cnt.n 은 방문한 국면 수
    function solve(b: number[], turn: number, ply: number, depth: number, cnt: Counter): number {
        cnt.n += 1;
        const w = lineOf(b);
        if (w >= 0) {
            const s = SCORE_WIN - ply;
            if (b[LINES[w][0]] === 1) { cnt.x += 1; return s; }
            cnt.o += 1;
            return -s;
        }
        if (depth <= 0) { return 0; }
        let best = turn === 1 ? -1000 : 1000;
        let any = false;
        for (let i = 0; i < 9; i += 1) {
            if (b[i] !== 0) { continue; }
            b[i] = turn;
            const v = solve(b, 3 - turn, ply + 1, depth - 1, cnt);
            b[i] = 0;
            any = true;
            if (turn === 1 ? v > best : v < best) { best = v; }
        }
        return any ? best : 0;
    }
    // 둘 곳마다 점수. 이미 찬 칸은 NaN. 둔 사람(turn) 시점이 아니라 X 시점 값이다
    function cellScores(b: number[], turn: number, depth: number, cnt: Counter, per?: Counter[]): number[] {
        const out: number[] = [];
        for (let i = 0; i < 9; i += 1) {
            if (b[i] !== 0) { out.push(NaN); if (per) { per.push({ n: 0, x: 0, o: 0 }); } continue; }
            b[i] = turn;
            const c: Counter = { n: 0, x: 0, o: 0 };
            out.push(solve(b, 3 - turn, 1, depth - 1, c));
            b[i] = 0;
            cnt.n += c.n; cnt.x += c.x; cnt.o += c.o;
            if (per) { per.push(c); }
        }
        return out;
    }
    function bestCell(b: number[], turn: number, depth: number): number {
        const cnt: Counter = { n: 0, x: 0, o: 0 };
        const sc = cellScores(b, turn, depth, cnt);
        let best = -1;
        for (let i = 0; i < 9; i += 1) {
            if (isNaN(sc[i])) { continue; }
            if (best < 0 || (turn === 1 ? sc[i] > sc[best] : sc[i] < sc[best])) { best = i; }
        }
        return best;
    }
    function gridRect(i: number, ox: number, oy: number, cs: number): [number, number, number, number] {
        return [ox + (i % 3) * cs, oy + Math.floor(i / 3) * cs, cs, cs];
    }
    function gridHit(x: number, y: number, ox: number, oy: number, cs: number): number {
        const c = Math.floor((x - ox) / cs);
        const r = Math.floor((y - oy) / cs);
        return c >= 0 && c < 3 && r >= 0 && r < 3 ? r * 3 + c : -1;
    }

    interface Match {
        g: Game;
        since: number;
        move(i: number): void;
        tap(i: number): void;
        step(): void;
        auto(): void;
    }
    const MATCH_DEPTH = 9;
    const REPLY_MS = 420;
    // 한 판 진행기 — 사람은 X, 컴퓨터는 O. 사람이 가만히 있으면(idle) 둘 다 컴퓨터가 두어 루프를 만든다.
    // pick 이 있으면 자동 대국의 수를 그 함수가 정한다. 판이 끝나면 holdMs 뒤에 새 판
    function makeMatch(inp: Input, reduce: boolean, turnMs: number, holdMs: number, seed: number, depth: number, onPlace: (i: number, who: number) => void, onReset: () => void, pick: (() => number) | null): Match {
        const rng = lcg(seed);
        let t = 0;
        let reply = -1;
        let hold = 0;
        const m: Match = {
            g: newGame(),
            since: 0,
            move(i: number): void {
                const who = m.g.turn;
                if (place(m.g, i)) { m.since = 0; onPlace(i, who); }
            },
            tap(i: number): void {
                if (m.g.over) { reset(); return; }
                if (m.g.turn !== 1 || m.g.b[i] !== 0) { return; }
                m.move(i);
                if (!m.g.over) {
                    if (reduce) { m.move(bestCell(m.g.b, 2, depth)); } else { reply = REPLY_MS; }
                }
            },
            step(): void {
                m.since += FIXED_DT;
                if (m.g.over) {
                    hold += FIXED_DT;
                    if (hold >= holdMs) { reset(); }
                    return;
                }
                if (reply >= 0) {
                    reply -= FIXED_DT;
                    if (reply < 0) { m.move(bestCell(m.g.b, 2, depth)); }
                    return;
                }
                if (inp.idle > IDLE_TICKS) {
                    t += FIXED_DT;
                    if (t >= turnMs) { t = 0; autoMove(); }
                }
            },
            auto(): void {
                if (m.g.over) { reset(); } else { autoMove(); }
            },
        };
        function reset(): void {
            m.g = newGame();
            t = 0;
            reply = -1;
            hold = 0;
            onReset();
        }
        function autoMove(): void {
            if (pick) { const p = pick(); if (p >= 0) { m.move(p); } return; }
            const e = emptyCells(m.g.b);
            if (m.g.turn === 1 && (e.length > 6 || rng() < 0.3)) { m.move(e[Math.floor(rng() * e.length)]); return; }
            m.move(bestCell(m.g.b, m.g.turn, depth));
        }
        return m;
    }

    const ZOOM_K = 2.6;
    const FOCUS_MS = 640;
    const DIM_ALPHA = 0.32;
    const SPRING_ZETA = 0.6;
    const TURN_MS = 620;
    const HOLD_MS = 1800;
    const BIG = 270;
    const SMALL = 90;
    const UNIT = 30;
    const MARK_MS = 260;

    const make: Maker = function (inp: Input, reduce: boolean): Scene {
        const rng = lcg(61);
        const cells: number[] = [];
        const age: number[] = [];
        for (let i = 0; i < 81; i += 1) { cells.push(0); age.push(-1); }
        const sw: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        const swAge: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        let turn = 1;
        let fb = -1;
        let over = false;
        let winLine = -1;
        let winner = 0;
        let hold = 0;
        let t = 0;
        let reply = -1;
        let hov = -1;
        let clock = 0;
        let cx = BIG / 2;
        let cy = BIG / 2;
        let sc = 1;
        let vx = 0;
        let vy = 0;
        let vs = 0;
        const omega = PI2 / (FOCUS_MS / 1000);
        function boardOf(i: number): number { return Math.floor(Math.floor(i / 9) / 3) * 3 + Math.floor((i % 9) / 3); }
        function cellOf(i: number): number { return (Math.floor(i / 9) % 3) * 3 + ((i % 9) % 3); }
        function gidx(b: number, c: number): number { return (Math.floor(b / 3) * 3 + Math.floor(c / 3)) * 9 + (b % 3) * 3 + (c % 3); }
        function legal(i: number): boolean {
            const b = boardOf(i);
            return !over && cells[i] === 0 && sw[b] === 0 && (fb < 0 || fb === b);
        }
        function legalList(): number[] {
            const out: number[] = [];
            for (let i = 0; i < 81; i += 1) { if (legal(i)) { out.push(i); } }
            return out;
        }
        function smallLine(b: number): number {
            const v: number[] = [];
            for (let c = 0; c < 9; c += 1) { v.push(cells[gidx(b, c)]); }
            return lineOf(v);
        }
        // b 판의 c 칸에 w 가 두면 그 판의 줄이 완성되는가
        function completes(b: number, c: number, w: number): boolean {
            const v: number[] = [];
            for (let k = 0; k < 9; k += 1) { v.push(cells[gidx(b, k)]); }
            v[c] = w;
            return lineOf(v) >= 0;
        }
        function place6(i: number): void {
            if (!legal(i)) { return; }
            const b = boardOf(i);
            const c = cellOf(i);
            cells[i] = turn;
            age[i] = reduce ? 9999 : 0;
            const sl = smallLine(b);
            if (sl >= 0) { sw[b] = turn; swAge[b] = reduce ? 9999 : 0; }
            else {
                let full = true;
                for (let k = 0; k < 9; k += 1) { if (cells[gidx(b, k)] === 0) { full = false; } }
                if (full) { sw[b] = 3; swAge[b] = reduce ? 9999 : 0; }
            }
            const bigVals = sw.map(function (v: number): number { return v === 3 ? 0 : v; });
            winLine = lineOf(bigVals);
            let open = false;
            for (let k = 0; k < 9; k += 1) { if (sw[k] === 0) { open = true; } }
            if (winLine >= 0) { over = true; winner = bigVals[LINES[winLine][0]]; }
            else if (!open) { over = true; winner = 0; }
            fb = sw[c] === 0 ? c : -1;
            turn = 3 - turn;
            snap();
        }
        function chooseMove(): number {
            const e = legalList();
            let best = -1;
            let bs = -1000;
            for (let k = 0; k < e.length; k += 1) {
                const i = e[k];
                const b = boardOf(i);
                const c = cellOf(i);
                let s = rng() * 8;
                if (completes(b, c, turn)) { s += 100; }
                else if (completes(b, c, 3 - turn)) { s += 40; }
                if (c === 4) { s += 6; }
                // 상대를 보낼 판에서 상대가 바로 이기면 감점
                if (sw[c] === 0) {
                    for (let q = 0; q < 9; q += 1) { if (cells[gidx(c, q)] === 0 && completes(c, q, 3 - turn)) { s -= 30; break; } }
                }
                if (s > bs) { bs = s; best = i; }
            }
            return best;
        }
        function resetAll(): void {
            for (let i = 0; i < 81; i += 1) { cells[i] = 0; age[i] = -1; }
            for (let b = 0; b < 9; b += 1) { sw[b] = 0; swAge[b] = 0; }
            turn = 1; fb = -1; over = false; winLine = -1; winner = 0; hold = 0; t = 0; reply = -1;
            snap();
        }
        // 카메라 목표 — 정해진 판이 있으면 그 판으로 줌, 없으면 전체
        function goal(): [number, number, number] {
            if (fb >= 0) { return [(fb % 3) * SMALL + SMALL / 2, Math.floor(fb / 3) * SMALL + SMALL / 2, ZOOM_K]; }
            return [BIG / 2, BIG / 2, 1];
        }
        function snap(): void {
            if (!reduce) { return; }
            const g = goal();
            cx = g[0]; cy = g[1]; sc = g[2];
        }
        function toScreen(wx: number, wy: number): [number, number] { return [W / 2 + (wx - cx) * sc, H / 2 + (wy - cy) * sc]; }
        function cellRect(i: number): [number, number, number, number] {
            const p = toScreen((i % 9) * UNIT, Math.floor(i / 9) * UNIT);
            return [p[0], p[1], UNIT * sc, UNIT * sc];
        }
        snap();
        return {
            step(): void {
                clock += FIXED_DT;
                const dt = FIXED_DT / 1000;
                const g = goal();
                const k = omega * omega;
                const c2 = 2 * SPRING_ZETA * omega;
                vx += (-k * (cx - g[0]) - c2 * vx) * dt;
                vy += (-k * (cy - g[1]) - c2 * vy) * dt;
                vs += (-k * (sc - g[2]) - c2 * vs) * dt;
                cx += vx * dt; cy += vy * dt; sc += vs * dt;
                for (let i = 0; i < 81; i += 1) { if (age[i] >= 0) { age[i] += FIXED_DT; } }
                for (let b = 0; b < 9; b += 1) { if (sw[b] !== 0) { swAge[b] += FIXED_DT; } }
                if (over) { hold += FIXED_DT; if (hold >= HOLD_MS) { resetAll(); } return; }
                if (reply >= 0) {
                    reply -= FIXED_DT;
                    if (reply < 0) { place6(chooseMove()); }
                    return;
                }
                if (inp.idle > IDLE_TICKS) {
                    t += FIXED_DT;
                    if (t >= TURN_MS) { t = 0; place6(chooseMove()); }
                }
            },
            draw(ctx: CanvasRenderingContext2D): void {
                ctx.fillStyle = rgba(BG, 1);
                ctx.fillRect(0, 0, W, H);
                ctx.save();
                ctx.translate(W / 2, H / 2);
                ctx.scale(sc, sc);
                ctx.translate(-cx, -cy);
                const bigWin = winLine >= 0 ? LINES[winLine] : [];
                for (let b = 0; b < 9; b += 1) {
                    const bx = (b % 3) * SMALL;
                    const by = Math.floor(b / 3) * SMALL;
                    const active = !over && sw[b] === 0 && (fb < 0 || fb === b);
                    const a = active ? 1 : DIM_ALPHA;
                    ctx.globalAlpha = a;
                    let col: RGB = mix(TILE, CREAM, active && fb === b ? 0.1 : 0.02);
                    if (bigWin.indexOf(b) >= 0) { col = mix(TILE, MINT, 0.35); }
                    ctx.fillStyle = rgba(col, 1);
                    rrect(ctx, bx + 2, by + 2, SMALL - 4, SMALL - 4, 6);
                    ctx.fill();
                    // 소판 격자선
                    ctx.strokeStyle = rgba(CREAM, 0.22);
                    ctx.lineWidth = 0.8;
                    ctx.beginPath();
                    for (let q = 1; q < 3; q += 1) {
                        ctx.moveTo(bx + 8 + q * 24.67, by + 8); ctx.lineTo(bx + 8 + q * 24.67, by + SMALL - 8);
                        ctx.moveTo(bx + 8, by + 8 + q * 24.67); ctx.lineTo(bx + SMALL - 8, by + 8 + q * 24.67);
                    }
                    ctx.stroke();
                    for (let c = 0; c < 9; c += 1) {
                        const i = gidx(b, c);
                        if (cells[i] === 0) { continue; }
                        const mx = (i % 9) * UNIT + UNIT / 2;
                        const my = Math.floor(i / 9) * UNIT + UNIT / 2;
                        drawMark(ctx, cells[i], mx, my, 7.5, clamp(age[i] / MARK_MS, 0, 1), 2.6, rgba(cells[i] === 1 ? SKY : PINK, 1));
                    }
                    if (hov >= 0 && boardOf(hov) === b && legal(hov)) {
                        const hx = (hov % 9) * UNIT;
                        const hy = Math.floor(hov / 9) * UNIT;
                        ctx.fillStyle = rgba(CREAM, 0.14);
                        rrect(ctx, hx + 3, hy + 3, UNIT - 6, UNIT - 6, 4);
                        ctx.fill();
                    }
                    if (sw[b] === 1 || sw[b] === 2) {
                        const q = clamp(swAge[b] / 320, 0, 1);
                        ctx.globalAlpha = a * smooth(q) * 0.92;
                        ctx.fillStyle = rgba(BG, 0.55);
                        rrect(ctx, bx + 2, by + 2, SMALL - 4, SMALL - 4, 6);
                        ctx.fill();
                        ctx.globalAlpha = 1;
                        drawMark(ctx, sw[b], bx + SMALL / 2, by + SMALL / 2, 26, q, 7, rgba(sw[b] === 1 ? SKY : PINK, smooth(q)));
                    }
                    ctx.globalAlpha = 1;
                }
                if (winLine >= 0) {
                    const l = LINES[winLine];
                    const ax = (l[0] % 3) * SMALL + SMALL / 2;
                    const ay = Math.floor(l[0] / 3) * SMALL + SMALL / 2;
                    const bx2 = (l[2] % 3) * SMALL + SMALL / 2;
                    const by2 = Math.floor(l[2] / 3) * SMALL + SMALL / 2;
                    ctx.strokeStyle = rgba(CREAM, 0.9);
                    ctx.lineWidth = 5;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(ax, ay);
                    ctx.lineTo(bx2, by2);
                    ctx.stroke();
                }
                ctx.restore();
            },
            label(): string {
                if (over) { return winner === 1 ? TXT_X_WIN : (winner === 2 ? TXT_O_WIN : TXT_DRAW); }
                return turn === 1 ? TXT_X_TURN : TXT_O_TURN;
            },
            hit(x: number, y: number): number {
                const wx = (x - W / 2) / sc + cx;
                const wy = (y - H / 2) / sc + cy;
                const c = Math.floor(wx / UNIT);
                const r = Math.floor(wy / UNIT);
                return c >= 0 && c < 9 && r >= 0 && r < 9 ? r * 9 + c : -1;
            },
            hover(i: number): void { hov = i; },
            tap(i: number): void {
                if (over) { resetAll(); return; }
                if (turn !== 1 || !legal(i)) { return; }
                place6(i);
                if (!over) { if (reduce) { place6(chooseMove()); } else { reply = REPLY_MS; } }
            },
            auto(): void {
                if (over) { resetAll(); } else { place6(chooseMove()); }
            },
            rect(i: number): [number, number, number, number] { return cellRect(i); },
            n(): number { return 9; },
        };
    };
    return mount(root, make);
  }, []);

  return (
      <div className={cx("tt") + " is-demo"} id="tt" ref={rootRef}>
      <canvas className={cx("tt__canvas")} data-role="canvas" width="480" height="300" tabIndex={0} aria-label="판 안에 판이 들어 있어 놓은 칸이 다음 판을 지정하고 화면이 그 판으로 스프링 확대되는 겹판"></canvas>
      <p className={cx("tt__status")} data-role="status" aria-live="polite">X 차례</p>
      <button className={cx("tt__btn")} data-role="btn" type="button">멈춤</button>
      </div>
  );
}
