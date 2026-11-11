// TttMinimaxCellScoreHeat - vanilla 판(03-ttt-minimax-cell-score-heat) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./TttMinimaxCellScoreHeat.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function TttMinimaxCellScoreHeat() {
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

    const SEARCH_DEPTH = 9;
    const HEAT_ALPHA = 0.85;
    const THINK_MS = 700;
    const TURN_MS = 1500;
    const HOLD_MS = 1600;
    const CELL = 88;
    const OX = 108;
    const OY = 18;
    const TXT_NODES = '탐색한 국면';

    const make: Maker = function (inp: Input, reduce: boolean): Scene {
        const rng = lcg(31);
        let scores: number[] = [];
        let ratio: number[] = [];
        let bestI = -1;
        let nodes = 0;
        let thinkT = 0;
        let hov = -1;
        let clock = 0;
        const marks: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        const m: Match = makeMatch(inp, reduce, TURN_MS, HOLD_MS, 31, SEARCH_DEPTH, function (i: number, w: number): void {
            marks[i] = w;
            analyze();
        }, function (): void {
            for (let i = 0; i < 9; i += 1) { marks[i] = 0; }
            analyze();
        }, function (): number {
            const e = emptyCells(m.g.b);
            if (m.g.turn === 1 && (e.length > 6 || rng() < 0.3)) { return e[Math.floor(rng() * e.length)]; }
            let best = -1;
            for (let i = 0; i < 9; i += 1) {
                if (isNaN(scores[i])) { continue; }
                if (best < 0 || mover(scores[i]) + ratio[i] * 0.01 > mover(scores[best]) + ratio[best] * 0.01) { best = i; }
            }
            return best;
        });
        // 둘 사람 시점으로 뒤집은 점수 — 양수면 둘 사람에게 좋은 칸
        function mover(s: number): number { return m.g.turn === 1 ? s : -s; }
        function analyze(): void {
            const cnt: Counter = { n: 0, x: 0, o: 0 };
            const per: Counter[] = [];
            scores = m.g.over ? [NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN] : cellScores(m.g.b.slice(), m.g.turn, SEARCH_DEPTH, cnt, per);
            // 점수가 0 인 칸도 색이 갈리게 — 그 칸 뒤에서 탐색이 만난 끝판 중 둘 사람이 이긴 몫 − 진 몫
            ratio = per.map(function (c: Counter): number {
                const tot = c.x + c.o;
                return tot === 0 ? 0 : (m.g.turn === 1 ? c.x - c.o : c.o - c.x) / tot;
            });
            nodes = cnt.n;
            bestI = -1;
            for (let i = 0; i < 9; i += 1) {
                if (isNaN(scores[i])) { continue; }
                if (bestI < 0 || mover(scores[i]) + ratio[i] * 0.01 > mover(scores[bestI]) + ratio[bestI] * 0.01) { bestI = i; }
            }
            thinkT = reduce ? THINK_MS * 2 : 0;
        }
        analyze();
        return {
            step(): void {
                clock += FIXED_DT;
                thinkT += FIXED_DT;
                m.step();
            },
            draw(ctx: CanvasRenderingContext2D): void {
                ctx.fillStyle = rgba(BG, 1);
                ctx.fillRect(0, 0, W, H);
                const wl = m.g.line >= 0 ? LINES[m.g.line] : [];
                let rank = 0;
                for (let i = 0; i < 9; i += 1) {
                    const r = gridRect(i, OX, OY, CELL);
                    const cx = r[0] + CELL / 2;
                    const cy = r[1] + CELL / 2;
                    let col: RGB = TILE;
                    let txt = '';
                    if (marks[i] === 0 && !isNaN(scores[i])) {
                        const reveal = smooth((thinkT - rank * (THINK_MS / 10)) / (THINK_MS * 0.4));
                        rank += 1;
                        const ms = mover(scores[i]);
                        const raw = ms !== 0 ? clamp(ms / (SCORE_WIN - 1), -1, 1) : ratio[i] * 0.45;
                        const v = raw * reveal;
                        const target: RGB = v >= 0 ? MINT : PINK;
                        col = mix(TILE, target, HEAT_ALPHA * Math.abs(v));
                        if (reveal > 0.6 && ms !== 0) { txt = (ms > 0 ? '+' : '') + ms; }
                    }
                    if (wl.indexOf(i) >= 0) { col = mix(col, CREAM, 0.3 + 0.12 * Math.sin(clock / 150)); }
                    if (i === bestI && thinkT > THINK_MS && !m.g.over) { col = mix(col, CREAM, 0.16 + 0.1 * Math.sin(clock / 170)); }
                    if (hov === i && marks[i] === 0 && !m.g.over) { col = mix(col, CREAM, 0.14); }
                    ctx.fillStyle = rgba(col, 1);
                    rrect(ctx, r[0] + 4, r[1] + 4, CELL - 8, CELL - 8, 12);
                    ctx.fill();
                    if (i === bestI && thinkT > THINK_MS && !m.g.over) {
                        ctx.strokeStyle = rgba(CREAM, 0.55 + 0.35 * Math.sin(clock / 170));
                        ctx.lineWidth = 2.5;
                        rrect(ctx, r[0] + 4, r[1] + 4, CELL - 8, CELL - 8, 12);
                        ctx.stroke();
                    }
                    if (marks[i] !== 0) {
                        drawMark(ctx, marks[i], cx, cy, 22, 1, 7, rgba(marks[i] === 1 ? SKY : PINK, 1));
                    } else if (txt) {
                        ctx.fillStyle = rgba(BG, 0.82);
                        ctx.font = '600 19px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(txt, cx, cy);
                    }
                }
                // 탐색 스캔 막대 — 생각하는 동안 칸 위를 지나간다
                const prog = clamp(thinkT / THINK_MS, 0, 1);
                if (prog < 1 && !m.g.over) {
                    const sx = OX + prog * CELL * 3;
                    const g = ctx.createLinearGradient(sx - 30, 0, sx, 0);
                    g.addColorStop(0, rgba(CREAM, 0));
                    g.addColorStop(1, rgba(CREAM, 0.28));
                    ctx.fillStyle = g;
                    ctx.fillRect(sx - 30, OY, 30, CELL * 3);
                }
                // 탐색한 국면 수 — THINK_MS 동안 올라가 최종값에 닿는다
                ctx.textAlign = 'center';
                ctx.textBaseline = 'alphabetic';
                ctx.fillStyle = rgba(CREAM, 0.78);
                ctx.font = '500 11px sans-serif';
                ctx.fillText(TXT_NODES, 426, 138);
                ctx.fillStyle = rgba(MINT, 1);
                ctx.font = '600 22px sans-serif';
                ctx.fillText(String(Math.round(nodes * smooth(prog))), 426, 164);
            },
            label(): string { return gameLabel(m.g); },
            hit(x: number, y: number): number { return gridHit(x, y, OX, OY, CELL); },
            hover(i: number): void { hov = i; },
            tap(i: number): void { m.tap(i); },
            auto(): void { m.auto(); },
            rect(i: number): [number, number, number, number] { return gridRect(i, OX, OY, CELL); },
            n(): number { return 3; },
        };
    };
    return mount(root, make);
  }, []);

  return (
      <div className={cx("tt") + " is-demo"} id="tt" ref={rootRef}>
      <canvas className={cx("tt__canvas")} data-role="canvas" width="480" height="300" tabIndex={0} aria-label="빈 칸마다 끝까지 수를 읽은 점수가 열지도 색으로 깔리고 가장 좋은 칸이 켜지는 판"></canvas>
      <p className={cx("tt__status")} data-role="status" aria-live="polite">X 차례</p>
      <button className={cx("tt__btn")} data-role="btn" type="button">멈춤</button>
      </div>
  );
}
