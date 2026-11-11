// RecBarcodeSeededBarsScanBeam - vanilla 판(04-rec-barcode-seeded-bars-scan-beam) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./RecBarcodeSeededBarsScanBeam.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function RecBarcodeSeededBarsScanBeam() {
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
    const BAR_N = 46;
    const BEAM_MS = 1300;
    const GLOW_PX = 34;
    let SEED = 461;
    const CONFIRM_MS = 520;
    const GAP_MS = 220;
    const CARD_X = 44;
    const CARD_Y = 40;
    const CARD_W = 392;
    const CARD_H = 220;
    const BW = 336;
    const BH = 118;
    const BX = CARD_X + (CARD_W - BW) / 2;
    const BY = CARD_Y + 34;
    const TXT_SCAN = '스캔 중';
    const TXT_OK = '읽음 — 확인';
    const TXT_CHECK = '확인';
    const nextBtn = root.querySelector('[data-role="next"]') as HTMLButtonElement | null;
    const againBtn = root.querySelector('[data-role="btn"]') as HTMLButtonElement | null;
    const off = document.createElement('canvas');
    off.width = BW;
    off.height = BH;
    const offCtxRaw = off.getContext('2d');
    if (!offCtxRaw) { return; }
    const offCtx: CanvasRenderingContext2D = offCtxRaw;
    const img = offCtx.createImageData(BW, BH);
    const inkAt = new Uint8Array(BW);
    let digits = '';
    let clock = 0;
    let phaseT = 0;
    let phase = 'scan';
    // 시드로 막대 폭을 만든다 — 같은 시드는 언제나 같은 바코드
    function buildBars(seed: number): void {
        const rnd = lcg(seed);
        const widths: number[] = [];
        let total = 0;
        for (let i = 0; i < BAR_N; i += 1) {
            const w = 1 + Math.floor(rnd() * 3.99);
            widths.push(w);
            total += w;
        }
        const quiet = 10;
        const unit = (BW - quiet * 2) / total;
        inkAt.fill(0);
        let pos = quiet;
        for (let i = 0; i < BAR_N; i += 1) {
            const end = pos + widths[i] * unit;
            if (i % 2 === 0) {
                for (let x = Math.round(pos); x < Math.round(end); x += 1) { if (x >= 0 && x < BW) { inkAt[x] = 1; } }
            }
            pos = end;
        }
        let d = '';
        const r2 = lcg(seed + 7);
        for (let i = 0; i < 12; i += 1) { d += String(Math.floor(r2() * 10)); }
        digits = d;
    }
    // 빔의 가로 위치 — 위아래로 살짝 휘어서 픽셀마다 거리가 다르다
    function beamX(y: number, t: number): number {
        const k = smooth(t);
        const base = lerp(-GLOW_PX, BW + GLOW_PX, k * (2 - k));
        return base + 5 * Math.sin(y / 15 + clock / 140);
    }
    function paintBars(t: number): void {
        const data = img.data;
        const sig = 2 * GLOW_PX * GLOW_PX;
        for (let y = 0; y < BH; y += 1) {
            const bx = beamX(y, t);
            const fall = 1 - 0.18 * (y / BH);
            for (let x = 0; x < BW; x += 1) {
                const dx = x - bx;
                const g = Math.exp(-(dx * dx) / sig) * fall;
                const ink = inkAt[x] === 1;
                const base: RGB = ink ? INK : PAPER;
                const tint: RGB = ink ? PINK : [255, 255, 255];
                const m = ink ? g * 0.9 : g * 0.55;
                const i4 = (y * BW + x) * 4;
                data[i4] = base[0] + (tint[0] - base[0]) * m;
                data[i4 + 1] = base[1] + (tint[1] - base[1]) * m;
                data[i4 + 2] = base[2] + (tint[2] - base[2]) * m;
                data[i4 + 3] = 255;
            }
        }
        offCtx.putImageData(img, 0, 0);
    }
    function restart(): void {
        phase = 'scan';
        phaseT = 0;
        status.textContent = TXT_SCAN;
    }
    function step(): void {
        clock += FIXED_DT;
        phaseT += FIXED_DT;
        if (phase === 'scan' && phaseT >= BEAM_MS) {
            phase = 'confirm';
            phaseT = 0;
            status.textContent = TXT_OK;
        } else if (phase === 'confirm' && phaseT >= CONFIRM_MS) {
            phase = 'gap';
            phaseT = 0;
        } else if (phase === 'gap' && phaseT >= GAP_MS) {
            restart();
        }
    }
    function settle(): void {
        phase = 'confirm';
        phaseT = CONFIRM_MS;
        status.textContent = TXT_OK;
    }
    function draw(): void {
        ctx.fillStyle = rgba(BG, 1);
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = rgba([10, 8, 22], 0.5);
        ctx.fillRect(CARD_X + 6, CARD_Y + 10, CARD_W, CARD_H);
        ctx.fillStyle = rgba(PAPER, 1);
        ctx.fillRect(CARD_X, CARD_Y, CARD_W, CARD_H);
        const t = phase === 'scan' ? phaseT / BEAM_MS : 1;
        paintBars(t);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(off, BX, BY);
        // 빔 몸통 — 얇은 밝은 선
        if (phase === 'scan') {
            const x = BX + beamX(BH / 2, t);
            ctx.fillStyle = rgba(PINK, 0.85);
            ctx.fillRect(x - 1, BY - 10, 2, BH + 20);
        }
        // 숫자 — 빔이 지나간 만큼 진해진다
        ctx.font = '600 14px ui-monospace, "Noto Sans KR", monospace';
        ctx.textAlign = 'center';
        const reach = phase === 'scan' ? t * (2 - t) : 1;
        for (let i = 0; i < digits.length; i += 1) {
            const dx = BX + 22 + (i * (BW - 44)) / (digits.length - 1);
            const seen = clamp((reach * BW - (dx - BX)) / 24 + 0.5, 0, 1);
            ctx.fillStyle = rgba(INK, 0.18 + 0.82 * seen);
            ctx.fillText(digits.charAt(i), dx, BY + BH + 26);
        }
        // 확인 점 — 빔이 끝에 닿으면 켜지고 한 번 부푼다
        const cx = CARD_X + CARD_W - 34;
        const cy = CARD_Y + 18;
        const on = phase === 'confirm' || phase === 'gap';
        const pop = on ? 1 + 0.5 * Math.exp(-phaseT / 160) : 0;
        ctx.fillStyle = on ? rgba(MINT, 1) : rgba(INK, 0.18);
        ctx.beginPath();
        ctx.arc(cx, cy, 8 * (on ? pop : 1), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba(INK, on ? 1 : 0.35);
        ctx.textAlign = 'right';
        ctx.font = '700 12px "Noto Sans KR", ui-monospace, monospace';
        ctx.fillText(TXT_CHECK, cx - 16, cy + 4);
    }
    buildBars(SEED);
    if (againBtn) {
        againBtn.addEventListener('click', function (): void {
            restart();
            if (reduceQuery.matches) { settle(); draw(); }
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', function (): void {
            SEED += 1;
            buildBars(SEED);
            restart();
            if (reduceQuery.matches) { settle(); draw(); }
        });
    }

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
        <canvas className={cx("rc__canvas")} data-role="canvas" width={480} height={300} aria-label="시드로 만든 바코드 위를 빔이 지나가며 막대가 밝아지고 끝에서 확인 점이 켜지는 장면"></canvas>
        <p className={cx("rc__status")} data-role="status" aria-live="polite">스캔 중</p>
        <div className={cx("rc__tools")}>
          <button className={cx("rc__btn")} data-role="btn" type="button">다시 스캔</button>
          <button className={cx("rc__btn")} data-role="next" type="button">다음 코드</button>
        </div>
    </div>
  );
}
