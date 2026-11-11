// HeroBrandLandingIntroSequence - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./HeroBrandLandingIntroSequence.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function HeroBrandLandingIntroSequence() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const root: HTMLElement = rootEl;
    type RGB = [number, number, number];
    type RGBA = [number, number, number, number];
    // 무대 좌표 — 캔버스 안 계산은 늘 480×300. 화면에 보이는 크기와 상관없다
    const W = 480;
    const H = 300;
    const PI = Math.PI;
    const TAU = Math.PI * 2;
    function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
    function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
    function ease(x: number): number { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); }
    // 가속 뒤 감속 — 앞 절반은 4p³, 뒤 절반은 대칭
    function easeInOut(x: number): number { const p = clamp(x, 0, 1); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
    // 시드 고정 난수 — 선형 합동 생성기(곱 1664525, 더함 1013904223). 같은 시드면 같은 수열
    function seeded(seed: number): () => number {
        let s = (seed >>> 0) || 1;
        return function (): number {
            s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
            return s / 4294967296;
        };
    }
    // 파스텔 팔레트 — 글자는 늘 INK, 면은 연한 색. 읽음은 민트, 어긋남은 분홍, 로고는 라벤더
    const BG_TOP: RGB = [250, 246, 252];
    const BG_BOT: RGB = [228, 234, 250];
    const FACE: RGB = [255, 253, 248];
    const FACE_EDGE: RGB = [206, 198, 226];
    const SKY: RGB = [176, 210, 246];
    const SKY_DEEP: RGB = [74, 120, 176];
    const GOLD: RGB = [250, 226, 150];
    const GOLD_DEEP: RGB = [196, 150, 52];
    const ROSE: RGB = [240, 150, 176];
    const ROSE_DEEP: RGB = [190, 52, 86];
    const MINT: RGB = [150, 214, 190];
    const MINT_DEEP: RGB = [22, 112, 82];
    const LAV: RGB = [188, 172, 236];
    const LAV_DEEP: RGB = [104, 82, 176];
    const INK: RGB = [40, 36, 54];
    const PAPER: RGB = [250, 246, 240];
    const PEACH: RGB = [250, 204, 170];
    const PEACH_DEEP: RGB = [176, 92, 40];
    function mix(a: RGB, b: RGB, k: number): RGB { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
    function rgba(c: RGB, a: number): string {
        return 'rgba(' + Math.round(clamp(c[0], 0, 255)) + ',' + Math.round(clamp(c[1], 0, 255)) + ',' + Math.round(clamp(c[2], 0, 255)) + ',' + clamp(a, 0, 1).toFixed(3) + ')';
    }

    // 장면 시계(초)·판 반복 번호·시간표 — 시간표는 (시각, 할 일) 목록이고 시각이 지나면 한 번씩 부른다
    // sceneT 는 rAF 타임스탬프 차이(dt, 한 프레임 0.05초 상한)를 쌓은 값 하나뿐이다 — 이 장면의 시간 원천은 이것 하나
    let sceneT = 0;
    let lap = 0;
    type Ev = { t: number; f: () => void };
    let script: Ev[] = [];
    let evAt = 0;

    // ── 가상 리소스 로딩 모델 ──────────────────────────────────
    // 진짜 네트워크를 부르지 않는다. 시드로 리소스 n 개의 크기(KB)와 도착 구간(시작·끝 시각)을 정하고,
    // 화면의 진행값(읽어 온 비율)은 전부 이 표에서만 나온다 — 연출은 이 값을 받아 계산한다
    type Res = { kb: number; t0: number; t1: number };
    let res: Res[] = [];
    let totalKb = 1;
    let doneT = 0;
    // 로딩은 시각 start 에 시작해 spanS 초 안에 끝난다. 큰 리소스일수록 오래 걸린다
    function makeLoad(seed: number, n: number, start: number, spanS: number): void {
        const rnd = seeded(seed);
        const raw: Res[] = [];
        let sum = 0;
        let mx = 0;
        for (let i = 0; i < n; i += 1) {
            const kb = Math.round(24 + rnd() * 276);
            const a = rnd() * 0.5;
            const b = a + 0.12 + (kb / 300) * 0.38;
            raw.push({ kb: kb, t0: a, t1: b });
            sum += kb;
            mx = Math.max(mx, b);
        }
        res = raw.map(function (r: Res): Res { return { kb: r.kb, t0: start + (r.t0 / mx) * spanS, t1: start + (r.t1 / mx) * spanS }; });
        totalKb = sum;
        doneT = start + spanS;
    }
    // 리소스 하나가 시각 t 에 얼마나 읽혔는지 0 에서 1
    function resFrac(r: Res, t: number): number { return clamp((t - r.t0) / (r.t1 - r.t0), 0, 1); }
    // 읽어 온 KB — 리소스마다 읽힌 비율 × 크기의 합
    function loadedKb(t: number): number {
        let s = 0;
        for (let i = 0; i < res.length; i += 1) { s += res[i].kb * resFrac(res[i], t); }
        return s;
    }
    // 읽어 온 비율 0 에서 1 — 연출은 이 값만 받는다
    function loadFrac(t: number): number { return loadedKb(t) / totalKb; }
    // 리소스가 통째로 도착했을 때만 세는 KB — 덩어리째 올라가는 진행률(03 의 목표값)
    function arrivedKb(t: number): number {
        let s = 0;
        for (let i = 0; i < res.length; i += 1) { if (t >= res[i].t1) { s += res[i].kb; } }
        return s;
    }
    // 읽어 온 비율이 f 에 처음 닿는 시각 — 단조 증가라 이분 탐색
    function timeAtFrac(f: number): number {
        let lo = 0;
        let hi = doneT;
        for (let i = 0; i < 40; i += 1) {
            const mid = (lo + hi) / 2;
            if (loadFrac(mid) < f) { lo = mid; } else { hi = mid; }
        }
        return hi;
    }
    // 감쇠 스프링의 계단 응답 — 0 에서 시작해 1 로 가며 한 번 넘쳤다가 선다. k 는 강성, c 는 감쇠
    function springStep(q: number, k: number, c: number): number {
        if (q <= 0) { return 0; }
        const w = Math.sqrt(k);
        const z = c / (2 * w);
        const wd = w * Math.sqrt(Math.max(1e-6, 1 - z * z));
        return 1 - Math.exp(-z * w * q) * (Math.cos(wd * q) + ((z * w) / wd) * Math.sin(wd * q));
    }
    const canvasEl = root.querySelector('[data-role="canvas"]') as HTMLCanvasElement | null;
    const padEl = root.querySelector('[data-role="pad"]') as HTMLElement | null;
    const pauseEl = root.querySelector('[data-role="pause"]') as HTMLButtonElement | null;
    const statusEl = root.querySelector('[data-role="status"]') as HTMLElement | null;
    const stepEl = root.querySelector('[data-role="step"]') as HTMLButtonElement | null;
    const doneEl = root.querySelector('[data-role="done"]') as HTMLElement | null;
    const progEl = root.querySelector('[data-role="progress"]') as HTMLElement | null;
    const ctxRaw = canvasEl ? canvasEl.getContext('2d') : null;
    if (!canvasEl || !ctxRaw || !pauseEl || !padEl || !stepEl || !doneEl) { return; }
    const cv: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctxRaw;
    const pauseBtn: HTMLButtonElement = pauseEl;
    const stepBtn: HTMLButtonElement = stepEl;
    const doneP: HTMLElement = doneEl;
    const pad: HTMLElement = padEl;
    // 외부 웹폰트는 부르지 않는다 — 기기에 있는 글꼴 목록만
    const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", "Noto Sans KR", sans-serif';
    let dpr = 1;
    function fitCanvas(): void {
        // 배율은 2 에서 자른다 — 배율 3 기기에서 화소가 2.25배로 늘지 않게
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const VIEW_S = 0.88;
    function skyFill(top: RGB, bot: RGB): void {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, rgba(top, 1));
        g.addColorStop(1, rgba(bot, 1));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        // 위쪽 일시정지·상태 알약이 덮는 띠를 비우려고 장면 전체를 VIEW_S 배로 줄여 아래 가운데에 붙인다 — 이 줄 뒤에 그리는 것은 모두 줄어든 좌표계
        ctx.translate(W / 2, H - 3);
        ctx.scale(VIEW_S, VIEW_S);
        ctx.translate(-W / 2, -(H - 3));
    }
    function disc(x: number, y: number, r: number, c: RGB, a: number): void {
        if (r <= 0.2 || a <= 0) { return; }
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fillStyle = rgba(c, a);
        ctx.fill();
    }
    function ring(x: number, y: number, r: number, width: number, c: RGB, a: number): void {
        if (r <= 0.2 || a <= 0) { return; }
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.lineWidth = width;
        ctx.strokeStyle = rgba(c, a);
        ctx.stroke();
    }
    function oval(x: number, y: number, rx: number, ry: number, c: RGB, a: number): void {
        if (rx <= 0.2 || ry <= 0.1 || a <= 0) { return; }
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
        ctx.fillStyle = rgba(c, a);
        ctx.fill();
    }
    function seg(x1: number, y1: number, x2: number, y2: number, width: number, c: RGB, a: number): void {
        if (a <= 0) { return; }
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.strokeStyle = rgba(c, a);
        ctx.stroke();
    }
    function box(x: number, y: number, w: number, h: number, r: number, c: RGB, a: number): void {
        if (w <= 0.2 || h <= 0.2 || a <= 0) { return; }
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
        ctx.fillStyle = rgba(c, a);
        ctx.fill();
    }
    function outline(x: number, y: number, w: number, h: number, r: number, width: number, c: RGB, a: number): void {
        if (w <= 0.2 || h <= 0.2 || a <= 0) { return; }
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
        ctx.lineWidth = width;
        ctx.strokeStyle = rgba(c, a);
        ctx.stroke();
    }
    function text(s: string, x: number, y: number, c: RGB, a: number, px: number, weight: number, align: CanvasTextAlign): void {
        ctx.font = weight + ' ' + px + 'px ' + FONT_STACK;
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = rgba(c, a);
        ctx.fillText(s, x, y);
    }
    // 글자 이름표 — 바탕 알약 위에 글자
    function tag(s: string, x: number, y: number, bg: RGB, fg: RGB, px: number, align: CanvasTextAlign): void {
        ctx.font = '700 ' + px + 'px ' + FONT_STACK;
        const w = ctx.measureText(s).width + px * 1.1;
        const left = align === 'center' ? x - w / 2 : (align === 'right' ? x - w : x);
        box(left, y - px * 0.82, w, px * 1.64, px * 0.82, bg, 0.92);
        text(s, left + w / 2, y + 0.5, fg, 1, px, 700, 'center');
    }
    // ── 공통 틀 ───────────────────────────────────────────────
    let shownStatus = '';
    function pushStatus(s: string): void {
        if (!statusEl || s === shownStatus) { return; }
        shownStatus = s;
        statusEl.textContent = s;
    }
    let paused = false;
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    // 페이지를 연 채 움직임 줄이기 설정을 바꿔도 change 리스너가 다시 읽는다
    let still = reduceQuery.matches;
    // 자동 시연 표시 — 사람이 처음 손대면 떼고 상태 줄을 polite 로 켠다
    let demo = root.classList.contains('is-demo');
    const off = new AbortController();
    function wake(): void {
        if (!demo) { return; }
        demo = false;
        root.classList.remove('is-demo');
        if (statusEl) { statusEl.setAttribute('aria-live', 'polite'); }
    }
    // 한 판 시연이 끝났음을 스크린리더에 한 번만 알린다 — 판이 되풀이돼도 다시 읽지 않는다
    let doneSaid = false;
    function checkDone(): void {
        if (!doneSaid && sceneT >= RESULT_S) {
            doneSaid = true;
            doneP.textContent = statusText();
        }
    }
    function advance(dt: number): void {
        sceneT += dt;
        while (evAt < script.length && script[evAt].t <= sceneT) {
            const ev = script[evAt];
            evAt += 1;
            ev.f();
        }
        if (sceneT >= LAP_S) { lap += 1; begin(); return; }
        update(dt);
    }
    // 첫 판은 START_S 만큼 앞서 시작한다 — 연출이 이미 진행 중인 장면에서 처음 보인다
    function runTo(t: number): void {
        while (sceneT < t - 1e-6) { advance(Math.min(1 / 30, t - sceneT)); }
    }
    function begin(): void {
        sceneT = 0;
        evAt = 0;
        script = [];
        build();
        if (lap === 0 && !still) { runTo(START_S); }
    }
    const DT_MAX = 0.05;
    // 진행 막대(role=progressbar) — 값이 바뀔 때만 aria-valuenow 를 쓴다. 값은 장면의 progressNow() 가 0 에서 100 으로
    let shownProg = -1;
    function pushProgress(): void {
        if (!progEl) { return; }
        const v = Math.round(clamp(progressNow(), 0, 100));
        if (v === shownProg) { return; }
        shownProg = v;
        progEl.setAttribute('aria-valuenow', String(v));
    }
    function showNow(): void {
        draw();
        pushStatus(statusText());
        pushProgress();
        checkDone();
    }
    let rafId = 0;
    let lastTs = -1;
    function frame(ts: number): void {
        if (still || paused) { rafId = 0; return; }
        if (lastTs < 0) { lastTs = ts; }
        const dt = Math.min((ts - lastTs) / 1000, DT_MAX);
        lastTs = ts;
        if (dt > 0) { advance(dt); }
        showNow();
        rafId = window.requestAnimationFrame(frame);
    }
    function startLoop(): void {
        if (rafId) { return; }
        // 멈췄던 사이의 시간을 첫 프레임 dt 로 넘기지 않는다
        lastTs = -1;
        rafId = window.requestAnimationFrame(frame);
    }
    function stopLoop(): void {
        if (rafId) { window.cancelAnimationFrame(rafId); rafId = 0; }
    }
    // 움직임 줄이기 — 루프 없이 한 판의 멈춘 한 장. 시간표의 REST_S 초 장면에서 멈춘다
    function showRest(): void {
        stopLoop();
        sceneT = 0;
        evAt = 0;
        script = [];
        build();
        runTo(REST_S);
        doneSaid = false;
        showNow();
    }
    function play(): void {
        begin();
        showNow();
        if (!paused) { startLoop(); }
    }
    function togglePause(): void {
        paused = !paused;
        pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
        wake();
        if (paused) { stopLoop(); } else if (!still) { startLoop(); }
    }
    // 다시 — 시간표를 처음부터 다시. 움직임 줄이기에서는 멈춘 한 장
    function restart(): void {
        lap += 1;
        doneSaid = false;
        if (still) { showRest(); return; }
        begin();
        showNow();
        if (!paused) { startLoop(); }
    }
    // 한 걸음 — 멈춘 채 시간표의 다음 일 하나까지 시계를 보낸다. 더 부를 일이 없으면 판을 다시 연다
    function stepOnce(): void {
        wake();
        if (!paused) {
            paused = true;
            pauseBtn.setAttribute('aria-pressed', 'true');
            stopLoop();
        }
        if (evAt >= script.length) {
            restart();
            return;
        }
        runTo(script[evAt].t + 0.05);
        showNow();
    }
    pauseBtn.addEventListener('click', togglePause, { signal: off.signal });
    stepBtn.addEventListener('click', stepOnce, { signal: off.signal });
    // 키보드 — 무대에 포커스가 있을 때만. Enter·Space·R 은 처음부터 다시, P 는 일시정지, N 은 한 걸음
    pad.addEventListener('keydown', function (e: KeyboardEvent): void {
        if (e.altKey || e.ctrlKey || e.metaKey) { return; }
        const k = e.key;
        if (k === 'Enter' || k === ' ') {
            e.preventDefault();
            wake();
            restart();
        } else if (k === 'p' || k === 'P') {
            togglePause();
        } else if (k === 'n' || k === 'N') {
            stepOnce();
        } else if (k === 'r' || k === 'R') {
            wake();
            restart();
        }
    }, { signal: off.signal });
    // 마우스·터치 — 무대를 누르면 처음부터 다시
    pad.addEventListener('click', function (): void {
        wake();
        restart();
    }, { signal: off.signal });
    // 탭이 숨으면 멈추고, 돌아오면 시계를 다시 맞춰 시작 — 숨은 동안의 몇 초가 한 프레임에 몰리지 않게
    document.addEventListener('visibilitychange', function (): void {
        if (document.hidden) { stopLoop(); } else if (!paused && !still) { startLoop(); }
    }, { signal: off.signal });
    // 설정이 바뀌면 — 켜지면 결과 한 장, 꺼지면 다시 움직인다
    reduceQuery.addEventListener('change', function (): void {
        still = reduceQuery.matches;
        if (still) { showRest(); } else { lap = 0; play(); }
    }, { signal: off.signal });
    window.addEventListener('resize', function (): void {
        fitCanvas();
        showNow();
    }, { signal: off.signal });
    // ── 스플래시 장면 도구 ────────────────────────────────────
    // 패널 — 비교판 한 칸의 바탕
    function panel(x: number, y: number, w: number, h: number, c: RGB, a: number): void {
        box(x, y, w, h, 10, c, a);
    }
    // 진행 막대 — 트랙 위에 f(0 에서 1) 만큼 채운다
    function bar(x: number, y: number, w: number, h: number, f: number, c: RGB, bg: RGB): void {
        box(x, y, w, h, h / 2, bg, 0.9);
        if (f > 0.001) { box(x, y, Math.max(h, w * clamp(f, 0, 1)), h, h / 2, c, 1); }
    }
    function pctText(f: number): string { return String(Math.round(clamp(f, 0, 1) * 100)); }
    // 자체 로고 — 둥근 타일에 큰 구멍과 작은 구멍 하나씩. 실제 브랜드와 무관한 도형
    function logoPath(cx: number, cy: number, s: number): void {
        ctx.beginPath();
        ctx.roundRect(cx - s / 2, cy - s / 2, s, s, s * 0.3);
        const ex = cx - s * 0.08;
        const ey = cy + s * 0.06;
        ctx.moveTo(ex + s * 0.2, ey);
        ctx.arc(ex, ey, s * 0.2, 0, TAU);
        const dx = cx + s * 0.2;
        const dy = cy - s * 0.22;
        ctx.moveTo(dx + s * 0.09, dy);
        ctx.arc(dx, dy, s * 0.09, 0, TAU);
    }
    function drawLogo(cx: number, cy: number, s: number, c: RGB, a: number): void {
        if (s <= 1 || a <= 0) { return; }
        logoPath(cx, cy, s);
        ctx.fillStyle = rgba(c, a);
        ctx.fill('evenodd');
    }
    // 로고 마스크 와이프 — 왼쪽에서 오른쪽으로 f(0 에서 1) 만큼 채운다. 가장자리 EDGE 폭은 조각으로 나눠 흐리게
    const EDGE_STRIPS = 6;
    function maskW(s: number, soft: number, f: number): number { return clamp(f, 0, 1) * (s + soft); }
    function logoWipe(cx: number, cy: number, s: number, f: number, soft: number, c: RGB, a: number): void {
        const left = cx - s / 2;
        const x = left + maskW(s, soft, f);
        drawLogo(cx, cy, s, c, 0.22 * a);
        const solidW = x - soft - left;
        if (solidW > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(left - 1, cy - s / 2 - 1, solidW + 1, s + 2);
            ctx.clip();
            drawLogo(cx, cy, s, c, a);
            ctx.restore();
        }
        for (let k = 0; k < EDGE_STRIPS; k += 1) {
            const sw = soft / EDGE_STRIPS;
            const sx = (x - soft) + k * sw;
            if (sx + sw <= left || sx >= x) { continue; }
            ctx.save();
            ctx.beginPath();
            ctx.rect(Math.max(sx, left - 1), cy - s / 2 - 1, sw + 0.5, s + 2);
            ctx.clip();
            drawLogo(cx, cy, s, c, a * (1 - (k + 0.5) / EDGE_STRIPS));
            ctx.restore();
        }
    }
    // 본문 화면 한 장 — 머리띠·히어로·카드 셋. 해골 판과 같은 사각형을 쓴다
    const PAGE_COLORS: RGB[] = [FACE, SKY, MINT, GOLD, ROSE];
    function pageRects(x: number, y: number, w: number, h: number): number[][] {
        const g = 6;
        const hh = h * 0.16;
        const heroH = h * 0.38;
        const cw = (w - g * 4) / 3;
        const cy = y + hh + g + heroH + g;
        const ch = y + h - cy - g;
        return [
            [x, y, w, hh, 6, 0],
            [x + g, y + hh + g, w - 2 * g, heroH, 8, 1],
            [x + g, cy, cw, ch, 6, 2],
            [x + g * 2 + cw, cy, cw, ch, 6, 3],
            [x + g * 3 + 2 * cw, cy, cw, ch, 6, 4]
        ];
    }
    function drawPage(x: number, y: number, w: number, h: number, a: number): void {
        if (a <= 0) { return; }
        const rs = pageRects(x, y, w, h);
        for (let i = 0; i < rs.length; i += 1) {
            const r = rs[i];
            box(r[0], r[1], r[2], r[3], r[4], i === 0 ? FACE : mix(PAGE_COLORS[r[5]], PAPER, 0.15), a);
        }
        // 머리띠의 메뉴 점 셋과 히어로의 줄 둘
        for (let i = 0; i < 3; i += 1) { disc(x + w - 14 - i * 14, y + h * 0.08, 3, LAV, a); }
        box(x + 16, y + h * 0.16 + 6 + h * 0.38 * 0.3, w * 0.4, 7, 3.5, INK, 0.7 * a);
        box(x + 16, y + h * 0.16 + 6 + h * 0.38 * 0.3 + 14, w * 0.28, 6, 3, INK, 0.4 * a);
    }
    // 해골 판 — 같은 자리를 연한 회색으로 채우고 빛 띠가 t 에 따라 훑고 지나간다
    function drawSkeleton(x: number, y: number, w: number, h: number, a: number, t: number): void {
        if (a <= 0) { return; }
        const rs = pageRects(x, y, w, h);
        const base: RGB = mix(PAPER, LAV, 0.28);
        const bx = x + (((t * 0.9) % 1.6) - 0.3) * w;
        for (let i = 0; i < rs.length; i += 1) {
            const r = rs[i];
            box(r[0], r[1], r[2], r[3], r[4], base, 0.95 * a);
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(r[0], r[1], r[2], r[3], r[4]);
            ctx.clip();
            const g = ctx.createLinearGradient(bx, 0, bx + 44, 0);
            g.addColorStop(0, rgba(FACE, 0));
            g.addColorStop(0.5, rgba(FACE, 0.8 * a));
            g.addColorStop(1, rgba(FACE, 0));
            ctx.fillStyle = g;
            ctx.fillRect(r[0], r[1], r[2], r[3]);
            ctx.restore();
        }
    }
    // 이징 곡선 상자 — 가로가 진행 p, 세로가 fn(p). 지금 p 의 값을 점으로 찍는다
    function curve(x: number, y: number, w: number, h: number, fn: (p: number) => number, p: number, c: RGB): void {
        box(x, y, w, h, 4, FACE, 0.8);
        ctx.beginPath();
        for (let i = 0; i <= 24; i += 1) {
            const px = x + 3 + ((w - 6) * i) / 24;
            const py = y + h - 3 - (h - 6) * fn(i / 24);
            if (i === 0) { ctx.moveTo(px, py); } else { ctx.lineTo(px, py); }
        }
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = rgba(c, 0.9);
        ctx.stroke();
        disc(x + 3 + (w - 6) * clamp(p, 0, 1), y + h - 3 - (h - 6) * fn(clamp(p, 0, 1)), 3.4, INK, 1);
    }
    // ── 09 브랜드 랜딩 인트로 — 로딩에 묶인 로고, 블라인드가 걷히고, 글줄이 솟고, 버튼이 튀고, 구슬이 돈다 ────
    // 모든 값은 읽어 온 비율과 장면 시계 하나에서. 블라인드는 로딩이 끝난 뒤 줄마다 BLIND_STAGGER 늦게 걷힌다
    const SEED = 5091;
    const LOAD_START = 0.3;
    const LOAD_SPAN = 2.5;
    const BLIND_N = 6;
    const BLIND_STAGGER = 0.07;
    const BLIND_S = 0.5;
    const SPRING_K = 240;
    const DAMPING_C = 14;
    const PX = 10;
    const PY = 44;
    const PW = 460;
    const PH = 244;
    const LAP_S = 9.0;
    const START_S = 3.6;
    const REST_S = 6.8;
    const RESULT_S = 6.8;
    const ORBS = [[0.0, 74, 30, 14, 0.7, 0], [1.1, 52, 22, 9, -0.9, 1], [2.2, 92, 40, 11, 0.5, 2], [3.3, 38, 16, 7, 1.2, 3], [4.4, 66, 28, 12, -0.6, 4], [5.5, 100, 34, 8, 0.8, 5]];
    const ORB_COLORS: RGB[] = [MINT, SKY, GOLD, ROSE, LAV, PEACH];
    function build(): void { makeLoad(SEED + (lap % 3), 8, LOAD_START, LOAD_SPAN); }
    function update(dt: number): void { if (dt < 0) { return; } }
    function blindStart(i: number): number { return doneT + 0.25 + i * BLIND_STAGGER; }
    // 블라인드 i 의 열림 — 줄의 높이가 이 값만큼 줄어든다
    function BLIND_OPEN(i: number, t: number): number { return ease((t - blindStart(i)) / BLIND_S); }
    function heroT(): number { return blindStart(BLIND_N - 1) + 0.15; }
    function draw(): void {
        skyFill(BG_TOP, BG_BOT);
        const t = sceneT;
        const lf = loadFrac(t);
        const cx = PX + PW / 2;
        const ht = t - heroT();
        panel(PX, PY, PW, PH, [255, 255, 255], 0.5);
        // 뒤: 히어로 — 글줄 둘이 clip 으로 솟고, 단추는 스프링으로 튀고, 구슬이 타원 궤도로 돈다
        ctx.save();
        ctx.beginPath();
        ctx.rect(PX, PY, PW, PH);
        ctx.clip();
        box(PX, PY, PW, PH, 0, mix(SKY, FACE, 0.78), 1);
        box(PX + 14, PY + 12, 76, 14, 7, FACE, 0.9);
        drawLogo(PX + 30, PY + 19, 16, LAV_DEEP, 1);
        for (let i = 0; i < 3; i += 1) { box(PX + PW - 120 + i * 36, PY + 15, 28, 8, 4, FACE, 0.9); }
        for (let k = 0; k < 2; k += 1) {
            const r = ease((ht - 0.08 * k) / 0.45);
            ctx.save();
            ctx.beginPath();
            ctx.rect(PX + 28, PY + 70 + k * 40, 220, 34);
            ctx.clip();
            text(k === 0 ? '여는 화면이' : '곧 본문이 된다', PX + 28, PY + 88 + k * 40 + (1 - r) * 34, INK, 1, 26, 800, 'left');
            ctx.restore();
        }
        const bs = springStep(ht - 0.35, SPRING_K, DAMPING_C);
        const bw = 116 * bs;
        box(PX + 28 + 58 - bw / 2, PY + 168 - 17 * bs, bw, 34 * bs, 17 * bs, LAV_DEEP, clamp(bs * 2, 0, 1));
        text('시작하기', PX + 28 + 58, PY + 168, FACE, clamp(bs * 2, 0, 1), 14, 700, 'center');
        const ocx = PX + 340;
        const ocy = PY + 130;
        disc(ocx, ocy, 70, FACE, 0.5 * ease(ht / 0.6));
        for (let i = 0; i < ORBS.length; i += 1) {
            const o = ORBS[i];
            const a = o[0] + t * o[4];
            const k = ease((ht - 0.05 * i) / 0.5);
            disc(ocx + Math.cos(a) * o[1], ocy + Math.sin(a) * o[2], o[3] * (0.4 + 0.6 * k), ORB_COLORS[o[5]], 0.95 * k);
        }
        drawLogo(ocx, ocy, 64 * (0.6 + 0.4 * ease(ht / 0.6)), LAV_DEEP, ease(ht / 0.5));
        ctx.restore();
        // 앞: 블라인드 여섯 줄 — 줄마다 높이가 줄어 위쪽부터 걷힌다. 로고는 맨 앞
        const bh = PH / BLIND_N;
        for (let i = 0; i < BLIND_N; i += 1) {
            const o = BLIND_OPEN(i, t);
            if (o >= 1) { continue; }
            box(PX, PY + i * bh, PW, Math.max(0, bh * (1 - o)) + 0.8, 0, mix(i % 2 === 0 ? LAV : SKY, FACE, 0.5), 1);
        }
        const lo = 1 - ease((t - doneT - 0.2) / 0.4);
        if (lo > 0) {
            logoWipe(cx, PY + PH / 2 - 14, 68, lf, 14, LAV_DEEP, lo);
            bar(cx - 70, PY + PH / 2 + 38, 140, 6, lf, LAV_DEEP, FACE_EDGE);
            text('읽어 온 {p} %'.replace('{p}', pctText(lf)), cx, PY + PH / 2 + 58, INK, lo, 12, 700, 'center');
        }
    }
    function statusText(): string {
        const open = BLIND_OPEN(BLIND_N - 1, sceneT);
        return '읽어 온 {p} % · 블라인드 {o} %'.replace('{p}', pctText(loadFrac(sceneT))).replace('{o}', pctText(open));
    }
    function progressNow(): number { return loadFrac(sceneT) * 100; }
    fitCanvas();
    if (still) { showRest(); } else { play(); }
    return function (): void {
        stopLoop();
        off.abort();
    };
  }, []);

  return (
    <div className={cx("vj") + " is-demo"} ref={rootRef}>
        <div className={cx("vj__pad")} data-role="pad" tabIndex={0} role="application" aria-label={'스플래시 시연 무대 — Enter 나 Space 나 R 이나 클릭으로 처음부터, P 로 일시정지, N 으로 한 걸음'}>
          <canvas className={cx("vj__canvas")} data-role="canvas" width={480} height={300} role="img" aria-label={'브랜드 랜딩 인트로 한 장면. 블라인드 여섯 줄 위에서 로고가 읽어 온 비율만큼 채워지고, 로딩이 끝나면 블라인드가 위쪽부터 차례로 걷히며 뒤의 히어로가 드러난다. 두 줄 제목이 아래에서 솟고 단추가 스프링으로 튀며 구슬 여섯 개와 로고가 오른쪽에서 궤도로 돈다'}></canvas>
        </div>
        <p className={cx("vj__status")} data-role="status" aria-live="off">{'스플래시 시연'}</p>
        <div className={cx("vj__ctrl")}>
          <button className={cx("vj__pause")} data-role="pause" type="button" aria-pressed="false">{'일시정지'}</button>
          <button className={cx("vj__step")} data-role="step" type="button">{'한 걸음'}</button>
        </div>
        <p className={cx("vj__done")} data-role="done" role="status" aria-live="polite"></p>
        <div className={cx("vj__prog")} data-role="progress" role="progressbar" aria-label={'스플래시 진행'} aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></div>
    </div>
  );
}
