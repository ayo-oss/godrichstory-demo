// PointerWindSwirlField - vanilla 판(05-aur-pointer-wind-swirl-field) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./PointerWindSwirlField.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function PointerWindSwirlField() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const root: HTMLElement = rootEl;
    type RGB = [number, number, number];
    type Pt = [number, number];
    type Rect = { x: number; y: number; w: number; h: number };
    type PixelBuffer = { cv: HTMLCanvasElement; c: CanvasRenderingContext2D; img: ImageData; w: number; h: number };
    // 장면 좌표 — 캔버스 내부는 이 크기 x 배율(dpr)로 잡고, 그림은 늘 480x300 좌표로 그린다
    const W = 480;
    const H = 300;
    // 고정 틱(ms) — 화면 주사율과 상관없이 같은 빠르기로 흐른다
    const FIXED_DT = 16;
    const TAU = Math.PI * 2;
    // 동작 줄이기에서 멈춰 둘 장면 시각(ms) — 이 시각의 한 장면만 그린다
    const STILL_MS = 5200;
    // 밤하늘 — 위는 짙은 남색, 지평선 쪽은 한 단계 밝은 남보라
    const SKY_TOP: RGB = [8, 10, 24];
    const SKY_LOW: RGB = [24, 28, 60];
    // 오로라 빛 — 채도를 낮춘 파스텔이지만 어두운 하늘과의 명도 차는 크게 둔다
    const MINT: RGB = [150, 240, 200];
    const TEAL: RGB = [126, 214, 236];
    const VIOLET: RGB = [192, 168, 255];
    const PINK: RGB = [255, 178, 214];
    function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
    function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
    // 부드러운 계단 3x² - 2x³ — 0 과 1 에서 기울기가 0 이라 이음매가 보이지 않는다
    function smooth(x: number): number { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); }
    function mix(a: RGB, b: RGB, k: number): RGB { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
    function rgba(c: RGB, a: number): string {
        return 'rgba(' + Math.round(clamp(c[0], 0, 255)) + ',' + Math.round(clamp(c[1], 0, 255)) + ',' + Math.round(clamp(c[2], 0, 255)) + ',' + clamp(a, 0, 1).toFixed(3) + ')';
    }
    // 시드 고정 난수 — 같은 시드면 같은 배치가 다시 나온다 (32비트 정수 섞기)
    function makeRng(seed: number): () => number {
        let s = seed >>> 0;
        return function (): number {
            s = (s + 0x6d2b79f5) >>> 0;
            let t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    // 격자점 해시 — 정수 좌표 (ix, iy) 와 시드에서 0..1 값 하나를 만든다. 같은 점은 언제나 같은 값
    function hash2(ix: number, iy: number, seed: number): number {
        let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1013904223)) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        h ^= h >>> 16;
        return (h >>> 0) / 4294967296;
    }
    // 값 노이즈 — 정수 격자점마다 해시 값을 두고, 칸 안에서는 네 모서리 값을 부드러운 계단으로 보간한다. 결과 0..1
    function noise2(x: number, y: number, seed: number): number {
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        const fx = x - ix;
        const fy = y - iy;
        const u = fx * fx * (3 - 2 * fx);
        const v = fy * fy * (3 - 2 * fy);
        const a = hash2(ix, iy, seed);
        const b = hash2(ix + 1, iy, seed);
        const c = hash2(ix, iy + 1, seed);
        const d = hash2(ix + 1, iy + 1, seed);
        return lerp(lerp(a, b, u), lerp(c, d, u), v);
    }
    // 옥타브 합 — 주파수를 두 배로, 세기를 절반으로 줄여 가며 n 겹 더한 뒤 세기 합으로 나눈다. 결과 0..1
    function octaves(x: number, y: number, n: number, seed: number): number {
        let sum = 0;
        let amp = 0.5;
        let norm = 0;
        let f = 1;
        for (let k = 0; k < n; k += 1) {
            sum += amp * noise2(x * f + k * 17.13, y * f + k * 9.71, seed + k * 31);
            norm += amp;
            amp *= 0.5;
            f *= 2;
        }
        return sum / norm;
    }
    function textOf(el: HTMLElement): string { return (el.textContent || '').trim(); }
    const canvasEl = root.querySelector('[data-role="canvas"]') as HTMLCanvasElement | null;
    const statusEl = root.querySelector('[data-role="status"]') as HTMLElement | null;
    const pauseEl = root.querySelector('[data-role="pause"]') as HTMLButtonElement | null;
    const ctxRaw = canvasEl ? canvasEl.getContext('2d') : null;
    if (!canvasEl || !ctxRaw || !statusEl || !pauseEl) { return; }
    const cv: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctxRaw;
    const status: HTMLElement = statusEl;
    const pauseBtn: HTMLButtonElement = pauseEl;
    // 화면 글자는 DOM 에 있다 — 문구를 바꾸면 버튼·상태 줄도 같이 바뀐다
    const STATUS0 = textOf(status);
    const PAUSE_LABEL = textOf(pauseBtn);
    const RESUME_LABEL = '움직임 다시 켜기';
    const TXT_PAUSED = '멈췄어요 — 버튼으로 다시 켜기';
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    // 페이지를 연 채 동작 줄이기 설정을 바꿔도 아래 change 리스너가 이 값을 다시 읽는다
    let still = reduceQuery.matches;
    // 사람이 멈춤 버튼을 눌렀는가
    let paused = false;
    // 자동 시연 중인가 — 사람이 처음 만지는 순간 시연을 멈추고 상태 줄을 읽어 주기 시작한다
    let demo = root.classList.contains('is-demo');
    function wake(): void {
        if (!demo) { return; }
        demo = false;
        root.classList.remove('is-demo');
        status.setAttribute('aria-live', 'polite');
    }
    function say(text: string): void {
        if (status.textContent !== text) { status.textContent = text; }
    }
    // 캔버스 배율 — 화면 배율을 따르되 2 에서 자른다(배율 3 기기에서 픽셀 일이 2.25배로 늘지 않게)
    let dpr = 1;
    function fitCanvas(): void {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
    }
    function begin(): void {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
    }
    // 작은 픽셀 버퍼 — 계산은 이 크기에서 하고 화면에는 늘려 그린다
    function makeBuffer(w: number, h: number): PixelBuffer {
        const b = document.createElement('canvas');
        b.width = w;
        b.height = h;
        const c = b.getContext('2d') as CanvasRenderingContext2D;
        return { cv: b, c: c, img: c.createImageData(w, h), w: w, h: h };
    }
    // 버퍼를 무대 크기로 키워 더한다 — 늘릴 때 브라우저의 이미지 보간이 칸 사이를 메우고, 'lighter' 는 밤하늘 위에 빛을 더한다
    function blitBuffer(b: PixelBuffer, x: number, y: number, w: number, h: number): void {
        b.c.putImageData(b.img, 0, 0);
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(b.cv, x, y, w, h);
        ctx.restore();
    }
    // 높이 y 에서 하늘 색 — 버퍼 계산에서 밝기를 잴 때도 같은 식을 쓴다
    function skyAt(y: number, h: number): RGB { return mix(SKY_TOP, SKY_LOW, clamp(y / h, 0, 1)); }
    function drawSky(c: CanvasRenderingContext2D, w: number, h: number): void {
        const g = c.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, rgba(SKY_TOP, 1));
        g.addColorStop(1, rgba(SKY_LOW, 1));
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
    }
    // 장면 시계(ms) — rAF 루프가 고정 틱으로만 늘린다. 동작 줄이기에서는 STILL_MS 에 멈춘다
    let simMs = 0;
    function nowS(): number { return simMs / 1000; }
    function toScene(ev: PointerEvent): Pt {
        const r = cv.getBoundingClientRect();
        return [(ev.clientX - r.left) / Math.max(1, r.width) * W, (ev.clientY - r.top) / Math.max(1, r.height) * H];
    }
    // 겹치는 DOM 층의 자리 — 장면 좌표를 무대 백분율로 바꿔 넣는다
    function place(el: HTMLElement, r: Rect): void {
        el.style.left = (r.x / W * 100).toFixed(3) + '%';
        el.style.top = (r.y / H * 100).toFixed(3) + '%';
        el.style.width = (r.w / W * 100).toFixed(3) + '%';
        el.style.height = (r.h / H * 100).toFixed(3) + '%';
    }
    // 소용돌이 결 — 장면 1px 당 퍼텐셜 노이즈 좌표가 움직이는 양. 작을수록 소용돌이가 크다
    const SWIRL_SCALE = 0.006;
    // 포인터 바람 세기 — 포인터 속도(px/틱)에 이 값을 곱해 반경 안의 가루를 민다
    const POINTER_WIND = 2.4;
    // 빛 가루 수
    const DUST_COUNT = 900;
    // 바람이 닿는 반경(px) — 거리 d 에서 세기 x exp(-d²/반경²)
    const WIND_RADIUS = 80;
    // 흐름 빠르기 — 흐름장 크기 1 일 때 한 틱에 가는 거리(px)
    const FLOW_SPEED = 1.4;
    // 자취 지우기 — 틱마다 자취 캔버스를 이 알파의 검정으로 덮는다(작을수록 꼬리가 길다)
    const TRAIL_FADE = 0.09;
    // 편미분 간격(px) — 퍼텐셜을 양옆 이만큼에서 읽어 기울기를 잰다
    const CURL_EPS = 1.5;
    // 처음 자취를 채워 두는 틱 수
    const WARM_TICKS = 120;
    // 동작 줄이기·멈춤에서 입력이 들어오면 이만큼만 계산해 한 장을 그린다
    const SNAP_TICKS = 24;
    // 포인터 속도 상한(px/틱) — 포인터가 무대 밖에서 돌아올 때의 순간이동을 바람으로 치지 않는다
    const WIND_CAP = 12;
    const dustX = new Float32Array(DUST_COUNT);
    const dustY = new Float32Array(DUST_COUNT);
    const dustLife = new Float32Array(DUST_COUNT);
    const rng05 = makeRng(505);
    // 가상 포인터 위상 — 시드 고정이라 렌더마다 같은 길을 돈다
    const vpPhase: number[] = [rng05() * TAU, rng05() * TAU];
    const trail05: HTMLCanvasElement = document.createElement('canvas');
    const trailCtx05 = trail05.getContext('2d') as CanvasRenderingContext2D;
    const flowTmp: number[] = [0, 0];
    const DUST_COLORS: string[] = [rgba(VIOLET, 0.42), rgba(TEAL, 0.42), rgba(MINT, 0.42), rgba(PINK, 0.38)];
    const dustBucket = new Uint8Array(DUST_COUNT);
    let ptr: Pt = [W / 2, H / 2];
    let prevPtr: Pt = [W / 2, H / 2];
    let live = false;
    let keyLive = false;
    const windV: number[] = [0, 0];
    function virtualPointer(t: number): Pt {
        return [W / 2 + 175 * Math.sin(t * 1.3 + vpPhase[0]), H / 2 + 85 * Math.sin(t * 2.05 + vpPhase[1])];
    }
    // 퍼텐셜 ψ — 값 노이즈 옥타브 합(2겹). 시간은 세로 좌표로 천천히 흘린다
    function potential(x: number, y: number, t: number): number {
        return octaves(x * SWIRL_SCALE, y * SWIRL_SCALE + t * 0.05, 2, 501);
    }
    // 회전 흐름장 — v = (∂ψ/∂y, -∂ψ/∂x). 퍼텐셜 등고선을 따라 흐르므로 발산이 0 — 가루가 한곳에 뭉치거나 비지 않는다
    function flow(x: number, y: number, t: number, out: number[]): void {
        const e = CURL_EPS;
        const dPdy = (potential(x, y + e, t) - potential(x, y - e, t)) / (2 * e);
        const dPdx = (potential(x + e, y, t) - potential(x - e, y, t)) / (2 * e);
        out[0] = dPdy / SWIRL_SCALE;
        out[1] = -dPdx / SWIRL_SCALE;
    }
    function respawn(i: number): void {
        dustX[i] = rng05() * W;
        dustY[i] = rng05() * H;
        dustLife[i] = 1.5 + rng05() * 4;
    }
    function sizeTrail05(): void {
        const w = Math.round(W * dpr);
        const h = Math.round(H * dpr);
        if (trail05.width !== w || trail05.height !== h) {
            trail05.width = w;
            trail05.height = h;
        }
        trailCtx05.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function windSource(t: number): Pt { return live ? ptr : virtualPointer(t); }
    function stepDust(t: number, dt: number): void {
        const src = windSource(t);
        // 포인터 속도 — 지난 틱과의 차를 저역 필터로 고른다
        windV[0] = lerp(windV[0], clamp(src[0] - prevPtr[0], -WIND_CAP, WIND_CAP), 0.35);
        windV[1] = lerp(windV[1], clamp(src[1] - prevPtr[1], -WIND_CAP, WIND_CAP), 0.35);
        prevPtr = [src[0], src[1]];
        const tc = trailCtx05;
        tc.globalCompositeOperation = 'source-over';
        tc.fillStyle = 'rgba(0,0,0,' + TRAIL_FADE + ')';
        tc.fillRect(0, 0, W, H);
        const r2 = WIND_RADIUS * WIND_RADIUS;
        for (let i = 0; i < DUST_COUNT; i += 1) {
            flow(dustX[i], dustY[i], t, flowTmp);
            let vx = flowTmp[0] * FLOW_SPEED;
            let vy = flowTmp[1] * FLOW_SPEED;
            const ox = dustX[i] - src[0];
            const oy = dustY[i] - src[1];
            const fall = Math.exp(-(ox * ox + oy * oy) / r2);
            vx += windV[0] * POINTER_WIND * fall;
            vy += windV[1] * POINTER_WIND * fall;
            dustX[i] += vx;
            dustY[i] += vy;
            dustLife[i] -= dt / 1000;
            if (dustLife[i] < 0 || dustX[i] < -4 || dustX[i] > W + 4 || dustY[i] < -4 || dustY[i] > H + 4) { respawn(i); }
            dustBucket[i] = Math.min(3, Math.floor(clamp(dustY[i] / H, 0, 0.999) * 3 + (i % 9 === 0 ? 1 : 0)));
        }
        // 가산 합성 — 겹친 자리가 밝아져 흐름을 따라 빛의 띠가 생긴다. 색 묶음마다 fillStyle 을 한 번만 바꾼다
        tc.globalCompositeOperation = 'lighter';
        for (let b = 0; b < 4; b += 1) {
            tc.fillStyle = DUST_COLORS[b];
            for (let i = 0; i < DUST_COUNT; i += 1) {
                if (dustBucket[i] === b) { tc.fillRect(dustX[i] - 0.9, dustY[i] - 0.9, 1.8, 1.8); }
            }
        }
    }
    function itemInit(): void {
        sizeTrail05();
        for (let i = 0; i < DUST_COUNT; i += 1) { respawn(i); }
        prevPtr = virtualPointer(-WARM_TICKS * FIXED_DT / 1000);
        for (let k = 0; k < WARM_TICKS; k += 1) { stepDust((k - WARM_TICKS) * FIXED_DT / 1000, FIXED_DT); }
    }
    function itemStep(dt: number): void { stepDust(nowS(), dt); }
    function itemDraw(): void {
        if (trail05.width !== Math.round(W * dpr)) { sizeTrail05(); }
        drawSky(ctx, W, H);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(trail05, 0, 0, W, H);
        // 바람 자리 — 포인터(또는 가상 포인터) 둘레의 옅은 빛
        const src = windSource(nowS());
        const g = ctx.createRadialGradient(src[0], src[1], 0, src[0], src[1], WIND_RADIUS);
        g.addColorStop(0, rgba(TEAL, 0.16));
        g.addColorStop(1, rgba(TEAL, 0));
        ctx.fillStyle = g;
        ctx.fillRect(src[0] - WIND_RADIUS, src[1] - WIND_RADIUS, WIND_RADIUS * 2, WIND_RADIUS * 2);
        ctx.restore();
    }
    function itemDemo(t: number): void { }
    function itemStatus(): string { return live ? '바람이 빛 가루를 휘감아요' : STATUS0; }
    function itemSnap(): void {
        for (let k = 0; k < SNAP_TICKS; k += 1) { stepDust(nowS(), FIXED_DT); }
    }
    function itemPointer(p: Pt, on: boolean): boolean {
        if (on) {
            if (!live) { prevPtr = [p[0], p[1]]; }
            live = true;
            keyLive = false;
            ptr = p;
            return true;
        }
        if (!keyLive) {
            live = false;
            prevPtr = virtualPointer(nowS());
        }
        return false;
    }
    // 화살표 키 — 바람 자리를 24px 씩 옮긴다. 옮긴 만큼이 그 틱의 포인터 속도라 바람이 인다
    function itemKey(key: string): boolean {
        const d: Pt = key === 'ArrowLeft' ? [-24, 0] : key === 'ArrowRight' ? [24, 0] : key === 'ArrowUp' ? [0, -24] : key === 'ArrowDown' ? [0, 24] : [0, 0];
        if (d[0] === 0 && d[1] === 0) { return false; }
        if (!live) { ptr = virtualPointer(nowS()); prevPtr = [ptr[0], ptr[1]]; }
        live = true;
        keyLive = true;
        ptr = [clamp(ptr[0] + d[0], 0, W), clamp(ptr[1] + d[1], 0, H)];
        return true;
    }
    function render(): void {
        begin();
        itemDraw();
        if (!paused) { say(itemStatus()); }
    }
    // 루프가 멈춰 있을 때(동작 줄이기·멈춤) 입력이 들어오면 — 움직이던 값을 목표로 바로 옮겨 한 장 그린다
    function after(): void {
        if (rafId) { return; }
        itemSnap();
        render();
    }
    function setPaused(p: boolean): void {
        paused = p;
        pauseBtn.setAttribute('aria-pressed', p ? 'true' : 'false');
        pauseBtn.textContent = p ? RESUME_LABEL : PAUSE_LABEL;
        if (p) {
            stopLoop();
            say(TXT_PAUSED);
        } else {
            say(itemStatus());
            startLoop();
        }
    }
    pauseBtn.addEventListener('click', function (): void { wake(); setPaused(!paused); });
    cv.addEventListener('pointermove', function (ev: PointerEvent): void {
        if (itemPointer(toScene(ev), true)) { wake(); after(); }
    });
    cv.addEventListener('pointerdown', function (ev: PointerEvent): void {
        wake();
        if (itemPointer(toScene(ev), true)) { after(); }
    });
    cv.addEventListener('pointerleave', function (): void { itemPointer([W / 2, H / 2], false); });
    root.addEventListener('keydown', function (ev: KeyboardEvent): void {
        if (ev.target !== root) { return; }
        if (itemKey(ev.key)) {
            ev.preventDefault();
            wake();
            after();
        }
    });
    function onResize(): void {
        fitCanvas();
        render();
    }
    fitCanvas();
    itemInit();
    window.addEventListener('resize', onResize);
    let rafId = 0;
    let lastTs = -1;
    let acc = 0;
    function frame(ts: number): void {
        if (still || paused) { rafId = 0; return; }
        if (lastTs < 0) { lastTs = ts; }
        // 탭이 숨었다 돌아와도 한 번에 100ms 까지만 따라잡는다 — 순간이동 대신 이어서 움직인다
        acc += Math.min(ts - lastTs, 100);
        lastTs = ts;
        let n = 0;
        while (acc >= FIXED_DT && n < 6) {
            simMs += FIXED_DT;
            if (demo) { itemDemo(simMs); }
            itemStep(FIXED_DT);
            acc -= FIXED_DT;
            n += 1;
        }
        if (n === 6) { acc = 0; }
        render();
        rafId = window.requestAnimationFrame(frame);
    }
    function startLoop(): void {
        if (rafId || still || paused) { return; }
        lastTs = -1;
        acc = 0;
        rafId = window.requestAnimationFrame(frame);
    }
    function stopLoop(): void {
        if (rafId) { window.cancelAnimationFrame(rafId); rafId = 0; }
    }
    // 동작 줄이기 설정이 페이지를 연 채 바뀌면 — 켜지면 루프를 멈추고 그 순간 한 장면으로, 꺼지면 루프를 다시 돈다
    function onMotionPref(): void {
        still = reduceQuery.matches;
        pauseBtn.hidden = still;
        if (still) {
            stopLoop();
            itemSnap();
            render();
        } else {
            startLoop();
        }
    }
    if (typeof reduceQuery.addEventListener === 'function') { reduceQuery.addEventListener('change', onMotionPref); }
    pauseBtn.hidden = still;
    if (still) {
        // 동작 줄이기 — 노이즈 시간을 STILL_MS 에 세운 한 장면. 입력은 after() 가 그 자리에서 반영한다
        simMs = STILL_MS;
        itemSnap();
        render();
    } else {
        render();
        startLoop();
    }
    return function (): void {
        stopLoop();
        window.removeEventListener('resize', onResize);
        if (typeof reduceQuery.removeEventListener === 'function') { reduceQuery.removeEventListener('change', onMotionPref); }
    };
  }, []);

  return (
    <div className={cx("au") + " is-demo"} ref={rootRef} tabIndex={0} role="group" aria-label="빛 가루 무대 — 화살표 키로 바람 자리 옮기기">
        <canvas className={cx("au__canvas")} data-role="canvas" width={480} height={300} aria-hidden="true"></canvas>
        <button className={cx("au__pause")} data-role="pause" type="button" aria-pressed="false">움직임 멈추기</button>
        <p className={cx("au__status")} data-role="status" aria-live="off">포인터를 움직이면 바람이 일어요</p>
    </div>
  );
}
