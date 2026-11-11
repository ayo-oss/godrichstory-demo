// BlizzardStreakWhiteout - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./BlizzardStreakWhiteout.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function BlizzardStreakWhiteout() {
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
    function ease(x: number): number { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); }
    // 시드 고정 난수 — 같은 시드면 같은 눈 (32비트 xorshift 에 곱셈 섞기 한 번)
    function seeded(seed: number): () => number {
        let s = (seed * 2654435761) >>> 0 || 1;
        return function (): number {
            s ^= s << 13; s >>>= 0;
            s ^= s >>> 17;
            s ^= s << 5; s >>>= 0;
            return (Math.imul(s, 0x9e3779b1) >>> 0) / 4294967296;
        };
    }
    // 장면 시계(초) — 장면 계산이 고치고 화면 쪽이 읽는다
    let sceneT = 0;
    // 자동 시연이 장면을 움직이는가 — 사람이 무대에서 처음 손대면 꺼진다
    let autoOn = true;
    // 사람이 주는 바람(−1 왼쪽 ~ 1 오른쪽) — 방향키·무대 위 가로 끌기. 자동 시연 중에는 0
    let windUser = 0;
    function userWind(): number { return autoOn ? 0 : windUser; }

    // 파스텔 팔레트 — 눈은 흰색 계열(기능색), 하늘·땅은 낮은 채도의 해질녘 청보라
    const SNOW: RGB = [255, 255, 255];
    const SNOW_SHADE: RGB = [208, 222, 246];
    const SKY_TOP: RGB = [70, 82, 140];
    const SKY_BOT: RGB = [146, 158, 212];
    const NIGHT_TOP: RGB = [38, 44, 86];
    const NIGHT_BOT: RGB = [78, 88, 140];
    const GROUND: RGB = [196, 206, 232];
    const DUSK: RGB = [96, 104, 156];
    const DUSK_DEEP: RGB = [60, 66, 112];
    const INK: RGB = [40, 36, 54];
    const PAPER: RGB = [250, 246, 240];
    const LAMP: RGB = [255, 232, 168];
    const BUTTER: RGB = [247, 226, 156];
    const ROSE: RGB = [232, 164, 178];
    const MINT: RGB = [166, 220, 200];
    const WATER: RGB = [190, 222, 248];
    function mix(a: RGB, b: RGB, k: number): RGB { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
    function rgba(c: RGB, a: number): string {
        return 'rgba(' + Math.round(clamp(c[0], 0, 255)) + ',' + Math.round(clamp(c[1], 0, 255)) + ',' + Math.round(clamp(c[2], 0, 255)) + ',' + clamp(a, 0, 1).toFixed(3) + ')';
    }
    const canvasEl = root.querySelector('[data-role="canvas"]') as HTMLCanvasElement | null;
    const padEl = root.querySelector('[data-role="pad"]') as HTMLElement | null;
    const pauseEl = root.querySelector('[data-role="pause"]') as HTMLButtonElement | null;
    const statusEl = root.querySelector('[data-role="status"]') as HTMLElement | null;
    const ctxRaw = canvasEl ? canvasEl.getContext('2d') : null;
    if (!canvasEl || !ctxRaw || !pauseEl || !padEl) { return; }
    const cv: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctxRaw;
    const pauseBtn: HTMLButtonElement = pauseEl;
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
    // 눈송이 한 알 — 번짐 반지름(blur)만큼 옅은 후광을 먼저 깔고 가운데를 또렷하게
    function flakeDot(x: number, y: number, r: number, blur: number, c: RGB, a: number): void {
        if (blur > 0.3) { disc(x, y, r + blur, c, a * 0.3); }
        disc(x, y, r, c, a);
    }
    // ── 08 줄무늬로 늘어나는 눈보라 ───────────────────────────────
    // 눈이 지나간 자국 길이 = 속도 × 노출 시간(초)
    const EXPOSURE = 0.06;
    // 돌풍이 1 일 때 가로 바람 빠르기(px/초)와 기준 낙하 빠르기
    const WIND = 300;
    const FALL = 150;
    // 먼 눈이 하늘색에 섞이는 최대 몫 — 시야가 줄어드는 정도
    const FOG = 0.75;
    // 눈이 생기는 빠르기(알/초)
    const RATE = 190;
    // 숨었던 탭이 돌아온 순간의 한 프레임 길이(초)와 그 시각표(초)
    const HIDDEN_S = 1.3;
    const HIDDEN_AT: number[] = [0.3, 1.6, 2.9, 4.2];
    const LOOP_S = 5.4;
    const REST_STEPS = 30;
    const PANEL_W = 240;
    type Flake = { x: number; y: number; z: number };
    type Storm = { fl: Flake[]; carry: number; rng: () => number };
    let storms: Storm[] = [];
    let hiddenSeen = 0;
    function gustAt(t: number): number { return 0.55 + 0.45 * Math.sin(t * 1.3); }
    function makeStorm(): Storm { return { fl: [], carry: 0, rng: seeded(808) }; }
    function spawn(s: Storm): void {
        const edge = s.rng() < 0.7;
        s.fl.push({ x: edge ? s.rng() * (PANEL_W + 60) - 60 : -8 - s.rng() * 10, y: edge ? -6 - s.rng() * 8 : s.rng() * H, z: s.rng() });
    }
    function stepStorm(s: Storm, dt: number): void {
        const g = gustAt(sceneT) + userWind() * 0.5;
        const next: Flake[] = [];
        for (const f of s.fl) {
            f.x += (WIND * g + 40) * (0.4 + f.z) * dt;
            f.y += FALL * (0.3 + 0.9 * f.z) * dt;
            if (f.x < PANEL_W + 20 && f.y < H + 10) { next.push(f); }
        }
        s.fl = next;
        // 생기는 눈의 수는 시간에 비례한다 — 한 프레임이 길면 그만큼 한꺼번에 생긴다
        s.carry += RATE * dt;
        while (s.carry >= 1) { s.carry -= 1; spawn(s); }
    }
    function reset(): void {
        storms = [makeStorm(), makeStorm()];
        hiddenSeen = 0;
        for (let k = 0; k < 60; k += 1) { for (const s of storms) { stepStorm(s, 1 / 30); } }
    }
    function update(dt: number): void {
        if (hiddenSeen < HIDDEN_AT.length && sceneT >= HIDDEN_AT[hiddenSeen]) {
            hiddenSeen += 1;
            // 왼쪽은 긴 한 프레임을 그대로 받고, 오른쪽은 DT_MAX 로 자른 만큼만 받는다
            stepStorm(storms[0], HIDDEN_S);
            stepStorm(storms[1], Math.min(HIDDEN_S, DT_MAX));
            return;
        }
        for (const s of storms) { stepStorm(s, dt); }
    }
    function drawStorm(s: Storm, ox: number): void {
        ctx.save();
        ctx.beginPath();
        ctx.rect(ox, 0, PANEL_W, H);
        ctx.clip();
        ctx.translate(ox, 0);
        const g = gustAt(sceneT);
        const sky = mix(SKY_TOP, SKY_BOT, 0.5);
        for (const f of s.fl) {
            const vx = (WIND * g + 40) * (0.4 + f.z);
            const vy = FALL * (0.3 + 0.9 * f.z);
            const len = EXPOSURE;
            const c = mix(SNOW, sky, (1 - f.z) * FOG);
            seg(f.x - vx * len, f.y - vy * len, f.x, f.y, 0.7 + f.z * 1.9, c, 0.3 + 0.65 * f.z);
        }
        // 하얗게 막힘 — 돌풍이 셀수록 짙은 막
        ctx.fillStyle = rgba(SNOW, 0.34 * g * g);
        ctx.fillRect(0, 0, PANEL_W, H);
        ctx.restore();
    }
    function draw(): void {
        skyFill(SKY_TOP, SKY_BOT);
        // 바닥 선
        box(0, 270, W, 30, 0, DUSK_DEEP, 1);
        drawStorm(storms[0], 0);
        drawStorm(storms[1], PANEL_W);
        box(PANEL_W - 1, 0, 2, H, 0, INK, 0.55);
        tag('한 프레임 {d}초 그대로'.replace('{d}', String(HIDDEN_S)), PANEL_W / 2, 284, PAPER, INK, 10, 'center');
        tag('상한 {d}초로 자름'.replace('{d}', String(DT_MAX)), PANEL_W * 1.5, 284, PAPER, INK, 10, 'center');
    }
    function statusText(): string {
        return '그대로 {a}알 · 자른 쪽 {b}알'.replace('{a}', String(storms[0].fl.length)).replace('{b}', String(storms[1].fl.length));
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
    // 사람이 바람을 만지면 자동 시연의 바람은 손을 뗀다
    function takeOver(): void {
        wake();
        autoOn = false;
    }
    // 한 프레임에 넘기는 시간 상한(초) — 오래 숨었다 돌아온 첫 프레임도 50ms 까지만 계산에 넣는다
    const DT_MAX = 0.05;
    // 방향키 한 번에 바뀌는 바람 몫
    const WIND_STEP = 0.25;
    function showNow(): void {
        if (still || paused) {
            draw();
            pushStatus(statusText());
        }
    }
    function advance(dt: number): void {
        sceneT += dt;
        if (sceneT >= LOOP_S) {
            sceneT -= LOOP_S;
            reset();
        }
        update(dt);
    }
    let rafId = 0;
    let lastTs = -1;
    function frame(ts: number): void {
        if (still || paused) { rafId = 0; return; }
        if (lastTs < 0) { lastTs = ts; }
        const dt = Math.min((ts - lastTs) / 1000, DT_MAX);
        lastTs = ts;
        if (dt > 0) { advance(dt); }
        draw();
        pushStatus(statusText());
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
    // 움직임 줄이기 — 루프 없이 눈이 이미 내려 쌓인 정지 장면 한 장
    function showRest(): void {
        stopLoop();
        sceneT = 0;
        reset();
        for (let k = 0; k < REST_STEPS; k += 1) { update(1 / 30); }
        draw();
        pushStatus(statusText());
    }
    function play(): void {
        sceneT = 0;
        reset();
        draw();
        pushStatus(statusText());
        if (!paused) { startLoop(); }
    }
    function togglePause(): void {
        paused = !paused;
        pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
        wake();
        if (paused) { stopLoop(); } else if (!still) { startLoop(); }
    }
    pauseBtn.addEventListener('click', togglePause, { signal: off.signal });
    // 방향키 — 무대에 포커스가 있을 때만. 왼쪽·오른쪽은 바람, Enter·Space 는 일시정지. 무대 밖에서는 화살표가 페이지를 스크롤한다
    pad.addEventListener('keydown', function (e: KeyboardEvent): void {
        if (e.altKey || e.ctrlKey || e.metaKey) { return; }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            takeOver();
            windUser = clamp(windUser + (e.key === 'ArrowRight' ? WIND_STEP : -WIND_STEP), -1, 1);
            showNow();
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            togglePause();
        }
    }, { signal: off.signal });
    // 포인터 — 무대 안에서 누른 채 가로로 끌면 그 위치가 바람(가운데 0, 가장자리 ±1)
    let dragging = -1;
    function windAt(e: PointerEvent): void {
        const r = pad.getBoundingClientRect();
        windUser = clamp(((e.clientX - r.left) / r.width - 0.5) * 2.4, -1, 1);
    }
    pad.addEventListener('pointerdown', function (e: PointerEvent): void {
        takeOver();
        pad.setPointerCapture(e.pointerId);
        dragging = e.pointerId;
        windAt(e);
        showNow();
    }, { signal: off.signal });
    pad.addEventListener('pointermove', function (e: PointerEvent): void {
        if (dragging !== e.pointerId) { return; }
        windAt(e);
        showNow();
    }, { signal: off.signal });
    function release(e: PointerEvent): void {
        if (dragging !== e.pointerId) { return; }
        dragging = -1;
        windUser = 0;
        showNow();
    }
    pad.addEventListener('pointerup', release, { signal: off.signal });
    pad.addEventListener('pointercancel', release, { signal: off.signal });
    // 탭이 숨으면 멈추고, 돌아오면 시계를 다시 맞춰 시작 — 숨은 동안의 몇 초가 한 프레임에 몰리지 않게
    document.addEventListener('visibilitychange', function (): void {
        if (document.hidden) { stopLoop(); } else if (!paused && !still) { startLoop(); }
    }, { signal: off.signal });
    // 설정이 바뀌면 — 켜지면 정지 장면, 꺼지면 다시 움직인다
    reduceQuery.addEventListener('change', function (): void {
        still = reduceQuery.matches;
        if (still) { showRest(); } else { play(); }
    }, { signal: off.signal });
    window.addEventListener('resize', function (): void {
        fitCanvas();
        draw();
    }, { signal: off.signal });
    fitCanvas();
    if (still) { showRest(); } else { play(); }
    return function (): void {
        stopLoop();
        off.abort();
    };
  }, []);

  return (
    <div className={cx("vj") + " is-demo"} ref={rootRef}>
        <div className={cx("vj__pad")} data-role="pad" tabIndex={0} role="application" aria-label={'눈 장면 무대 — 누른 뒤 왼쪽·오른쪽 방향키로 바람 바꾸기, Enter 로 일시정지'}>
          <canvas className={cx("vj__canvas")} data-role="canvas" width={480} height={300} role="img" aria-label={'속도 방향으로 늘어난 줄무늬 눈보라가 돌풍에 따라 하얗게 시야를 막고, 숨었던 탭이 돌아온 긴 한 프레임을 그대로 받은 왼쪽은 눈이 한꺼번에 쏟아지고 시간 상한을 둔 오른쪽은 고르게 내린다'}></canvas>
        </div>
        <p className={cx("vj__status")} data-role="status" aria-live="off">{'눈 내리는 장면'}</p>
        <button className={cx("vj__pause")} data-role="pause" type="button" aria-pressed="false">{'일시정지'}</button>
    </div>
  );
}
