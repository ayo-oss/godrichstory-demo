// KeystrokeGapHistogramBins - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./KeystrokeGapHistogramBins.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function KeystrokeGapHistogramBins() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const root: HTMLElement = rootEl;
    type RGB = [number, number, number];
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
    // 파스텔 팔레트 — 글자는 늘 INK 나 진한 색, 면은 연한 색. 맞음은 민트, 틀림은 분홍, 내 커서는 라벤더
    const BG_TOP: RGB = [250, 246, 252];
    const BG_BOT: RGB = [228, 234, 250];
    const FACE: RGB = [255, 253, 248];
    const FACE_EDGE: RGB = [206, 198, 226];
    const SKY: RGB = [176, 210, 246];
    const SKY_DEEP: RGB = [60, 104, 162];
    const GOLD: RGB = [250, 226, 150];
    const GOLD_DEEP: RGB = [150, 108, 20];
    const ROSE: RGB = [240, 150, 176];
    const ROSE_DEEP: RGB = [184, 44, 80];
    const MINT: RGB = [150, 214, 190];
    const MINT_DEEP: RGB = [18, 104, 76];
    const LAV: RGB = [188, 172, 236];
    const LAV_DEEP: RGB = [96, 74, 170];
    const INK: RGB = [40, 36, 54];
    const PAPER: RGB = [250, 246, 240];
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
    // 자동 시연이 끝나는 시각과 한 판이 되풀이되는 시각 — build() 가 시간표를 짜면서 정한다
    let doneAt = 12;
    let lapEnd = 14;
    // 사람이 직접 키를 치는 중인가 — 켜지면 시간표의 가상 타자는 빠지고 판은 되풀이되지 않는다
    let live = false;
    function sched(t: number, f: () => void): void { script.push({ t: t, f: f }); }

    // ── 타자 기록 ─────────────────────────────────────────────
    // 한 번의 키 입력은 (누른 시각, 키) 두 값이다. 타수도 오타도 열지도도 이 목록에서만 계산한다
    const BS = 'Backspace';
    type Raw = { t: number; k: string };
    type Stroke = { t: number; k: string; ok: boolean };
    let target = '';
    let buf = '';
    let strokes: Stroke[] = [];
    function sessReset(text: string): void {
        target = text;
        buf = '';
        strokes = [];
    }
    // 키 하나를 받는다 — 지우기는 마지막 글자를 빼고, 글자는 그 자리의 정답과 견줘 ok 를 정한다
    function press(k: string, t: number): void {
        if (k === BS) {
            if (buf.length > 0) { buf = buf.slice(0, -1); }
            strokes.push({ t: t, k: k, ok: false });
            return;
        }
        if (buf.length >= target.length) { return; }
        const ok = k === target.charAt(buf.length);
        buf += k;
        strokes.push({ t: t, k: k, ok: ok });
    }
    // 글자 키 수와 맞은 수 — 지우기 키는 세지 않는다
    function keyCount(): number {
        let n = 0;
        for (let i = 0; i < strokes.length; i += 1) { if (strokes[i].k !== BS) { n += 1; } }
        return n;
    }
    function okCount(): number {
        let n = 0;
        for (let i = 0; i < strokes.length; i += 1) { if (strokes[i].ok) { n += 1; } }
        return n;
    }
    // 정확도 — 맞은 글자 키 ÷ 글자 키 전체. 지워도 이미 친 틀린 키는 남는다
    function accuracy(): number {
        const n = keyCount();
        return n === 0 ? 100 : (okCount() / n) * 100;
    }
    // 자리 옆 키 — 틀린 키는 같은 줄의 이웃 글쇠에서 고른다(스페이스 바는 c, 글자가 아닌 키는 n)
    function nearKey(ch: string, rnd: () => number): string {
        const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
        for (let r = 0; r < rows.length; r += 1) {
            const i = rows[r].indexOf(ch);
            if (i >= 0) {
                const j = i === 0 ? 1 : (i === rows[r].length - 1 ? i - 1 : (rnd() < 0.5 ? i - 1 : i + 1));
                return rows[r].charAt(j);
            }
        }
        return ch === ' ' ? 'c' : 'n';
    }
    // 시드 가상 타자 — 글자마다 간격은 pace(지금 시각) 의 ±20%, 오타는 지정한 자리에서만 낸다
    // miss 는 [글자 자리, 알아채기 전에 더 치는 글자 수, 틀린 키 수(생략하면 1)] 목록. 틀린 키를 치고 lag 글자를 더 친 뒤 한 번에 지우고 다시 친다
    function genStrokes(seed: number, text: string, pace: (t: number) => number, miss: number[][], t0: number): Raw[] {
        const rnd = seeded(seed);
        const out: Raw[] = [];
        let t = t0;
        let i = 0;
        const handled: Record<number, boolean> = {};
        while (i < text.length) {
            let hit: number[] | null = null;
            for (let m = 0; m < miss.length; m += 1) { if (miss[m][0] === i && !handled[i]) { hit = miss[m]; } }
            t += pace(t) * (0.8 + 0.4 * rnd());
            if (hit) {
                handled[i] = true;
                const lag = Math.min(hit[1], text.length - 1 - i);
                const bad = hit.length > 2 ? hit[2] : 1;
                for (let j = 0; j <= lag; j += 1) {
                    if (j > 0) { t += pace(t) * (0.8 + 0.4 * rnd()); }
                    out.push({ t: t, k: j < bad ? nearKey(text.charAt(i + j), rnd) : text.charAt(i + j) });
                }
                t += 0.26 + 0.16 * rnd();
                for (let j = 0; j <= lag; j += 1) {
                    out.push({ t: t, k: BS });
                    t += 0.09;
                }
                continue;
            }
            out.push({ t: t, k: text.charAt(i) });
            i += 1;
        }
        return out;
    }
    // 시간표에 가상 타자의 키를 모두 올린다 — 끝나는 시각(doneAt)과 되풀이 시각(lapEnd)도 여기서 정한다
    function schedule(raw: Raw[], hold: number): void {
        for (let i = 0; i < raw.length; i += 1) {
            const r = raw[i];
            sched(r.t, function (): void { onKey(r.k, r.t); });
        }
        doneAt = raw.length > 0 ? raw[raw.length - 1].t + 0.35 : 1;
        lapEnd = doneAt + hold;
    }
    function defaultFinished(): boolean {
        return live ? buf.length >= target.length : sceneT >= doneAt;
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
    // 외부 웹폰트는 부르지 않는다 — 기기에 있는 글꼴 목록만. 타자 글자는 고정폭이라 칸 폭이 흔들리지 않는다
    const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", "Noto Sans KR", sans-serif';
    const MONO_STACK = 'ui-monospace, "SF Mono", Menlo, Consolas, "Courier New", monospace';
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
    // 고정폭 글자 — 칸마다 같은 폭이라 커서와 오타 칸이 글자에 정확히 겹친다
    function mono(s: string, x: number, y: number, c: RGB, a: number, px: number, weight: number, align: CanvasTextAlign): void {
        ctx.font = weight + ' ' + px + 'px ' + MONO_STACK;
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = rgba(c, a);
        ctx.fillText(s, x, y);
    }
    // 고정폭 글꼴 한 칸의 폭 — 글꼴이 바뀌면 같이 바뀐다
    function monoW(px: number): number {
        ctx.font = '400 ' + px + 'px ' + MONO_STACK;
        return ctx.measureText('M').width;
    }
    // 글자 이름표 — 바탕 알약 위에 글자
    function tag(s: string, x: number, y: number, bg: RGB, fg: RGB, px: number, align: CanvasTextAlign): void {
        ctx.font = '700 ' + px + 'px ' + FONT_STACK;
        const w = ctx.measureText(s).width + px * 1.1;
        const left = align === 'center' ? x - w / 2 : (align === 'right' ? x - w : x);
        box(left, y - px * 0.82, w, px * 1.64, px * 0.82, bg, 0.92);
        text(s, left + w / 2, y + 0.5, fg, 1, px, 700, 'center');
    }
    function panel(x: number, y: number, w: number, h: number, c: RGB, a: number): void {
        box(x, y, w, h, 12, c, a);
        outline(x, y, w, h, 12, 1.5, FACE_EDGE, 0.9);
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
    // 한 판이 끝났음을 스크린리더에 한 번만 알린다 — 판이 되풀이돼도 다시 읽지 않는다
    let doneSaid = false;
    function checkDone(): void {
        if (!doneSaid && finished()) {
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
        if (!live && sceneT >= lapEnd) { lap += 1; begin(); return; }
        update(dt);
    }
    // 시간표를 새로 짠다 — 같은 시각이면 짠 순서대로 부른다(정렬은 안정)
    function fresh(): void {
        sceneT = 0;
        evAt = 0;
        script = [];
        build();
        script.sort(function (a: Ev, b: Ev): number { return a.t - b.t; });
    }
    // 첫 판은 START_S 만큼 앞서 시작한다 — 타자가 이미 치고 있는 장면에서 보인다
    function runTo(t: number): void {
        while (sceneT < t - 1e-6) { advance(Math.min(1 / 30, t - sceneT)); }
    }
    function begin(): void {
        fresh();
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
    // 움직임 줄이기 — 루프 없이 한 판이 끝난 멈춘 한 장. 시간표를 끝까지 돌려 결과 화면에서 멈춘다
    function showRest(): void {
        stopLoop();
        live = false;
        fresh();
        runTo(doneAt);
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
    // 처음부터 — 자동 시연은 시간표를 다시, 직접 치던 중이면 빈 연습판을 다시
    function restart(): void {
        lap += 1;
        doneSaid = false;
        if (still) { showRest(); return; }
        begin();
        showNow();
        if (!paused) { startLoop(); }
    }
    // 직접 치기 — 첫 키가 오면 가상 타자를 빼고 빈 판에서 시작한다
    let lastStamp = -1;
    function goLive(): void {
        live = true;
        doneSaid = false;
        lastStamp = -1;
        shownStatus = '';
        fresh();
        if (still) { showNow(); } else { lastTs = -1; showNow(); if (!paused) { startLoop(); } }
    }
    // 이벤트 시각 e.timeStamp 와 rAF 시각은 같은 원점이라 빼면 마지막 프레임 이후의 간격이 나온다
    function liveKey(k: string, stamp: number): void {
        let t = sceneT;
        if (still) {
            if (lastStamp >= 0) { sceneT += clamp((stamp - lastStamp) / 1000, 0, 2); }
            lastStamp = stamp;
            t = sceneT;
        } else if (lastTs >= 0) {
            t = sceneT + clamp((stamp - lastTs) / 1000, 0, DT_MAX);
        }
        onKey(k, t);
        if (still) { update(0); showNow(); }
    }
    // 한 걸음 — 멈춘 채 시간표의 다음 키 하나까지 시계를 보낸다. 더 부를 일이 없으면 판을 다시 연다
    function stepOnce(): void {
        if (live) { return; }
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
    // 키 이름 바꾸기 — 한글 자모 장면은 이 함수를 덮어쓴다. 글자 키와 지우기 키만 받고 나머지는 빈 문자열
    let keyMap: ((e: KeyboardEvent) => string) | null = null;
    function keyOf(e: KeyboardEvent): string {
        if (keyMap) { return keyMap(e); }
        if (e.key === 'Backspace') { return BS; }
        return e.key.length === 1 ? e.key : '';
    }
    pauseBtn.addEventListener('click', togglePause, { signal: off.signal });
    stepBtn.addEventListener('click', stepOnce, { signal: off.signal });
    // 키보드 — 무대에 포커스가 있을 때만. 글자 키는 직접 치기, Esc 는 처음부터. Tab 은 그대로 두어 포커스가 나갈 수 있다
    pad.addEventListener('keydown', function (e: KeyboardEvent): void {
        if (e.altKey || e.ctrlKey || e.metaKey) { return; }
        if (e.key === 'Escape') {
            e.preventDefault();
            wake();
            if (live) { goLive(); } else { restart(); }
            return;
        }
        const k = keyOf(e);
        if (k === '') { return; }
        e.preventDefault();
        if (paused) { return; }
        if (!live) {
            wake();
            goLive();
        }
        liveKey(k, e.timeStamp);
    }, { signal: off.signal });
    // 마우스·터치 — 무대를 누르면 키보드 포커스만 준다
    pad.addEventListener('click', function (): void {
        pad.focus({ preventScroll: true });
    }, { signal: off.signal });
    // 탭이 숨으면 멈추고, 돌아오면 시계를 다시 맞춰 시작 — 숨은 동안의 몇 초가 한 프레임에 몰리지 않게
    document.addEventListener('visibilitychange', function (): void {
        if (document.hidden) { stopLoop(); } else if (!paused && !still) { startLoop(); }
    }, { signal: off.signal });
    // 설정이 바뀌면 — 켜지면 결과 한 장, 꺼지면 다시 움직인다
    reduceQuery.addEventListener('change', function (): void {
        still = reduceQuery.matches;
        if (still) { showRest(); } else { live = false; lap = 0; play(); }
    }, { signal: off.signal });
    window.addEventListener('resize', function (): void {
        fitCanvas();
        showNow();
    }, { signal: off.signal });
    // ── 08 키 간격 분포 막대 ───────────────────────────────────
    // 글자와 글자 사이의 간격(gapList)을 BIN_MS 폭의 칸 BIN_N 개에 나눠 담아 막대 높이로 그린다
    // 같은 평균으로 치는 두 사람 — A 는 일정하게, B 는 몰아 치고 멈춘다. 왼쪽 판은 둘의 분포를 나란히 보이고, 오른쪽 판은 평균 한 줄만 보여 둘이 같아 보인다
    const BIN_MS = 50;
    const BIN_N = 12;
    const AXIS_S = 13.8;
    const START_S = 7.6;
    const TEXT_08 = 'cold rain taps the roof while the tea cools down';
    let bTimes: number[] = [];
    // SIM-BEGIN
    // 일정하게 치는 A — 간격이 0.26초 둘레에서 ±20% 만 흔들린다
    function steadyRun(): Raw[] { return genStrokes(81, TEXT_08, function (): number { return 0.26; }, [], 0.4); }
    // 몰아 치는 B — 3~6 글자를 빠르게 치고 쉬는 것을 되풀이한다
    function burstRun(seed: number, n: number, t0: number): number[] {
        const rnd = seeded(seed);
        const out: number[] = [];
        let t = t0;
        while (out.length < n) {
            const len = 3 + Math.floor(rnd() * 4);
            for (let j = 0; j < len && out.length < n; j += 1) {
                t += 0.09 + 0.05 * rnd();
                out.push(t);
            }
            t += 0.5 + 0.3 * rnd();
        }
        return out;
    }
    // 두 사람의 평균 간격이 같아지도록 B 의 시각을 같은 비율로 늘이고 줄인다
    function matchMean(b: number[], t0: number, meanTarget: number): number[] {
        const meanB = (b[b.length - 1] - b[0]) / (b.length - 1);
        const f = meanTarget / meanB;
        return b.map(function (t: number): number { return t0 + (t - t0) * f; });
    }
    function timesOfRaw(raw: Raw[]): number[] { return raw.map(function (r: Raw): number { return r.t; }); }
    function gapList(ts: number[]): number[] {
        const out: number[] = [];
        for (let i = 1; i < ts.length; i += 1) { out.push(ts[i] - ts[i - 1]); }
        return out;
    }
    function binCounts(gaps: number[]): number[] {
        const c: number[] = [];
        for (let i = 0; i < BIN_N; i += 1) { c.push(0); }
        for (let i = 0; i < gaps.length; i += 1) { c[Math.min(BIN_N - 1, Math.floor((gaps[i] * 1000) / BIN_MS))] += 1; }
        return c;
    }
    function meanOf(v: number[]): number {
        if (v.length === 0) { return 0; }
        let s = 0;
        for (let i = 0; i < v.length; i += 1) { s += v[i]; }
        return s / v.length;
    }
    function maxOfList(v: number[]): number {
        let m = 0;
        for (let i = 0; i < v.length; i += 1) { if (v[i] > m) { m = v[i]; } }
        return m;
    }
    function bRun(): number[] {
        const a = steadyRun();
        const ta = timesOfRaw(a);
        const meanA = (ta[ta.length - 1] - ta[0]) / (ta.length - 1);
        return matchMean(burstRun(82, TEXT_08.length, 0.4), 0.4, meanA);
    }
    // SIM-END
    function aTimes(): number[] {
        const out: number[] = [];
        for (let i = 0; i < strokes.length; i += 1) { if (strokes[i].k !== BS) { out.push(strokes[i].t); } }
        return out;
    }
    function build(): void {
        sessReset(TEXT_08);
        bTimes = [];
        const b = bRun();
        for (let i = 0; i < b.length; i += 1) { const bt = b[i]; sched(bt, function (): void { bTimes.push(bt); }); }
        if (!live) {
            schedule(steadyRun(), 2.6);
            doneAt = Math.max(doneAt, b[b.length - 1] + 0.35);
            lapEnd = doneAt + 2.6;
        }
    }
    function onKey(k: string, t: number): void { press(k, t); }
    function finished(): boolean { return defaultFinished(); }
    function update(dt: number): void { if (dt < 0) { return; } }
    function raster(x0: number, y0: number, ts: number[], deep: RGB): void {
        box(x0, y0, 202, 16, 6, [255, 255, 255], 0.8);
        for (let i = 0; i < ts.length; i += 1) {
            const x = x0 + 4 + (ts[i] / AXIS_S) * 194;
            seg(x, y0 + 3, x, y0 + 13, 1.6, deep, 0.9);
        }
    }
    function hist(x0: number, y0: number, ca: number[], cb: number[]): void {
        const w = 202;
        const h = 100;
        box(x0, y0, w, h, 8, [255, 255, 255], 0.75);
        const top = Math.max(8, maxOfList(ca), maxOfList(cb));
        const bw = (w - 12) / BIN_N;
        for (let g = 1; g <= 2; g += 1) {
            const gy = y0 + h - 14 - (g / 2) * (h - 26);
            seg(x0 + 4, gy, x0 + w - 4, gy, 1, FACE_EDGE, 0.5);
        }
        for (let i = 0; i < BIN_N; i += 1) {
            const bx = x0 + 6 + i * bw;
            const ha = (ca[i] / top) * (h - 26);
            const hb = (cb[i] / top) * (h - 26);
            box(bx + 0.5, y0 + h - 14 - ha, bw / 2 - 0.8, ha, 2, MINT_DEEP, 0.9);
            box(bx + bw / 2 + 0.3, y0 + h - 14 - hb, bw / 2 - 0.8, hb, 2, ROSE_DEEP, 0.9);
            if (i % 2 === 0) { text(((i * BIN_MS) / 1000).toFixed(1), bx + 1, y0 + h - 6, INK, 0.8, 8, 700, 'left'); }
        }
    }
    function meanRow(x0: number, y: number, m: number, deep: RGB, soft: RGB, name: string): void {
        box(x0, y - 11, 22, 22, 6, soft, 1);
        text(name, x0 + 11, y + 0.5, INK, 1, 12, 800, 'center');
        box(x0 + 30, y - 8, clamp(m / 0.6, 0, 1) * 130, 16, 5, deep, 0.9);
        text('{m}초'.replace('{m}', m.toFixed(2)), x0 + 38 + clamp(m / 0.6, 0, 1) * 130, y + 0.5, INK, 1, 11, 700, 'left');
    }
    // 친 글자 수 ÷ 전체 글자 수 만큼 채운 줄
    function progress(x0: number, y: number, n: number, deep: RGB): void {
        box(x0, y, 202, 12, 6, [255, 255, 255], 0.85);
        outline(x0, y, 202, 12, 6, 1.2, FACE_EDGE, 1);
        box(x0 + 1, y + 1, Math.max(0.1, clamp(n / TEXT_08.length, 0, 1) * 200), 10, 5, deep, 0.85);
    }
    function draw(): void {
        skyFill(BG_TOP, BG_BOT);
        panel(10, 46, 226, 244, [255, 255, 255], 0.5);
        panel(244, 46, 226, 244, [255, 255, 255], 0.5);
        const ta = aTimes().filter(function (t: number): boolean { return t <= sceneT; });
        const tb = bTimes;
        const ga = gapList(ta);
        const gb = gapList(tb);
        raster(22, 62, ta, MINT_DEEP);
        raster(22, 82, tb, ROSE_DEEP);
        hist(22, 108, binCounts(ga), binCounts(gb));
        meanRow(256, 90, meanOf(ga), MINT_DEEP, MINT, 'A');
        meanRow(256, 122, meanOf(gb), ROSE_DEEP, ROSE, 'B');
        text('평균 간격만 보면 둘이 같다', 357, 154, INK, 0.9, 12, 700, 'center');
        text('가장 긴 멈춤은 숨어 있다', 357, 174, INK, 0.7, 11, 600, 'center');
        // 진행 — 친 글자 수에 비례해 차오르는 두 줄. 평균이 같으니 두 줄이 나란히 차오른다
        progress(256, 198, ta.length, MINT_DEEP);
        progress(256, 222, tb.length, ROSE_DEEP);
        tag('A 일정하게 치는 사람', 123, 232, MINT, INK, 11, 'center');
        tag('B 몰아 치고 멈추는 사람', 123, 253, ROSE, INK, 11, 'center');
        tag('칸마다 센 키 간격 분포', 123, 26, MINT, INK, 11, 'center');
        tag('평균 한 줄만 본다', 357, 26, ROSE, INK, 11, 'center');
        tag('한 칸 {n}밀리초'.replace('{n}', String(BIN_MS)), 123, 273, PAPER, INK, 11, 'center');
        tag('둘이 같아 보인다', 357, 273, PAPER, INK, 11, 'center');
    }
    function statusText(): string {
        const ga = gapList(aTimes().filter(function (t: number): boolean { return t <= sceneT; }));
        const gb = gapList(bTimes);
        return '평균 A {a}초 B {b}초 · 최장 멈춤 {x} 대 {y}초'.replace('{a}', meanOf(ga).toFixed(2)).replace('{b}', meanOf(gb).toFixed(2)).replace('{x}', maxOfList(ga).toFixed(2)).replace('{y}', maxOfList(gb).toFixed(2));
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
        <div className={cx("vj__pad")} data-role="pad" tabIndex={0} role="application" aria-label={'타자 연습 시연 무대 — 키를 누르면 직접 연습, Esc 로 처음부터'}>
          <canvas className={cx("vj__canvas")} data-role="canvas" width={480} height={300} role="img" aria-label={'평균 간격이 같은 두 사람이 같은 문장을 친다. 왼쪽은 키 간격을 50밀리초 폭 열두 칸에 나눠 담아 일정하게 치는 A 는 한 봉우리, 몰아 치고 멈추는 B 는 두 봉우리로 보이고 위의 눈금 줄이 키를 누른 순간을 보인다. 오른쪽은 평균 간격과 막대 한 줄만 보여 둘이 같아 보인다.'}></canvas>
        </div>
        <p className={cx("vj__status")} data-role="status" aria-live="off">{'타자 연습 시연'}</p>
        <div className={cx("vj__ctrl")}>
          <button className={cx("vj__pause")} data-role="pause" type="button" aria-pressed="false">{'일시정지'}</button>
          <button className={cx("vj__step")} data-role="step" type="button">{'한 걸음'}</button>
        </div>
        <p className={cx("vj__done")} data-role="done" role="status" aria-live="polite"></p>
    </div>
  );
}
