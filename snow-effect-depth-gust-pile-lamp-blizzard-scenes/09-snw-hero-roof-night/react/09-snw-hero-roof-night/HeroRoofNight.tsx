// HeroRoofNight - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./HeroRoofNight.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function HeroRoofNight() {
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
    // ── 09 눈 내리는 밤 지붕 히어로 장면 ─────────────────────────
    // 기울기 한계(열 사이 높이 차, 알 단위)와 눈 한 알이 더하는 높이(px). 알 하나는 이웃 열에도 나눠 준다
    const REPOSE = 1;
    const ADD = 4;
    const GRAIN = 3;
    const COLS = W / GRAIN;
    const GROUND_Y = 262;
    const FLAKES = 230;
    const LOOP_S = 7;
    const REST_STEPS = 90;
    // 지붕 모양 — 꼭대기와 기울기(열 하나당 세로 변화 ÷ 가로)
    const ROOF_X0 = 100;
    const ROOF_X1 = 380;
    const ROOF_TOP = 112;
    const ROOF_SLOPE = 0.5;
    const CHIMNEY_X0 = 300;
    const CHIMNEY_X1 = 318;
    const CHIMNEY_Y = 80;
    // 가로등 — 빛 원뿔
    const LAMP_X = 56;
    const LAMP_Y = 120;
    const CONE_HALF = 0.55;
    const LAMP_RANGE = 200;
    const AMBIENT = 0.2;
    type Flake = { x: number; y: number; z: number; s: number; ph: number; lit: number };
    let flakes: Flake[] = [];
    let h: number[] = [];
    const baseY: number[] = [];
    let rng = seeded(909);
    let litCount = 0;
    for (let c = 0; c < COLS; c += 1) {
        const x = c * GRAIN + GRAIN / 2;
        let y = GROUND_Y;
        if (x >= ROOF_X0 && x <= ROOF_X1) { y = ROOF_TOP + Math.abs(x - 240) * ROOF_SLOPE; }
        if (x >= CHIMNEY_X0 && x <= CHIMNEY_X1) { y = CHIMNEY_Y; }
        baseY.push(y);
    }
    function topOf(c: number): number { return baseY[c] - h[c]; }
    function reset(): void {
        rng = seeded(909);
        flakes = [];
        h = [];
        for (let c = 0; c < COLS; c += 1) { h.push(0); }
        for (let i = 0; i < FLAKES; i += 1) {
            const s = 1.1 + Math.pow(rng(), 1.7) * 3.6;
            flakes.push({ x: rng() * (W + 40) - 20, y: rng() * GROUND_Y, z: (s - 1.1) / 3.6, s: s, ph: rng() * TAU, lit: 0 });
        }
        for (let k = 0; k < 30; k += 1) { update(1 / 30); }
    }
    // 기울기 한계 — 이웃보다 한계 넘게 높으면 넘은 만큼의 반을 낮은 쪽으로. 굴뚝처럼 바닥 높이가 갑자기 달라지는 곳은 벽이라 흘리지 않는다
    function relax(): void {
        const maxDiff = REPOSE * GRAIN;
        for (let pass = 0; pass < 3; pass += 1) {
            for (let c = 0; c < COLS; c += 1) {
                for (let d = -1; d <= 1; d += 2) {
                    const n = c + d;
                    if (n < 0 || n >= COLS || Math.abs(baseY[c] - baseY[n]) > 6) { continue; }
                    const excess = topOf(n) - topOf(c) - maxDiff;
                    if (excess > 0 && h[c] > 0) {
                        const move = Math.min(h[c], excess * 0.5);
                        h[c] -= move;
                        h[n] += move;
                    }
                }
            }
        }
    }
    function update(dt: number): void {
        const wind = autoOn ? Math.sin(sceneT * 0.9) * 0.4 : userWind();
        for (const f of flakes) {
            f.y += (28 + 62 * f.z) * dt;
            f.x += wind * 26 * (0.3 + f.z) * dt + Math.sin(sceneT * 1.5 + f.ph) * 7 * dt;
            if (f.x > W + 20) { f.x -= W + 40; }
            if (f.x < -20) { f.x += W + 40; }
            // 가까운 눈(z ≥ 0.45)만 지붕과 땅에 닿아 쌓인다. 먼 눈은 집 뒤를 지나 바닥에서 위로 돌아간다
            if (f.z >= 0.45) {
                const c = clamp(Math.floor(f.x / GRAIN), 0, COLS - 1);
                if (f.y >= topOf(c)) {
                    h[c] += ADD * 0.5;
                    if (c > 0) { h[c - 1] += ADD * 0.25; }
                    if (c < COLS - 1) { h[c + 1] += ADD * 0.25; }
                    f.y = -4 - rng() * 20;
                    f.x = rng() * (W + 40) - 20;
                }
            } else if (f.y > GROUND_Y) {
                f.y = -4 - rng() * 20;
            }
        }
        relax();
    }
    // 불빛 속 눈의 밝기 — 원뿔 몫 × 거리 감쇠, 원뿔 밖은 AMBIENT
    function lampLight(x: number, y: number): number {
        const axis = 0.18 + Math.sin(sceneT * 0.9) * 0.12;
        const dx = x - LAMP_X;
        const dy = y - LAMP_Y;
        const d = Math.hypot(dx, dy);
        const th = Math.abs(Math.atan2(dy, dx) - axis);
        const t = th / CONE_HALF;
        const cone = t < 1 ? Math.pow(Math.cos(t * Math.PI / 2), 2) : 0;
        return clamp(AMBIENT + cone / (1 + (d / LAMP_RANGE) * (d / LAMP_RANGE)), 0, 1);
    }
    function drawFlakes(far: boolean): number {
        let lit = 0;
        for (const f of flakes) {
            if ((f.z < 0.45) !== far) { continue; }
            const b = lampLight(f.x, f.y);
            if (b > 0.5) { lit += 1; }
            const tw = b > 0.5 ? 0.8 + 0.2 * Math.sin(sceneT * 9 + f.ph) : 1;
            flakeDot(f.x, f.y, f.s * 0.6, (1 - f.z) * 1.4 + (b > 0.6 ? 1.2 : 0), mix(SNOW_SHADE, SNOW, b), clamp(0.3 + 0.7 * b, 0, 1) * tw * lerp(0.6, 1, f.z));
        }
        return lit;
    }
    function draw(): void {
        skyFill(NIGHT_TOP, NIGHT_BOT);
        // 땅
        box(0, GROUND_Y, W, H - GROUND_Y, 0, DUSK_DEEP, 1);
        let lit = drawFlakes(true);
        // 집 — 벽 · 굴뚝 · 지붕 · 불 켜진 창
        box(116, 170, 248, GROUND_Y - 170, 0, DUSK, 1);
        box(CHIMNEY_X0 - 2, CHIMNEY_Y, CHIMNEY_X1 - CHIMNEY_X0 + 4, 80, 0, DUSK_DEEP, 1);
        ctx.beginPath();
        ctx.moveTo(ROOF_X0 - 6, ROOF_TOP + (240 - ROOF_X0 + 6) * ROOF_SLOPE + 4);
        ctx.lineTo(240, ROOF_TOP - 3);
        ctx.lineTo(ROOF_X1 + 6, ROOF_TOP + (ROOF_X1 + 6 - 240) * ROOF_SLOPE + 4);
        ctx.closePath();
        ctx.fillStyle = rgba(DUSK_DEEP, 1);
        ctx.fill();
        for (let i = 0; i < 3; i += 1) {
            box(146 + i * 74, 196, 34, 38, 4, BUTTER, 1);
            box(146 + i * 74 + 16, 196, 2, 38, 0, DUSK_DEEP, 0.7);
        }
        // 쌓인 눈 — 지붕 선과 땅 위 높이 지도
        for (let c = 0; c < COLS; c += 1) {
            if (h[c] > 0) { box(c * GRAIN, topOf(c), GRAIN + 0.6, h[c], 0, SNOW, 1); }
        }
        // 가로등과 원뿔
        ctx.beginPath();
        ctx.moveTo(LAMP_X, LAMP_Y);
        const axis = 0.18 + Math.sin(sceneT * 0.9) * 0.12;
        ctx.arc(LAMP_X, LAMP_Y, 300, axis - CONE_HALF, axis + CONE_HALF);
        ctx.closePath();
        const g = ctx.createRadialGradient(LAMP_X, LAMP_Y, 6, LAMP_X, LAMP_Y, 260);
        g.addColorStop(0, rgba(LAMP, 0.42));
        g.addColorStop(1, rgba(LAMP, 0));
        ctx.fillStyle = g;
        ctx.fill();
        box(LAMP_X - 3, LAMP_Y, 6, GROUND_Y - LAMP_Y, 2, INK, 1);
        box(LAMP_X - 11, LAMP_Y - 12, 22, 14, 6, INK, 1);
        disc(LAMP_X, LAMP_Y + 2, 7, LAMP, 1);
        lit += drawFlakes(false);
        litCount = lit;
    }
    function statusText(): string {
        let top = 0;
        for (let c = 0; c < COLS; c += 1) {
            const x = c * GRAIN + GRAIN / 2;
            if (x >= ROOF_X0 && x <= ROOF_X1 && !(x >= CHIMNEY_X0 && x <= CHIMNEY_X1)) { top = Math.max(top, h[c]); }
        }
        return '지붕 눈 두께 {t}px · 불빛 속 눈 {n}개'.replace('{t}', String(Math.round(top))).replace('{n}', String(litCount));
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
          <canvas className={cx("vj__canvas")} data-role="canvas" width={480} height={300} role="img" aria-label={'눈 내리는 밤 불 켜진 집 지붕과 땅에 높이 지도로 눈이 쌓여 지붕 선이 하얗게 두꺼워지고, 가로등 빛 원뿔 안의 눈만 반짝이며 깊이별 눈송이 층이 겹친다'}></canvas>
        </div>
        <p className={cx("vj__status")} data-role="status" aria-live="off">{'눈 내리는 장면'}</p>
        <button className={cx("vj__pause")} data-role="pause" type="button" aria-pressed="false">{'일시정지'}</button>
    </div>
  );
}
