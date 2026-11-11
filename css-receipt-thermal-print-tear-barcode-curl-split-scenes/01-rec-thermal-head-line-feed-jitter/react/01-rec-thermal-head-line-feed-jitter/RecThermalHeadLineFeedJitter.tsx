// RecThermalHeadLineFeedJitter - vanilla 판(01-rec-thermal-head-line-feed-jitter) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./RecThermalHeadLineFeedJitter.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function RecThermalHeadLineFeedJitter() {
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
    const PAPER_W = 260;
    const FEED_PX = 14;
    const LINE_MS = 180;
    const SHIVER_PX = 2.4;
    const FEED_MS = 140;
    const START_MS = 200;
    const HOLD_MS = 600;
    const OUT_MS = 420;
    const OUT_PX = 190;
    const DARKEN_MS = 160;
    const HEAD_Y = 236;
    const TXT_PRINTING = '인쇄 중';
    const TXT_DONE = '인쇄 완료 — 합계';
    interface Row { kind: string; a: string; b: string; }
    const ROWS: Row[] = [
        { kind: 'title', a: '달빛 상점', b: '' },
        { kind: 'rule', a: '', b: '' },
        { kind: 'item', a: '우유', b: '1,200' },
        { kind: 'item', a: '식빵', b: '2,800' },
        { kind: 'item', a: '사과', b: '3,500' },
        { kind: 'item', a: '달걀', b: '4,100' },
        { kind: 'rule', a: '', b: '' },
        { kind: 'total', a: '합계', b: '11,600' },
        { kind: 'note', a: '감사합니다', b: '' },
    ];
    const btn = root.querySelector('[data-role="btn"]') as HTMLButtonElement | null;
    let phase = 'wait';
    let phaseT = 0;
    let now = 0;
    let lineIdx = 0;
    let scroll = 0;
    let feedFrom = 0;
    const printedAt: number[] = [];
    const born: number[] = [];
    function easeOut(k: number): number { const c = clamp(k, 0, 1); return 1 - (1 - c) * (1 - c) * (1 - c); }
    // 이어서 밀리는 동안의 가로 떨림 — 시작에 크고 끝으로 갈수록 잦아든다
    function shiverAt(k: number): number {
        return SHIVER_PX * Math.sin(k * Math.PI * 7) * (1 - k);
    }
    // 줄 하나의 세로 위치 — 찍힌 순간의 밀림값과 지금 밀림값의 차이만큼 머리에서 멀어진다
    function rowY(printedScroll: number, scrollNow: number): number {
        return HEAD_Y - 9 - (scrollNow - printedScroll);
    }
    function restart(): void {
        lineIdx = 0;
        printedAt.length = 0;
        born.length = 0;
        phase = 'wait';
        phaseT = 0;
        status.textContent = TXT_PRINTING;
    }
    function step(): void {
        now += FIXED_DT;
        phaseT += FIXED_DT;
        if (phase === 'wait') {
            if (phaseT >= START_MS) { phase = 'print'; phaseT = 0; printedAt[lineIdx] = scroll; }
        } else if (phase === 'print') {
            if (phaseT >= LINE_MS) { born[lineIdx] = now; feedFrom = scroll; phase = 'feed'; phaseT = 0; }
        } else if (phase === 'feed') {
            const k = phaseT / FEED_MS;
            scroll = feedFrom + FEED_PX * easeOut(k);
            if (k >= 1) {
                scroll = feedFrom + FEED_PX;
                lineIdx += 1;
                phaseT = 0;
                if (lineIdx >= ROWS.length) {
                    phase = 'hold';
                    status.textContent = TXT_DONE + ' 11,600';
                } else {
                    phase = 'print';
                    printedAt[lineIdx] = scroll;
                }
            }
        } else if (phase === 'hold') {
            if (phaseT >= HOLD_MS) { phase = 'out'; feedFrom = scroll; phaseT = 0; }
        } else if (phase === 'out') {
            const k = phaseT / OUT_MS;
            scroll = feedFrom + OUT_PX * smooth(k);
            if (k >= 1) { scroll = feedFrom + OUT_PX; restart(); }
        }
    }
    // 움직임 줄이기 — 다 찍힌 영수증을 그대로 놓는다
    function settle(): void {
        for (let i = 0; i < ROWS.length; i += 1) { printedAt[i] = i * FEED_PX; born[i] = -9999; }
        lineIdx = ROWS.length;
        scroll = ROWS.length * FEED_PX;
        phase = 'hold';
        status.textContent = TXT_DONE + ' 11,600';
    }
    function shiverNow(): number {
        if (phase === 'feed') { return shiverAt(phaseT / FEED_MS); }
        if (phase === 'out') { return shiverAt((phaseT / OUT_MS) % 0.5 * 2) * 0.6; }
        return 0;
    }
    function draw(): void {
        ctx.fillStyle = rgba(BG, 1);
        ctx.fillRect(0, 0, W, H);
        // 인쇄기 몸체
        const body = ctx.createLinearGradient(0, HEAD_Y, 0, H);
        body.addColorStop(0, rgba(mix(BG, LILAC, 0.34), 1));
        body.addColorStop(1, rgba(mix(BG, LILAC, 0.1), 1));
        ctx.fillStyle = body;
        ctx.fillRect(0, HEAD_Y, W, H - HEAD_Y);
        const px = (W - PAPER_W) / 2 + shiverNow();
        // 종이 — 가장자리 음영과 가로 결이 밀리는 만큼 같이 움직인다
        ctx.fillStyle = rgba(BG, 0.5);
        ctx.fillRect(px + 6, 0, PAPER_W, HEAD_Y);
        const sheet = ctx.createLinearGradient(px, 0, px + PAPER_W, 0);
        sheet.addColorStop(0, rgba(mix(PAPER, INK, 0.14), 1));
        sheet.addColorStop(0.12, rgba(PAPER, 1));
        sheet.addColorStop(0.88, rgba(PAPER, 1));
        sheet.addColorStop(1, rgba(mix(PAPER, INK, 0.14), 1));
        ctx.fillStyle = sheet;
        ctx.fillRect(px, 0, PAPER_W, HEAD_Y);
        const off = ((scroll % 8) + 8) % 8;
        ctx.fillStyle = rgba(INK, 0.1);
        for (let y = off - 8; y < HEAD_Y; y += 8) { ctx.fillRect(px, y, PAPER_W, 1); }
        // 줄들
        ctx.font = '600 12px "Noto Sans KR", ui-monospace, monospace';
        ctx.textBaseline = 'alphabetic';
        for (let i = 0; i < ROWS.length; i += 1) {
            if (printedAt[i] === undefined) { continue; }
            const y = rowY(printedAt[i], scroll);
            if (y < -4 || y > HEAD_Y) { continue; }
            const done = born[i] !== undefined;
            let alpha = 0.3;
            if (done) { alpha = 0.3 + 0.7 * smooth((now - born[i]) / DARKEN_MS); }
            let reveal = 1;
            if (!done && i === lineIdx && phase === 'print') { reveal = clamp(phaseT / LINE_MS, 0, 1); }
            ctx.save();
            ctx.beginPath();
            ctx.rect(px, y - 14, PAPER_W * reveal, 20);
            ctx.clip();
            ctx.fillStyle = rgba(INK, alpha);
            const r = ROWS[i];
            if (r.kind === 'rule') {
                ctx.fillRect(px + 18, y - 4, PAPER_W - 36, 1);
            } else if (r.kind === 'title') {
                ctx.textAlign = 'center';
                ctx.font = '700 14px "Noto Sans KR", ui-monospace, monospace';
                ctx.fillText(r.a, px + PAPER_W / 2, y);
            } else if (r.kind === 'note') {
                ctx.textAlign = 'center';
                ctx.font = '600 12px "Noto Sans KR", ui-monospace, monospace';
                ctx.fillText(r.a, px + PAPER_W / 2, y);
            } else {
                ctx.font = (r.kind === 'total' ? '700 13px' : '600 12px') + ' "Noto Sans KR", ui-monospace, monospace';
                ctx.textAlign = 'left';
                ctx.fillText(r.a, px + 18, y);
                ctx.textAlign = 'right';
                ctx.fillText(r.b, px + PAPER_W - 18, y);
            }
            ctx.restore();
        }
        // 인쇄 머리 — 찍는 동안 한 줄이 달아오른다
        ctx.fillStyle = rgba(mix(BG, LILAC, 0.5), 1);
        ctx.fillRect(px - 14, HEAD_Y - 2, PAPER_W + 28, 12);
        const heat = phase === 'print' ? 0.55 + 0.45 * Math.sin(now / 24) : 0.12;
        const glow = ctx.createLinearGradient(0, HEAD_Y - 14, 0, HEAD_Y + 4);
        glow.addColorStop(0, rgba(PEACH, 0));
        glow.addColorStop(0.7, rgba(PEACH, 0.5 * heat));
        glow.addColorStop(1, rgba(PINK, 0.9 * heat));
        ctx.fillStyle = glow;
        ctx.fillRect(px, HEAD_Y - 14, PAPER_W, 18);
        // 종이 나오는 틈
        ctx.fillStyle = rgba(BG, 0.9);
        ctx.fillRect(px - 14, HEAD_Y + 10, PAPER_W + 28, 4);
    }
    if (btn) {
        btn.addEventListener('click', function (): void {
            if (reduceQuery.matches) { settle(); draw(); return; }
            restart();
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
        <canvas className={cx("rc__canvas")} data-role="canvas" width={480} height={300} aria-label="영수증이 한 줄씩 인쇄되며 줄마다 종이가 밀려 올라가고 가로로 떨리는 장면"></canvas>
        <p className={cx("rc__status")} data-role="status" aria-live="polite">인쇄 중</p>
        <div className={cx("rc__tools")}>
          <button className={cx("rc__btn")} data-role="btn" type="button">다시 인쇄</button>
        </div>
    </div>
  );
}
