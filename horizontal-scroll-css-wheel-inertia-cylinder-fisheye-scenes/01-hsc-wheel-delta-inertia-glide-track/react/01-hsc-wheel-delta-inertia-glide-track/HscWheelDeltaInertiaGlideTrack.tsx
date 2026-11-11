// HscWheelDeltaInertiaGlideTrack - vanilla 판(01-hsc-wheel-delta-inertia-glide-track) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./HscWheelDeltaInertiaGlideTrack.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function HscWheelDeltaInertiaGlideTrack() {
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
    const CARD_N = 12;
    const CARD_W = 118;
    const CARD_H = 156;
    const GAP = 14;
    const PITCH = CARD_W + GAP;
    const PAD = 24;
    const TRACK_TOP = 58;
    const MAX_X = PAD * 2 + CARD_N * PITCH - GAP - W;
    const WHEEL_GAIN = 0.12;
    const FRICTION = 0.92;
    const EDGE_K = 0.16;
    const EDGE_DAMP = 0.6;
    const RUBBER_PX = 90;
    const STOP_V = 0.05;
    const DEMO_LOOP = 4200;
    const TXT_GLIDE = '휠 관성으로 미끄러지는 중';
    const TXT_EDGE = '끝에서 고무줄처럼 되돌아온다';
    const TXT_STOP = '멈춤';
    const backBtn = root.querySelector('[data-role="btn"]') as HTMLButtonElement | null;
    let x = 0;
    let v = 0;
    let moving = false;
    let edgeSaid = false;
    let dragId = -1;
    let dragX = 0;
    let dragT = 0;
    let dragV = 0;
    // 트랙 끝 밖으로 나간 거리(안쪽이면 0)
    function overshoot(p: number): number { return p < 0 ? p : (p > MAX_X ? p - MAX_X : 0); }
    // 끝 밖으로 미는 입력은 나간 거리만큼 줄인다 — 고무줄처럼 버틴다
    function rubber(d: number): number {
        const out = (x <= 0 && d < 0) || (x >= MAX_X && d > 0);
        return out ? d / (1 + Math.abs(overshoot(x)) / RUBBER_PX) : d;
    }
    function push(d: number): void {
        v += rubber(d) * WHEEL_GAIN;
        moving = true;
        say(TXT_GLIDE);
    }
    // 지금 속도로 놓아두면 얼마나 더 가나 — 스텝마다 FRICTION 을 곱하므로 등비급수 v·f/(1−f)
    function glideDistance(v0: number, f: number): number { return v0 * f / (1 - f); }
    // 거꾸로, distance 만큼 가서 멈추려면 처음 속도가 얼마여야 하나
    function speedFor(distance: number, f: number): number { return distance * (1 - f) / f; }
    function canMove(d: number): boolean { return d > 0 ? x < MAX_X - 0.5 : x > 0.5; }
    function step(): void {
        if (dragId >= 0) { return; }
        x += v;
        const o = overshoot(x);
        if (o !== 0) {
            v = (v - o * EDGE_K) * EDGE_DAMP;
            if (!edgeSaid) { edgeSaid = true; say(TXT_EDGE); }
        } else {
            v *= FRICTION;
            edgeSaid = false;
        }
        if (moving && Math.abs(v) < STOP_V && Math.abs(o) < 0.5) {
            x = clamp(x, 0, MAX_X);
            v = 0;
            moving = false;
            say(TXT_STOP);
        }
    }
    function settle(): void {
        x = 0;
        v = 0;
        say(TXT_STOP);
    }
    function demoTick(t: number): void {
        for (let k = 0; k < 3; k += 1) { if (crossed(t, 200 + k * 40, DEMO_LOOP)) { push(100); } }
        for (let k = 0; k < 5; k += 1) { if (crossed(t, 1250 + k * 40, DEMO_LOOP)) { push(-100); } }
    }
    function draw(): void {
        ctx.fillStyle = rgba(BG, 1);
        ctx.fillRect(0, 0, W, H);
        // 바닥 레일
        ctx.fillStyle = rgba(mix(BG, LILAC, 0.16), 1);
        ctx.fillRect(0, TRACK_TOP + CARD_H + 14, W, 3);
        for (let i = 0; i < CARD_N; i += 1) {
            const cx = PAD + i * PITCH - x;
            if (cx > W || cx + CARD_W < 0) { continue; }
            drawCard(ctx, cx, TRACK_TOP, CARD_W, CARD_H, i, 1);
        }
        // 위쪽 진행 막대 — 끝 밖으로 나가면 막대가 그만큼 짧아진다
        const trackW = W - 48;
        const thumbW = trackW * (W / (MAX_X + W));
        const o = overshoot(x);
        const squash = Math.abs(o) * 0.6;
        const left = 24 + (clamp(x, 0, MAX_X) / MAX_X) * (trackW - thumbW) + (o > 0 ? squash : 0);
        ctx.fillStyle = rgba(mix(BG, PAPER, 0.14), 1);
        ctx.fillRect(24, 26, trackW, 6);
        ctx.fillStyle = rgba(SKY, 1);
        ctx.fillRect(left, 26, Math.max(10, thumbW - squash), 6);
        // 속도 눈금 — 마찰로 줄어드는 모습이 그대로 보인다
        const speedW = clamp(Math.abs(v) * 2.4, 0, trackW);
        ctx.fillStyle = rgba(PINK, 0.9);
        ctx.fillRect(W / 2 - speedW / 2, 38, speedW, 3);
    }
    function onWheel(ev: WheelEvent): void {
        const d = wheelPx(ev);
        // 끝에 닿았으면 가로채지 않는다 — 페이지가 계속 스크롤된다
        if (d === 0 || !canMove(d)) { return; }
        ev.preventDefault();
        wake();
        if (still) {
            x = clamp(x + d, 0, MAX_X);
            say(TXT_STOP);
            draw();
            return;
        }
        push(d);
    }
    cv.addEventListener('wheel', onWheel, { passive: false });
    cv.addEventListener('pointerdown', function (ev: PointerEvent): void {
        wake();
        dragId = ev.pointerId;
        cv.setPointerCapture(ev.pointerId);
        dragX = toScene(ev)[0];
        dragT = ev.timeStamp;
        dragV = 0;
        v = 0;
    });
    cv.addEventListener('pointermove', function (ev: PointerEvent): void {
        if (ev.pointerId !== dragId) { return; }
        const sx = toScene(ev)[0];
        const dx = sx - dragX;
        const steps = Math.max(1, (ev.timeStamp - dragT) / FIXED_DT);
        dragX = sx;
        dragT = ev.timeStamp;
        const d = rubber(-dx);
        x = still ? clamp(x + d, 0, MAX_X) : x + d;
        dragV = lerp(dragV, d / steps, 0.5);
        if (still) { draw(); }
    });
    function endDrag(ev: PointerEvent): void {
        if (ev.pointerId !== dragId) { return; }
        dragId = -1;
        if (still) { return; }
        v = clamp(dragV, -60, 60);
        moving = true;
        say(TXT_GLIDE);
    }
    cv.addEventListener('pointerup', endDrag);
    cv.addEventListener('pointercancel', endDrag);
    cv.addEventListener('keydown', function (ev: KeyboardEvent): void {
        let goal = NaN;
        if (ev.key === 'ArrowRight') { goal = x + PITCH; }
        else if (ev.key === 'ArrowLeft') { goal = x - PITCH; }
        else if (ev.key === 'Home') { goal = 0; }
        else if (ev.key === 'End') { goal = MAX_X; }
        if (Number.isNaN(goal) || !canMove(goal - x)) { return; }
        ev.preventDefault();
        wake();
        goal = clamp(goal, 0, MAX_X);
        if (still) { x = goal; say(TXT_STOP); draw(); return; }
        // 키도 관성으로 — 목표에서 정확히 멈추는 처음 속도를 등비급수로 거꾸로 푼다
        v = speedFor(goal - x, FRICTION);
        moving = true;
        say(TXT_GLIDE);
    });
    if (backBtn) {
        backBtn.addEventListener('click', function (): void {
            wake();
            if (still) { x = 0; say(TXT_STOP); draw(); return; }
            v = speedFor(-x, FRICTION);
            moving = true;
            say(TXT_GLIDE);
        });
    }
    say(TXT_GLIDE);

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
        <canvas className={cx("hs__canvas")} data-role="canvas" width={480} height={300} tabIndex={0} aria-label="휠이나 끌기로 카드 트랙을 옆으로 밀면 마찰로 서서히 멈추고 양 끝에서 고무줄처럼 되돌아오는 장면"></canvas>
        <p className={cx("hs__status")} data-role="status" aria-live="off">휠 관성으로 미끄러지는 중</p>
        <div className={cx("hs__tools")}>
          <button className={cx("hs__btn")} data-role="btn" type="button">처음으로</button>
        </div>
    </div>
  );
}
