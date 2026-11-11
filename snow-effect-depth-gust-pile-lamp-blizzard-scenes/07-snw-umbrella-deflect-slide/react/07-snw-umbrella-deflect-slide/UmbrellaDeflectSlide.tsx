// UmbrellaDeflectSlide - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./UmbrellaDeflectSlide.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function UmbrellaDeflectSlide() {
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
    // ── 07 우산 위를 미끄러지는 눈 ───────────────────────────────
    // 우산 윗면 타원(가운데 CX·CY, 가로 반지름 A, 세로 반지름 B)
    const CX = 240;
    const CY = 150;
    const A = 104;
    const B = 58;
    // 우산 면을 따라 내리막으로 당기는 힘(px/초²)과 면 마찰(1/초)
    const SLIDE_G = 430;
    const FRICTION = 1.0;
    // 바닥 눈 한 번 더하는 양과 높이 상한(px)
    const GROUND_Y = 262;
    const ADD = 0.7;
    const CAP = 16;
    const BIN_W = 6;
    const BINS = W / BIN_W;
    const FLAKES = 150;
    const LOOP_S = 6;
    const REST_STEPS = 60;
    // 눈 상태 — 0 떨어지는 중 · 1 우산 위를 미끄러지는 중 · 2 가장자리를 떠나 방울로 떨어지는 중
    type Flake = { x: number; y: number; vx: number; vy: number; mode: number; speed: number; dir: number; s: number };
    let flakes: Flake[] = [];
    let ground: number[] = [];
    let rng = seeded(707);
    let slidingNow = 0;
    let droppedTotal = 0;
    function surfY(x: number): number {
        const u = (x - CX) / A;
        return CY - B * Math.sqrt(Math.max(0, 1 - u * u));
    }
    // 우산 면 바깥쪽 법선 — 타원 식의 기울기 방향을 길이 1 로
    function normalAt(x: number, y: number): [number, number] {
        const gx = (x - CX) / (A * A);
        const gy = (y - CY) / (B * B);
        const m = Math.hypot(gx, gy) || 1;
        return [gx / m, gy / m];
    }
    function respawn(f: Flake, anywhere: boolean): void {
        f.x = rng() * (W + 40) - 20;
        f.y = anywhere ? rng() * GROUND_Y : -6 - rng() * 20;
        f.vx = 10 + rng() * 10;
        f.vy = 70 + rng() * 40;
        f.mode = 0;
        f.speed = 0;
        f.dir = 1;
        f.s = 1.3 + rng() * 1.4;
    }
    function reset(): void {
        rng = seeded(707);
        flakes = [];
        ground = [];
        slidingNow = 0;
        droppedTotal = 0;
        for (let b = 0; b < BINS; b += 1) { ground.push(0); }
        for (let i = 0; i < FLAKES; i += 1) {
            const f: Flake = { x: 0, y: 0, vx: 0, vy: 0, mode: 0, speed: 0, dir: 1, s: 1 };
            respawn(f, true);
            flakes.push(f);
        }
        for (let k = 0; k < 60; k += 1) { update(1 / 30); }
    }
    function land(f: Flake): void {
        const b = clamp(Math.floor(f.x / BIN_W), 0, BINS - 1);
        ground[b] = Math.min(CAP, ground[b] + ADD);
        respawn(f, false);
    }
    function update(dt: number): void {
        const wind = userWind() * 30;
        let sliding = 0;
        for (const f of flakes) {
            if (f.mode === 0) {
                const prevY = f.y;
                f.x += (f.vx + wind) * dt;
                f.y += f.vy * dt;
                if (Math.abs(f.x - CX) < A) {
                    const sy = surfY(f.x);
                    // 위에서 내려와 면을 지난 눈만 닿는다 — 옆으로 들어온 눈은 우산 밑을 지나간다
                    if (prevY <= sy && f.y >= sy) {
                        const n = normalAt(f.x, sy);
                        f.dir = f.x >= CX ? 1 : -1;
                        // 접선 — 내리막 쪽(아래로 향하는 쪽)으로 잡는다
                        const tx = f.dir * -n[1];
                        const ty = f.dir * n[0];
                        // 법선 성분은 없애고 접선 성분의 0.6 만 속도로 남긴다
                        f.speed = Math.max(0, (f.vx + wind) * tx + f.vy * ty) * 0.6;
                        f.y = sy;
                        f.mode = 1;
                    }
                }
                if (f.y >= GROUND_Y - ground[clamp(Math.floor(f.x / BIN_W), 0, BINS - 1)]) { land(f); }
            } else if (f.mode === 1) {
                sliding += 1;
                const n = normalAt(f.x, f.y);
                const tx = f.dir * -n[1];
                const ty = f.dir * n[0];
                f.speed += (SLIDE_G * ty - FRICTION * f.speed) * dt;
                if (f.speed < 8) { f.speed = 8; }
                f.x += tx * f.speed * dt;
                if (Math.abs(f.x - CX) >= A * 0.995) {
                    f.vx = tx * f.speed;
                    f.vy = Math.max(30, ty * f.speed);
                    f.mode = 2;
                    droppedTotal += 1;
                } else {
                    f.y = surfY(f.x);
                }
            } else {
                f.vy += 380 * dt;
                f.x += f.vx * dt;
                f.y += f.vy * dt;
                if (f.y >= GROUND_Y - ground[clamp(Math.floor(f.x / BIN_W), 0, BINS - 1)]) { land(f); }
            }
        }
        slidingNow = sliding;
    }
    function draw(): void {
        skyFill([120, 124, 176], [200, 204, 232]);
        // 바닥
        box(0, GROUND_Y, W, H - GROUND_Y, 0, DUSK, 1);
        // 우산 밑 그늘 — 바닥에 그늘 타원만 깐다(눈을 막지는 않는다)
        ctx.beginPath();
        ctx.ellipse(CX, GROUND_Y + 8, A * 0.95, 10, 0, 0, TAU);
        ctx.fillStyle = rgba(DUSK_DEEP, 0.55);
        ctx.fill();
        // 바닥에 쌓인 눈
        ctx.beginPath();
        ctx.moveTo(0, GROUND_Y);
        for (let b = 0; b < BINS; b += 1) {
            ctx.lineTo(b * BIN_W, GROUND_Y - ground[b]);
            ctx.lineTo((b + 1) * BIN_W, GROUND_Y - ground[b]);
        }
        ctx.lineTo(W, GROUND_Y);
        ctx.closePath();
        ctx.fillStyle = rgba(SNOW, 1);
        ctx.fill();
        // 손잡이
        seg(CX, CY, CX, CY + 98, 4, INK, 1);
        ctx.beginPath();
        ctx.arc(CX - 10, CY + 98, 10, 0, Math.PI);
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.strokeStyle = rgba(INK, 1);
        ctx.stroke();
        // 우산 살 — 일곱 개. 지붕 아래 가장자리는 물결
        ctx.beginPath();
        ctx.moveTo(CX - A, CY);
        for (let k = 0; k <= 120; k += 1) {
            ctx.lineTo(CX + A * Math.cos(Math.PI * (1 - k / 120)), CY - B * Math.sin(Math.PI * (1 - k / 120)));
        }
        for (let k = 7; k >= 0; k -= 1) {
            ctx.quadraticCurveTo(CX - A + (k + 0.5) * (2 * A / 8), CY + 9, CX - A + k * (2 * A / 8), CY);
        }
        ctx.closePath();
        ctx.fillStyle = rgba(ROSE, 1);
        ctx.fill();
        for (let k = 1; k < 8; k += 1) {
            const ang = Math.PI * (1 - k / 8);
            seg(CX, CY - B - 2 + 6, CX + A * Math.cos(ang), CY - B * Math.sin(ang), 1.5, [190, 122, 142], 0.8);
        }
        // 눈송이
        for (const f of flakes) {
            if (f.mode === 2) {
                // 방울 — 아래로 길쭉한 물방울 모양
                seg(f.x, f.y - Math.min(7, f.vy * 0.02), f.x, f.y, f.s * 1.2, WATER, 0.95);
            } else {
                flakeDot(f.x, f.y - (f.mode === 1 ? 1.5 : 0), f.s, f.mode === 1 ? 0 : 0.8, SNOW, 0.95);
            }
        }
    }
    function statusText(): string {
        return '미끄러지는 눈 {n}알 · 가장자리에서 떨어진 눈 {m}알'.replace('{n}', String(slidingNow)).replace('{m}', String(droppedTotal));
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
          <canvas className={cx("vj__canvas")} data-role="canvas" width={480} height={300} role="img" aria-label={'우산 곡면의 법선 방향 속도를 감쇠하고 접선 방향만 남겨 눈이 우산 면을 따라 미끄러지다 가장자리에서 방울로 떨어지고, 우산 밑 바닥에는 그늘이 진다'}></canvas>
        </div>
        <p className={cx("vj__status")} data-role="status" aria-live="off">{'눈 내리는 장면'}</p>
        <button className={cx("vj__pause")} data-role="pause" type="button" aria-pressed="false">{'일시정지'}</button>
    </div>
  );
}
