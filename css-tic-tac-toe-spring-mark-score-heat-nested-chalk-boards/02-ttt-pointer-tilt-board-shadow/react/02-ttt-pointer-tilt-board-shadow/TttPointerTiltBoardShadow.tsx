// TttPointerTiltBoardShadow - vanilla 판(02-ttt-pointer-tilt-board-shadow) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./TttPointerTiltBoardShadow.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function TttPointerTiltBoardShadow() {
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

    const TILT_MAX = 0.42;
    const DEPTH_PX = 18;
    const SHADOW_LEN = 0.55;
    const LERP_K = 0.09;
    const CAM_Z = 560;
    const CELL = 84;
    const TURN_MS = 1000;
    const HOLD_MS = 1500;
    const DROP_H = 90;
    const GRAVITY = 1100;
    const BOUNCE = 0.38;
    const MARK_R = 25;

    const make: Maker = function (inp: Input, reduce: boolean): Scene {
        let ax = 0;
        let ay = 0;
        let hov = -1;
        let clock = 0;
        const zb: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        const vz: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        const who: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        const m = makeMatch(inp, reduce, TURN_MS, HOLD_MS, 21, MATCH_DEPTH, function (i: number, w: number): void {
            who[i] = w;
            zb[i] = reduce ? 0 : DROP_H;
            vz[i] = 0;
        }, function (): void {
            for (let i = 0; i < 9; i += 1) { who[i] = 0; zb[i] = 0; vz[i] = 0; }
        }, null);
        // 판 평면의 점 (px, py) 과 높이 pz 를 화면으로 — 두 축 회전 뒤 원근 나눗셈
        function proj(px: number, py: number, pz: number): [number, number, number] {
            const cyy = Math.cos(ay);
            const syy = Math.sin(ay);
            const cxx = Math.cos(ax);
            const sxx = Math.sin(ax);
            const x1 = px * cyy + pz * syy;
            const z1 = -px * syy + pz * cyy;
            const y2 = py * cxx - z1 * sxx;
            const z2 = py * sxx + z1 * cxx;
            const f = CAM_Z / (CAM_Z - z2);
            return [W / 2 + x1 * f, H / 2 + 2 + y2 * f, f];
        }
        function center(i: number): [number, number] {
            return [((i % 3) - 1) * CELL, (Math.floor(i / 3) - 1) * CELL];
        }
        function quad(i: number): Array<[number, number, number]> {
            const c = center(i);
            const h = CELL / 2;
            return [proj(c[0] - h, c[1] - h, 0), proj(c[0] + h, c[1] - h, 0), proj(c[0] + h, c[1] + h, 0), proj(c[0] - h, c[1] + h, 0)];
        }
        function markPoints(who1: number, cx: number, cy: number): number[][][] {
            const r = MARK_R;
            if (who1 === 1) { return [[[cx - r, cy - r], [cx + r, cy + r]], [[cx + r, cy - r], [cx - r, cy + r]]]; }
            const pts: number[][] = [];
            for (let k = 0; k <= 24; k += 1) { pts.push([cx + Math.cos((k / 24) * PI2) * r, cy + Math.sin((k / 24) * PI2) * r]); }
            return [pts];
        }
        function strokeMark(ctx: CanvasRenderingContext2D, w: number, i: number, z: number, col: string, lw: number, dx: number, dy: number): void {
            const c = center(i);
            const shapes = markPoints(w, c[0] + dx, c[1] + dy);
            ctx.strokeStyle = col;
            ctx.lineWidth = lw;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            for (let s = 0; s < shapes.length; s += 1) {
                ctx.beginPath();
                for (let k = 0; k < shapes[s].length; k += 1) {
                    const p = proj(shapes[s][k][0], shapes[s][k][1], z);
                    if (k === 0) { ctx.moveTo(p[0], p[1]); } else { ctx.lineTo(p[0], p[1]); }
                }
                ctx.stroke();
            }
        }
        return {
            step(): void {
                clock += FIXED_DT;
                m.step();
                let tx = 0;
                let ty = 0;
                if (inp.idle <= IDLE_TICKS && inp.x >= 0 && !inp.key) {
                    tx = ((inp.y - H / 2) / (H / 2)) * TILT_MAX;
                    ty = ((inp.x - W / 2) / (W / 2)) * TILT_MAX;
                } else {
                    tx = TILT_MAX * 0.8 * Math.cos(clock / 520);
                    ty = TILT_MAX * Math.sin(clock / 410);
                }
                if (reduce) { tx = 0; ty = 0; }
                ax = lerp(ax, tx, LERP_K);
                ay = lerp(ay, ty, LERP_K);
                const dt = FIXED_DT / 1000;
                for (let i = 0; i < 9; i += 1) {
                    if (who[i] === 0) { continue; }
                    if (zb[i] > 0 || vz[i] !== 0) {
                        vz[i] -= GRAVITY * dt;
                        zb[i] += vz[i] * dt;
                        if (zb[i] <= 0) {
                            zb[i] = 0;
                            vz[i] = Math.abs(vz[i]) > 60 ? -vz[i] * BOUNCE : 0;
                        }
                    }
                }
            },
            draw(ctx: CanvasRenderingContext2D): void {
                ctx.fillStyle = rgba(BG, 1);
                ctx.fillRect(0, 0, W, H);
                // 판 받침
                const hb = CELL * 1.5 + 8;
                const base = [proj(-hb, -hb, -6), proj(hb, -hb, -6), proj(hb, hb, -6), proj(-hb, hb, -6)];
                ctx.fillStyle = rgba(mix(BG, LILAC, 0.16), 1);
                ctx.beginPath();
                for (let k = 0; k < 4; k += 1) { if (k === 0) { ctx.moveTo(base[k][0], base[k][1]); } else { ctx.lineTo(base[k][0], base[k][1]); } }
                ctx.closePath();
                ctx.fill();
                const wl = m.g.line >= 0 ? LINES[m.g.line] : [];
                for (let i = 0; i < 9; i += 1) {
                    const q = quad(i);
                    let col: RGB = TILE;
                    if (wl.indexOf(i) >= 0) { col = mix(TILE, MINT, 0.4); }
                    if (hov === i && who[i] === 0 && !m.g.over) { col = mix(TILE, CREAM, 0.16); }
                    ctx.fillStyle = rgba(col, 1);
                    ctx.beginPath();
                    for (let k = 0; k < 4; k += 1) {
                        // 칸 사이 틈 — 중심 쪽으로 6% 당긴다
                        const c = proj(center(i)[0], center(i)[1], 0);
                        const x = lerp(q[k][0], c[0], 0.07);
                        const y = lerp(q[k][1], c[1], 0.07);
                        if (k === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
                    }
                    ctx.closePath();
                    ctx.fill();
                }
                // 그림자 — 높이(받침 위 떠 있는 높이 + 두께)에 비례해 멀리, 더 번지게
                for (let i = 0; i < 9; i += 1) {
                    if (who[i] === 0) { continue; }
                    const hgt = zb[i] + DEPTH_PX;
                    const off = hgt * SHADOW_LEN;
                    const blur = 1 + hgt * 0.16;
                    const alpha = clamp(0.5 - hgt * 0.0016, 0.18, 0.5);
                    for (let pass = 3; pass >= 0; pass -= 1) {
                        strokeMark(ctx, who[i], i, 0.5, 'rgba(10,8,22,' + (alpha / 4).toFixed(3) + ')', 7 + blur * pass * 0.9, off * 0.5, off * 0.8);
                    }
                }
                // 말 — 뒤쪽 줄부터 그린다. 두께는 높이를 여러 층으로 쌓아 표현
                const order = [0, 1, 2, 3, 4, 5, 6, 7, 8].sort(function (a: number, b: number): number { return center(a)[1] - center(b)[1]; });
                for (let o = 0; o < 9; o += 1) {
                    const i = order[o];
                    if (who[i] === 0) { continue; }
                    const base0 = who[i] === 1 ? SKY : PINK;
                    const layers = 6;
                    for (let s = 0; s < layers; s += 1) {
                        const z = zb[i] + (DEPTH_PX * s) / (layers - 1);
                        const top = s === layers - 1;
                        const col: RGB = top ? mix(base0, CREAM, 0.25) : mix(BG, base0, 0.35 + 0.4 * (s / layers));
                        strokeMark(ctx, who[i], i, z, rgba(col, 1), top ? 8 : 9, 0, 0);
                    }
                }
            },
            label(): string { return gameLabel(m.g); },
            hit(x: number, y: number): number {
                for (let i = 0; i < 9; i += 1) {
                    const q = quad(i);
                    let pos = 0;
                    let neg = 0;
                    for (let k = 0; k < 4; k += 1) {
                        const a = q[k];
                        const b = q[(k + 1) % 4];
                        const cr = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
                        if (cr > 0) { pos += 1; } else { neg += 1; }
                    }
                    if (pos === 4 || neg === 4) { return i; }
                }
                return -1;
            },
            hover(i: number): void { hov = i; },
            tap(i: number): void { m.tap(i); },
            auto(): void { m.auto(); },
            rect(i: number): [number, number, number, number] {
                const q = quad(i);
                const xs = q.map(function (p: [number, number, number]): number { return p[0]; });
                const ys = q.map(function (p: [number, number, number]): number { return p[1]; });
                const x0 = Math.min(xs[0], xs[1], xs[2], xs[3]);
                const y0 = Math.min(ys[0], ys[1], ys[2], ys[3]);
                return [x0, y0, Math.max(xs[0], xs[1], xs[2], xs[3]) - x0, Math.max(ys[0], ys[1], ys[2], ys[3]) - y0];
            },
            n(): number { return 3; },
        };
    };
    return mount(root, make);
  }, []);

  return (
      <div className={cx("tt") + " is-demo"} id="tt" ref={rootRef}>
      <canvas className={cx("tt__canvas")} data-role="canvas" width="480" height="300" tabIndex={0} aria-label="포인터를 따라 판이 원근으로 기울고 말이 떨어져 앉을 때 높이만큼 그림자가 길고 흐려지는 입체 판"></canvas>
      <p className={cx("tt__status")} data-role="status" aria-live="polite">X 차례</p>
      <button className={cx("tt__btn")} data-role="btn" type="button">멈춤</button>
      </div>
  );
}
