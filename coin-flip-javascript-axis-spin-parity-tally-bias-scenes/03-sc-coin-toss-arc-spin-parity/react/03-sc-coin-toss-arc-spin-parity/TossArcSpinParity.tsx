// TossArcSpinParity - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./TossArcSpinParity.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function TossArcSpinParity() {
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
    // 시드 고정 난수 — 선형 합동 생성기(곱 1664525, 더함 1013904223). 같은 시드면 같은 수열
    function seeded(seed: number): () => number {
        let s = (seed >>> 0) || 1;
        return function (): number {
            s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
            return s / 4294967296;
        };
    }
    // 파스텔 팔레트 — 앞면은 금빛, 뒷면은 하늘빛, 치우침·경고는 분홍
    const BG_TOP: RGB = [250, 246, 252];
    const BG_BOT: RGB = [228, 234, 250];
    const TABLE_TOP: RGB = [240, 226, 238];
    const TABLE_BOT: RGB = [222, 208, 236];
    const GOLD: RGB = [250, 226, 150];
    const GOLD_DEEP: RGB = [196, 150, 52];
    const SKY: RGB = [176, 210, 246];
    const SKY_DEEP: RGB = [74, 120, 176];
    const RIM_LO: RGB = [184, 156, 100];
    const RIM_HI: RGB = [255, 248, 222];
    const ROSE: RGB = [240, 150, 176];
    const ROSE_DEEP: RGB = [190, 52, 86];
    const MINT: RGB = [150, 214, 190];
    const MINT_DEEP: RGB = [22, 112, 82];
    const LAV: RGB = [188, 172, 236];
    const INK: RGB = [40, 36, 54];
    const PAPER: RGB = [250, 246, 240];
    function mix(a: RGB, b: RGB, k: number): RGB { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
    function rgba(c: RGB, a: number): string {
        return 'rgba(' + Math.round(clamp(c[0], 0, 255)) + ',' + Math.round(clamp(c[1], 0, 255)) + ',' + Math.round(clamp(c[2], 0, 255)) + ',' + clamp(a, 0, 1).toFixed(3) + ')';
    }

    // 장면 시계(초)·판 반복 번호·시간표 — 시간표는 (시각, 할 일) 목록이고 시각이 지나면 한 번씩 부른다
    let sceneT = 0;
    let lap = 0;
    type Ev = { t: number; f: () => void };
    let script: Ev[] = [];
    let evAt = 0;

    // ── 던지기 물리 ───────────────────────────────────────────
    // 한 번의 던지기: 출발 (x0, y0) → 도착 (x1, y1), 체공 T 초, 꼭대기 peak 픽셀, 초당 반 바퀴 수 hr, 시작 반 바퀴 수 h0.
    // 위치는 포물선(중력만), 각도는 반 바퀴 수 × π — 체공 중 회전 속도는 일정하다
    type Toss = { t0: number; T: number; x0: number; y0: number; x1: number; y1: number; peak: number; hr: number; h0: number };
    function tossHalf(k: Toss, t: number): number { return k.h0 + k.hr * clamp(t - k.t0, 0, k.T); }
    function landHalf(k: Toss): number { return k.h0 + k.hr * k.T; }
    function tossXY(k: Toss, t: number): [number, number] {
        const u = clamp((t - k.t0) / k.T, 0, 1);
        return [lerp(k.x0, k.x1, u), lerp(k.y0, k.y1, u) - 4 * k.peak * u * (1 - u)];
    }
    // 착지한 뒤 — 가장 가까운 평평한 각(반 바퀴 수 반올림)으로 감쇠 진동하며 눕는다
    function halfAt(k: Toss, t: number): number {
        const q = t - (k.t0 + k.T);
        if (q <= 0) { return tossHalf(k, t); }
        const hl = landHalf(k);
        const hf = Math.round(hl);
        return hf + (hl - hf) * Math.exp(-9 * q) * Math.cos(26 * q);
    }
    function hopLift(k: Toss, t: number): number {
        const q = t - (k.t0 + k.T);
        return q <= 0 ? 0 : 12 * Math.exp(-7 * q) * Math.abs(Math.sin(15 * q));
    }
    // 위로 온 면 — 반 바퀴 수를 반올림해 짝수면 던지기 전 면(0), 홀수면 반대 면(1)
    function upFace(h: number): number { return Math.abs(Math.round(h)) % 2; }
    // 원하는 면이 나오도록 반 바퀴 수를 고른다 — 짝수 + 면 번호, 소수 부분은 ±0.2 안에서 흔든다
    function halfFor(face: number, rng: () => number, minPairs: number): number {
        return 2 * (minPairs + Math.floor(rng() * 3)) + face + (rng() - 0.5) * 0.4;
    }
    // 같은 수열에서 앞면(0)과 뒷면(1) — 값이 p 보다 작으면 앞면
    function outcomes(seed: number, n: number, p: number): number[] {
        const rng = seeded(seed);
        const out: number[] = [];
        for (let i = 0; i < n; i += 1) { out.push(rng() < p ? 0 : 1); }
        return out;
    }
    // 가장 긴 연속 길이
    function longestRun(seq: number[]): number {
        let best = 0;
        let cur = 0;
        for (let i = 0; i < seq.length; i += 1) {
            cur = (i > 0 && seq[i] === seq[i - 1]) ? cur + 1 : 1;
            if (cur > best) { best = cur; }
        }
        return best;
    }
    const canvasEl = root.querySelector('[data-role="canvas"]') as HTMLCanvasElement | null;
    const padEl = root.querySelector('[data-role="pad"]') as HTMLElement | null;
    const pauseEl = root.querySelector('[data-role="pause"]') as HTMLButtonElement | null;
    const statusEl = root.querySelector('[data-role="status"]') as HTMLElement | null;
    const stepEl = root.querySelector('[data-role="step"]') as HTMLButtonElement | null;
    const doneEl = root.querySelector('[data-role="done"]') as HTMLElement | null;
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
    function skyFill(top: RGB, bot: RGB): void {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, rgba(top, 1));
        g.addColorStop(1, rgba(bot, 1));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
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
    // 탁자 — 위쪽 가장자리 높이 y 부터 아래까지
    function tableBack(y: number): void {
        const g = ctx.createLinearGradient(0, y, 0, H);
        g.addColorStop(0, rgba(TABLE_TOP, 1));
        g.addColorStop(1, rgba(TABLE_BOT, 1));
        ctx.fillStyle = g;
        ctx.fillRect(0, y, W, H - y);
        seg(0, y + 0.5, W, y + 0.5, 1.5, [255, 255, 255], 0.7);
    }

    // ── 동전 그리기 ───────────────────────────────────────────
    // 동전은 원판이다. 가로축으로 th 만큼 돌면 위쪽 원판은 세로 반지름이 R·|cos th| 인 타원으로 보이고,
    // cos th 의 부호가 음수가 되는 순간 보이는 면이 바뀐다(앞/뒤 판정은 법선의 부호 하나).
    // 옆면은 둘레를 RIM_N 조각으로 나눠, 조각 법선과 빛 방향(lx, ly, lz)의 내적으로 밝기를 정한다
    const RIM_N = 40;
    function faceArt(face: number, R: number, a: number): void {
        const base = face === 0 ? GOLD : SKY;
        const deep = face === 0 ? GOLD_DEEP : SKY_DEEP;
        disc(0, 0, R, base, a);
        ring(0, 0, R * 0.84, R * 0.07, deep, a);
        for (let k = 0; k < 14; k += 1) {
            disc(Math.cos(k * TAU / 14) * R * 0.93, Math.sin(k * TAU / 14) * R * 0.93, R * 0.03, deep, a * 0.8);
        }
        if (face === 0) {
            // 별 — 바깥 반지름 0.5R, 안쪽 0.2R
            ctx.beginPath();
            for (let k = 0; k < 10; k += 1) {
                const rr = (k % 2 === 0 ? 0.5 : 0.21) * R;
                const an = -PI / 2 + k * PI / 5;
                if (k === 0) { ctx.moveTo(Math.cos(an) * rr, Math.sin(an) * rr); } else { ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
            }
            ctx.closePath();
            ctx.fillStyle = rgba(deep, a);
            ctx.fill();
        } else {
            // 초승달과 점 세 개
            disc(-R * 0.05, -R * 0.08, R * 0.44, deep, a);
            disc(R * 0.14, -R * 0.14, R * 0.38, base, a);
            for (let k = 0; k < 3; k += 1) { disc((k - 1) * R * 0.24, R * 0.52, R * 0.06, deep, a); }
        }
    }
    function coinShadow(cx: number, gy: number, R: number, lift: number, a: number): void {
        const k = clamp(lift / 260, 0, 0.75);
        oval(cx, gy, R * (1.02 - k * 0.5), R * (1.02 - k * 0.5) * 0.26, INK, a * 0.26 * (1 - k));
    }
    function drawCoin(cx: number, cy: number, R: number, th: number, thick: number, lx: number, ly: number, lz: number, a: number, startFace: number): void {
        const c = Math.cos(th);
        const s = Math.sin(th);
        const sg = c >= 0 ? 1 : -1;
        const ac = Math.max(Math.abs(c), 0.012);
        const half = thick / 2;
        const near = -sg * s * half;
        const far = -near;
        const nearFace = sg > 0 ? startFace : 1 - startFace;
        if (thick > 0) {
            oval(cx, cy + far, R, R * ac, RIM_LO, a);
            for (let k = 0; k < RIM_N; k += 1) {
                const p0 = k * TAU / RIM_N;
                const p1 = (k + 1) * TAU / RIM_N;
                const pm = (p0 + p1) / 2;
                if (Math.sin(pm) * s <= 0) { continue; }
                const dot = Math.cos(pm) * lx + Math.sin(pm) * c * ly + Math.sin(pm) * s * lz;
                const col = mix(RIM_LO, RIM_HI, clamp(0.5 + 0.5 * dot, 0, 1));
                const x0 = cx + R * Math.cos(p0);
                const x1 = cx + R * Math.cos(p1);
                const y0 = R * Math.sin(p0) * c;
                const y1 = R * Math.sin(p1) * c;
                ctx.beginPath();
                ctx.moveTo(x0, cy + near + y0);
                ctx.lineTo(x1, cy + near + y1);
                ctx.lineTo(x1, cy + far + y1);
                ctx.lineTo(x0, cy + far + y0);
                ctx.closePath();
                ctx.fillStyle = rgba(col, a);
                ctx.fill();
                ctx.lineWidth = 0.8;
                ctx.strokeStyle = rgba(col, a);
                ctx.stroke();
            }
        }
        ctx.save();
        ctx.translate(cx, cy + near);
        ctx.scale(1, ac);
        faceArt(nearFace, R, a);
        // 빛 쪽으로 쏠린 윤기
        disc(lx * R * 0.3, -ly * R * 0.3 - R * 0.18, R * 0.3, [255, 255, 255], 0.22 * a);
        ctx.restore();
    }
    // 서 있는 동전 — 가장자리가 위를 향해 옆에서 본 모습(너비 2R, 높이 thick)
    function drawEdge(cx: number, cy: number, R: number, thick: number, a: number): void {
        const g = ctx.createLinearGradient(0, cy - thick / 2, 0, cy + thick / 2);
        g.addColorStop(0, rgba(RIM_HI, a));
        g.addColorStop(1, rgba(RIM_LO, a));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.roundRect(cx - R, cy - thick / 2, R * 2, thick, Math.min(thick / 2, 4));
        ctx.fill();
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
    // 첫 판은 START_S 만큼 앞서 시작한다 — 동전이 이미 돌고 있는 장면에서 보인다
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
    function showNow(): void {
        draw();
        pushStatus(statusText());
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
    // 움직임 줄이기 — 루프 없이 던진 결과 한 장. 회전 없이 결과 면이 나온 장면에서 멈춘다
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
    // 던지기 — 새 수열로 처음부터 다시. 움직임 줄이기에서는 새 결과 한 장
    function restart(): void {
        lap += 1;
        doneSaid = false;
        if (still) { showRest(); return; }
        begin();
        showNow();
        if (!paused) { startLoop(); }
    }
    // 한 걸음 — 멈춘 채 시간표의 다음 일 하나까지 시계를 보낸다. 더 부를 일이 없으면 다음 던지기를 연다
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
    // 키보드 — 무대에 포커스가 있을 때만. Enter·Space 는 던지기, P 는 일시정지, N 은 한 걸음, R 은 다시
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
    // 마우스·터치 — 무대를 누르면 던진다
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
    // ── 03 체공 시간에 회전 속도를 곱해 반 바퀴 수로 면을 읽는 포물선 던지기 ─────────────
    // 반 바퀴 수 = 체공 시간(AIR_T) × 초당 회전수(SPIN_RATE) × 2. 반올림한 수가 짝수면 던지기 전 면, 홀수면 반대 면
    const AIR_T = 0.9;
    const SPIN_RATE = 7;
    // 던질 때마다 초당 회전수를 이만큼 올린다
    const SPIN_STEP = 0.6;
    const PEAK = 150;
    const TOSS_GAP = 3.4;
    const GROUND_Y = 226;
    const LAP_S = 10.4;
    const START_S = 0.0;
    const REST_S = 1.9;
    const RESULT_S = 1.8;
    let tosses: Toss[] = [];
    function spinOf(k: number): number { return SPIN_RATE + SPIN_STEP * k; }
    function build(): void {
        tosses = [];
        for (let k = 0; k < 3; k += 1) {
            const t0 = 0.2 + TOSS_GAP * k;
            tosses.push({ t0: t0, T: AIR_T, x0: 64, y0: 206, x1: 300 + 34 * k, y1: GROUND_Y, peak: PEAK, hr: 2 * spinOf(k), h0: 0 });
        }
    }
    function update(dt: number): void { if (dt < 0) { return; } }
    // 지금 보이는 던지기 — 시각이 이미 지난 마지막 것
    function curK(): number {
        let k = 0;
        for (let i = 0; i < tosses.length; i += 1) { if (sceneT >= tosses[i].t0) { k = i; } }
        return k;
    }
    function faceName(n: number): string { return n === 0 ? '앞면' : '뒷면'; }
    function halfTurns(k: number): number { return tosses[k].hr * AIR_T; }
    function drawToss(k: Toss, t: number): void {
        const p = tossXY(k, t);
        const h = halfAt(k, t);
        const lift = hopLift(k, t);
        const th = PI * h;
        const groundLift = GROUND_Y - p[1] + lift;
        // 지나온 자리 — 포물선 위 점선
        const tt = clamp(t - k.t0, 0, k.T);
        for (let i = 0; i < 18; i += 1) {
            const tq = k.t0 + (k.T * i) / 18;
            if (tq > k.t0 + tt) { break; }
            const q = tossXY(k, tq);
            disc(q[0], q[1], 2.2, LAV, 0.8);
        }
        if (t < k.t0) { return; }
        coinShadow(p[0], GROUND_Y + 12, 30, groundLift, 1);
        // 빠르게 도는 동안의 잔상 — 지난 몇 걸음의 각도에 흐린 동전
        if (t - k.t0 < k.T) {
            for (let g = 3; g >= 1; g -= 1) {
                const tg = t - g * 0.012;
                drawCoin(tossXY(k, tg)[0], tossXY(k, tg)[1], 30, PI * halfAt(k, tg), 6, 0.36, -0.46, 0.81, 0.22, 0);
            }
        }
        drawCoin(p[0], p[1] - lift, 30, th, 6, 0.36, -0.46, 0.81, 1, 0);
    }
    function draw(): void {
        skyFill(BG_TOP, BG_BOT);
        tableBack(GROUND_Y + 12);
        // 손 자리
        disc(64, 222, 16, LAV, 0.85);
        const k = curK();
        for (let i = 0; i < k; i += 1) {
            // 앞선 던지기의 착지 자리는 흐리게 남긴다
            const e = tosses[i];
            drawCoin(e.x1, e.y1, 30, PI * Math.round(landHalf(e)), 6, 0.36, -0.46, 0.81, 0.35, 0);
        }
        drawToss(tosses[k], sceneT);
        // 반 바퀴 수 판독 — 던지는 동안 숫자가 오르고, 착지하면 반올림해 면을 말한다
        const e = tosses[k];
        const live = tossHalf(e, sceneT);
        const landed = sceneT >= e.t0 + e.T;
        box(286, 66, 184, 74, 12, PAPER, 0.9);
        text('반 바퀴 수', 296, 82, INK, 1, 11, 700, 'left');
        text(live.toFixed(1), 462, 84, INK, 1, 22, 800, 'right');
        if (landed) {
            const r = Math.round(landHalf(e));
            const verdict = '반 바퀴 {r} · {p} → {f}'.replace('{r}', String(r)).replace('{p}', r % 2 === 0 ? '짝수' : '홀수').replace('{f}', faceName(upFace(r)));
            tag(verdict, 462, 124, upFace(r) === 0 ? GOLD : SKY, INK, 12, 'right');
        } else {
            text('초당 회전수 {s}'.replace('{s}', spinOf(k).toFixed(1)), 296, 124, INK, 1, 11, 700, 'left');
        }
    }
    function statusText(): string {
        const k = curK();
        const e = tosses[k];
        if (sceneT >= e.t0 + e.T) {
            const r = Math.round(landHalf(e));
            return '던지기 {n} · 반 바퀴 {h} 반올림 {r} · {p} → {f}'.replace('{n}', String(k + 1)).replace('{h}', halfTurns(k).toFixed(1)).replace('{r}', String(r)).replace('{p}', r % 2 === 0 ? '짝수' : '홀수').replace('{f}', faceName(upFace(r)));
        }
        return '던지기 {n} · 도는 중 반 바퀴 {h}'.replace('{n}', String(k + 1)).replace('{h}', tossHalf(e, sceneT).toFixed(1));
    }
    fitCanvas();
    if (still) { showRest(); } else { play(); }
    return function (): void {
        stopLoop();
        off.abort();
    };
  }, []);

  return (
    <div className={cx("vj") + " is-demo"} ref={rootRef}>
        <div className={cx("vj__pad")} data-role="pad" tabIndex={0} role="application" aria-label={'동전 던지기 시연 무대 — Enter 나 Space 나 클릭으로 던지기, P 로 일시정지, N 으로 한 걸음, R 로 다시'}>
          <canvas className={cx("vj__canvas")} data-role="canvas" width={480} height={300} role="img" aria-label={'손에서 던져진 동전이 포물선을 그리며 날면서 초당 회전수 7 로 돌고, 착지하면 반 바퀴 수를 반올림해 짝수면 앞면 홀수면 뒷면으로 읽는다. 던질 때마다 초당 회전수가 0.6 씩 올라 세 번 던지는 동안 결과 면이 뒷면 앞면 뒷면으로 바뀐다'}></canvas>
        </div>
        <p className={cx("vj__status")} data-role="status" aria-live="off">{'동전 던지기 시연'}</p>
        <div className={cx("vj__ctrl")}>
          <button className={cx("vj__pause")} data-role="pause" type="button" aria-pressed="false">{'일시정지'}</button>
          <button className={cx("vj__step")} data-role="step" type="button">{'한 걸음'}</button>
        </div>
        <p className={cx("vj__done")} data-role="done" role="status" aria-live="polite"></p>
    </div>
  );
}
