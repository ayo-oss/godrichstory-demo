// HscFoldingScreenPanelsNormalLighting - vanilla 판(04-hsc-folding-screen-panels-normal-lighting) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./HscFoldingScreenPanelsNormalLighting.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function HscFoldingScreenPanelsNormalLighting() {
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
    const PANEL_N = 6;
    const PANEL_W = 72;
    const PANEL_H = 176;
    const MAX_FOLD = 1.25;
    const FOCAL = 420;
    const CY = 128;
    const AMBIENT = 0.3;
    const DIFFUSE = 0.72;
    const Q_GAIN = 0.0011;
    const Q_LERP = 0.12;
    const DEMO_LOOP = 4000;
    const YAW = -0.3;
    // 빛이 오는 방향(왼쪽 위 앞) — 길이 1 로 맞춘 벡터 (x 오른쪽, y 아래, z 화면 안쪽)
    const LIGHT = (function (): [number, number, number] {
        const lx = -0.6;
        const ly = -0.3;
        const lz = -0.75;
        const n = Math.sqrt(lx * lx + ly * ly + lz * lz);
        return [lx / n, ly / n, lz / n];
    })();
    const TXT_OPEN = '펼치는 중';
    const TXT_FOLD = '접는 중';
    const TXT_FLAT = '다 펼침';
    const TXT_SHUT = '다 접힘';
    const foldBtn = root.querySelector('[data-role="fold"]') as HTMLButtonElement | null;
    const openBtn = root.querySelector('[data-role="open"]') as HTMLButtonElement | null;
    let target = 0;
    let q = 0;
    let lastDir = 0;
    let lastEnd = TXT_SHUT;
    // 접힘 각도 θ — 진행률 q 가 1 이면 평평(0), 0 이면 MAX_FOLD
    function foldAngle(p: number): number { return (1 - p) * MAX_FOLD; }
    // 원근 투영 배율 — 화면 안쪽 깊이 z 만큼 작아진다
    function persp(z: number): number { return FOCAL / (FOCAL + z); }
    // 병풍 전체를 세로축으로 YAW 만큼 돌려 둔다 — 오른쪽이 멀어져 면마다 깊이가 달라진다
    function yawRot(dx: number, dz: number): [number, number] {
        const c = Math.cos(YAW);
        const s = Math.sin(YAW);
        return [dx * c + dz * s, -dx * s + dz * c];
    }
    // 면 i 의 법선과 빛의 내적 → 밝기. 짝수 면은 오른쪽 안으로, 홀수 면은 오른쪽 앞으로 꺾인다
    function panelLight(i: number, th: number): number {
        const n = yawRot((i % 2 === 0 ? 1 : -1) * Math.sin(th), -Math.cos(th));
        const dot = n[0] * LIGHT[0] + n[1] * LIGHT[2];
        return AMBIENT + DIFFUSE * Math.max(0, dot);
    }
    // 면 i 위의 점(u: 0 왼쪽~1 오른쪽) → 돌리기 전 가로 위치와 깊이
    function panelLocal(i: number, u: number, th: number): [number, number] {
        const run = PANEL_W * Math.cos(th);
        const rise = PANEL_W * Math.sin(th);
        const total = PANEL_N * run;
        const X = W / 2 - total / 2 + (i + u) * run;
        const Z = i % 2 === 0 ? u * rise : (1 - u) * rise;
        return yawRot(X - W / 2, Z);
    }
    // 면 i 위의 점(u, v: 0 위~1 아래) → 3D 로 놓고 원근 투영한 화면 좌표
    function panelPoint(i: number, u: number, v: number, th: number): [number, number] {
        const r = panelLocal(i, u, th);
        const s = persp(r[1]);
        return [W / 2 + r[0] * s, CY + (v - 0.5) * PANEL_H * s];
    }
    // 면 가운데의 깊이 — 화가 알고리즘의 정렬 열쇠
    function panelDepth(i: number, th: number): number { return panelLocal(i, 0.5, th)[1]; }
    function step(): void {
        const prev = q;
        q += (target - q) * Q_LERP;
        if (Math.abs(target - q) < 0.0005) { q = target; }
        const dir = Math.sign(q - prev);
        if (dir !== 0 && dir !== lastDir) { lastDir = dir; lastEnd = ''; say(dir > 0 ? TXT_OPEN : TXT_FOLD); }
        // 목표에 닿아 멈췄을 때만 끝 상태를 알린다
        if (q === target && q > 0.995 && lastEnd !== TXT_FLAT) { lastEnd = TXT_FLAT; say(TXT_FLAT); }
        if (q === target && q < 0.005 && lastEnd !== TXT_SHUT) { lastEnd = TXT_SHUT; say(TXT_SHUT); }
    }
    function settle(): void {
        q = target;
        say(q > 0.5 ? TXT_FLAT : TXT_SHUT);
    }
    function demoTick(t: number): void {
        const p = t % DEMO_LOOP;
        if (p >= 200 && p <= 1300) { target = (p - 200) / 1100; }
        else if (p >= 2300 && p <= 3400) { target = 1 - (p - 2300) / 1100; }
    }
    function quad(i: number, u0: number, v0: number, u1: number, v1: number, th: number): void {
        const a = panelPoint(i, u0, v0, th);
        const b = panelPoint(i, u1, v0, th);
        const c = panelPoint(i, u1, v1, th);
        const d = panelPoint(i, u0, v1, th);
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.lineTo(c[0], c[1]);
        ctx.lineTo(d[0], d[1]);
        ctx.closePath();
    }
    function drawPanel(i: number, th: number): void {
        const lit = panelLight(i, th);
        const tint = TINTS[i % TINTS.length];
        const face = mix(BG, mix(PAPER, tint, 0.35), lit);
        quad(i, 0, 0, 1, 1, th);
        ctx.fillStyle = rgba(face, 1);
        ctx.fill();
        // 그림 칸 — 면과 같이 원근으로 찌그러진다
        quad(i, 0.1, 0.06, 0.9, 0.52, th);
        ctx.fillStyle = rgba(mix(BG, tint, lit), 1);
        ctx.fill();
        // 산 능선 — 면 위 점들을 투영해 잇는다
        ctx.beginPath();
        const ridge: [number, number][] = [[0.1, 0.52], [0.32, 0.3], [0.5, 0.42], [0.7, 0.24], [0.9, 0.4], [0.9, 0.52]];
        for (let k = 0; k < ridge.length; k += 1) {
            const p = panelPoint(i, ridge[k][0], ridge[k][1], th);
            if (k === 0) { ctx.moveTo(p[0], p[1]); } else { ctx.lineTo(p[0], p[1]); }
        }
        ctx.closePath();
        ctx.fillStyle = rgba(mix(BG, INK, lit), 0.7);
        ctx.fill();
        // 글줄 세 개
        for (let r = 0; r < 3; r += 1) {
            quad(i, 0.12, 0.62 + r * 0.09, 0.12 + (r === 0 ? 0.7 : 0.5), 0.62 + r * 0.09 + 0.035, th);
            ctx.fillStyle = rgba(mix(BG, INK, lit), r === 0 ? 0.8 : 0.45);
            ctx.fill();
        }
        // 접힌 모서리 선
        const top = panelPoint(i, 0, 0, th);
        const bot = panelPoint(i, 0, 1, th);
        ctx.strokeStyle = rgba(mix(BG, PAPER, lit * 0.6), 0.7);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(top[0], top[1]);
        ctx.lineTo(bot[0], bot[1]);
        ctx.stroke();
    }
    function draw(): void {
        ctx.fillStyle = rgba(BG, 1);
        ctx.fillRect(0, 0, W, H);
        const th = foldAngle(q);
        // 바닥 그림자 — 펼친 폭만큼 넓어진다
        const left = panelPoint(0, 0, 1, th);
        const right = panelPoint(PANEL_N - 1, 1, 1, th);
        ctx.fillStyle = rgba([10, 8, 22], 0.45);
        ctx.beginPath();
        ctx.ellipse((left[0] + right[0]) / 2, CY + PANEL_H / 2 + 14, (right[0] - left[0]) / 2 + 12, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        // 화가 알고리즘 — 가운데 깊이가 깊은(먼) 면부터 그려 가까운 면이 위에 덮이게 한다
        const order: number[] = [];
        for (let i = 0; i < PANEL_N; i += 1) { order.push(i); }
        order.sort(function (a: number, b: number): number { return panelDepth(b, th) - panelDepth(a, th); });
        for (let k = 0; k < order.length; k += 1) { drawPanel(order[k], th); }
        // 진행 막대
        ctx.fillStyle = rgba(mix(BG, PAPER, 0.14), 1);
        ctx.fillRect(24, 22, W - 48, 5);
        ctx.fillStyle = rgba(MINT, 1);
        ctx.fillRect(24, 22, (W - 48) * q, 5);
    }
    function canMove(d: number): boolean { return d > 0 ? target < 1 : target > 0; }
    function moveTo(p: number): void {
        target = clamp(p, 0, 1);
        if (still) { settle(); draw(); }
    }
    function onWheel(ev: WheelEvent): void {
        const d = wheelPx(ev);
        if (d === 0 || !canMove(d)) { return; }
        ev.preventDefault();
        wake();
        moveTo(target + d * Q_GAIN);
    }
    cv.addEventListener('wheel', onWheel, { passive: false });
    let dragId = -1;
    let dragX = 0;
    cv.addEventListener('pointerdown', function (ev: PointerEvent): void {
        wake();
        dragId = ev.pointerId;
        cv.setPointerCapture(ev.pointerId);
        dragX = toScene(ev)[0];
    });
    cv.addEventListener('pointermove', function (ev: PointerEvent): void {
        if (ev.pointerId !== dragId) { return; }
        const sx = toScene(ev)[0];
        // 오른쪽으로 끌면 펼친다 — 다 펼친 폭(PANEL_N × PANEL_W)을 끌면 0 → 1
        moveTo(target + (sx - dragX) / (PANEL_N * PANEL_W));
        dragX = sx;
    });
    function endDrag(ev: PointerEvent): void { if (ev.pointerId === dragId) { dragId = -1; } }
    cv.addEventListener('pointerup', endDrag);
    cv.addEventListener('pointercancel', endDrag);
    cv.addEventListener('keydown', function (ev: KeyboardEvent): void {
        let goal = NaN;
        if (ev.key === 'ArrowRight') { goal = target + 0.1; }
        else if (ev.key === 'ArrowLeft') { goal = target - 0.1; }
        else if (ev.key === 'Home') { goal = 0; }
        else if (ev.key === 'End') { goal = 1; }
        if (Number.isNaN(goal) || !canMove(goal - target)) { return; }
        ev.preventDefault();
        wake();
        moveTo(goal);
    });
    if (foldBtn) { foldBtn.addEventListener('click', function (): void { wake(); moveTo(0); }); }
    if (openBtn) { openBtn.addEventListener('click', function (): void { wake(); moveTo(1); }); }
    say(TXT_SHUT);

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
        <canvas className={cx("hs__canvas")} data-role="canvas" width={480} height={300} tabIndex={0} aria-label="병풍 패널이 접혔다 펴지며 면마다 빛을 받는 각도에 따라 밝기가 달라지는 장면"></canvas>
        <p className={cx("hs__status")} data-role="status" aria-live="off">다 접힘</p>
        <div className={cx("hs__tools")}>
          <button className={cx("hs__btn")} data-role="fold" type="button">접기</button>
          <button className={cx("hs__btn")} data-role="open" type="button">펼치기</button>
        </div>
    </div>
  );
}
