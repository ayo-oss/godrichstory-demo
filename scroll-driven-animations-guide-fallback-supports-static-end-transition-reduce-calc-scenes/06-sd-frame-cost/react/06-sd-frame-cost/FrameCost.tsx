// FrameCost - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./FrameCost.module.scss";

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
    const simEl = rootEl.querySelector('[data-role="sim"]') as HTMLButtonElement | null;
    const ctxRaw = canvasEl ? canvasEl.getContext('2d') : null;
    if (!canvasEl || !ctxRaw || !pauseEl || !padEl || !doneEl || !statusEl || !simEl) {
        return function (): void { /* 무대가 없으면 할 일이 없다 */ };
    }
    const cv: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctxRaw;
    const pad: HTMLElement = padEl;
    const pauseBtn: HTMLButtonElement = pauseEl;
    const doneP: HTMLElement = doneEl;
    const statusP: HTMLElement = statusEl;
    const simBtn: HTMLButtonElement = simEl;
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
    // 지원 흉내 스위치 — 브라우저를 바꾸지 않고 타임라인 지원 감지가 false 인 상태를 켜 본다
    let simOn = false;
    // 움직임 줄이기 설정이 켜진 페이지인지
    function reduceNow(): boolean { return still || simOn; }
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
        const m = still ? -2 : modeId(t) * 2 + (simOn ? 1 : 0);
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
    let onSim: () => void = function (): void { /* 시뮬레이션 스위치가 바뀔 때 장면이 할 일 */ };
    let onSetting: (v: boolean) => void = function (v: boolean): void { void v; };
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
    function setSim(v: boolean): void {
        simOn = v;
        simBtn.setAttribute('aria-pressed', v ? 'true' : 'false');
        onSim();
        redraw();
    }
    pauseBtn.addEventListener('click', function (): void { togglePause(); }, { signal: off.signal });
    simBtn.addEventListener('click', function (): void { setSim(!simOn); }, { signal: off.signal });
    pad.addEventListener('keydown', function (e: KeyboardEvent): void {
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'p' || e.key === 'P') {
            e.preventDefault();
            togglePause();
            return;
        }
        if (e.key === 'u' || e.key === 'U') {
            e.preventDefault();
            setSim(!simOn);
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
        onSetting(still);
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
    // 쓰는 곡선 — CSS 기본 키워드 ease-in-out 과 같은 제어값
    const EASE_IN_OUT: Fn = cubic(0.42, 0, 0.58, 1);
    // 화면이 1초에 60번 그려진다고 보고 값을 잰다
    const FPS = 60;
    // 모든 장면이 쓰는 줄 간격 — 위쪽 44 까지는 상태 줄과 버튼 자리
    const TOP = 44;
    function fm(v: number, d: number): string { return (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d); }
    // 이름표가 붙은 한 칸. live 이면 지금 이 페이지가 따르는 판이라 색 테두리를 두른다
    function pane(x: number, y: number, w: number, h: number, title: string, c: RGB, live: boolean): void {
        box(x, y, w, h, 10, PANEL, 1);
        if (live) {
            box(x, y, w, h, 10, c, 0.12);
            ctx.beginPath();
            ctx.roundRect(x + 1, y + 1, w - 2, h - 2, 9);
            ctx.strokeStyle = rgba(c, 1);
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        text(title, x + 10, y + 11, c, 11, 800, 'left', w - 20);
    }
    // 가상 문서 — 높이 300, 보이는 창 높이 100, 스크롤로 갈 수 있는 거리 200 (스크롤 진행률 = 위치 ÷ 이 거리)
    const DOC_H = 300;
    const VIEW_H = 100;
    const MAX_SCROLL = DOC_H - VIEW_H;
    // 자동 스크롤 시간표 — 내려가고(0.3초부터 2.1초까지) 올라온다(2.5초부터 4.3초까지). 첫 변화는 150ms 보다 뒤
    const UP_FROM = 0.3;
    const UP_TO = 2.1;
    const DOWN_FROM = 2.5;
    const DOWN_TO = 4.3;
    const LAP_S = 4.6;
    // 움직임 줄이기가 켜지면 내려간 끝 시각의 한 장만 그린다
    const REST_S = 2.2;
    function scrollAt(t: number): number {
        if (t < UP_TO + 0.2) { return MAX_SCROLL * EASE_IN_OUT(clamp((t - UP_FROM) / (UP_TO - UP_FROM), 0, 1)); }
        return MAX_SCROLL * (1 - EASE_IN_OUT(clamp((t - DOWN_FROM) / (DOWN_TO - DOWN_FROM), 0, 1)));
    }
    // 스크롤 진행률 0 에서 1 — 타임라인이 쓰는 값. 스크롤 위치 ÷ (문서 높이 − 창 높이)
    function progAt(s: number): number { return clamp(s / MAX_SCROLL, 0, 1); }
    // 스크립트가 스크롤 이벤트에서 읽어 막대에 쓴 값은 몇 프레임 전 위치다 (LAG_FRAMES = 1)
    const LAG_FRAMES = 1;
    function scrollLag(t: number): number { return scrollAt(Math.max(0, t - LAG_FRAMES / FPS)); }
    const SUP_T: [string, RGB] = ['타임라인 지원판', ROSE];
    const FB_T: [string, RGB] = ['스크립트 폴백판', MINT];
    // 칸 전체에 깔리는 옅은 색 — 알파가 지금 스크롤 속도를 따라가 칸이 얼마나 살아 있는지 한눈에 보인다
    function wash(x: number, a: number, c: RGB): void { box(x, TOP, 224, 150, 10, c, clamp(a, 0, 0.5)); }
    // 순간 변화율(초당) — 앞뒤 0.02초의 차이
    function rateAt(f: (t: number) => number, t: number): number {
        const h = 0.02;
        return Math.abs(f(t + h) - f(t - h)) / (2 * h);
    }
    // 한 프레임에서 가장 크게 바뀐 값을 1초당으로 환산 — 순간 최대 속도
    function peakRate(f: (t: number) => number, t0: number, t1: number): number {
        let m = 0;
        let prev = f(t0);
        for (let t = t0 + 1 / FPS; t <= t1 + 1e-9; t += 1 / FPS) {
            const v = f(t);
            m = Math.max(m, Math.abs(v - prev));
            prev = v;
        }
        return m * FPS;
    }
    const SCROLL_PEAK = peakRate(scrollAt, 0, LAP_S);
    // 칸 안쪽만 그리도록 자른다 — 끝나면 clipEnd 로 푼다
    function clipPane(x: number, y: number, w: number, h: number): void {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 6);
        ctx.clip();
    }
    function clipEnd(): void { ctx.restore(); }
    // 비교 막대 한 줄 — 왼쪽 판 값(ROSE)과 오른쪽 판 값(MINT)을 같은 눈금에 겹쳐 놓고 오른쪽에 숫자
    function cmpRow(y: number, name: string, a: number, b: number, maxV: number, unit: string, dec: number, ca: RGB = ROSE, cb: RGB = MINT): void {
        text(name, 24, y + 8, PAPER, 10.5, 700, 'left', 126);
        const bx = 156;
        const bw = 190;
        box(bx, y + 1, bw, 6, 3, [78, 72, 104], 1);
        box(bx, y + 1, Math.max(2, bw * clamp(a / maxV, 0, 1)), 6, 3, ca, 1);
        box(bx, y + 9, bw, 6, 3, [78, 72, 104], 1);
        box(bx, y + 9, Math.max(2, bw * clamp(b / maxV, 0, 1)), 6, 3, cb, 1);
        text(fm(a, dec) + ' → ' + fm(b, dec) + ' ' + unit, 456, y + 8, SUN, 10.5, 800, 'right', 100, true);
    }
    function rowsPanel(): void { box(14, 200, 452, 62, 10, PANEL, 1); }
    // 보이는 창 — 칸 안 (x+10, y+22) 에서 204×100. 문서 칸 카드가 스크롤만큼 위로 올라간다
    const VX = 10;
    const VY = 22;
    const VW = 204;
    function vpFrame(x: number): void {
        box(x + VX, TOP + VY, VW, VIEW_H, 6, GRID, 0.3);
    }
    // 문서 안 카드 한 장 — doc 좌표 dy 에서 높이 ch. 스크롤 s 만큼 올라간다
    function docCard(x: number, dy: number, ch: number, s: number, c: RGB, a: number, inset: number): void {
        box(x + VX + 12 + inset, TOP + VY + dy - s, VW - 24 - inset * 2, ch, 6, c, a);
    }
    // 배경 카드 — 스크롤하면 움직이는 것이 보이도록 깔아 둔다
    function fillerCards(x: number, s: number, skip: number): void {
        for (let i = 0; i < 6; i += 1) {
            if (i === skip) { continue; }
            docCard(x, 14 + i * 48, 36, s, LILAC, 0.34, 0);
        }
    }
    // 스크롤바 막대 — 현재 위치를 오른쪽 가장자리에
    function thumb(x: number, s: number): void {
        const th = VIEW_H * VIEW_H / DOC_H;
        box(x + VX + VW - 6, TOP + VY + (VIEW_H - th) * progAt(s), 4, th, 2, NEU, 0.8);
    }
    // 진행 막대 — 보이는 창 맨 위에 붙는다
    function topBar(x: number, frac: number, c: RGB, a: number): void {
        box(x + VX, TOP + VY, VW, 7, 3, [78, 72, 104], 1);
        box(x + VX, TOP + VY, Math.max(0, VW * clamp(frac, 0, 1)), 7, 3, c, a);
    }
    // 칸 안 바닥 글줄
    function cap(x: number, s: string, c: RGB): void {
        text(s, x + 112, TOP + 139, c, 10, 700, 'center', 204, true);
    }
    // 06 — 스크롤 연동을 스크립트로 계속 쓸지의 비용. 보이지 않는 실제 스크롤 상자(rig)를 만들어 프레임마다 같은 위치로 스크롤하고, 짝수 프레임은 타임라인판 방식(위치만 쓴다), 홀수 프레임은 스크립트판 방식(읽고 막대 너비를 쓰고 한 번 더 읽는다)으로 잰다
    // 측정한 ms 는 이 기기·이 렌더 환경의 값이고 두 방식의 상대 비교만 읽는다
    const NODE_LIST = [100, 300, 600, 1200];
    let nodeIdx = 1;
    let NODES = NODE_LIST[nodeIdx];
    const SAMPLE_CAP = 180;
    const rig = document.createElement('div');
    rig.setAttribute('aria-hidden', 'true');
    rig.style.cssText = 'position:absolute;left:-9999px;top:0;width:204px;height:100px;overflow:auto;visibility:hidden;pointer-events:none;';
    const rigDoc = document.createElement('div');
    rigDoc.style.cssText = 'position:relative;width:180px;height:' + DOC_H + 'px;';
    rig.appendChild(rigDoc);
    const rigBar = document.createElement('div');
    rigBar.style.cssText = 'position:absolute;left:-9999px;top:0;width:0;height:7px;visibility:hidden;';
    rootEl.appendChild(rig);
    rootEl.appendChild(rigBar);
    function buildRig(): void {
        rigDoc.textContent = '';
        for (let i = 0; i < NODES; i += 1) {
            const d = document.createElement('div');
            d.style.cssText = 'position:absolute;left:' + ((i * 7) % 160) + 'px;top:' + ((i * 13) % 280) + 'px;width:20px;height:12px;';
            rigDoc.appendChild(d);
        }
    }
    // 타임라인판 방식 — 위치만 쓴다. 읽을 값도, 막대에 쓸 값도 스크립트에 없다
    function bareScroll(s: number): void { rig.scrollTop = s; }
    // 스크립트판 방식 — 스크롤 이벤트 핸들러가 하는 일: 위치를 읽고, 진행률을 계산하고, 막대 너비를 쓰고, 요소 위치를 한 번 더 읽는다
    function handler(s: number): void {
        rig.scrollTop = s;
        const p = rig.scrollTop / (rig.scrollHeight - rig.clientHeight);
        rigBar.style.width = (p * VW) + 'px';
        const last = rigDoc.lastElementChild;
        if (last) { void last.getBoundingClientRect().top; }
    }
    const msA: number[] = [];
    const msB: number[] = [];
    const ivA: number[] = [];
    const ivB: number[] = [];
    let k = 0;
    let prevNow = -1;
    let prevMethod = -1;
    function push(a: number[], v: number): void {
        a.push(v);
        if (a.length > SAMPLE_CAP) { a.shift(); }
    }
    function mean(a: number[]): number {
        if (a.length === 0) { return 0; }
        let sum = 0;
        for (let i = 0; i < a.length; i += 1) { sum += a[i]; }
        return sum / a.length;
    }
    function clearStats(): void {
        msA.length = 0;
        msB.length = 0;
        ivA.length = 0;
        ivB.length = 0;
        prevNow = -1;
        prevMethod = -1;
    }
    function runMethod(m: number, s: number): number {
        const useScript = m === 1 || simOn;
        const t0 = performance.now();
        if (useScript) { handler(s); } else { bareScroll(s); }
        return performance.now() - t0;
    }
    // 프레임이 그려질 때 한 번 — 이 프레임의 방식을 정해 스크립트 시간을 재고, 직전 프레임 방식에 지금까지의 간격을 붙인다
    function measure(s: number): void {
        const now = performance.now();
        if (prevNow >= 0 && prevMethod >= 0) {
            const iv = now - prevNow;
            if (iv < 100) { push(prevMethod === 0 ? ivA : ivB, iv); }
        }
        const m = k % 2;
        push(m === 0 ? msA : msB, runMethod(m, s));
        prevNow = now;
        prevMethod = m;
        k += 1;
    }
    function ivText(a: number[]): string { return a.length < 4 ? '-' : fm(mean(a), 1); }
    function page(x: number, s: number, frac: number, c: RGB): void {
        vpFrame(x);
        clipPane(x + VX, TOP + VY, VW, VIEW_H);
        fillerCards(x, s, -1);
        thumb(x, s);
        topBar(x, frac, c, 1);
        clipEnd();
    }
    function draw(t: number): void {
        const s = scrollAt(t);
        if (!paused && !still) { measure(s); }
        pane(14, TOP, 224, 150, simOn ? FB_T[0] : SUP_T[0], simOn ? MINT : ROSE, !simOn);
        pane(242, TOP, 224, 150, FB_T[0], FB_T[1], simOn);
        const r = clamp(rateAt(scrollAt, t) / SCROLL_PEAK, 0, 1);
        wash(14, 0.22 * r, simOn ? MINT : ROSE);
        wash(242, 0.22 * r, MINT);
        page(14, s, progAt(s), simOn ? MINT : ROSE);
        page(242, s, progAt(scrollLag(t)), MINT);
        const a1 = mean(msA);
        const b1 = mean(msB);
        cap(14, fill('스크립트 {a}ms · 간격 {b}ms', fm(a1, 2), ivText(ivA)), PAPER);
        cap(242, fill('스크립트 {a}ms · 간격 {b}ms', fm(b1, 2), ivText(ivB)), PAPER);
        rowsPanel();
        cmpRow(207, '프레임당 스크립트 시간', a1, b1, Math.max(a1, b1, 0.05) * 1.25, 'ms', 2);
        cmpRow(231, '프레임 간격 평균', mean(ivA), mean(ivB), 33.4, 'ms', 1);
        hud('NODES', String(NODES), NODES / 1200);
    }
    function statusText(t: number): string {
        void t;
        return fill('스크립트 {a} 대 {b}ms · 간격 {c} 대 {d}ms', fm(mean(msA), 2), fm(mean(msB), 2), ivText(ivA), ivText(ivB));
    }
    function modeId(t: number): number { return t < UP_FROM ? 0 : (t < UP_TO ? 1 : (t < DOWN_FROM ? 2 : 3)); }
    function speakText(t: number): string {
        void t;
        return fill('두 칸이 같은 스크롤을 한 프레임씩 번갈아 받는다. 타임라인판 방식은 위치만 쓰고 스크립트판 방식은 위치를 읽고 막대 너비를 쓰고 한 번 더 읽는다. 보이지 않는 문서 노드는 {a}개이고 숫자는 이 기기에서 지금 잰 값이다', String(NODES));
    }
    function onKey(e: KeyboardEvent): boolean {
        if (e.key === 'ArrowLeft' && nodeIdx > 0) { nodeIdx -= 1; NODES = NODE_LIST[nodeIdx]; buildRig(); clearStats(); return true; }
        if (e.key === 'ArrowRight' && nodeIdx < NODE_LIST.length - 1) { nodeIdx += 1; NODES = NODE_LIST[nodeIdx]; buildRig(); clearStats(); return true; }
        return false;
    }
    function sceneInit(): void {
        buildRig();
        onSim = function (): void { clearStats(); };
        off.signal.addEventListener('abort', function (): void {
            rig.remove();
            rigBar.remove();
        });
        // 처음 그리기 전에 두 방식을 여러 번 돌려 스크립트 시간 표본을 채운다
        for (let i = 0; i < 40; i += 1) {
            push(msA, runMethod(0, (i * 5) % MAX_SCROLL));
            push(msB, runMethod(1, (i * 5) % MAX_SCROLL));
        }
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

export default function FrameCost() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    return main(rootEl);
  }, []);

  return (
    <div className={cx("ez") + " is-demo"} ref={rootRef}>
        <div className={cx("ez__pad")} data-role="pad" tabIndex={0} role="application" aria-label={'시연 무대 — Space 또는 Enter 로 일시정지, R 로 처음부터, U 로 미지원 흉내 켜기, 왼쪽·오른쪽 방향키로 문서 노드 수를 바꾼다'}>
          <canvas className={cx("ez__canvas")} data-role="canvas" width={480} height={300} role="img" aria-label={'같은 스크롤을 타임라인판 방식과 스크립트판 방식으로 번갈아 처리하며 스크립트 시간과 프레임 간격을 재는 장면'}></canvas>
        </div>
        <p className={cx("ez__status")} data-role="status" aria-live="off">{'장면 준비'}</p>
        <div className={cx("ez__ctrl")}>
          <button className={cx("ez__pause")} data-role="pause" type="button" aria-pressed="false">{'일시정지'}</button>
          <button className={cx("ez__pause")} data-role="sim" type="button" aria-pressed="false">{'미지원 흉내'}</button>
        </div>
        <p className={cx("ez__done")} data-role="done" role="status" aria-live="polite"></p>
    </div>
  );
}
