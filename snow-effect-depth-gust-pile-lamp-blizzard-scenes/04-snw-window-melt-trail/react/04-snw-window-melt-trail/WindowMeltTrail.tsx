// WindowMeltTrail - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./WindowMeltTrail.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function WindowMeltTrail() {
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
    // ── 04 창유리에 닿아 녹는 눈 ─────────────────────────────────
    // 유리 격자 한 칸(px) — 물기 w 는 칸마다 0 ~ 1
    const CELL = 4;
    const GC = W / CELL;
    const GR = H / CELL;
    // 물기가 마르는 빠르기(1/초) — 클수록 물줄기 자국이 빨리 사라진다
    const EVAP = 0.55;
    // 방울 한 개가 가진 물의 양 범위(질량)
    const MASS_MIN = 0.5;
    const MASS_MAX = 1.3;
    // 칸에 남기는 물기와 방울이 줄이는 질량 몫(칸당)
    const TRAIL_WET = 0.85;
    const TRAIL_COST = 0.024;
    const LAND_PER_S = 20;
    const FLAKES = 70;
    const LOOP_S = 6;
    const REST_STEPS = 45;
    let water: number[] = [];
    type Drop = { x: number; y: number; m: number; wait: number };
    type Land = { x: number; y: number; age: number };
    type Out = { x: number; y: number; v: number; s: number };
    let drops: Drop[] = [];
    let lands: Land[] = [];
    let outside: Out[] = [];
    let rng = seeded(404);
    let carry = 0;
    // 안쪽 불빛 — 유리 건너편 카페의 보케 위치와 색
    const BOKEH: number[][] = [];
    // 김서림 층 — 따로 그려 두고 물기가 있는 곳만 뚫어 건너편이 보이게
    const fogCv = document.createElement('canvas');
    fogCv.width = W;
    fogCv.height = H;
    const fogCtxRaw = fogCv.getContext('2d');
    if (!fogCtxRaw) { return; }
    const fogCtx: CanvasRenderingContext2D = fogCtxRaw;
    function reset(): void {
        rng = seeded(404);
        water = [];
        for (let i = 0; i < GC * GR; i += 1) { water.push(0); }
        drops = [];
        lands = [];
        outside = [];
        carry = 0;
        BOKEH.length = 0;
        const r = seeded(405);
        for (let i = 0; i < 22; i += 1) { BOKEH.push([r() * W, 20 + r() * 220, 10 + r() * 22, r()]); }
        for (let i = 0; i < FLAKES; i += 1) { outside.push({ x: rng() * W, y: rng() * H, v: 36 + rng() * 40, s: 0.8 + rng() * 1.6 }); }
        for (let k = 0; k < 36; k += 1) { update(1 / 30); }
    }
    function landOne(): void {
        const x = 12 + rng() * (W - 24);
        const y = 14 + rng() * (H * 0.55);
        lands.push({ x: x, y: y, age: 0 });
        // 닿은 칸이 먼저 젖는다
        const c = clamp(Math.floor(x / CELL), 0, GC - 1);
        const rr = clamp(Math.floor(y / CELL), 0, GR - 1);
        water[rr * GC + c] = Math.min(1, water[rr * GC + c] + 0.9);
        drops.push({ x: x, y: y, m: MASS_MIN + rng() * (MASS_MAX - MASS_MIN), wait: 0.15 + rng() * 0.2 });
    }
    function update(dt: number): void {
        const wind = userWind() * 24;
        for (const o of outside) {
            o.y += o.v * dt;
            o.x += wind * dt;
            if (o.y > H + 4) { o.y = -4; o.x = rng() * W; }
            if (o.x > W + 4) { o.x -= W + 8; }
            if (o.x < -4) { o.x += W + 8; }
        }
        carry += LAND_PER_S * dt;
        while (carry >= 1) { carry -= 1; landOne(); }
        for (const l of lands) { l.age += dt; }
        lands = lands.filter(function (l: Land): boolean { return l.age < 0.6; });
        // 중력 방향으로 번짐 — 방울은 질량이 클수록 빠르게 내려가며 지나간 칸을 적시고 질량을 잃는다
        for (const d of drops) {
            if (d.wait > 0) { d.wait -= dt; continue; }
            const v = 14 + 70 * d.m;
            const steps = Math.max(1, Math.round(v * dt / CELL));
            for (let s = 0; s < steps; s += 1) {
                d.y += v * dt / steps;
                d.x += Math.sin(d.y * 0.09 + d.m * 9) * 0.12;
                const c = clamp(Math.floor(d.x / CELL), 0, GC - 1);
                const rr = Math.floor(d.y / CELL);
                if (rr >= 0 && rr < GR) {
                    const i = rr * GC + c;
                    water[i] = Math.min(1, Math.max(water[i], TRAIL_WET));
                    d.m -= TRAIL_COST;
                }
            }
        }
        drops = drops.filter(function (d: Drop): boolean { return d.m > 0 && d.y < H; });
        const keep = Math.exp(-EVAP * dt);
        for (let i = 0; i < water.length; i += 1) { water[i] *= keep; }
    }
    function draw(): void {
        // 건너편 — 따뜻한 실내 바탕과 보케
        skyFill([146, 130, 182], [238, 204, 196]);
        for (const b of BOKEH) { disc(b[0], b[1], b[2], b[3] < 0.5 ? LAMP : ROSE, 0.55); }
        // 바깥 눈 — 유리 건너편에서 천천히 내린다
        for (const o of outside) { flakeDot(o.x, o.y, o.s, 1.6, SNOW, 0.8); }
        // 김서림 — 물기 칸만 뚫는다
        fogCtx.globalCompositeOperation = 'source-over';
        fogCtx.clearRect(0, 0, W, H);
        fogCtx.fillStyle = rgba(mix(SNOW_SHADE, SNOW, 0.4), 0.55);
        fogCtx.fillRect(0, 0, W, H);
        fogCtx.globalCompositeOperation = 'destination-out';
        for (let rr = 0; rr < GR; rr += 1) {
            for (let c = 0; c < GC; c += 1) {
                const w = water[rr * GC + c];
                if (w > 0.03) {
                    fogCtx.fillStyle = 'rgba(0,0,0,' + clamp(w * 1.1, 0, 1).toFixed(3) + ')';
                    fogCtx.fillRect(c * CELL, rr * CELL, CELL, CELL);
                }
            }
        }
        ctx.drawImage(fogCv, 0, 0);
        // 방울 머리 — 물줄기 끝의 밝은 점
        for (const d of drops) {
            if (d.wait <= 0) { disc(d.x, d.y, 2 + d.m * 1.4, WATER, 0.9); }
        }
        // 방금 닿은 눈 — 크게 보이다 줄어든다
        for (const l of lands) {
            const k = 1 - l.age / 0.6;
            flakeDot(l.x, l.y, 2 + 5 * k, 2, SNOW, 0.5 + 0.5 * k);
        }
        // 창틀
        box(0, 0, W, 6, 0, INK, 0.5);
        box(0, H - 8, W, 8, 0, INK, 0.5);
    }
    function statusText(): string {
        let wet = 0;
        for (let i = 0; i < water.length; i += 1) { if (water[i] > 0.08) { wet += 1; } }
        return '젖은 칸 {w}% · 흘러내리는 방울 {n}개'.replace('{w}', String(Math.round(wet / water.length * 100))).replace('{n}', String(drops.length));
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
          <canvas className={cx("vj__canvas")} data-role="canvas" width={480} height={300} role="img" aria-label={'김 서린 창유리에 눈송이가 닿아 녹으면 물방울이 아래로 흘러 맑은 물줄기 자국을 내고, 자국은 시간이 지나 마르며 건너편 카페 불빛이 비친다'}></canvas>
        </div>
        <p className={cx("vj__status")} data-role="status" aria-live="off">{'눈 내리는 장면'}</p>
        <button className={cx("vj__pause")} data-role="pause" type="button" aria-pressed="false">{'일시정지'}</button>
    </div>
  );
}
