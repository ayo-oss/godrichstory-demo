// CubicReader - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./CubicReader.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

function main(root: HTMLElement): () => void {
    type RGB = [number, number, number];
    type Fn = (p: number) => number;
    // 무대 좌표 — 캔버스 안 계산은 늘 480×300. 화면에 보이는 크기와 상관없다
    const W = 480;
    const H = 300;
    const TAU = Math.PI * 2;
    function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
    function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
    // 파스텔 팔레트 — 바탕은 짙은 자두색, 상자는 연한 색, 글자는 연한 색 또는 짙은 잉크
    const INK: RGB = [40, 36, 54];
    const PAPER: RGB = [250, 246, 240];
    const ROSE: RGB = [244, 162, 186];
    const MINT: RGB = [148, 212, 182];
    const SKY: RGB = [150, 192, 244];
    const SUN: RGB = [250, 218, 146];
    const LILAC: RGB = [196, 176, 244];
    const NEU: RGB = [236, 230, 250];
    const BGC: RGB = [46, 42, 68];
    const PANEL: RGB = [62, 57, 92];
    const GRID: RGB = [92, 86, 124];
    const DIM: RGB = [196, 190, 224];
    function rgba(c: RGB, a: number): string {
        return 'rgba(' + Math.round(clamp(c[0], 0, 255)) + ',' + Math.round(clamp(c[1], 0, 255)) + ',' + Math.round(clamp(c[2], 0, 255)) + ',' + clamp(a, 0, 1).toFixed(3) + ')';
    }
    // 문구 틀의 {a}·{b}·{c} 자리에 값을 끼운다 — 화면 문구는 늘 틀 한 줄이고 로케일 사전이 통째로 바꾼다
    function fill(s: string, ...v: string[]): string {
        const keys = ['{a}', '{b}', '{c}', '{d}', '{e}', '{f}', '{g}', '{h}'];
        let o = s;
        for (let i = 0; i < keys.length; i += 1) {
            o = o.split(keys[i]).join(i < v.length ? v[i] : '');
        }
        return o;
    }
    function f1(v: number): string { return (Math.round(v * 10) / 10).toFixed(1); }
    function f2(v: number): string { return (Math.round(v * 100) / 100).toFixed(2); }
    function f3(v: number): string { return (Math.round(v * 1000) / 1000).toFixed(3); }
    function pct(v: number): string { return String(Math.round(v * 100)); }
    // ── 이징 계산. 모두 진행률 p(0 에서 1) 를 받아 변화량 비율을 돌려준다
    const LINEAR: Fn = function (p: number): number { return clamp(p, 0, 1); };
    // 3차 곡선 한 점 — 제어값 두 개(a, b) 와 매개값 s 로 좌표 하나를 얻는다
    function bz(a: number, b: number, s: number): number {
        const u = 1 - s;
        return 3 * u * u * s * a + 3 * u * s * s * b + s * s * s;
    }
    // CSS cubic-bezier(x1, y1, x2, y2) 와 같은 곡선. 시간 p 에 맞는 매개값 s 를 반으로 줄이는 반복 근사로 찾고 그 s 의 y 를 돌려준다
    function cubic(x1: number, y1: number, x2: number, y2: number): Fn {
        return function (p: number): number {
            if (p <= 0) { return 0; }
            if (p >= 1) { return 1; }
            let lo = 0;
            let hi = 1;
            let s = p;
            for (let i = 0; i < 32; i += 1) {
                s = (lo + hi) / 2;
                if (bz(x1, x2, s) < p) { lo = s; } else { hi = s; }
            }
            return bz(y1, y2, s);
        };
    }
    // CSS steps(n, jump-end) 와 steps(n, jump-start) — 값이 계단으로만 바뀐다
    function stepsFn(n: number, jumpStart: boolean): Fn {
        return function (p: number): number {
            if (p <= 0) { return 0; }
            if (p >= 1) { return 1; }
            return jumpStart ? Math.min(1, Math.ceil(p * n) / n) : Math.floor(p * n) / n;
        };
    }
    // CSS linear(점 목록) — 점은 같은 간격 위치에 놓이고 사이는 직선으로 잇는다
    function linearFn(pts: number[]): Fn {
        return function (p: number): number {
            if (p <= 0) { return pts[0]; }
            if (p >= 1) { return pts[pts.length - 1]; }
            const x = p * (pts.length - 1);
            const i = Math.floor(x);
            return lerp(pts[i], pts[i + 1], x - i);
        };
    }
    // 순간 속도 — 진행률 곡선의 기울기(길이 1 을 시간 1 에 가는 직선이 1 배)
    function slopeAt(fn: Fn, p: number): number {
        const h = 0.002;
        const a = Math.max(0, p - h);
        const b = Math.min(1, p + h);
        return (fn(b) - fn(a)) / (b - a);
    }
    // 목표의 비율 q 에 처음 닿는 시간(0 에서 1) — 반으로 줄이는 반복 근사
    function reachTime(fn: Fn, q: number): number {
        let lo = 0;
        let hi = 1;
        for (let i = 0; i < 30; i += 1) {
            const m = (lo + hi) / 2;
            if (fn(m) < q) { lo = m; } else { hi = m; }
        }
        return hi;
    }
    // ── 그리기 도구
    const rootEl = root;
    const canvasEl = rootEl.querySelector('[data-role="canvas"]') as HTMLCanvasElement | null;
    const padEl = rootEl.querySelector('[data-role="pad"]') as HTMLElement | null;
    const pauseEl = rootEl.querySelector('[data-role="pause"]') as HTMLButtonElement | null;
    const statusEl = rootEl.querySelector('[data-role="status"]') as HTMLElement | null;
    const doneEl = rootEl.querySelector('[data-role="done"]') as HTMLElement | null;
    const ctxRaw = canvasEl ? canvasEl.getContext('2d') : null;
    if (!canvasEl || !ctxRaw || !pauseEl || !padEl || !doneEl || !statusEl) {
        return function (): void { /* 무대가 없으면 할 일이 없다 */ };
    }
    const cv: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctxRaw;
    const pad: HTMLElement = padEl;
    const pauseBtn: HTMLButtonElement = pauseEl;
    const doneP: HTMLElement = doneEl;
    const statusP: HTMLElement = statusEl;
    // 외부 웹폰트는 부르지 않는다 — 기기에 있는 글꼴 목록만
    const UI_FONT = 'system-ui, -apple-system, "Segoe UI", "Noto Sans KR", sans-serif';
    const CODE_FONT = 'ui-monospace, "Cascadia Mono", Consolas, "Noto Sans KR", monospace';
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
    // 점선 세로·가로선
    function dash(x1: number, y1: number, x2: number, y2: number, c: RGB, a: number): void {
        ctx.setLineDash([3, 3]);
        seg(x1, y1, x2, y2, c, a, 1);
        ctx.setLineDash([]);
    }
    // 글자 — maxW 가 있으면 그 폭에 들어가도록 글자 크기를 줄인다(문구가 로케일마다 길이가 달라서)
    function text(s: string, x: number, y: number, c: RGB, px: number, weight: number, align: CanvasTextAlign, maxW?: number, mono?: boolean): void {
        const face = mono ? CODE_FONT : UI_FONT;
        let size = px;
        ctx.font = weight + ' ' + size + 'px ' + face;
        if (maxW !== undefined) {
            while (size > 8 && ctx.measureText(s).width > maxW) {
                size -= 0.5;
                ctx.font = weight + ' ' + size + 'px ' + face;
            }
        }
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = rgba(c, 1);
        ctx.fillText(s, x, y);
    }
    function panel(x: number, y: number, w: number, h: number): void { box(x, y, w, h, 10, PANEL, 1); }
    // 아래쪽 눈금 — 상수 이름과 지금 값 · 크기 막대
    function hud(name: string, val: string, frac: number): void {
        const label = name + ' ' + val;
        ctx.font = '700 11px ' + CODE_FONT;
        const w = ctx.measureText(label).width + 20;
        const x = 12;
        const y = H - 30;
        box(x, y, w, 20, 10, NEU, 0.96);
        text(label, x + w / 2, y + 10.5, INK, 11, 700, 'center', undefined, true);
        const mx = x + w + 10;
        box(mx, y + 6, 140, 8, 4, [78, 72, 104], 1);
        box(mx, y + 6, 140 * clamp(frac, 0, 1), 8, 4, MINT, 1);
    }
    // 그래프 한 칸 — 가로는 시간(0 에서 1), 세로는 lo 에서 hi 까지의 값
    type Graph = { x: number; y: number; w: number; h: number; lo: number; hi: number };
    function gX(g: Graph, p: number): number { return g.x + g.w * p; }
    function gY(g: Graph, v: number): number { return g.y + g.h * (1 - (v - g.lo) / (g.hi - g.lo)); }
    function graphFrame(g: Graph): void {
        box(g.x - 6, g.y - 6, g.w + 12, g.h + 12, 8, PANEL, 1);
        seg(g.x, gY(g, 0), g.x + g.w, gY(g, 0), GRID, 1, 1);
        seg(g.x, gY(g, 1), g.x + g.w, gY(g, 1), GRID, 1, 1);
        dash(g.x, gY(g, 0), g.x, gY(g, 1), GRID, 1);
        dash(g.x + g.w, gY(g, 0), g.x + g.w, gY(g, 1), GRID, 1);
    }
    // 곡선 한 줄 — 시간 upTo(0 에서 1) 까지 그리고, 끝에 점을 찍는다
    function plot(g: Graph, fn: Fn, c: RGB, lw: number, upTo: number, dot: boolean, wash?: number): void {
        const n = 72;
        if (wash !== undefined && wash > 0 && upTo > 0) {
            // 곡선 아래를 옅게 채워 진행이 면으로 보이게 한다
            ctx.beginPath();
            ctx.moveTo(gX(g, 0), gY(g, 0));
            for (let i = 0; i <= n; i += 1) {
                const p = (i / n) * upTo;
                ctx.lineTo(gX(g, p), gY(g, fn(p)));
            }
            ctx.lineTo(gX(g, upTo), gY(g, 0));
            ctx.closePath();
            ctx.fillStyle = rgba(c, wash);
            ctx.fill();
        }
        ctx.beginPath();
        for (let i = 0; i <= n; i += 1) {
            const p = (i / n) * upTo;
            const px = gX(g, p);
            const py = gY(g, fn(p));
            if (i === 0) { ctx.moveTo(px, py); } else { ctx.lineTo(px, py); }
        }
        ctx.strokeStyle = rgba(c, 1);
        ctx.lineWidth = lw;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        if (dot) { disc(gX(g, upTo), gY(g, fn(upTo)), lw + 1.5, c, 1); }
    }
    // ── 시간·상태·낭독
    let sceneT = 0;
    let lap = 0;
    let paused = false;
    let still = false;
    let lastStatus = '';
    let lastMode = -9;
    function pushStatus(s: string): void {
        if (s === lastStatus) { return; }
        lastStatus = s;
        statusP.textContent = s;
    }
    // 화면을 한 번 그린다 — 움직임 줄이기이면 시간표 끝(REST_S)의 한 장
    function redraw(): void {
        const t = still ? REST_S : sceneT;
        ctx.clearRect(0, 0, W, H);
        box(0, 0, W, H, 0, BGC, 1);
        draw(t);
        pushStatus(statusText(t));
        const m = still ? -2 : modeId(t);
        if (m !== lastMode) {
            lastMode = m;
            doneP.textContent = speakText(t);
        }
    }
    // 프레임 간격이 튀어도 한 번에 몰리지 않게 자른다
    const DT_MAX = 0.05;
    let rafId = 0;
    let lastTs = -1;
    function frame(ts: number): void {
        rafId = 0;
        if (still || paused || document.hidden) { return; }
        if (lastTs < 0) { lastTs = ts; }
        const dt = Math.min((ts - lastTs) / 1000, DT_MAX);
        lastTs = ts;
        sceneT += dt;
        if (sceneT >= LAP_S) {
            sceneT -= LAP_S;
            lap += 1;
        }
        redraw();
        rafId = window.requestAnimationFrame(frame);
    }
    function startLoop(): void {
        if (rafId) { return; }
        // 멈췄던 사이의 시간을 첫 프레임 dt 로 넘기지 않는다
        lastTs = -1;
        rafId = window.requestAnimationFrame(frame);
    }
    function stopLoop(): void {
        if (rafId) {
            window.cancelAnimationFrame(rafId);
            rafId = 0;
        }
    }
    // 장면이 처음으로 돌아갈 때 해야 할 일이 있으면 이 함수를 바꿔 건다
    let onReset: () => void = function (): void { /* 기본은 할 일 없음 */ };
    function restart(): void {
        onReset();
        sceneT = 0;
        lap = 0;
        redraw();
        if (!paused && !still) { startLoop(); }
    }
    function togglePause(): void {
        paused = !paused;
        pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
        if (paused) { stopLoop(); } else if (!still) { startLoop(); }
    }
    const off = new AbortController();
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    // 페이지를 연 채 움직임 줄이기 설정을 바꿔도 change 리스너가 다시 읽는다
    still = reduceQuery.matches;
    pauseBtn.addEventListener('click', function (): void { togglePause(); }, { signal: off.signal });
    pad.addEventListener('keydown', function (e: KeyboardEvent): void {
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'p' || e.key === 'P') {
            e.preventDefault();
            togglePause();
            return;
        }
        if (e.key === 'r' || e.key === 'R') {
            e.preventDefault();
            restart();
            return;
        }
        if (onKey(e)) {
            e.preventDefault();
            // 멈춘 채이거나 움직임 줄이기이면 루프가 없으니 바로 다시 그린다
            redraw();
        }
    }, { signal: off.signal });
    // 탭이 숨으면 멈추고, 돌아오면 시계를 다시 맞춰 시작
    document.addEventListener('visibilitychange', function (): void {
        if (document.hidden) { stopLoop(); } else if (!paused && !still) { startLoop(); }
    }, { signal: off.signal });
    // 설정이 바뀌면 — 켜지면 끝 장면 한 장, 꺼지면 다시 움직인다
    reduceQuery.addEventListener('change', function (): void {
        still = reduceQuery.matches;
        if (still) { stopLoop(); redraw(); } else { restart(); }
    }, { signal: off.signal });
    window.addEventListener('resize', function (): void {
        fitCanvas();
        redraw();
    }, { signal: off.signal });
    // 캔버스 좌표(480×300) — 화면 크기와 상관없이 같은 좌표계
    function stageXY(e: PointerEvent): [number, number] {
        const r = cv.getBoundingClientRect();
        return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
    }
    // CSS 기본 키워드 네 개의 실제 곡선 값(CSS 표준이 정한 제어값)
    const EASE: Fn = cubic(0.25, 0.1, 0.25, 1);
    const EASE_IN: Fn = cubic(0.42, 0, 1, 1);
    const EASE_OUT: Fn = cubic(0, 0, 0.58, 1);
    const EASE_IN_OUT: Fn = cubic(0.42, 0, 0.58, 1);
    // 03 — cubic-bezier(x1, y1, x2, y2) 의 값 네 개를 읽는 판독기. 조절점 두 개(P1·P2)를 끌면 진행률 곡선·순간 속도 곡선·상자 움직임·계산값(0.25·0.5·0.75 에서의 진행률, startSlope, endSlope)이 함께 바뀐다
    const PERIOD = 1.8;
    const MORPH_S = 0.4;
    const RUN_T0 = 0.5;
    const RUN_S = 1.0;
    const PRESET_N = 5;
    const LAP_S = PERIOD * PRESET_N;
    const REST_S = RUN_T0 + RUN_S;
    // 자동 시연이 차례로 보여 주는 값 네 개 — 오버슈트·ease·ease-in-out·ease-in·ease-out
    const PRESETS: number[][] = [
        [0.34, 1.56, 0.64, 1],
        [0.25, 0.1, 0.25, 1],
        [0.42, 0, 0.58, 1],
        [0.42, 0, 1, 1],
        [0, 0, 0.58, 1]
    ];
    const GR: Graph = { x: 30, y: 78, w: 170, h: 142, lo: -0.3, hi: 1.7 };
    const SG: Graph = { x: 244, y: 112, w: 216, h: 46, lo: 0, hi: 4 };
    const TRX0 = 242;
    const TRX1 = 466;
    const BW = 26;
    // 손으로 만진 값 — manual 이 참이면 자동 시연 대신 이 값을 쓴다
    let manual = false;
    let held = 0;
    let dragging = -1;
    const mp: number[] = [0.34, 1.56, 0.64, 1];
    function smooth(k: number): number { const u = clamp(k, 0, 1); return u * u * (3 - 2 * u); }
    function pointsAt(t: number): number[] {
        if (manual) { return mp; }
        const idx = Math.floor(t / PERIOD) % PRESET_N;
        const prev = PRESETS[(idx + PRESET_N - 1) % PRESET_N];
        const cur = PRESETS[idx];
        const k = smooth((t - Math.floor(t / PERIOD) * PERIOD) / MORPH_S);
        return [lerp(prev[0], cur[0], k), lerp(prev[1], cur[1], k), lerp(prev[2], cur[2], k), lerp(prev[3], cur[3], k)];
    }
    // 기울기 — 처음 기울기 y1/x1, 끝 기울기 (1-y2)/(1-x2). 분모가 0 에 가까우면 큰 값으로 자른다
    function startSlope(p: number[]): number { return p[0] < 0.02 ? 99 : p[1] / p[0]; }
    function endSlope(p: number[]): number { return p[2] > 0.98 ? 99 : (1 - p[3]) / (1 - p[2]); }
    function fmtSlope(v: number): string { return v > 20 ? '20+' : f1(v); }
    function curve(p: number[]): Fn { return cubic(p[0], p[1], p[2], p[3]); }
    function cssText(p: number[]): string { return 'cubic-bezier(' + f2(p[0]) + ', ' + f2(p[1]) + ', ' + f2(p[2]) + ', ' + f2(p[3]) + ')'; }
    function draw(t: number): void {
        const p4 = pointsAt(t);
        const fn = curve(p4);
        const tt = t - Math.floor(t / PERIOD) * PERIOD;
        const run = clamp((tt - RUN_T0) / RUN_S, 0, 1);
        // 진행률 곡선 칸
        graphFrame(GR);
        text('진행률 곡선', GR.x + GR.w / 2, 62, NEU, 11, 700, 'center', 150);
        seg(gX(GR, 0), gY(GR, 0), gX(GR, p4[0]), gY(GR, p4[1]), ROSE, 0.7, 1.5);
        seg(gX(GR, 1), gY(GR, 1), gX(GR, p4[2]), gY(GR, p4[3]), SKY, 0.7, 1.5);
        plot(GR, fn, MINT, 3, 1, false);
        plot(GR, fn, MINT, 0.1, run, false, 0.2);
        disc(gX(GR, run), gY(GR, fn(run)), 4.5, PAPER, 1);
        for (let k = 0; k < 2; k += 1) {
            const hx = gX(GR, p4[k * 2]);
            const hy = gY(GR, p4[k * 2 + 1]);
            const c = k === 0 ? ROSE : SKY;
            if (held === k) { disc(hx, hy, 10, PAPER, 0.85); }
            disc(hx, hy, 7, c, 1);
            text(String(k + 1), hx, hy + 0.5, INK, 10, 800, 'center');
        }
        // 상자 — 곡선이 정한 진행률대로 간다
        box(TRX0, 54, TRX1 - TRX0, 38, 9, PANEL, 1);
        box(TRX0, 60, 5 + fn(run) * (TRX1 - TRX0 - 10 - BW) + BW, 26, 8, MINT, 0.22);
        box(TRX0 + 5 + fn(run) * (TRX1 - TRX0 - 10 - BW), 60, BW, 26, 8, MINT, 1);
        // 순간 속도 곡선 — 1 은 직선과 같은 속도
        graphFrame(SG);
        text('순간 속도 (1 은 직선과 같다)', SG.x + SG.w / 2, 102, NEU, 10, 700, 'center', 230);
        plot(SG, function (q: number): number { return clamp(slopeAt(fn, q), 0, 4); }, SUN, 2, 1, false);
        plot(SG, function (q: number): number { return clamp(slopeAt(fn, q), 0, 4); }, SUN, 0.1, run, false, 0.18);
        disc(gX(SG, run), gY(SG, clamp(slopeAt(fn, run), 0, 4)), 3.5, PAPER, 1);
        // 읽은 값 — 0.25·0.5·0.75 에서의 진행률 막대
        const marks = [0.25, 0.5, 0.75];
        for (let i = 0; i < 3; i += 1) {
            const y = 184 + i * 17;
            const v = fn(marks[i]);
            text('curve(' + marks[i] + ')', 244, y, DIM, 10, 700, 'left', 70, true);
            box(318, y - 5, 100, 10, 5, [78, 72, 104], 1);
            box(318, y - 5, 100 * clamp(v, 0, 1), 10, 5, v > 1 ? SUN : MINT, 1);
            text(f2(v), 424, y, PAPER, 11, 700, 'left');
        }
        text(cssText(p4), 244, 240, NEU, 11, 700, 'left', 224, true);
        text('startSlope ' + fmtSlope(startSlope(p4)) + 'x', 30, 236, ROSE, 11, 700, 'left', 160, true);
        text('endSlope ' + fmtSlope(endSlope(p4)) + 'x', 30, 252, SKY, 11, 700, 'left', 160, true);
        hud('x1', f2(p4[0]) + ' · y1 ' + f2(p4[1]), clamp(p4[1] / 1.5, 0, 1));
    }
    function statusText(t: number): string {
        const p4 = pointsAt(t);
        return fill(manual ? '손으로 조절 · 시작 {a}배 끝 {b}배' : '자동 시연 · 시작 {a}배 끝 {b}배', fmtSlope(startSlope(p4)), fmtSlope(endSlope(p4)));
    }
    function modeId(t: number): number { return manual ? 100 : Math.floor(t / PERIOD) % PRESET_N; }
    function speakText(t: number): string {
        const p4 = pointsAt(t);
        const fn = curve(p4);
        return fill('곡선 값 {a}. 시간 0.25 와 0.5 와 0.75 에서 진행률은 {b} 와 {c} 와 {d}, 시작 속도는 직선의 {e}배, 끝 속도는 {f}배다', cssText(p4), f2(fn(0.25)), f2(fn(0.5)), f2(fn(0.75)), fmtSlope(startSlope(p4)), fmtSlope(endSlope(p4)));
    }
    function onKey(e: KeyboardEvent): boolean {
        if (e.key === '1' || e.key === '2') {
            held = e.key === '1' ? 0 : 1;
            return true;
        }
        const d = e.key === 'ArrowLeft' ? [-0.05, 0] : (e.key === 'ArrowRight' ? [0.05, 0] : (e.key === 'ArrowUp' ? [0, 0.05] : (e.key === 'ArrowDown' ? [0, -0.05] : null)));
        if (!d) { return false; }
        takeOver();
        mp[held * 2] = clamp(mp[held * 2] + d[0], 0, 1);
        mp[held * 2 + 1] = clamp(mp[held * 2 + 1] + d[1], -0.3, 1.7);
        return true;
    }
    // 손으로 만지기 시작하면 지금 보이는 값을 그대로 넘겨받는다
    function takeOver(): void {
        if (manual) { return; }
        const now = pointsAt(still ? REST_S : sceneT);
        for (let i = 0; i < 4; i += 1) { mp[i] = now[i]; }
        manual = true;
    }
    function dragTo(x: number, y: number): void {
        const k = dragging;
        mp[k * 2] = clamp((x - GR.x) / GR.w, 0, 1);
        mp[k * 2 + 1] = clamp(GR.lo + (1 - (y - GR.y) / GR.h) * (GR.hi - GR.lo), -0.3, 1.7);
    }
    function sceneInit(): void {
        onReset = function (): void { manual = false; };
        pad.addEventListener('pointerdown', function (e: PointerEvent): void {
            const q = stageXY(e);
            const src = manual ? mp : pointsAt(still ? REST_S : sceneT);
            let best = -1;
            let bd = 20;
            for (let k = 0; k < 2; k += 1) {
                const d = Math.hypot(q[0] - gX(GR, src[k * 2]), q[1] - gY(GR, src[k * 2 + 1]));
                if (d < bd) { bd = d; best = k; }
            }
            if (best < 0) { return; }
            takeOver();
            dragging = best;
            held = best;
            pad.setPointerCapture(e.pointerId);
            dragTo(q[0], q[1]);
            redraw();
        }, { signal: off.signal });
        pad.addEventListener('pointermove', function (e: PointerEvent): void {
            if (dragging < 0) { return; }
            const q = stageXY(e);
            dragTo(q[0], q[1]);
            redraw();
        }, { signal: off.signal });
        const end = function (): void { dragging = -1; };
        pad.addEventListener('pointerup', end, { signal: off.signal });
        pad.addEventListener('pointercancel', end, { signal: off.signal });
    }
    sceneInit();
    fitCanvas();
    // 캔버스 설명에는 이 장면이 계산한 핵심 값이 든 문장을 쓴다
    cv.setAttribute('aria-label', speakText(REST_S));
    redraw();
    if (!still) { startLoop(); }
    return function (): void {
        stopLoop();
        off.abort();
    };

}

export default function CubicReader() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    return main(rootEl);
  }, []);

  return (
    <div className={cx("ez") + " is-demo"} ref={rootRef}>
        <div className={cx("ez__pad")} data-role="pad" tabIndex={0} role="application" aria-label={'시연 무대 — Space 또는 Enter 로 일시정지, R 로 처음부터, 1 또는 2 로 조절점을 고르고 방향키로 옮긴다'}>
          <canvas className={cx("ez__canvas")} data-role="canvas" width={480} height={300} role="img" aria-label={'3차 곡선의 조절점 두 개를 끌어 곡선과 상자 움직임과 계산값이 함께 바뀌는 장면'}></canvas>
        </div>
        <p className={cx("ez__status")} data-role="status" aria-live="off">{'장면 준비'}</p>
        <div className={cx("ez__ctrl")}>
          <button className={cx("ez__pause")} data-role="pause" type="button" aria-pressed="false">{'일시정지'}</button>
        </div>
        <p className={cx("ez__done")} data-role="done" role="status" aria-live="polite"></p>
    </div>
  );
}
