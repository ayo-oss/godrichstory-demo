// GlobeShakeSettle - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./GlobeShakeSettle.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function GlobeShakeSettle() {
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
    // ── 05 흔들었다 가라앉는 눈 유리구슬 ──────────────────────────
    // 중력(px/초²)과 공기 저항 몫(1/초) — 끝 속도는 중력 ÷ 저항 = 약 50px/초
    const GRAVITY = 62;
    const DRAG = 1.25;
    // 흔들 때 눈에 주는 충격 크기(px/초)
    const SHAKE = 210;
    // 벽에서 튕길 때 법선 방향 속도가 반대로 남는 몫
    const RESTITUTION = 0.45;
    // 흔드는 시각표(초) — 사람이 아니라 시간표로 고정한다
    const SHAKE_AT: number[] = [0.25, 3.6];
    const GRAINS = 240;
    const LOOP_S = 7;
    const REST_STEPS = 150;
    const CX = 240;
    const CY = 140;
    const R = 116;
    // 바닥 눈더미 구간 — 구슬 안쪽 아래 호를 이 폭의 칸으로 나눈다
    const BIN_W = 8;
    const BINS = 26;
    const PILE_ADD = 1.5;
    // 바닥 접촉 여유(px) — 비스듬한 벽에 닿은 눈알도 바닥에 닿은 것으로 센다
    const FLOOR_SLACK = 4;
    type Grain = { x: number; y: number; vx: number; vy: number; s: number };
    let grains: Grain[] = [];
    let pile: number[] = [];
    let rng = seeded(505);
    let shakeSeen = 0;
    let kick = 0;
    // 바닥 곡선 — 구슬 안쪽 아래 호의 높이
    function floorY(x: number): number { return CY + Math.sqrt(Math.max(0, (R - 4) * (R - 4) - (x - CX) * (x - CX))); }
    function binOf(x: number): number { return clamp(Math.floor((x - (CX - BINS * BIN_W / 2)) / BIN_W), 0, BINS - 1); }
    function binX(b: number): number { return CX - BINS * BIN_W / 2 + (b + 0.5) * BIN_W; }
    function reset(): void {
        rng = seeded(505);
        grains = [];
        pile = [];
        shakeSeen = 0;
        kick = 0;
        for (let b = 0; b < BINS; b += 1) { pile.push(0); }
        // 처음에는 모든 눈이 바닥에 가라앉아 있다 — 가운데가 높은 더미로 시작
        for (let i = 0; i < GRAINS; i += 1) {
            const b = clamp(Math.round(BINS / 2 + (rng() + rng() + rng() - 1.5) * 6), 0, BINS - 1);
            pile[b] += PILE_ADD;
        }
    }
    function releasePile(): void {
        // 흔들면 쌓인 눈이 모두 입자로 돌아와 충격을 받는다
        for (let b = 0; b < BINS; b += 1) {
            const n = Math.round(pile[b] / PILE_ADD);
            for (let k = 0; k < n; k += 1) {
                const x = binX(b) + (rng() - 0.5) * BIN_W;
                grains.push({ x: x, y: floorY(x) - 2 - rng() * pile[b], vx: 0, vy: 0, s: 1.2 + rng() * 1.5 });
            }
            pile[b] = 0;
        }
    }
    function update(dt: number): void {
        // 시각표를 지난 흔들기마다 한 번씩 충격
        while (shakeSeen < SHAKE_AT.length && sceneT >= SHAKE_AT[shakeSeen]) {
            shakeSeen += 1;
            kick = 1;
            releasePile();
            for (const g of grains) {
                g.vx += (rng() - 0.5) * 2 * SHAKE;
                g.vy += (rng() - 0.75) * 2 * SHAKE;
            }
        }
        kick = Math.max(0, kick - dt * 2.4);
        const wind = userWind() * 40;
        const rest: Grain[] = [];
        for (const g of grains) {
            g.vy += GRAVITY * dt;
            g.vx += wind * dt;
            // 공기 저항 — 속도에 비례해 깎는다
            const drag = Math.exp(-DRAG * dt);
            g.vx *= drag;
            g.vy *= drag;
            g.x += g.vx * dt;
            g.y += g.vy * dt;
            const dx = g.x - CX;
            const dy = g.y - CY;
            const d = Math.hypot(dx, dy);
            const lim = R - 5 - g.s;
            if (d > lim) {
                // 벽 반사 — 바깥으로 향하는 법선 방향 속도 성분만 뒤집고 RESTITUTION 만큼 남긴다
                const nx = dx / d;
                const ny = dy / d;
                const vn = g.vx * nx + g.vy * ny;
                if (vn > 0) {
                    g.vx -= (1 + RESTITUTION) * vn * nx;
                    g.vy -= (1 + RESTITUTION) * vn * ny;
                }
                g.x = CX + nx * lim;
                g.y = CY + ny * lim;
            }
            const b = binOf(g.x);
            if (g.y + g.s >= floorY(g.x) - pile[b] - 1 - FLOOR_SLACK && Math.hypot(g.vx, g.vy) < 40) {
                pile[b] += PILE_ADD;
            } else {
                rest.push(g);
            }
        }
        grains = rest;
        // 더미 평탄화 — 이웃보다 두 알(PILE_ADD 의 2배) 넘게 차이 나면 차이의 4분의 1 을 낮은 쪽으로 옮긴다
        for (let pass = 0; pass < 2; pass += 1) {
            for (let b = 0; b < BINS - 1; b += 1) {
                const diff = pile[b] - pile[b + 1];
                if (Math.abs(diff) > PILE_ADD * 2) {
                    const m = diff * 0.25;
                    pile[b] -= m;
                    pile[b + 1] += m;
                }
            }
        }
    }
    function draw(): void {
        skyFill(NIGHT_TOP, NIGHT_BOT);
        ctx.save();
        // 흔들림 — 충격 직후 구슬 전체가 잠깐 떤다
        ctx.translate(Math.sin(sceneT * 70) * 4 * kick, Math.cos(sceneT * 61) * 3 * kick);
        // 받침
        box(CX - 96, CY + R - 12, 192, 54, 10, DUSK_DEEP, 1);
        box(CX - 96, CY + R - 12, 192, 7, 3, ROSE, 1);
        // 구슬 안
        ctx.save();
        ctx.beginPath();
        ctx.arc(CX, CY, R, 0, TAU);
        ctx.clip();
        skyFill(mix(SKY_TOP, NIGHT_BOT, 0.2), SKY_BOT);
        // 안쪽 작은 마을 실루엣
        for (let i = 0; i < 6; i += 1) {
            const bx = CX - 80 + i * 30;
            box(bx, CY + 52 - (i % 3) * 10, 22, 70, 2, DUSK, 1);
            box(bx + 6, CY + 60 - (i % 3) * 10, 5, 7, 1, LAMP, 0.9);
        }
        // 쌓인 눈
        ctx.beginPath();
        ctx.moveTo(CX - BINS * BIN_W / 2, CY + R);
        for (let b = 0; b < BINS; b += 1) {
            const x = binX(b);
            ctx.lineTo(x, floorY(x) - pile[b]);
        }
        ctx.lineTo(CX + BINS * BIN_W / 2, CY + R);
        ctx.closePath();
        ctx.fillStyle = rgba(SNOW, 1);
        ctx.fill();
        for (const g of grains) { flakeDot(g.x, g.y, g.s, 0, SNOW, 0.95); }
        ctx.restore();
        // 유리 테두리와 반사
        ring(CX, CY, R, 3, SNOW, 0.7);
        ctx.beginPath();
        ctx.arc(CX, CY, R - 10, Math.PI * 1.08, Math.PI * 1.36);
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = rgba(SNOW, 0.55);
        ctx.stroke();
        ctx.restore();
    }
    function statusText(): string {
        let top = 0;
        for (const p of pile) { top = Math.max(top, p); }
        return '떠다니는 눈 {n}알 · 바닥 눈 높이 {h}px'.replace('{n}', String(grains.length)).replace('{h}', String(Math.round(top)));
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
          <canvas className={cx("vj__canvas")} data-role="canvas" width={480} height={300} role="img" aria-label={'정해진 시각표대로 흔들린 유리구슬 안에서 눈 입자가 벽에 튕겨 흩날리다 공기 저항으로 느려져 바닥에 천천히 가라앉아 쌓인다'}></canvas>
        </div>
        <p className={cx("vj__status")} data-role="status" aria-live="off">{'눈 내리는 장면'}</p>
        <button className={cx("vj__pause")} data-role="pause" type="button" aria-pressed="false">{'일시정지'}</button>
    </div>
  );
}
