// MblStaggerCombFeatherGrain - vanilla 판(05-mbl-stagger-comb-feather-grain) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./MblStaggerCombFeatherGrain.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function MblStaggerCombFeatherGrain() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const root: HTMLElement = rootEl;
    type RGB = [number, number, number];
    const W = 480;
    const H = 300;
    const FIXED_DT = 16;
    // 마블링 팔레트 — 종이 물면(PAPER) 위에 파스텔 잉크 결이 흐른다
    const PAPER: RGB = [252, 246, 234];
    const INK: RGB = [58, 48, 76];
    const MINT: RGB = [126, 226, 192];
    const SKY: RGB = [124, 196, 255];
    const LILAC: RGB = [190, 164, 255];
    const PINK: RGB = [255, 160, 190];
    const PEACH: RGB = [255, 208, 168];
    const TINTS: RGB[] = [SKY, PINK, MINT, LILAC, PEACH];
    function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
    function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
    function smooth(x: number): number { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); }
    function rgba(c: RGB, a: number): string {
        return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + clamp(a, 0, 1).toFixed(3) + ')';
    }
    function mix(a: RGB, b: RGB, k: number): RGB { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
    const canvasEl = root.querySelector('[data-role="canvas"]') as HTMLCanvasElement | null;
    const statusEl = root.querySelector('[data-role="status"]') as HTMLElement | null;
    const ctxRaw = canvasEl ? canvasEl.getContext('2d') : null;
    if (!canvasEl || !ctxRaw || !statusEl) { return; }
    const cv: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctxRaw;
    const status: HTMLElement = statusEl;
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const still = reduceQuery.matches;
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
    // 시연 시계가 loop 주기 안의 at 시각을 이번 스텝에 막 지났는가
    function crossed(t: number, at: number, loop: number): boolean {
        const p = t % loop;
        return p >= at && p - FIXED_DT < at;
    }
    function fitCanvas(): void {
        // 캔버스 내부 해상도는 480x300 고정, 배율은 devicePixelRatio 에 상한 2 를 둔다
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function onResize(): void {
        fitCanvas();
        draw();
    }
    fitCanvas();
    window.addEventListener('resize', onResize);
    // 화면 좌표(CSS px) → 장면 좌표(480x300). 리사이즈 뒤에도 늘 현재 크기로 다시 잰다
    function toScene(ev: PointerEvent): [number, number] {
        const r = cv.getBoundingClientRect();
        return [((ev.clientX - r.left) / r.width) * W, ((ev.clientY - r.top) / r.height) * H];
    }
    // ── 필드 버퍼(077 방식) — 항목이 정한 낮은 해상도 버퍼에 픽셀 값을 굽고 drawImage 로 부드럽게 확대한다
    const small = document.createElement('canvas');
    let sctx: CanvasRenderingContext2D | null = null;
    let buf: ImageData | null = null;
    let px: Uint8ClampedArray | null = null;
    // 종이 결은 시간이 지나도 안 변한다 — 필드를 만들 때 한 번만 구워 두고 픽셀마다 꺼내 쓴다
    let grainF: Float32Array = new Float32Array(0);
    function initField(nw: number, nh: number): void {
        small.width = nw;
        small.height = nh;
        const c = small.getContext('2d');
        if (!c) { return; }
        sctx = c;
        buf = c.createImageData(nw, nh);
        px = buf.data;
        grainF = new Float32Array(nw * nh);
        for (let y = 0; y < nh; y += 1) {
            for (let x = 0; x < nw; x += 1) { grainF[y * nw + x] = paperGrain(x * W / nw, y * H / nh); }
        }
    }
    function blitField(nw: number, nh: number): void {
        if (!sctx || !buf) { return; }
        sctx.putImageData(buf, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(small, 0, 0, nw, nh, 0, 0, W, H);
    }
    // ── 결정적 값노이즈 — 난수 소스를 못 쓰므로 정수 해시로 같은 시드에 같은 값
    const SEED = 463;
    function hash1(n: number, seed: number): number {
        let h = Math.imul(n ^ seed, 374761393);
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    }
    function hash2(x: number, y: number, seed: number): number {
        return hash1((Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) | 0, seed);
    }
    function fade(t: number): number { return t * t * (3 - 2 * t); }
    function vnoise2(x: number, y: number, seed: number): number {
        const xi = Math.floor(x), yi = Math.floor(y);
        const u = fade(x - xi), v = fade(y - yi);
        const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
        const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
        return lerp(lerp(a, b, u), lerp(c, d, u), v);
    }
    function fbm2(x: number, y: number, oct: number, seed: number): number {
        let sum = 0, amp = 0.5, norm = 0, f = 1;
        for (let i = 0; i < oct; i += 1) {
            sum += vnoise2(x * f, y * f, seed + i * 131) * amp;
            norm += amp;
            amp *= 0.5;
            f *= 2;
        }
        return sum / norm;
    }
    // 종이 결 — 옅은 얼룩으로 종이가 느껴지게 하는 바닥 값(0~1)
    function paperGrain(x: number, y: number): number {
        return fbm2(x * 0.021, y * 0.021, 3, 71);
    }
    // 05 깃털 — 반 칸 위상 어긋난 두 빗질 간섭, 만나는 지점 결 분기
    const COMB_TOOTH_GAP = 14;   // 빗 이빨 간격(px)
    const STAGGER_PHASE = 0.5;   // 두 번째 빗의 이빨을 첫 빗 이빨 사이 몇 칸 지점에 두나(반 칸 = 0.5)
    const FEATHER_SPLIT_K = 1.3; // 이빨 줄에서 멀어질 때 끌림이 줄어드는 빠르기 — 클수록 깃털 끝이 가늘게 갈라진다
    const COMB_SPEED = 0.9;      // 16ms 스텝마다 빗이 끌고 가는 거리(px)
    const COMB_MAX = 64;         // 빗 하나가 끝까지 끄는 거리(px)
    const BAND_PX = 16;          // 처음 깔린 가로 잉크 띠 한 줄 높이(px)
    const DEMO_LOOP = 3600;
    const FW = 240;
    const FH = 150;
    const TXT_UP = '윗결을 빗는 중';
    const TXT_DN = '아랫결을 반대로 빗는 중';
    const TXT_SPLIT = '만나는 지점에서 깃털로 갈라진다';
    let pull1 = 0;       // 첫 빗(아래로 끎) 누적 거리
    let pull2 = 0;       // 둘째 빗(위로 끎, 반 칸 어긋남) 누적 거리
    let target1 = 0;
    let target2 = 0;
    // 빗 이빨 한 줄이 잉크를 끄는 양 — 가장 가까운 이빨 줄까지 가로 거리 d 에서 amount·λ/(d+λ)
    function tineShift(x: number, offset: number, amount: number): number {
        const g = COMB_TOOTH_GAP;
        let u = (x - offset) / g;
        u -= Math.round(u);
        const d = Math.abs(u) * g;
        const lam = (g * 0.55) / FEATHER_SPLIT_K;
        return amount * lam / (d + lam);
    }
    // 화면 점이 빗질 전 어느 높이에 있던 잉크인가 — 두 빗 모두 세로로만 끌므로 y 만 되돌리면 된다
    function sourceY(x: number, y: number): number {
        return y - tineShift(x, 0, pull1) + tineShift(x, COMB_TOOTH_GAP * STAGGER_PHASE, pull2);
    }
    function draw(): void {
        if (!px || !sctx) { return; }
        const sx = W / FW, sy = H / FH;
        let i4 = 0;
        for (let y = 0; y < FH; y += 1) {
            const wy = (y + 0.5) * sy;
            for (let x = 0; x < FW; x += 1) {
                const wx = (x + 0.5) * sx;
                const g0 = grainF[y * FW + x];
                const base = mix(PAPER, INK, g0 * 0.07 + 0.015);
                // 처음 깔린 띠는 살짝 물결친다 — 완전한 직선이면 빗 자국이 기계처럼 보인다
                const sy0 = sourceY(wx, wy) + Math.sin(wx * 0.013) * 4;
                const f = sy0 / BAND_PX;
                const band = Math.floor(f);
                const fr = f - band;
                const tint = TINTS[((band % 5) + 5) % 5];
                let col = mix(base, tint, 0.62);
                if (((band % 2) + 2) % 2 === 1) { col = mix(base, tint, 0.26); }
                col = mix(col, INK, smooth((fr - 0.86) / 0.12) * 0.28);
                px[i4] = col[0]; px[i4 + 1] = col[1]; px[i4 + 2] = col[2]; px[i4 + 3] = 255;
                i4 += 4;
            }
        }
        blitField(FW, FH);
    }
    function settle(): void {
        pull1 = target1 = COMB_MAX;
        pull2 = target2 = COMB_MAX * 0.8;
        say(TXT_SPLIT);
    }
    function step(): void {
        if (pull1 < target1) { pull1 = Math.min(target1, pull1 + COMB_SPEED); }
        else if (pull2 < target2) { pull2 = Math.min(target2, pull2 + COMB_SPEED); }
        if (demo) {
            say(pull2 <= 0 ? TXT_UP : (pull2 < COMB_MAX * 0.5 ? TXT_DN : TXT_SPLIT));
        }
    }
    function comb(which: number): void {
        if (which === 1) { target1 = Math.min(target1 + 16, COMB_MAX * 2); } else { target2 = Math.min(target2 + 16, COMB_MAX * 2); }
        if (still) {
            pull1 = target1;
            pull2 = target2;
            draw();
        }
        say(which === 1 ? TXT_UP : TXT_DN);
    }
    function demoTick(t: number): void {
        // 첫 빗은 200ms 부터, 둘째 빗은 첫 빗이 끝나는 대로 이어서 — 2초 안에 두 빗질이 다 들어온다
        if (crossed(t, 200, DEMO_LOOP)) { pull1 = 0; pull2 = 0; target1 = COMB_MAX; target2 = COMB_MAX * 0.8; }
    }
    initField(FW, FH);
    const btn = root.querySelector('[data-role="btn"]') as HTMLButtonElement | null;
    if (btn) {
        btn.addEventListener('click', function (): void {
            wake();
            pull1 = 0;
            pull2 = 0;
            target1 = COMB_MAX;
            target2 = COMB_MAX * 0.8;
            if (still) { settle(); draw(); return; }
            say(TXT_UP);
        });
    }
    cv.addEventListener('pointerdown', function (ev: PointerEvent): void {
        wake();
        comb(toScene(ev)[1] < H / 2 ? 1 : 2);
    });
    cv.addEventListener('keydown', function (ev: KeyboardEvent): void {
        const k = ev.key;
        if (k !== 'ArrowUp' && k !== 'ArrowDown') { return; }
        ev.preventDefault();
        wake();
        comb(k === 'ArrowDown' ? 1 : 2);
    });

    let rafId = 0;
    let lastTs = -1;
    let acc = 0;
    let clock = 0;
    function frame(ts: number): void {
        if (lastTs < 0) { lastTs = ts; }
        // 탭이 숨었다 돌아와도 한 번에 100ms 까지만 따라잡는다 — 순간이동 대신 이어서 움직인다
        acc += Math.min(ts - lastTs, 100);
        lastTs = ts;
        let n = 0;
        while (acc >= FIXED_DT && n < 6) {
            clock += FIXED_DT;
            if (demo) { demoTick(clock); }
            step();
            acc -= FIXED_DT;
            n += 1;
        }
        draw();
        rafId = window.requestAnimationFrame(frame);
    }
    if (still) {
        settle();
        draw();
    } else {
        rafId = window.requestAnimationFrame(frame);
    }
    return function (): void {
        window.cancelAnimationFrame(rafId);
        window.removeEventListener('resize', onResize);
    };

  }, []);

  return (
    <div className={cx("hs") + " is-demo"} ref={rootRef}>
        <canvas className={cx("hs__canvas")} data-role="canvas" width={480} height={300} tabIndex={0} aria-label="반대 방향 두 빗질이 어긋나 만나 깃털로 갈라지는 결"></canvas>
        <p className={cx("hs__status")} data-role="status" aria-live="off">윗결을 빗는 중</p>
        <div className={cx("hs__tools")}>
          <button className={cx("hs__btn")} data-role="btn" type="button">다시 빗질</button>
        </div>
    </div>
  );
}
