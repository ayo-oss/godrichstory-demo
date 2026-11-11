// MblBouquetFanFoldPleats - vanilla 판(03-mbl-bouquet-fan-fold-pleats) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./MblBouquetFanFoldPleats.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function MblBouquetFanFoldPleats() {
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
    // 03 부케 — 방사각 사인 주름 접힘 폭 산정 + 결마다 밝기 계단
    const RADIANT_K = 1.0;      // 방사각 사인 주름 진폭 계수
    const PLEAT_FREQ = 15;      // 한 바퀴 안의 주름(접힘) 수
    const FOLD_CONTRAST = 0.34; // 접힌 결마다 밝기 계단 크기
    const DEMO_LOOP = 3600;
    const FW = 192;
    const FH = 120;
    const TXT_TURN = '부채 결이 접힌 채 돈다';
    const TXT_STEPB = '접힘마다 밝기가 계단진다';
    const TXT_GUIDE = '화살표로 부채를 돌린다';
    let fanA = 0.5;       // 부채 회전각(rad)
    let fanV = 0;
    let saidStep = false;
    function pleatWidth(r: number, ang: number): number {
        // 방사각 사인 주름 접힘 폭 산정 — 주름 계수 K(f·sin mθ) 가 접힘 폭을 정한다
        return RADIANT_K * PLEAT_FREQ * Math.sin(ang);
    }
    function draw(): void {
        if (!px || !sctx) { return; }
        const ox = FW * 0.44, oy = FH * 0.94;
        let i4 = 0;
        for (let y = 0; y < FH; y += 1) {
            for (let x = 0; x < FW; x += 1) {
                const g = grainF[y * FW + x];
                const base = mix(PAPER, INK, g * 0.07 + 0.015);
                const dx = x - ox, dy = y - oy;
                const r = Math.sqrt(dx * dx + dy * dy);
                let col = base;
                if (r > 6) {
                    let ang = Math.atan2(dx, -dy) + fanA;
                    const w = pleatWidth(r, ang);
                    // 접힘 좌표 — 주름 폭만큼 각을 눌러 천이 접히는 듯한 밀도를 만든다
                    const fold = (ang * PLEAT_FREQ + w * 0.5) / Math.PI;
                    const fr = fold - Math.floor(fold);
                    // 접힌 면(뒤 절반)은 어둡게 — 경계는 0.12 폭으로 부드럽게 넘어가 계단이 톱니로 깨지지 않는다
                    const shade = 1 - 0.58 * smooth((fr - 0.44) / 0.12) * (1 - smooth((fr - 0.92) / 0.08));
                    const tint = TINTS[Math.abs(Math.floor(fold)) % TINTS.length];
                    const edge = smooth(1 - Math.abs(fr - 0.5) * 2);
                    let k = smooth(clamp(1 - r / (FH * 0.98), 0, 1)) * 0.8;
                    // 결마다 밝기 계단 — shade 와 FOLD_CONTRAST 로 접힌 면 사이 계단
                    const stepB = shade * (1 - FOLD_CONTRAST) + (1 - shade) * FOLD_CONTRAST;
                    k = k * stepB + edge * 0.06;
                    if (y > oy - 4) { k *= smooth((oy - 4 - y) / 14); }
                    col = mix(base, tint, clamp(k, 0, 1) * 0.8);
                    col = mix(col, INK, FOLD_CONTRAST * 0.5 * (1 - shade) / 0.58);
                }
                px[i4] = col[0]; px[i4 + 1] = col[1]; px[i4 + 2] = col[2]; px[i4 + 3] = 255;
                i4 += 4;
            }
        }
        blitField(FW, FH);
        // 부챗살 결 — 접힘 폭이 커지는 바깥쪽 잉크 테두리
        for (let s = 0; s < PLEAT_FREQ; s += 1) {
            const a0 = fanA + (s / PLEAT_FREQ) * Math.PI * 2;
            const w = pleatWidth(100, a0);
            const a1 = a0 + (0.5 + w * 0.008) * (Math.PI * 2 / PLEAT_FREQ);
            const r2 = FH * 0.95;
            ctx.beginPath();
            ctx.moveTo(ox * W / FW, oy * H / FH);
            ctx.lineTo((ox + Math.sin(a1) * r2 * 0.96) * W / FW, (oy - Math.cos(a1) * r2 * 0.96) * H / FH);
            ctx.strokeStyle = rgba(INK, 0.16);
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }
    function settle(): void {
        fanV = 0;
        say(TXT_TURN);
    }
    function step(): void {
        fanA += fanV * FIXED_DT;
        fanV *= 0.965;
        if (demo && Math.abs(fanV) > 0.0004) {
            if (!saidStep && Math.abs(fanA) > 1.1) { saidStep = true; say(TXT_STEPB); }
            else if (!saidStep) { say(TXT_TURN); }
        }
    }
    function spin(dir: number): void {
        fanV += dir * 0.0023;
        if (still) {
            fanA += dir * 0.28;
            fanV = 0;
            draw();
            return;
        }
        say(TXT_TURN);
    }
    function demoTick(t: number): void {
        if (crossed(t, 200, DEMO_LOOP)) { fanV = 0.0021; saidStep = false; }
        if (crossed(t, 2000, DEMO_LOOP)) { fanV = -0.0024; }
    }
    initField(FW, FH);
    const btn = root.querySelector('[data-role="btn"]') as HTMLButtonElement | null;
    if (btn) {
        btn.addEventListener('click', function (): void {
            wake();
            fanA = 0.5;
            fanV = 0;
            saidStep = false;
            if (still) { draw(); }
            say(TXT_TURN);
        });
    }
    cv.addEventListener('pointerdown', function (ev: PointerEvent): void {
        wake();
        spin(toScene(ev)[0] < W / 2 ? -1 : 1);
    });
    cv.addEventListener('keydown', function (ev: KeyboardEvent): void {
        const k = ev.key;
        if (k !== 'ArrowLeft' && k !== 'ArrowRight') { return; }
        ev.preventDefault();
        wake();
        spin(k === 'ArrowRight' ? 1 : -1);
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
        <canvas className={cx("hs__canvas")} data-role="canvas" width={480} height={300} tabIndex={0} aria-label="한 점에서 뻗는 주름이 부채처럼 접히는 부케 결"></canvas>
        <p className={cx("hs__status")} data-role="status" aria-live="off">부채 결이 접힌 채 돈다</p>
        <div className={cx("hs__tools")}>
          <button className={cx("hs__btn")} data-role="btn" type="button">부채 되돌리기</button>
        </div>
    </div>
  );
}
