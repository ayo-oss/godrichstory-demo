// UniqueDigCount - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./UniqueDigCount.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function UniqueDigCount() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const root: HTMLElement = rootEl;
    type RGB = [number, number, number];
    // 무대 좌표 — 캔버스 안 계산은 늘 480×300. 화면에 보이는 크기와 상관없다
    const W = 480;
    const H = 300;
    const TAU = Math.PI * 2;
    function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
    function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
    function easeOut(k: number): number { const u = 1 - clamp(k, 0, 1); return 1 - u * u * u; }
    // 파스텔 팔레트 — 바탕은 짙은 자두색, 타일은 연한 색 위에 짙은 잉크 숫자
    const INK: RGB = [40, 36, 54];
    const PAPER: RGB = [250, 246, 240];
    const ROSE: RGB = [244, 162, 186];
    const MINT: RGB = [148, 212, 182];
    const SKY: RGB = [150, 192, 244];
    const SUN: RGB = [250, 218, 146];
    const NEU: RGB = [236, 230, 250];
    const BGC: RGB = [46, 42, 68];
    const PANEL: RGB = [62, 57, 92];
    const DIM: RGB = [196, 190, 224];
    function rgba(c: RGB, a: number): string {
        return 'rgba(' + Math.round(clamp(c[0], 0, 255)) + ',' + Math.round(clamp(c[1], 0, 255)) + ',' + Math.round(clamp(c[2], 0, 255)) + ',' + clamp(a, 0, 1).toFixed(3) + ')';
    }
    function hsl(h: number, s: number, l: number): RGB {
        const a = s * Math.min(l, 1 - l);
        const f = function (n: number): number {
            const k = (n + h / 30) % 12;
            return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
        };
        return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
    }
    // 정수 해시 — 같은 (a, b) 에는 늘 같은 0 이상 1 미만 값. 난수 함수는 쓰지 않는다
    function hash2(a: number, b: number): number {
        let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        h = h ^ (h >>> 16);
        return (h >>> 0) / 4294967296;
    }
    // 2차원 값 잡음 — 정수 격자점마다 해시 값이 있고 그 사이를 부드럽게 잇는다
    function noise2(x: number, y: number, seed: number): number {
        const xi = Math.floor(x);
        const yi = Math.floor(y);
        const fx = x - xi;
        const fy = y - yi;
        const ux = fx * fx * (3 - 2 * fx);
        const uy = fy * fy * (3 - 2 * fy);
        const s = seed * 131;
        return lerp(lerp(hash2(xi + s, yi), hash2(xi + 1 + s, yi), ux), lerp(hash2(xi + s, yi + 1), hash2(xi + 1 + s, yi + 1), ux), uy);
    }

    // 장면 시계(초)·판 반복 번호·시간표 — 시간표는 (시각, 할 일) 목록이고 시각이 지나면 한 번씩 부른다
    let sceneT = 0;
    let lap = 0;
    type Ev = { t: number; f: () => void };
    let script: Ev[] = [];
    let evAt = 0;
    // 문구 틀의 {a}·{b}·{c} 자리에 값을 끼운다 — 화면 문구는 늘 틀 한 줄이고 로케일 사전이 통째로 바꾼다
    function fill(s: string, a: string, b?: string, c?: string): string {
        return s.split('{a}').join(a).split('{b}').join(b === undefined ? '' : b).split('{c}').join(c === undefined ? '' : c);
    }
    function r1(v: number): string { return String(Math.round(v * 10) / 10); }
    function group(v: number): string {
        // 천 단위 점 — 로케일 함수에 기대지 않는다
        const s = String(Math.round(v));
        let o = '';
        for (let i = 0; i < s.length; i += 1) {
            if (i > 0 && (s.length - i) % 3 === 0) { o += ','; }
            o += s.charAt(i);
        }
        return o;
    }

    // ── 스도쿠 모델 — 판은 81칸 숫자 배열(0 은 빈칸). 후보는 9비트 한 수: 숫자 d 는 (d-1) 번째 비트
    const ALL = 511;
    function bit(d: number): number { return 1 << (d - 1); }
    function popcount(m: number): number {
        let c = 0;
        let v = m;
        while (v) { v &= v - 1; c += 1; }
        return c;
    }
    // 가장 낮은 비트 하나가 가리키는 숫자
    function lowDigit(m: number): number { return 32 - Math.clz32(m & -m); }
    function bin9(m: number): string {
        let s = '';
        for (let d = 9; d >= 1; d -= 1) { s += (m & bit(d)) ? '1' : '0'; }
        return s;
    }
    function rowOf(i: number): number { return Math.floor(i / 9); }
    function colOf(i: number): number { return i % 9; }
    function boxOf(i: number): number { return Math.floor(i / 27) * 3 + Math.floor((i % 9) / 3); }
    // 묶음 27개 — 줄 9 · 세로줄 9 · 상자 9. 칸의 이웃은 같은 묶음 세 곳의 다른 칸 20개
    const UNITS: number[][] = [];
    const PEERS: number[][] = [];
    for (let k = 0; k < 27; k += 1) { UNITS.push([]); }
    for (let i = 0; i < 81; i += 1) {
        UNITS[rowOf(i)].push(i);
        UNITS[9 + colOf(i)].push(i);
        UNITS[18 + boxOf(i)].push(i);
    }
    for (let i = 0; i < 81; i += 1) {
        const ps: number[] = [];
        for (let j = 0; j < 81; j += 1) {
            if (j !== i && (rowOf(j) === rowOf(i) || colOf(j) === colOf(i) || boxOf(j) === boxOf(i))) { ps.push(j); }
        }
        PEERS.push(ps);
    }
    // 묶음 종류 kind: 0 줄 · 1 세로줄 · 2 상자
    function unitIndex(kind: number, i: number): number { return kind === 0 ? rowOf(i) : (kind === 1 ? 9 + colOf(i) : 18 + boxOf(i)); }
    function sharedKind(i: number, j: number): number {
        if (rowOf(i) === rowOf(j)) { return 0; }
        if (colOf(i) === colOf(j)) { return 1; }
        return boxOf(i) === boxOf(j) ? 2 : -1;
    }
    // 칸 i 가 속한 kind 묶음에서 i 를 뺀 칸들이 이미 쓴 숫자의 비트 합(OR)
    function usedMask(b: number[], i: number, kind: number): number {
        const u = UNITS[unitIndex(kind, i)];
        let m = 0;
        for (let k = 0; k < 9; k += 1) { if (u[k] !== i && b[u[k]] !== 0) { m |= bit(b[u[k]]); } }
        return m;
    }
    // 후보 = 9비트 전체에서 세 묶음이 쓴 비트를 뺀 것. 채워진 칸의 후보는 0
    function candMask(b: number[], i: number): number {
        if (b[i] !== 0) { return 0; }
        return ALL & ~(usedMask(b, i, 0) | usedMask(b, i, 1) | usedMask(b, i, 2));
    }
    function filledOf(b: number[]): number {
        let c = 0;
        for (let i = 0; i < 81; i += 1) { if (b[i] !== 0) { c += 1; } }
        return c;
    }
    function perm(n: number, seed: number): number[] {
        const a: number[] = [];
        for (let i = 0; i < n; i += 1) { a.push(i); }
        for (let i = n - 1; i > 0; i -= 1) {
            const j = Math.floor(hash2(i, seed) * (i + 1));
            const t = a[i];
            a[i] = a[j];
            a[j] = t;
        }
        return a;
    }
    // 완성판 — 기본 무늬를 숫자·줄·상자 묶음 순서로 섞는다. 같은 씨앗이면 같은 판
    function fullBoard(seed: number): number[] {
        const dp = perm(9, seed * 7 + 1);
        const bp = perm(3, seed * 7 + 2);
        const sp = perm(3, seed * 7 + 3);
        const rows: number[] = [];
        const cols: number[] = [];
        for (let k = 0; k < 3; k += 1) {
            const rp = perm(3, seed * 13 + k * 5 + 4);
            const cp = perm(3, seed * 13 + k * 5 + 9);
            for (let j = 0; j < 3; j += 1) {
                rows.push(bp[k] * 3 + rp[j]);
                cols.push(sp[k] * 3 + cp[j]);
            }
        }
        const b: number[] = [];
        for (let r = 0; r < 9; r += 1) {
            for (let c = 0; c < 9; c += 1) {
                b.push(dp[(3 * (rows[r] % 3) + Math.floor(rows[r] / 3) + cols[c]) % 9] + 1);
            }
        }
        return b;
    }
    // 풀이 탐색 — 가장 후보가 적은 칸(plain 이면 앞쪽 빈칸)부터 숫자를 걸고, 막히면 되돌린다.
    // count 가 limit 에 닿으면 멈추고(풀이 개수는 limit 까지만 센다), 걸어 본 숫자가 cap 을 넘으면 멈춘다.
    // trace 에는 (종류 << 16) | (칸 << 4) | 숫자 — 종류 0 은 걸기, 1 은 되돌리기
    type Srch = { count: number; nodes: number; dead: number; branch: number; capHit: boolean; first: number[]; trace: number[] };
    function search(start: number[], limit: number, cap: number, plain: boolean, wantTrace: boolean): Srch {
        const b = start.slice();
        const rm: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        const cm: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        const xm: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (let i = 0; i < 81; i += 1) {
            if (b[i] !== 0) {
                rm[rowOf(i)] |= bit(b[i]);
                cm[colOf(i)] |= bit(b[i]);
                xm[boxOf(i)] |= bit(b[i]);
            }
        }
        const r: Srch = { count: 0, nodes: 0, dead: 0, branch: 0, capHit: false, first: [], trace: [] };
        function rec(): void {
            let best = -1;
            let bm = 0;
            let bc = 10;
            for (let i = 0; i < 81; i += 1) {
                if (b[i] !== 0) { continue; }
                const m = ALL & ~(rm[rowOf(i)] | cm[colOf(i)] | xm[boxOf(i)]);
                const pc = popcount(m);
                if (plain) { best = i; bm = m; bc = pc; break; }
                if (pc < bc) { best = i; bm = m; bc = pc; if (pc <= 1) { break; } }
            }
            if (best < 0) {
                r.count += 1;
                if (r.count === 1) { r.first = b.slice(); }
                return;
            }
            if (bc === 0) { r.dead += 1; return; }
            if (bc > 1) { r.branch += 1; }
            let mm = bm;
            while (mm) {
                const lo = mm & -mm;
                mm ^= lo;
                const d = 32 - Math.clz32(lo);
                r.nodes += 1;
                if (r.nodes > cap) { r.capHit = true; return; }
                b[best] = d;
                rm[rowOf(best)] |= lo;
                cm[colOf(best)] |= lo;
                xm[boxOf(best)] |= lo;
                if (wantTrace) { r.trace.push((best << 4) | d); }
                rec();
                if (r.count >= limit || r.capHit) { return; }
                b[best] = 0;
                rm[rowOf(best)] &= ~lo;
                cm[colOf(best)] &= ~lo;
                xm[boxOf(best)] &= ~lo;
                if (wantTrace) { r.trace.push((1 << 16) | (best << 4) | d); }
            }
        }
        rec();
        return r;
    }
    // 하나뿐인 후보 채우기 — 후보가 하나인 칸(번호가 가장 앞선 칸)을 채우고 다시 센다. 더 없으면 멈춘다
    type Singles = { order: number[]; digits: number[]; avail: number[]; solved: boolean; board: number[] };
    function singlesFill(start: number[]): Singles {
        const b = start.slice();
        const order: number[] = [];
        const digits: number[] = [];
        const avail: number[] = [];
        for (;;) {
            let first = -1;
            let n = 0;
            for (let i = 0; i < 81; i += 1) {
                if (b[i] === 0 && popcount(candMask(b, i)) === 1) {
                    if (first < 0) { first = i; }
                    n += 1;
                }
            }
            if (first < 0) { break; }
            const d = lowDigit(candMask(b, first));
            b[first] = d;
            order.push(first);
            digits.push(d);
            avail.push(n);
        }
        let solved = true;
        for (let i = 0; i < 81; i += 1) { if (b[i] === 0) { solved = false; } }
        return { order: order, digits: digits, avail: avail, solved: solved, board: b };
    }
    // 구멍 파기 — 완성판에서 칸을 해시 순서로 하나씩 비우고 풀이 개수를 2 까지만 센다.
    // 하나뿐이면 비운 채로 두고, 둘 이상이면 되돌린다. singlesOnly 이면 하나뿐인 후보만으로 풀리는 판만 남긴다
    type DigStep = { cell: number; cnt: number; ok: boolean; nodes: number };
    type Dug = { puz: number[]; steps: DigStep[]; clues: number };
    function digBoard(sol: number[], seed: number, target: number, singlesOnly: boolean): Dug {
        const puz = sol.slice();
        const order = perm(81, seed * 31 + 5);
        const steps: DigStep[] = [];
        let clues = 81;
        for (let k = 0; k < 81; k += 1) {
            if (clues <= target) { break; }
            const c = order[k];
            const d = puz[c];
            puz[c] = 0;
            const s = search(puz, 2, 6000, false, false);
            const cnt = s.capHit ? 2 : Math.min(2, s.count);
            const ok = cnt === 1 && (!singlesOnly || singlesFill(puz).solved);
            steps.push({ cell: c, cnt: cnt, ok: ok, nodes: s.nodes });
            if (ok) { clues -= 1; } else { puz[c] = d; }
        }
        return { puz: puz, steps: steps, clues: clues };
    }
    // 놓은 숫자가 겹치는 쌍 — [칸, 칸, 묶음 종류]
    function conflicts(b: number[]): number[][] {
        const out: number[][] = [];
        for (let i = 0; i < 81; i += 1) {
            if (b[i] === 0) { continue; }
            for (let k = 0; k < 20; k += 1) {
                const p = PEERS[i][k];
                if (p > i && b[p] === b[i]) { out.push([i, p, sharedKind(i, p)]); }
            }
        }
        return out;
    }

    // ── 판 상태 — 장면이 아니라 판이 들고 있는 것. 화면은 이 값을 읽어 그린다
    const BX = 22;
    const BY = 44;
    const CS = 23;
    const GAP = 3;
    const PX = 258;
    const PW = 210;
    let g: number[] = [];
    let giv: boolean[] = [];
    let sol: number[] = [];
    let pt: number[] = [];
    let cur = 40;
    let solvedT = -1;
    let lastCell = -1;
    type Rip = { i: number; t: number; list: number[]; d: number };
    let rip: Rip = { i: -1, t: -9, list: [], d: 0 };
    let selDigit = 0;
    let still = false;
    let hintHook = null as (() => void) | null;
    function cellX(i: number): number { const c = colOf(i); return BX + c * CS + Math.floor(c / 3) * GAP; }
    function cellY(i: number): number { const r = rowOf(i); return BY + r * CS + Math.floor(r / 3) * GAP; }
    function cellCx(i: number): number { return cellX(i) + CS / 2; }
    function cellCy(i: number): number { return cellY(i) + CS / 2; }
    function cellAt(x: number, y: number): number {
        let c = -1;
        let r = -1;
        for (let k = 0; k < 9; k += 1) {
            const x0 = BX + k * CS + Math.floor(k / 3) * GAP;
            const y0 = BY + k * CS + Math.floor(k / 3) * GAP;
            if (x >= x0 && x < x0 + CS) { c = k; }
            if (y >= y0 && y < y0 + CS) { r = k; }
        }
        return c < 0 || r < 0 ? -1 : r * 9 + c;
    }
    function setBoard(puz: number[], solution: number[]): void {
        g = puz.slice();
        sol = solution.slice();
        giv = [];
        pt = [];
        for (let i = 0; i < 81; i += 1) { giv.push(puz[i] !== 0); pt.push(-9); }
        solvedT = -1;
        lastCell = -1;
        rip = { i: -1, t: -9, list: [], d: 0 };
    }
    function solvedNow(): boolean { return filledOf(g) === 81 && conflicts(g).length === 0; }
    function checkSolved(): void {
        if (solvedNow()) { if (solvedT < 0) { solvedT = sceneT; } } else { solvedT = -1; }
    }
    // 숫자를 놓는다 — 놓기 전에 그 숫자가 후보에 있던 이웃 칸을 기억해 두면 소거가 번지는 모습을 그릴 수 있다
    function putDigit(i: number, d: number): boolean {
        if (giv[i] || d < 1 || d > 9) { return false; }
        const list: number[] = [];
        for (let k = 0; k < 20; k += 1) {
            const p = PEERS[i][k];
            if (g[p] === 0 && (candMask(g, p) & bit(d)) !== 0) { list.push(p); }
        }
        g[i] = d;
        pt[i] = sceneT;
        rip = { i: i, t: sceneT, list: list, d: d };
        lastCell = i;
        checkSolved();
        return true;
    }
    function clearDigit(i: number): void {
        if (giv[i] || g[i] === 0) { return; }
        g[i] = 0;
        pt[i] = -9;
        checkSolved();
    }
    function mix(a: RGB, b: RGB, k: number): RGB { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }

    // ── 그리기 도구
    const canvasEl = root.querySelector('[data-role="canvas"]') as HTMLCanvasElement | null;
    const padEl = root.querySelector('[data-role="pad"]') as HTMLElement | null;
    const pauseEl = root.querySelector('[data-role="pause"]') as HTMLButtonElement | null;
    const statusEl = root.querySelector('[data-role="status"]') as HTMLElement | null;
    const doneEl = root.querySelector('[data-role="done"]') as HTMLElement | null;
    const ctxRaw = canvasEl ? canvasEl.getContext('2d') : null;
    if (!canvasEl || !ctxRaw || !pauseEl || !padEl || !doneEl) { return; }
    const cv: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctxRaw;
    const pauseBtn: HTMLButtonElement = pauseEl;
    const doneP: HTMLElement = doneEl;
    const pad: HTMLElement = padEl;
    // 외부 웹폰트는 부르지 않는다 — 기기에 있는 글꼴 목록만
    const UI_FONT = 'system-ui, -apple-system, "Segoe UI", "Noto Sans KR", sans-serif';
    let dpr = 1;
    function fitCanvas(): void {
        // 배율은 2 에서 자른다 — 계산은 늘 480×300 이고 화면 배율만 이 값
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function box(x: number, y: number, w: number, h: number, r: number, c: RGB, a: number): void {
        if (w <= 0.2 || h <= 0.2 || a <= 0) { return; }
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
        ctx.fillStyle = rgba(c, a);
        ctx.fill();
    }
    function disc(x: number, y: number, r: number, c: RGB, a: number): void {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fillStyle = rgba(c, a);
        ctx.fill();
    }
    function seg(x1: number, y1: number, x2: number, y2: number, c: RGB, a: number, w: number): void {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = rgba(c, a);
        ctx.lineWidth = w;
        ctx.lineCap = 'round';
        ctx.stroke();
    }
    function text(s: string, x: number, y: number, c: RGB, px: number, weight: number, align: CanvasTextAlign): void {
        ctx.font = weight + ' ' + px + 'px ' + UI_FONT;
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = rgba(c, 1);
        ctx.fillText(s, x, y);
    }
    function panel(x: number, y: number, w: number, h: number): void { box(x, y, w, h, 12, PANEL, 1); }
    // 아래쪽 눈금 — 상수 이름과 지금 값 · 크기 막대
    function hud(name: string, val: string, frac: number): void {
        const label = name + ' ' + val;
        ctx.font = '700 11px ' + UI_FONT;
        const w = ctx.measureText(label).width + 20;
        const x = 12;
        const y = H - 30;
        box(x, y, w, 20, 10, NEU, 0.96);
        text(label, x + w / 2, y + 10.5, INK, 11, 700, 'center');
        const mx = x + w + 10;
        box(mx, y + 6, 140, 8, 4, [78, 72, 104], 1);
        box(mx, y + 6, 140 * clamp(frac, 0, 1), 8, 4, MINT, 1);
    }

    // ── 판 그리기 — 칸 색은 장면이 정하고, 숫자는 판이 그린다
    const EMPTY: RGB = [58, 53, 88];
    const PLACED: RGB = [190, 214, 246];
    const PLACED_INK: RGB = [28, 54, 118];
    function ring(x: number, y: number, w: number, h: number, r: number, c: RGB, a: number, lw: number): void {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        ctx.strokeStyle = rgba(c, a);
        ctx.lineWidth = lw;
        ctx.stroke();
    }
    function drawBoard(fillOf: (i: number) => RGB | null, extra: ((i: number, x: number, y: number) => void) | null): void {
        const s = 9 * CS + 2 * GAP;
        box(BX - 5, BY - 5, s + 10, s + 10, 12, PANEL, 1);
        for (let i = 0; i < 81; i += 1) {
            const x = cellX(i);
            const y = cellY(i);
            let f: RGB | null = fillOf(i);
            if (f === null) { f = g[i] === 0 ? EMPTY : (giv[i] ? NEU : PLACED); }
            box(x + 1, y + 1, CS - 2, CS - 2, 4, f, 1);
            if (g[i] !== 0) {
                const a = still ? 99 : sceneT - pt[i];
                const k = a < 0.3 ? 0.7 + 0.3 * easeOut(a / 0.3) : 1;
                text(String(g[i]), x + CS / 2, y + CS / 2 + 1, giv[i] ? INK : PLACED_INK, Math.round(14 * k), giv[i] ? 800 : 700, 'center');
            } else if (extra !== null) {
                extra(i, x, y);
            }
        }
        if (!demo) { ring(cellX(cur) + 0.5, cellY(cur) + 0.5, CS - 1, CS - 1, 4, PAPER, 1, 2); }
    }
    // 묶음 하나를 옅게 물들인다
    function tintUnit(u: number, c: RGB, a: number): void {
        for (let k = 0; k < 9; k += 1) {
            const i = UNITS[u][k];
            box(cellX(i) + 1, cellY(i) + 1, CS - 2, CS - 2, 4, c, a);
            // 물들임이 숫자를 흐리지 않도록 숫자를 다시 얹는다
            if (g[i] !== 0) { text(String(g[i]), cellCx(i), cellCy(i) + 1, giv[i] ? INK : PLACED_INK, 14, giv[i] ? 800 : 700, 'center'); }
        }
    }
    // 후보 비트 줄 — 숫자 1~9 칸 아홉 개, 켜진 비트만 밝다
    function bitRow(x: number, y: number, m: number, on: RGB, off: RGB): void {
        for (let d = 1; d <= 9; d += 1) {
            const lit = (m & bit(d)) !== 0;
            const bx = x + (d - 1) * 18;
            box(bx, y, 16, 16, 4, lit ? on : off, 1);
            text(String(d), bx + 8, y + 8.5, lit ? INK : DIM, 10, 700, 'center');
        }
    }

    // ── 상태 줄·낭독 문장
    const SPK_FILL = '{a}칸 중 {b}칸이 채워져 있다';
    const SPK_DONE = '판 완성, {a}칸이 모두 채워졌다';
    function speakBoard(): string {
        return solvedNow() ? fill(SPK_DONE, '81') : fill(SPK_FILL, '81', String(filledOf(g)));
    }
    // 낭독 모드 — 완성이면 1000, 손으로 하는 중이면 100 + 채운 칸 수, 자동 시연이면 장면이 정한 단계
    function modeBase(sceneMode: number): number {
        if (solvedNow()) { return 1000; }
        return manual ? 100 + filledOf(g) : sceneMode;
    }
    // 방금 놓은 칸의 줄·세로줄·상자 세 묶음을 한 번 물들였다 서서히 빼는 번짐 — 숫자 하나가 어디까지 영향을 주는지 보인다
    function unitPulse(c: RGB, a: number, dur: number): void {
        if (rip.i < 0 || still) { return; }
        const k = (sceneT - rip.t) / dur;
        if (k < 0 || k >= 1) { return; }
        for (let kind = 0; kind < 3; kind += 1) { tintUnit(unitIndex(kind, rip.i), c, a * (1 - k)); }
    }

    let shownStatus = '';
    function pushStatus(s: string): void {
        if (!statusEl || s === shownStatus) { return; }
        shownStatus = s;
        statusEl.textContent = s;
    }
    let paused = false;
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    // 페이지를 연 채 움직임 줄이기 설정을 바꿔도 change 리스너가 다시 읽는다
    still = reduceQuery.matches;
    // 자동 시연 표시 — 사람이 처음 손대면 떼고, 그 뒤부터 모드가 바뀔 때만 낭독 문장을 쓴다
    let demo = root.classList.contains('is-demo');
    const off = new AbortController();
    // 사람이 직접 조작하는 중이면 시간표는 멈추고 계산만 흐른다
    let manual = false;
    function wake(): void {
        if (!demo) { return; }
        demo = false;
        root.classList.remove('is-demo');
    }
    function takeOver(): void {
        if (manual) { return; }
        manual = true;
        wake();
    }
    // 낭독 문장 — 화면 상태 줄(aria-live off)과 따로, 모드가 바뀔 때와 사람이 조작했을 때만 role=status 에 쓴다
    let lastMode = -9;
    function say(): void {
        doneP.textContent = speakText();
        lastMode = still ? -2 : modeId();
    }
    function advance(dt: number): void {
        sceneT += dt;
        if (!manual) {
            while (evAt < script.length && script[evAt].t <= sceneT) {
                const ev = script[evAt];
                evAt += 1;
                ev.f();
            }
            if (sceneT >= LAP_S) { lap += 1; begin(); return; }
        }
        update(dt);
    }
    function begin(): void {
        sceneT = 0;
        evAt = 0;
        script = [];
        build();
    }
    // 고정 걸음 + 걸음 수 상한 — 프레임 간격이 흔들려도 같은 계산, 탭이 멈췄다 돌아와도 한 번에 몰리지 않는다
    const STEP_S = 1 / 60;
    const DT_MAX = 0.05;
    let acc = 0;
    function showNow(): void {
        draw();
        pushStatus(statusText());
        if (!demo) {
            const m = still ? -2 : modeId();
            if (m !== lastMode) { say(); }
        }
    }
    let rafId = 0;
    let lastTs = -1;
    function frame(ts: number): void {
        if (still || paused) { rafId = 0; return; }
        if (lastTs < 0) { lastTs = ts; }
        const dt = Math.min((ts - lastTs) / 1000, DT_MAX);
        lastTs = ts;
        acc += dt;
        while (acc >= STEP_S) {
            advance(STEP_S);
            acc -= STEP_S;
        }
        showNow();
        rafId = window.requestAnimationFrame(frame);
    }
    function startLoop(): void {
        if (rafId) { return; }
        // 멈췄던 사이의 시간을 첫 프레임 dt 로 넘기지 않는다
        lastTs = -1;
        acc = 0;
        rafId = window.requestAnimationFrame(frame);
    }
    function stopLoop(): void {
        if (rafId) { window.cancelAnimationFrame(rafId); rafId = 0; }
    }
    // 움직임 줄이기 — 루프 없이 시간표의 REST_S 초까지를 한 번에 치른 판 한 장. 타일은 보간 없이 바로 제자리
    function showRest(): void {
        stopLoop();
        lap = 0;
        begin();
        while (evAt < script.length && script[evAt].t <= REST_S) {
            const ev = script[evAt];
            evAt += 1;
            sceneT = ev.t;
            ev.f();
        }
        sceneT = REST_S;
        update(0);
        showNow();
    }
    function play(): void {
        begin();
        showNow();
        if (!paused) { startLoop(); }
    }
    // 사람이 조작한 뒤 — 멈춘 채이거나 움직임 줄이기이면 보간을 건너뛰어 바로 보이게 한다. 조작 직후는 낭독 문장도 쓴다
    function afterInput(speak: boolean): void {
        if (paused || still) { sceneT += 1; }
        update(0);
        showNow();
        if (speak) { say(); }
    }
    function togglePause(): void {
        paused = !paused;
        pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
        wake();
        if (paused) { stopLoop(); } else if (!still) { startLoop(); }
        say();
    }
    function restart(): void {
        manual = false;
        lap = 0;
        begin();
        update(0);
        showNow();
        say();
    }

    // 새 판 — 씨앗이 달라진 판으로 시간표를 처음부터. 손으로 하던 중이어도 자동 시연으로 돌아간다
    function newBoard(): void {
        manual = false;
        lap += 1;
        begin();
        update(0);
        showNow();
        say();
    }
    function moveCur(dx: number, dy: number): void {
        takeOver();
        cur = clamp(rowOf(cur) + dy, 0, 8) * 9 + clamp(colOf(cur) + dx, 0, 8);
        afterInput(true);
    }
    // 힌트 기본 — 고른 빈칸에 정답 숫자를 놓는다. 장면이 hintHook 을 걸어 두면 그쪽이 먼저
    function hintDefault(): void {
        if (!giv[cur] && g[cur] === 0) { putDigit(cur, sol[cur]); }
    }
    function toCanvas(e: PointerEvent): number[] {
        const r = cv.getBoundingClientRect();
        return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height];
    }
    pauseBtn.addEventListener('click', togglePause, { signal: off.signal });
    // 키보드 — 무대에 포커스가 있을 때만. 방향키 = 칸 이동, 1~9 = 숫자 입력, Delete·Backspace·0 = 지우기, H = 힌트,
    // N = 새 판, R = 처음부터, Enter·Space = 일시정지
    pad.addEventListener('keydown', function (e: KeyboardEvent): void {
        if (e.altKey || e.ctrlKey || e.metaKey) { return; }
        const k = e.key;
        if (k === 'Enter' || k === ' ' || k === 'p' || k === 'P') {
            e.preventDefault();
            togglePause();
        } else if (k === 'r' || k === 'R') {
            restart();
        } else if (k === 'n' || k === 'N') {
            e.preventDefault();
            newBoard();
        } else if (k === 'ArrowLeft') {
            e.preventDefault();
            moveCur(-1, 0);
        } else if (k === 'ArrowRight') {
            e.preventDefault();
            moveCur(1, 0);
        } else if (k === 'ArrowUp') {
            e.preventDefault();
            moveCur(0, -1);
        } else if (k === 'ArrowDown') {
            e.preventDefault();
            moveCur(0, 1);
        } else if (k.length === 1 && k >= '1' && k <= '9') {
            e.preventDefault();
            takeOver();
            selDigit = Number(k);
            putDigit(cur, selDigit);
            afterInput(true);
        } else if (k === 'Delete' || k === 'Backspace' || k === '0') {
            e.preventDefault();
            takeOver();
            clearDigit(cur);
            afterInput(true);
        } else if (k === 'h' || k === 'H') {
            e.preventDefault();
            takeOver();
            if (hintHook !== null) { hintHook(); } else { hintDefault(); }
            afterInput(true);
        }
    }, { signal: off.signal });
    // 포인터 — 마우스·터치·펜을 한 이벤트로. 누르는 순간부터 놓을 때까지 무대가 포인터를 붙잡는다
    let ptrDown = false;
    pad.addEventListener('pointerdown', function (e: PointerEvent): void {
        takeOver();
        ptrDown = true;
        try { pad.setPointerCapture(e.pointerId); } catch (err) { ptrDown = true; }
        const p = toCanvas(e);
        const c = cellAt(p[0], p[1]);
        if (c >= 0) { cur = c; }
        onPtr(0, p[0], p[1]);
        afterInput(false);
    }, { signal: off.signal });
    pad.addEventListener('pointermove', function (e: PointerEvent): void {
        if (!ptrDown) { return; }
        const p = toCanvas(e);
        const c = cellAt(p[0], p[1]);
        if (c >= 0) { cur = c; }
        onPtr(1, p[0], p[1]);
        afterInput(false);
    }, { signal: off.signal });
    function ptrEnd(e: PointerEvent): void {
        if (!ptrDown) { return; }
        ptrDown = false;
        const p = toCanvas(e);
        onPtr(2, p[0], p[1]);
        afterInput(true);
    }
    pad.addEventListener('pointerup', ptrEnd, { signal: off.signal });
    pad.addEventListener('pointercancel', ptrEnd, { signal: off.signal });
    // 탭이 숨으면 멈추고, 돌아오면 시계를 다시 맞춰 시작
    document.addEventListener('visibilitychange', function (): void {
        if (document.hidden) { stopLoop(); } else if (!paused && !still) { startLoop(); }
    }, { signal: off.signal });
    // 설정이 바뀌면 — 켜지면 판 한 장, 꺼지면 다시 움직인다
    reduceQuery.addEventListener('change', function (): void {
        still = reduceQuery.matches;
        if (still) { showRest(); } else { lap = 0; play(); }
    }, { signal: off.signal });
    window.addEventListener('resize', function (): void {
        fitCanvas();
        showNow();
    }, { signal: off.signal });
    // 04 — 완성판에서 칸을 하나씩 비우고 풀이 개수를 2 까지만 센다. 하나면 비운 채로 두고 둘이면 되돌린다. 비운 순서와 되돌린 칸을 표시해 단서 수가 줄어드는 모습을 보인다
    const CLUES = 36;
    const SEEDS_04 = [4, 9, 15, 22];
    let LAP_S = 8;
    let REST_S = 6;
    let dug: Dug = { puz: [], steps: [], clues: 81 };
    let gapS = 0.1;
    let stepShown = 0;
    let clueNow = 81;
    let restored = 0;
    let lastCnt = 1;
    let lastNodes = 0;
    let restT: number[] = [];
    let dugAt: number[] = [];
    let clueHist: number[] = [];
    let uniqueFinal = 0;
    // 풀이 개수를 세는 동안 그 칸의 줄·세로줄·상자를 훑는 표시
    let scanCell = -1;
    let scanT = -9;
    let scanOk = true;
    const SCAN_S = 0.6;
    function stepAt(k: number): () => void {
        return function (): void {
            const st = dug.steps[k];
            stepShown = k + 1;
            lastCnt = st.cnt;
            lastNodes = st.nodes;
            scanCell = st.cell;
            scanT = sceneT;
            scanOk = st.ok;
            if (st.ok) {
                g[st.cell] = 0;
                giv[st.cell] = false;
                pt[st.cell] = -9;
                clueNow -= 1;
                dugAt[st.cell] = sceneT;
            } else {
                restored += 1;
                restT[st.cell] = sceneT;
            }
            clueHist.push(clueNow);
            if (k === dug.steps.length - 1) { uniqueFinal = search(g, 2, 6000, false, false).count; }
        };
    }
    function build(): void {
        stepShown = 0;
        clueNow = 81;
        restored = 0;
        lastCnt = 1;
        lastNodes = 0;
        uniqueFinal = 0;
        scanCell = -1;
        scanT = -9;
        clueHist = [];
        restT = [];
        dugAt = [];
        for (let i = 0; i < 81; i += 1) { restT.push(-9); dugAt.push(-9); }
        const seed = SEEDS_04[lap % SEEDS_04.length];
        const s = fullBoard(seed);
        dug = digBoard(s, seed + 60, CLUES, false);
        setBoard(s, s);
        gapS = clamp(5.2 / Math.max(1, dug.steps.length), 0.04, 0.12);
        for (let k = 0; k < dug.steps.length; k += 1) { script.push({ t: 0.4 + k * gapS, f: stepAt(k) }); }
        const end = 0.4 + dug.steps.length * gapS;
        LAP_S = end + 2.4;
        REST_S = end + 0.3;
    }
    function update(dt: number): void { if (dt < 0) { return; } }
    function draw(): void {
        ctx.fillStyle = rgba(BGC, 1);
        ctx.fillRect(0, 0, W, H);
        drawBoard(function (i: number): RGB | null {
            const a = still ? 99 : sceneT - dugAt[i];
            if (g[i] === 0 && a >= 0 && a < 0.8) { return mix(SUN, EMPTY, a / 0.8); }
            return null;
        }, null);
        const sk = (sceneT - scanT) / SCAN_S;
        if (scanCell >= 0 && !still && sk >= 0 && sk < 1) {
            for (let kind = 0; kind < 3; kind += 1) { tintUnit(unitIndex(kind, scanCell), scanOk ? SUN : ROSE, 0.2 * (1 - sk)); }
        }
        // 되돌린 칸 — 비우려다 풀이가 둘이 되어 제자리로 돌아간 칸에 붉은 테가 남는다
        for (let i = 0; i < 81; i += 1) {
            const a = sceneT - restT[i];
            if (restT[i] > -9 && g[i] !== 0) { ring(cellX(i) + 1, cellY(i) + 1, CS - 2, CS - 2, 4, ROSE, still ? 0.6 : Math.max(0.35, 1 - a / 1.5), 2); }
        }
        panel(PX, BY - 5, PW, 223);
        text('단서', PX + 12, BY + 8, DIM, 11, 700, 'left');
        text(String(clueNow), PX + 12, BY + 36, PAPER, 30, 800, 'left');
        // 단서 수가 줄어드는 꺾은선
        const x0 = PX + 70;
        const w0 = PW - 82;
        box(x0, BY + 14, w0, 44, 6, [48, 44, 74], 1);
        ctx.beginPath();
        const total = Math.max(1, dug.steps.length);
        for (let k = 0; k < clueHist.length; k += 1) {
            const x = x0 + 4 + (w0 - 8) * (k + 1) / total;
            const y = BY + 18 + 36 * (81 - clueHist[k]) / (81 - CLUES);
            if (k === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
        }
        ctx.strokeStyle = rgba(MINT, 1);
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.stroke();
        // 최근 풀이 개수 결과 점 — 1 은 민트(비움), 2 는 장미(되돌림)
        text('풀이 개수 (2 까지만 센다)', PX + 12, BY + 76, DIM, 11, 700, 'left');
        const from = Math.max(0, stepShown - 18);
        for (let k = from; k < stepShown; k += 1) {
            const x = PX + 18 + (k - from) * 10.5;
            disc(x, BY + 94, 4.2, dug.steps[k].ok ? MINT : ROSE, 1);
        }
        if (stepShown > 0) {
            text(lastCnt === 1 ? fill('비움: 풀이 {a}개', '1') : '되돌림: 풀이 2개 이상', PX + 12, BY + 118, lastCnt === 1 ? MINT : ROSE, 12, 800, 'left');
            text(fill('탐색 노드 {a}', String(lastNodes)), PX + 12, BY + 138, NEU, 11, 700, 'left');
        }
        text(fill('되돌린 칸 {a}', String(restored)), PX + 12, BY + 160, NEU, 12, 700, 'left');
        if (stepShown >= dug.steps.length && dug.steps.length > 0) {
            text(uniqueFinal === 1 ? '완성: 풀이가 하나뿐' : '풀이가 하나가 아님', PX + 12, BY + 190, uniqueFinal === 1 ? MINT : ROSE, 12, 800, 'left');
        }
        hud('CLUES', String(CLUES), clueNow / 81);
    }
    function statusText(): string {
        return fill('단서 {a}, 마지막 풀이 개수 {b}', String(clueNow), String(lastCnt));
    }
    function modeId(): number { return modeBase(stepShown >= dug.steps.length ? 3 : (stepShown > 0 ? 1 : 0)); }
    function speakText(): string {
        return fill('단서 {a}개, 되돌린 칸 {b}개', String(clueNow), String(restored)) + '. ' + speakBoard();
    }
    function onPtr(kind: number, x: number, y: number): void { if (kind < 0 || x < 0 || y < 0) { return; } }
    fitCanvas();
    if (still) { showRest(); } else { play(); }
    return function (): void {
        stopLoop();
        off.abort();
    };
  }, []);

  return (
    <div className={cx("vj") + " is-demo"} ref={rootRef}>
        <div className={cx("vj__pad")} data-role="pad" tabIndex={0} role="application" aria-label={'스도쿠 시연 무대 — 방향키로 칸 이동, 1부터 9 숫자키로 입력, Delete 로 지우기, H 로 힌트, N 으로 새 판, R 로 처음부터, Enter 또는 Space 로 일시정지'}>
          <canvas className={cx("vj__canvas")} data-role="canvas" width={480} height={300} role="img" aria-label={'완성된 9×9 판에서 칸을 해시 순서로 하나씩 비운다. 비운 뒤 풀이 개수를 2까지만 세어, 하나이면 비운 칸을 그대로 두고 둘 이상이면 숫자를 되돌리며 그 칸에 붉은 테가 남는다. 오른쪽 패널에는 단서 수가 81에서 CLUES 36까지 줄어드는 큰 숫자와 꺾은선, 최근 결과 점(민트는 비움, 장미는 되돌림), 마지막 탐색 노드 수와 되돌린 칸 수가 나오고 끝에는 풀이가 하나뿐이라고 표시된다. 아래 눈금은 상수 이름과 지금 값을 보이고, 움직임 줄이기에서는 숫자가 바로 채워진 판 한 장만 그려진다'}></canvas>
        </div>
        <p className={cx("vj__status")} data-role="status" aria-live="off">{'스도쿠 장면'}</p>
        <div className={cx("vj__ctrl")}>
          <button className={cx("vj__pause")} data-role="pause" type="button" aria-pressed="false">{'일시정지'}</button>
        </div>
        <p className={cx("vj__done")} data-role="done" role="status" aria-live="polite"></p>
    </div>
  );
}
