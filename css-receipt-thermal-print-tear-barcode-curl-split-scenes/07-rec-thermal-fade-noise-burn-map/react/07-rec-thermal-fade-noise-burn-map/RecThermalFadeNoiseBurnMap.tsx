// RecThermalFadeNoiseBurnMap - vanilla 판(07-rec-thermal-fade-noise-burn-map) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./RecThermalFadeNoiseBurnMap.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function RecThermalFadeNoiseBurnMap() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const root: HTMLElement = rootEl;
    type RGB = [number, number, number];
    const W = 480;
    const H = 300;
    const FIXED_DT = 16;
    // 파스텔 팔레트 — 어두운 무대 위에 밝은 종이를 얹어 명도 차로 읽힌다
    const BG: RGB = [29, 26, 44];
    const PAPER: RGB = [255, 248, 234];
    const INK: RGB = [58, 48, 76];
    const MINT: RGB = [126, 226, 192];
    const SKY: RGB = [124, 196, 255];
    const LILAC: RGB = [190, 164, 255];
    const PINK: RGB = [255, 160, 190];
    const PEACH: RGB = [255, 208, 168];
    function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
    function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
    function smooth(x: number): number { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); }
    function rgba(c: RGB, a: number): string {
        return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + clamp(a, 0, 1).toFixed(3) + ')';
    }
    function mix(a: RGB, b: RGB, k: number): RGB { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
    // 시드 고정 난수 — 같은 시드면 언제나 같은 수열 (선형 합동 방식)
    function lcg(seed: number): () => number {
        let s = seed >>> 0;
        return function (): number {
            s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
            return s / 4294967296;
        };
    }
    const canvasEl = root.querySelector('[data-role="canvas"]') as HTMLCanvasElement | null;
    const statusEl = root.querySelector('[data-role="status"]') as HTMLElement | null;
    const ctxRaw = canvasEl ? canvasEl.getContext('2d') : null;
    if (!canvasEl || !ctxRaw || !statusEl) { return; }
    const cv: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctxRaw;
    const status: HTMLElement = statusEl;
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    function fitCanvas(): void {
        const dpr = window.devicePixelRatio || 1;
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function onResize(): void {
        fitCanvas();
        if (reduceQuery.matches) { draw(); }
    }
    fitCanvas();
    window.addEventListener('resize', onResize);
    // 화면 좌표(CSS px) → 장면 좌표(480x300). 리사이즈 뒤에도 늘 현재 크기로 다시 잰다
    function toScene(ev: PointerEvent): [number, number] {
        const r = cv.getBoundingClientRect();
        return [((ev.clientX - r.left) / r.width) * W, ((ev.clientY - r.top) / r.height) * H];
    }
    const HEAT_GAIN = 1;
    const FADE_RATE = 0.4;
    const NOISE_SCALE = 30;
    const CUTOFF = 0.25;
    const SPREAD = 2.4;
    const PRINT_MS = 700;
    const CYCLE_MS = 2800;
    const HALO = 0.24;
    const SUN_X = 3;
    const PW = 280;
    const PX = (W - PW) / 2;
    const TXT_PRINT = '인쇄 중';
    const TXT_FADE = '바래는 중';
    const TXT_GONE = '다 바램';
    const TXT_LINES: string[] = ['달빛 상점', '우유', '식빵', '사과', '달걀', '귤', '합계', '감사합니다'];
    const TXT_PRICES: string[] = ['', '1,200', '2,800', '3,500', '4,100', '1,900', '13,500', ''];
    const againBtn = root.querySelector('[data-role="btn"]') as HTMLButtonElement | null;
    const sunBtn = root.querySelector('[data-role="sun"]') as HTMLButtonElement | null;
    const off = document.createElement('canvas');
    off.width = PW;
    off.height = H;
    const offCtxRaw = off.getContext('2d');
    if (!offCtxRaw) { return; }
    const offCtx: CanvasRenderingContext2D = offCtxRaw;
    const img = offCtx.createImageData(PW, H);
    const mask = new Float32Array(PW * H);
    const heat = new Float32Array(PW * H);
    const rate = new Float32Array(PW * H);
    let front = 0;
    let phaseT = 0;
    let phase = 'print';
    let sun = false;
    let clock = 0;
    function hash2(x: number, y: number): number {
        let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + 1442695041) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        h ^= h >>> 16;
        return (h >>> 0) / 4294967296;
    }
    // 값 노이즈 — 격자점 해시 네 개를 부드럽게 섞는다
    function noise2(x: number, y: number): number {
        const xi = Math.floor(x);
        const yi = Math.floor(y);
        const fx = smooth(x - xi);
        const fy = smooth(y - yi);
        const a = hash2(xi, yi);
        const b = hash2(xi + 1, yi);
        const c = hash2(xi, yi + 1);
        const d = hash2(xi + 1, yi + 1);
        return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
    }
    // 한 자리의 바램 속도(초당 열 감소량) — 지도 값 n(0~1)이 클수록 빨리 바랜다
    function decayAt(n: number): number {
        return FADE_RATE * (1 + SPREAD * n);
    }
    // 바램 속도 지도 — 위치마다 다른 값 (큰 덩이 + 잔 무늬)
    function buildRate(): void {
        for (let y = 0; y < H; y += 1) {
            for (let x = 0; x < PW; x += 1) {
                const n = 0.7 * noise2(x / NOISE_SCALE, y / NOISE_SCALE) + 0.3 * noise2(x / (NOISE_SCALE * 0.35) + 9, y / (NOISE_SCALE * 0.35) + 4);
                rate[y * PW + x] = n;
            }
        }
    }
    // 글자 마스크 — 한 번만 그려서 읽는다 (한 번뿐이라 틱마다 읽지 않는다)
    function buildMask(): void {
        offCtx.clearRect(0, 0, PW, H);
        offCtx.fillStyle = '#ffffff';
        offCtx.font = '700 17px "Noto Sans KR", ui-monospace, monospace';
        offCtx.textBaseline = 'middle';
        for (let i = 0; i < TXT_LINES.length; i += 1) {
            const y = 28 + i * 34;
            offCtx.textAlign = i === 0 || i === TXT_LINES.length - 1 ? 'center' : 'left';
            offCtx.fillText(TXT_LINES[i], i === 0 || i === TXT_LINES.length - 1 ? PW / 2 : 22, y);
            if (TXT_PRICES[i]) {
                offCtx.textAlign = 'right';
                offCtx.fillText(TXT_PRICES[i], PW - 22, y);
            }
        }
        offCtx.fillRect(18, 28 + 6 * 34 - 17, PW - 36, 2);
        const d = offCtx.getImageData(0, 0, PW, H).data;
        for (let i = 0; i < PW * H; i += 1) { mask[i] = d[i * 4 + 3] / 255; }
    }
    function restart(): void {
        heat.fill(0);
        front = 0;
        phase = 'print';
        phaseT = 0;
        status.textContent = TXT_PRINT;
    }
    function step(): void {
        clock += FIXED_DT;
        phaseT += FIXED_DT;
        const dt = FIXED_DT / 1000;
        // 인쇄 머리가 위에서 아래로 지나가며 열을 쌓는다
        if (phase === 'print') {
            const nf = Math.min(H, Math.round((phaseT / PRINT_MS) * H));
            for (let y = front; y < nf; y += 1) {
                for (let x = 0; x < PW; x += 1) {
                    const m = mask[y * PW + x];
                    heat[y * PW + x] = m > 0.05 ? Math.min(1.2, HEAT_GAIN * m) : HALO;
                }
            }
            front = nf;
            if (phaseT >= PRINT_MS) { phase = 'fade'; status.textContent = TXT_FADE; }
        }
        const mul = (sun ? SUN_X : 1) * dt;
        let alive = 0;
        for (let i = 0; i < PW * H; i += 1) {
            const h = heat[i];
            if (h <= 0) { continue; }
            const nh = h - mul * decayAt(rate[i]);
            heat[i] = nh > 0 ? nh : 0;
            if (nh > CUTOFF) { alive += 1; }
        }
        if (phase === 'fade' && alive === 0 && !gone) {
            gone = true;
            status.textContent = TXT_GONE;
        }
        if (phaseT >= CYCLE_MS) { gone = false; restart(); }
    }
    let gone = false;
    function settle(): void {
        for (let i = 0; i < PW * H; i += 1) { heat[i] = mask[i]; }
        phase = 'fade';
        status.textContent = TXT_FADE;
    }
    function paint(): void {
        const d = img.data;
        for (let y = 0; y < H; y += 1) {
            for (let x = 0; x < PW; x += 1) {
                const i = y * PW + x;
                const h = heat[i];
                // 종이 바탕에도 지도가 옅게 비친다
                const base = mix(PAPER, PEACH, rate[i] * 0.16);
                let r = base[0];
                let g = base[1];
                let b = base[2];
                if (h > 0 && h <= CUTOFF) {
                    // 글자가 없는 자리도 옅게 달아올랐다 식는다 — 바램 지도가 색으로 드러난다
                    const w = (h / CUTOFF) * 0.55;
                    r = lerp(r, 238, w);
                    g = lerp(g, 186, w);
                    b = lerp(b, 150, w);
                } else if (h > CUTOFF) {
                    const a = smooth((h - CUTOFF) / 0.55);
                    const warm = a;
                    const k2 = a * a;
                    r = lerp(r, 205, warm * 0.8);
                    g = lerp(g, 150, warm * 0.8);
                    b = lerp(b, 135, warm * 0.8);
                    r = lerp(r, INK[0], k2);
                    g = lerp(g, INK[1], k2);
                    b = lerp(b, INK[2], k2);
                }
                // 가장자리 음영
                const e = Math.min(x, PW - 1 - x);
                const sh = e < 10 ? 0.9 + 0.1 * (e / 10) : 1;
                d[i * 4] = r * sh;
                d[i * 4 + 1] = g * sh;
                d[i * 4 + 2] = b * sh;
                d[i * 4 + 3] = 255;
            }
        }
        offCtx.putImageData(img, 0, 0);
    }
    function draw(): void {
        ctx.fillStyle = rgba(BG, 1);
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = rgba([10, 8, 22], 0.45);
        ctx.fillRect(PX + 7, 0, PW, H);
        paint();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(off, PX, 0);
        ctx.fillStyle = rgba(mix(BG, LILAC, 0.14), 1);
        ctx.fillRect(0, H - 28, W, 28);
        // 인쇄 머리 선
        if (phase === 'print') {
            ctx.fillStyle = rgba(PINK, 0.9);
            ctx.fillRect(PX - 16, front - 1, PW + 32, 3);
        }
    }
    buildRate();
    buildMask();
    if (againBtn) {
        againBtn.addEventListener('click', function (): void {
            gone = false;
            restart();
            if (reduceQuery.matches) { settle(); draw(); }
        });
    }
    if (sunBtn) {
        sunBtn.addEventListener('click', function (): void {
            sun = !sun;
            sunBtn.setAttribute('aria-pressed', sun ? 'true' : 'false');
            if (reduceQuery.matches) { draw(); }
        });
    }
    restart();

    let rafId = 0;
    let lastTs = -1;
    let acc = 0;
    function frame(ts: number): void {
        if (lastTs < 0) { lastTs = ts; }
        acc += Math.min(ts - lastTs, 100);
        lastTs = ts;
        let n = 0;
        while (acc >= FIXED_DT && n < 6) {
            step();
            acc -= FIXED_DT;
            n += 1;
        }
        draw();
        rafId = window.requestAnimationFrame(frame);
    }
    if (reduceQuery.matches) {
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
    <div className={cx("rc") + " is-demo"} ref={rootRef}>
        <canvas className={cx("rc__canvas")} data-role="canvas" width={480} height={300} aria-label="감열지 글자가 노이즈 지도에 따라 위치마다 다른 속도로 바래 사라지는 장면"></canvas>
        <p className={cx("rc__status")} data-role="status" aria-live="polite">인쇄 중</p>
        <div className={cx("rc__tools")}>
          <button className={cx("rc__btn")} data-role="btn" type="button">다시 인쇄</button>
          <button className={cx("rc__btn")} data-role="sun" type="button" aria-pressed="false">햇빛 쬐기</button>
        </div>
    </div>
  );
}
