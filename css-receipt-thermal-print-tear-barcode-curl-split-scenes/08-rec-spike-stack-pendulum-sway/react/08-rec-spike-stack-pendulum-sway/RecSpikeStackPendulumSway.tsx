// RecSpikeStackPendulumSway - vanilla 판(08-rec-spike-stack-pendulum-sway) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./RecSpikeStackPendulumSway.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function RecSpikeStackPendulumSway() {
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
    const SHEET_N = 9;
    const LEN_MIN = 70;
    const LEN_STEP = 22;
    const LEN_REF = 160;
    const DAMP = 0.9;
    const KICK = 2;
    const KICK_MS = 1800;
    const GRAV = 3600;
    const SHEET_W = 56;
    const PIVOT_Y = 24;
    const GAP_X = 40;
    const TXT_KICK = '툭 쳤다';
    const TXT_SWAY = '흔들리는 중';
    const TXT_STILL = '가만히 걸려 있다';
    const kickBtn = root.querySelector('[data-role="btn"]') as HTMLButtonElement | null;
    const ang: number[] = [];
    const vel: number[] = [];
    const len: number[] = [];
    const tints: RGB[] = [PAPER, mix(PAPER, PINK, 0.28), mix(PAPER, SKY, 0.28), mix(PAPER, MINT, 0.28), mix(PAPER, LILAC, 0.3)];
    for (let i = 0; i < SHEET_N; i += 1) {
        ang.push(0);
        vel.push(0);
        len.push(LEN_MIN + i * LEN_STEP);
    }
    let clock = 0;
    let nextKick = 200;
    let sign = 1;
    let barShift = 0;
    let barVel = 0;
    // 판 하나의 각도 가속 — 길이가 길수록 느리고, 짧은 판일수록 공기 저항이 크다
    function accel(i: number, a: number, v: number): number {
        return -(GRAV / len[i]) * Math.sin(a) - DAMP * (LEN_REF / len[i]) * v;
    }
    function kick(dir: number): void {
        for (let i = 0; i < SHEET_N; i += 1) { vel[i] += dir * KICK * (LEN_REF / len[i]); }
        barVel += dir * 60;
    }
    function step(): void {
        clock += FIXED_DT;
        const dt = FIXED_DT / 1000;
        if (clock >= nextKick) {
            kick(sign);
            sign = -sign;
            nextKick = clock + KICK_MS;
        }
        for (let i = 0; i < SHEET_N; i += 1) {
            vel[i] += accel(i, ang[i], vel[i]) * dt;
            ang[i] += vel[i] * dt;
        }
        barVel += (-90 * barShift - 9 * barVel) * dt;
        barShift += barVel * dt;
    }
    function settle(): void {
        for (let i = 0; i < SHEET_N; i += 1) { ang[i] = 0; vel[i] = 0; }
        status.textContent = TXT_STILL;
    }
    function drawSheet(i: number): void {
        const px = W / 2 + (i - (SHEET_N - 1) / 2) * GAP_X + barShift;
        const L = len[i];
        ctx.save();
        ctx.translate(px, PIVOT_Y);
        ctx.rotate(ang[i]);
        ctx.fillStyle = rgba([10, 8, 22], 0.4);
        ctx.fillRect(-SHEET_W / 2 + 5, 8, SHEET_W, L);
        const t = tints[i % tints.length];
        const g = ctx.createLinearGradient(-SHEET_W / 2, 0, SHEET_W / 2, 0);
        g.addColorStop(0, rgba(mix(t, INK, 0.12), 1));
        g.addColorStop(0.3, rgba(t, 1));
        g.addColorStop(1, rgba(mix(t, INK, 0.06), 1));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-SHEET_W / 2, 0);
        ctx.lineTo(SHEET_W / 2, 0);
        ctx.lineTo(SHEET_W / 2, L);
        for (let k = 7; k >= 0; k -= 1) { ctx.lineTo(-SHEET_W / 2 + (SHEET_W * k) / 7, L + (k % 2 === 0 ? 0 : 5)); }
        ctx.closePath();
        ctx.fill();
        // 글줄 막대 — 장마다 줄 수가 다르다
        ctx.fillStyle = rgba(INK, 0.55);
        const rows = Math.floor((L - 30) / 14);
        for (let r = 0; r < rows; r += 1) {
            const w = SHEET_W - 18 - ((r * 7 + i * 5) % 14);
            ctx.fillRect(-SHEET_W / 2 + 9, 22 + r * 14, w, 3);
        }
        // 걸린 구멍
        ctx.fillStyle = rgba(BG, 1);
        ctx.beginPath();
        ctx.arc(0, 9, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    function draw(): void {
        ctx.fillStyle = rgba(BG, 1);
        ctx.fillRect(0, 0, W, H);
        // 꽂이 막대
        ctx.fillStyle = rgba(mix(BG, LILAC, 0.5), 1);
        ctx.fillRect(34 + barShift, PIVOT_Y - 12, W - 68, 6);
        // 긴 장을 뒤에 그린다
        for (let i = SHEET_N - 1; i >= 0; i -= 1) { drawSheet(i); }
        ctx.fillStyle = rgba(PEACH, 1);
        for (let i = 0; i < SHEET_N; i += 1) {
            ctx.beginPath();
            ctx.arc(W / 2 + (i - (SHEET_N - 1) / 2) * GAP_X + barShift, PIVOT_Y - 9, 4.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    function userKick(): void {
        status.textContent = TXT_KICK;
        if (reduceQuery.matches) { return; }
        kick(sign);
        sign = -sign;
        nextKick = clock + KICK_MS;
    }
    if (kickBtn) { kickBtn.addEventListener('click', userKick); }
    cv.addEventListener('pointerdown', userKick);
    status.textContent = TXT_SWAY;

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
        <canvas className={cx("rc__canvas")} data-role="canvas" width={480} height={300} aria-label="꽂이에 걸린 영수증 아홉 장이 길이마다 다른 진자로 흔들리다 짧은 장부터 멈추는 장면"></canvas>
        <p className={cx("rc__status")} data-role="status" aria-live="polite">흔들리는 중</p>
        <div className={cx("rc__tools")}>
          <button className={cx("rc__btn")} data-role="btn" type="button">툭 치기</button>
        </div>
    </div>
  );
}
