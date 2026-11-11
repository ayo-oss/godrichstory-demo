// HscDragFlingProjectedSnapSpring - vanilla 판(03-hsc-drag-fling-projected-snap-spring) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./HscDragFlingProjectedSnapSpring.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function HscDragFlingProjectedSnapSpring() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const root: HTMLElement = rootEl;
    type RGB = [number, number, number];
    const W = 480;
    const H = 300;
    const FIXED_DT = 16;
    // 파스텔 팔레트 — 어두운 무대 위에 밝은 카드를 얹어 명도 차로 읽힌다
    const BG: RGB = [29, 26, 44];
    const PAPER: RGB = [255, 248, 234];
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
    // 휠 한 번의 이동량을 px 로 — 줄 단위(deltaMode 1)·쪽 단위(deltaMode 2) 장치도 같은 눈금으로 맞춘다.
    // 가로·세로 중 큰 쪽을 쓴다: 트랙패드의 가로 쓸기와 마우스 휠의 세로 굴림이 같은 방향으로 들어온다
    function wheelPx(ev: WheelEvent): number {
        const unit = ev.deltaMode === 1 ? 16 : (ev.deltaMode === 2 ? W : 1);
        const d = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY;
        return d * unit;
    }
    // 시연 시계가 loop 주기 안의 at 시각을 이번 스텝에 막 지났는가
    function crossed(t: number, at: number, loop: number): boolean {
        const p = t % loop;
        return p >= at && p - FIXED_DT < at;
    }
    function fitCanvas(): void {
        const dpr = window.devicePixelRatio || 1;
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
    function roundRectPath(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
        const rr = Math.min(r, w / 2, h / 2);
        c.beginPath();
        c.moveTo(x + rr, y);
        c.lineTo(x + w - rr, y);
        c.quadraticCurveTo(x + w, y, x + w, y + rr);
        c.lineTo(x + w, y + h - rr);
        c.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
        c.lineTo(x + rr, y + h);
        c.quadraticCurveTo(x, y + h, x, y + h - rr);
        c.lineTo(x, y + rr);
        c.quadraticCurveTo(x, y, x + rr, y);
        c.closePath();
    }
    // 카드 한 장 — 사진 대신 계산한 그림 칸(그라디언트 하늘·해·언덕) + 글줄 막대 두 개 + 번호
    function drawCard(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, i: number, light: number): void {
        const t1 = TINTS[i % TINTS.length];
        const t2 = TINTS[(i + 2) % TINTS.length];
        const k = clamp(light, 0, 1);
        roundRectPath(c, x, y, w, h, 10);
        c.fillStyle = rgba(mix(BG, PAPER, k), 1);
        c.fill();
        const ih = h * 0.58;
        const g = c.createLinearGradient(x, y, x + w, y + ih);
        g.addColorStop(0, rgba(mix(BG, t1, k), 1));
        g.addColorStop(1, rgba(mix(BG, t2, k * 0.92), 1));
        c.save();
        roundRectPath(c, x + 6, y + 6, w - 12, ih - 6, 7);
        c.fillStyle = g;
        c.fill();
        c.clip();
        c.fillStyle = rgba(mix(BG, PAPER, k * 0.9), 0.9);
        c.beginPath();
        c.arc(x + w * 0.7, y + ih * 0.36, Math.min(w, ih) * 0.13, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = rgba(mix(BG, INK, k), 0.55);
        c.beginPath();
        c.moveTo(x, y + ih);
        c.lineTo(x + w * 0.32, y + ih * 0.55);
        c.lineTo(x + w * 0.55, y + ih * 0.8);
        c.lineTo(x + w * 0.78, y + ih * 0.62);
        c.lineTo(x + w, y + ih);
        c.closePath();
        c.fill();
        c.restore();
        c.fillStyle = rgba(mix(BG, INK, k), 0.75);
        c.fillRect(x + 10, y + ih + 12, w * 0.62, 6);
        c.fillStyle = rgba(mix(BG, INK, k), 0.4);
        c.fillRect(x + 10, y + ih + 24, w * 0.44, 5);
        c.fillStyle = rgba(mix(BG, INK, k), 0.9);
        c.font = '700 13px sans-serif';
        c.textAlign = 'right';
        c.textBaseline = 'alphabetic';
        c.fillText(String(i + 1).padStart(2, '0'), x + w - 9, y + h - 10);
    }
    const CARD_N = 8;
    const CARD_W = 210;
    const CARD_H = 172;
    const PITCH = 232;
    const CARD_TOP = 50;
    const MAX_X = (CARD_N - 1) * PITCH;
    const TAU = 0.2;
    const SNAP_K = 120;
    const SNAP_C = 14;
    const RUBBER_PX = 120;
    const WHEEL_IDLE = 140;
    const DEMO_LOOP = 3600;
    const TXT_DRAG = '끄는 중';
    const TXT_FLING = '착지 칸을 미리 계산해 붙는 중';
    const TXT_SNAP = '칸에 붙음';
    const prevBtn = root.querySelector('[data-role="prev"]') as HTMLButtonElement | null;
    const nextBtn = root.querySelector('[data-role="next"]') as HTMLButtonElement | null;
    let raw = 0;
    let x = 0;
    let v = 0;
    let target = 0;
    let snapping = false;
    let ghostX = 0;
    let ghostSlot = 0;
    let ghostA = 0;
    let dragId = -1;
    let dragX = 0;
    let dragT = 0;
    let wheeling = false;
    let lastWheel = 0;
    let demoDragging = false;
    // 끝 밖으로 끈 거리는 줄여서 보여 준다 — 고무줄
    function rubberClamp(p: number): number {
        if (p < 0) { return p / (1 - p / RUBBER_PX); }
        if (p > MAX_X) { const o = p - MAX_X; return MAX_X + o / (1 + o / RUBBER_PX); }
        return p;
    }
    // 놓는 순간의 속도로 τ 초 뒤 위치를 미리 내다보고 가장 가까운 칸을 고른다
    function predictSlot(x0: number, v0: number): number {
        return clamp(Math.round((x0 + v0 * TAU) / PITCH), 0, CARD_N - 1);
    }
    function release(): void {
        ghostX = x + v * TAU;
        ghostA = 1;
        ghostSlot = predictSlot(x, v);
        target = ghostSlot * PITCH;
        snapping = true;
        say(TXT_FLING);
        if (still) { x = target; raw = x; v = 0; snapping = false; say(TXT_SNAP); draw(); }
    }
    // 스프링·댐퍼 한 스텝 — 가속 = K·(목표−위치) − C·속도 (반암시 오일러)
    function springStep(dt: number): void {
        const a = SNAP_K * (target - x) - SNAP_C * v;
        v += a * dt;
        x += v * dt;
    }
    function canMove(d: number): boolean { return d > 0 ? x < MAX_X - 0.5 : x > 0.5; }
    function step(): void {
        const dt = FIXED_DT / 1000;
        ghostA = Math.max(0, ghostA - dt * 0.9);
        if (wheeling && clock - lastWheel > WHEEL_IDLE) {
            wheeling = false;
            release();
        }
        if (snapping) {
            springStep(dt);
            raw = x;
            if (Math.abs(target - x) < 0.3 && Math.abs(v) < 3) {
                x = target;
                raw = x;
                v = 0;
                snapping = false;
                say(TXT_SNAP);
            }
        }
    }
    function settle(): void {
        x = 0;
        raw = 0;
        v = 0;
        say(TXT_SNAP);
    }
    function demoMove(dxPerSec: number): void {
        const dt = FIXED_DT / 1000;
        raw += dxPerSec * dt;
        x = rubberClamp(raw);
        v = dxPerSec;
    }
    function demoTick(t: number): void {
        const p = t % DEMO_LOOP;
        if (p >= 220 && p < 520) { demoDragging = true; snapping = false; demoMove(900); say(TXT_DRAG); }
        else if (p >= 1300 && p < 1500) { demoDragging = true; snapping = false; demoMove(-1100); say(TXT_DRAG); }
        else if (demoDragging) { demoDragging = false; release(); }
    }
    function draw(): void {
        ctx.fillStyle = rgba(BG, 1);
        ctx.fillRect(0, 0, W, H);
        const originX = W / 2 - CARD_W / 2;
        for (let i = 0; i < CARD_N; i += 1) {
            const cx = originX + i * PITCH - x;
            if (cx > W || cx + CARD_W < 0) { continue; }
            // 가운데에서 멀수록 살짝 작고 어둡다 — 지금 칸이 어디인지 읽힌다
            const d = clamp(Math.abs(cx - originX) / PITCH, 0, 1);
            const s = 1 - 0.1 * d;
            const w = CARD_W * s;
            const h = CARD_H * s;
            drawCard(ctx, cx + (CARD_W - w) / 2, CARD_TOP + (CARD_H - h) / 2, w, h, i, 1 - 0.35 * d);
        }
        // 착지 예측 표시 — 놓는 순간 x + v·τ 로 고른 칸의 카드에 점선 테두리를 두르고, 위 점 줄에 예측 위치를 찍는다
        if (ghostA > 0.01) {
            const gx = originX + ghostSlot * PITCH - x;
            ctx.save();
            ctx.setLineDash([6, 6]);
            ctx.lineWidth = 2;
            ctx.strokeStyle = rgba(PEACH, ghostA);
            roundRectPath(ctx, gx, CARD_TOP - 6, CARD_W, CARD_H + 12, 14);
            ctx.stroke();
            ctx.restore();
            ctx.fillStyle = rgba(PEACH, ghostA);
            ctx.beginPath();
            ctx.arc(W / 2 - 70 + clamp(ghostX / PITCH, -0.5, CARD_N - 0.5) * 20, 40, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        // 칸 점
        for (let i = 0; i < CARD_N; i += 1) {
            const near = clamp(1 - Math.abs(x / PITCH - i), 0, 1);
            ctx.fillStyle = rgba(mix(mix(BG, PAPER, 0.25), MINT, near), 1);
            ctx.beginPath();
            ctx.arc(W / 2 - 70 + i * 20, 26, 3.5 + near * 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    cv.addEventListener('pointerdown', function (ev: PointerEvent): void {
        wake();
        dragId = ev.pointerId;
        cv.setPointerCapture(ev.pointerId);
        dragX = toScene(ev)[0];
        dragT = ev.timeStamp;
        raw = x;
        v = 0;
        snapping = false;
        say(TXT_DRAG);
    });
    cv.addEventListener('pointermove', function (ev: PointerEvent): void {
        if (ev.pointerId !== dragId) { return; }
        const sx = toScene(ev)[0];
        const dt = Math.max(1, ev.timeStamp - dragT) / 1000;
        raw -= sx - dragX;
        x = rubberClamp(raw);
        v = lerp(v, -(sx - dragX) / dt, 0.4);
        dragX = sx;
        dragT = ev.timeStamp;
        if (still) { draw(); }
    });
    function endDrag(ev: PointerEvent): void {
        if (ev.pointerId !== dragId) { return; }
        dragId = -1;
        release();
    }
    cv.addEventListener('pointerup', endDrag);
    cv.addEventListener('pointercancel', endDrag);
    function onWheel(ev: WheelEvent): void {
        const d = wheelPx(ev);
        if (d === 0 || !canMove(d)) { return; }
        ev.preventDefault();
        wake();
        snapping = false;
        raw = clamp(x + d, 0, MAX_X);
        x = raw;
        // 휠은 속도를 남기지 않는다 — 멈춘 뒤 WHEEL_IDLE 이 지나면 지금 자리에서 가장 가까운 칸으로 붙는다
        v = 0;
        if (still) { release(); return; }
        wheeling = true;
        lastWheel = clock;
    }
    cv.addEventListener('wheel', onWheel, { passive: false });
    function goSlot(k: number): boolean {
        const kk = clamp(k, 0, CARD_N - 1);
        if (kk * PITCH === target && !snapping && x === target) { return false; }
        target = kk * PITCH;
        v = 0;
        ghostX = target;
        ghostSlot = kk;
        ghostA = 1;
        snapping = true;
        say(TXT_FLING);
        if (still) { x = target; raw = x; snapping = false; say(TXT_SNAP); draw(); }
        return true;
    }
    cv.addEventListener('keydown', function (ev: KeyboardEvent): void {
        const cur = Math.round(target / PITCH);
        let moved = false;
        if (ev.key === 'ArrowRight' && cur < CARD_N - 1) { moved = goSlot(cur + 1); }
        else if (ev.key === 'ArrowLeft' && cur > 0) { moved = goSlot(cur - 1); }
        else if (ev.key === 'Home' && cur > 0) { moved = goSlot(0); }
        else if (ev.key === 'End' && cur < CARD_N - 1) { moved = goSlot(CARD_N - 1); }
        if (!moved) { return; }
        ev.preventDefault();
        wake();
    });
    if (prevBtn) { prevBtn.addEventListener('click', function (): void { wake(); goSlot(Math.round(target / PITCH) - 1); }); }
    if (nextBtn) { nextBtn.addEventListener('click', function (): void { wake(); goSlot(Math.round(target / PITCH) + 1); }); }
    say(TXT_SNAP);

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
        <canvas className={cx("hs__canvas")} data-role="canvas" width={480} height={300} tabIndex={0} aria-label="카드를 끌었다 놓으면 놓는 순간의 속도로 착지 칸을 미리 고르고 스프링으로 붙는 장면"></canvas>
        <p className={cx("hs__status")} data-role="status" aria-live="off">칸에 붙음</p>
        <div className={cx("hs__tools")}>
          <button className={cx("hs__btn")} data-role="prev" type="button">이전</button>
          <button className={cx("hs__btn")} data-role="next" type="button">다음</button>
        </div>
    </div>
  );
}
