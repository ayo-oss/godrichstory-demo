// TimeScale - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./TimeScale.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

function main(root: HTMLElement): () => void {
    type RGB = [number, number, number];
    // 무대 좌표 — 캔버스 안 계산은 늘 480×300. 화면에 보이는 크기와 상관없다
    const W = 480;
    const H = 300;
    const TAU = Math.PI * 2;
    function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
    function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
    // 파스텔 팔레트 — 바탕은 짙은 자두색, 상자는 연한 색, 글자는 연한 색 또는 짙은 잉크
    const INK: RGB = [40, 36, 54];
    const PAPER: RGB = [250, 246, 240];
    const ROSE: RGB = [244, 162, 186];
    const MINT: RGB = [148, 212, 182];
    const SKY: RGB = [150, 192, 244];
    const SUN: RGB = [250, 218, 146];
    const LILAC: RGB = [196, 176, 244];
    const NEU: RGB = [236, 230, 250];
    const BGC: RGB = [46, 42, 68];
    const PANEL: RGB = [62, 57, 92];
    const GRID: RGB = [92, 86, 124];
    const DIM: RGB = [196, 190, 224];
    function rgba(c: RGB, a: number): string {
        return 'rgba(' + Math.round(clamp(c[0], 0, 255)) + ',' + Math.round(clamp(c[1], 0, 255)) + ',' + Math.round(clamp(c[2], 0, 255)) + ',' + clamp(a, 0, 1).toFixed(3) + ')';
    }
    // 문구 틀의 {a}·{b}·{c} 자리에 값을 끼운다 — 화면 문구는 늘 틀 한 줄이고 로케일 사전이 통째로 바꾼다
    function fill(s: string, ...v: string[]): string {
        const keys = ['{a}', '{b}', '{c}', '{d}', '{e}', '{f}', '{g}', '{h}'];
        let o = s;
        for (let i = 0; i < keys.length; i += 1) {
            o = o.split(keys[i]).join(i < v.length ? v[i] : '');
        }
        return o;
    }
    function f1(v: number): string { return (Math.round(v * 10) / 10).toFixed(1); }
    function f2(v: number): string { return (Math.round(v * 100) / 100).toFixed(2); }
    function n0(v: number): string { return String(Math.round(v)); }
    // ── 무대 요소
    const rootEl = root;
    const canvasEl = rootEl.querySelector('[data-role="canvas"]') as HTMLCanvasElement | null;
    const padEl = rootEl.querySelector('[data-role="pad"]') as HTMLElement | null;
    const pauseEl = rootEl.querySelector('[data-role="pause"]') as HTMLButtonElement | null;
    const statusEl = rootEl.querySelector('[data-role="status"]') as HTMLElement | null;
    const doneEl = rootEl.querySelector('[data-role="done"]') as HTMLElement | null;
    const actEl = rootEl.querySelector('[data-role="act"]') as HTMLButtonElement | null;
    const ctxRaw = canvasEl ? canvasEl.getContext('2d') : null;
    if (!canvasEl || !ctxRaw || !pauseEl || !padEl || !doneEl || !statusEl) {
        return function (): void { /* 무대가 없으면 할 일이 없다 */ };
    }
    const cv: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctxRaw;
    const pad: HTMLElement = padEl;
    const pauseBtn: HTMLButtonElement = pauseEl;
    const doneP: HTMLElement = doneEl;
    const statusP: HTMLElement = statusEl;
    // 외부 웹폰트는 부르지 않는다 — 기기에 있는 글꼴 목록만
    const UI_FONT = 'system-ui, -apple-system, "Segoe UI", "Noto Sans KR", sans-serif';
    const CODE_FONT = 'ui-monospace, "Cascadia Mono", Consolas, "Noto Sans KR", monospace';
    let dpr = 1;
    function fitCanvas(): void {
        // 배율은 2 에서 자른다 — 계산은 늘 480×300 이고 화면 배율만 이 값
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function box(x: number, y: number, w: number, h: number, r: number, c: RGB, a: number): void {
        if (w <= 0.2 || h <= 0.2 || a <= 0) { return; }
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
        ctx.fillStyle = rgba(c, a);
        ctx.fill();
    }
    function disc(x: number, y: number, r: number, c: RGB, a: number): void {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fillStyle = rgba(c, a);
        ctx.fill();
    }
    function ring(x: number, y: number, r: number, c: RGB, a: number, w: number): void {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.strokeStyle = rgba(c, a);
        ctx.lineWidth = w;
        ctx.stroke();
    }
    function seg(x1: number, y1: number, x2: number, y2: number, c: RGB, a: number, w: number): void {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = rgba(c, a);
        ctx.lineWidth = w;
        ctx.lineCap = 'round';
        ctx.stroke();
    }
    function dash(x1: number, y1: number, x2: number, y2: number, c: RGB, a: number): void {
        ctx.setLineDash([3, 3]);
        seg(x1, y1, x2, y2, c, a, 1);
        ctx.setLineDash([]);
    }
    // 글자 — maxW 가 있으면 그 폭에 들어가도록 글자 크기를 줄인다(문구가 로케일마다 길이가 달라서)
    function text(s: string, x: number, y: number, c: RGB, px: number, weight: number, align: CanvasTextAlign, maxW?: number, mono?: boolean): void {
        const face = mono ? CODE_FONT : UI_FONT;
        let size = px;
        ctx.font = weight + ' ' + size + 'px ' + face;
        if (maxW !== undefined) {
            while (size > 8 && ctx.measureText(s).width > maxW) {
                size -= 0.5;
                ctx.font = weight + ' ' + size + 'px ' + face;
            }
        }
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = rgba(c, 1);
        ctx.fillText(s, x, y);
    }
    // 아래쪽 눈금 알약들 — 상수 이름과 지금 값
    function chips(list: [string, string][]): void {
        const y = H - 28;
        let x = 10;
        for (let i = 0; i < list.length; i += 1) {
            const label = list[i][0] + ' ' + list[i][1];
            ctx.font = '700 10px ' + CODE_FONT;
            const w = ctx.measureText(label).width + 16;
            box(x, y, w, 18, 9, NEU, 0.96);
            text(label, x + w / 2, y + 9.5, INK, 10, 700, 'center', undefined, true);
            x += w + 6;
        }
    }
    // 가로 막대 — 바탕 위에 frac(0 에서 1) 만큼 채우고 끝에 머리를 단다
    function bar(x: number, y: number, w: number, h: number, frac: number, c: RGB, a: number): void {
        box(x, y, w, h, h / 2, PANEL, 1);
        if (frac > 0) {
            const fw = Math.max(h, w * clamp(frac, 0, 1));
            box(x, y, fw, h, h / 2, c, a);
            disc(x + fw - h / 2, y + h / 2, h / 2 - 2.5, PAPER, 1);
        }
    }
    // ── 가상 눈금 — 실제 requestAnimationFrame 이 한 번 불릴 때마다, 그사이 지난 시간만큼 가상 프레임을 차례로 부른다
    // (모니터 주사율을 흉내 내는 시계 주입. 콜백 인자는 가상 프레임 사이의 간격 ms 와 그 시각 ms)
    type Lane = { period: number; next: number };
    function lane(periodMs: number): Lane { return { period: periodMs, next: periodMs }; }
    function runLane(l: Lane, nowMs: number, cb: (gapMs: number, vtMs: number) => void): number {
        let n = 0;
        while (l.next <= nowMs && n < 400) {
            cb(l.period, l.next);
            l.next += l.period;
            n += 1;
        }
        return n;
    }
    // ── 시간·상태·낭독
    // sceneT = 장면 시간(초). 일시정지·탭 숨김·간격 폭주 구간은 더하지 않는다
    let sceneT = 0;
    let lap = 0;
    let paused = false;
    let still = false;
    let settling = false;
    let holdFlag = false;
    let rawGap = 0;
    let lastStatus = '';
    let lastMode = -9;
    // 프레임 간격이 튀어도 장면 시간이 한 번에 몰리지 않게 자른다
    const DT_MAX = 0.05;
    const timerIds: number[] = [];
    function later(fn: () => void, ms: number): void { timerIds.push(window.setTimeout(fn, ms)); }
    function every(fn: () => void, ms: number): number {
        const id = window.setInterval(fn, ms);
        timerIds.push(id);
        return id;
    }
    function clearTimers(): void {
        for (let i = 0; i < timerIds.length; i += 1) {
            window.clearTimeout(timerIds[i]);
            window.clearInterval(timerIds[i]);
        }
        timerIds.length = 0;
    }
    function pushStatus(s: string): void {
        if (s === lastStatus) { return; }
        lastStatus = s;
        statusP.textContent = s;
    }
    function redraw(): void {
        ctx.clearRect(0, 0, W, H);
        box(0, 0, W, H, 0, BGC, 1);
        ctx.save();
        ctx.translate(0, 6);
        draw();
        ctx.restore();
        pushStatus(statusText());
        const m = still ? -2 : modeId();
        if (m !== lastMode) {
            lastMode = m;
            doneP.textContent = speakText();
        }
    }
    let rafId = 0;
    let lastTs = -1;
    function frame(ts: number): void {
        rafId = 0;
        if (still || paused || document.hidden) { return; }
        rawGap = lastTs < 0 ? 0 : ts - lastTs;
        const dt = lastTs < 0 ? 0 : Math.min(rawGap / 1000, DT_MAX);
        lastTs = ts;
        sceneT += dt;
        if (sceneT >= LAP_S) {
            lap += 1;
            resetScene();
        }
        advance(ts, dt);
        redraw();
        if (!holdFlag) { rafId = window.requestAnimationFrame(frame); }
    }
    function startLoop(): void {
        if (rafId || holdFlag) { return; }
        // 멈췄던 사이의 시간을 첫 프레임 간격으로 넘기지 않는다
        lastTs = -1;
        rafId = window.requestAnimationFrame(frame);
    }
    function stopLoop(): void {
        if (rafId) {
            window.cancelAnimationFrame(rafId);
            rafId = 0;
        }
    }
    function resetScene(): void {
        clearTimers();
        holdFlag = false;
        sceneT = 0;
        reset();
    }
    // 움직임 줄이기 — 루프를 돌리지 않고 장면의 끝 상태를 계산해 한 장만 그린다
    function finalState(): void {
        stopLoop();
        settling = true;
        resetScene();
        const n = Math.round(REST_S * 60);
        for (let i = 1; i <= n; i += 1) {
            sceneT = i / 60;
            rawGap = 1000 / 60;
            advance(sceneT * 1000, 1 / 60);
        }
        settling = false;
        clearTimers();
        redraw();
    }
    function restart(): void {
        lap = 0;
        resetScene();
        redraw();
        if (!paused && !still) { startLoop(); }
    }
    function togglePause(): void {
        paused = !paused;
        pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
        if (paused) { stopLoop(); } else if (!still) { startLoop(); }
    }
    const off = new AbortController();
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    still = reduceQuery.matches;
    pauseBtn.addEventListener('click', function (): void { togglePause(); }, { signal: off.signal });
    if (actEl) {
        actEl.addEventListener('click', function (): void { onAction(); redraw(); }, { signal: off.signal });
    }
    pad.addEventListener('keydown', function (e: KeyboardEvent): void {
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'p' || e.key === 'P') {
            e.preventDefault();
            togglePause();
            return;
        }
        if (e.key === 'r' || e.key === 'R') {
            e.preventDefault();
            restart();
            return;
        }
        if ((e.key === 'a' || e.key === 'A') && actEl) {
            e.preventDefault();
            onAction();
            redraw();
            return;
        }
        if (onKey(e)) {
            e.preventDefault();
            redraw();
        }
    }, { signal: off.signal });
    // 탭이 숨으면 멈추고, 돌아오면 시계를 다시 맞춰 시작
    document.addEventListener('visibilitychange', function (): void {
        if (document.hidden) { stopLoop(); } else if (!paused && !still) { startLoop(); }
    }, { signal: off.signal });
    // 설정이 바뀌면 — 켜지면 끝 장면 한 장, 꺼지면 다시 움직인다
    reduceQuery.addEventListener('change', function (): void {
        still = reduceQuery.matches;
        if (still) { finalState(); } else { restart(); }
    }, { signal: off.signal });
    window.addEventListener('resize', function (): void {
        fitCanvas();
        redraw();
    }, { signal: off.signal });
    // 08 — 시간 차에 배율(timeScale)을 곱해 정지·0.5배·2배를 만든다. 일시정지 동안 기준 시각을 갱신하지 않는 판은 복귀 첫 프레임에 거리가 튀고, 기준 시각을 계속 갱신하는 판은 튀지 않는다
    const LAP_S = 4.0;
    const REST_S = 3.8;
    const SP = 90;
    const TX = 20;
    const TW = 330;
    // 장면 시간(초)별 배율 — 1배, 0.5배, 정지, 2배, 다시 1배
    function scaleAt(t: number): number {
        if (t < 0.7) { return 1; }
        if (t < 1.3) { return 0.5; }
        if (t < 2.0) { return 0; }
        if (t < 2.8) { return 2; }
        return 1;
    }
    type Ball = { x: number; last: number; jump: number };
    let naive: Ball = { x: 0, last: -1, jump: 0 };
    let scaled: Ball = { x: 0, last: -1, jump: 0 };
    let force = false;
    let shown = 1;
    let curScale = 1;
    let resumeJump = 0;
    function reset(): void {
        naive = { x: 0, last: -1, jump: 0 };
        scaled = { x: 0, last: -1, jump: 0 };
        force = false;
        shown = 1;
        curScale = 1;
        resumeJump = 0;
    }
    function advance(ts: number, dt: number): void {
        curScale = force ? 0 : scaleAt(sceneT);
        shown += (curScale - shown) * (1 - Math.exp(-12 * dt));
        if (naive.last < 0 || rawGap === 0) {
            naive.last = ts;
            scaled.last = ts;
        }
        // timeScale 판 — 기준 시각은 늘 갱신하고, 시간 차에 배율을 곱한다
        const dB = Math.min((ts - scaled.last) / 1000, DT_MAX);
        scaled.last = ts;
        scaled.x = Math.min(TW, scaled.x + SP * curScale * dB);
        // 정지 판 — 멈춘 동안은 기준 시각을 갱신하지 않고 그냥 건너뛴다
        if (curScale > 0) {
            const dA = (ts - naive.last) / 1000;
            naive.last = ts;
            const before = naive.x;
            naive.x = Math.min(TW, naive.x + SP * curScale * dA);
            if (dA > 0.3) {
                naive.jump = naive.x - before;
                resumeJump = Math.max(resumeJump, naive.jump);
            }
        }
    }
    function lanePanel(y: number, title: string, b: Ball, c: RGB, jumped: boolean): void {
        box(8, y, 344, 70, 10, [54, 49, 80], 1);
        text(title, 20, y + 12, PAPER, 10.5, 700, 'left', 340);
        bar(TX, y + 26, TW, 16, b.x / TW, c, 0.95);
        text(fill('거리 {a}px', n0(b.x)), TX, y + 56, c, 11, 700, 'left', 150);
        if (jumped) {
            text(fill('복귀 첫 프레임 +{a}px', n0(resumeJump)), TX + TW, y + 56, SUN, 10.5, 700, 'right', 190);
        } else {
            text('복귀 때 점프 없음', TX + TW, y + 56, DIM, 10.5, 700, 'right', 190);
        }
    }
    function dial(): void {
        const cx = 415;
        const cy = 108;
        const r = 40;
        box(358, 40, 114, 148, 10, [54, 49, 80], 1);
        text("timeScale", cx, 54, PAPER, 11, 700, "center", 100, true);
        // 0 에서 2 까지의 눈금 — 왼쪽 아래에서 오른쪽 아래로
        ctx.beginPath();
        ctx.arc(cx, cy + 8, r, Math.PI * 0.75, Math.PI * 2.25);
        ctx.strokeStyle = rgba(GRID, 1);
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.stroke();
        const a0 = Math.PI * 0.75;
        const a1 = a0 + (Math.PI * 1.5) * clamp(shown / 2, 0, 1);
        ctx.beginPath();
        ctx.arc(cx, cy + 8, r, a0, Math.max(a1, a0 + 0.001));
        ctx.strokeStyle = rgba(shown < 0.05 ? ROSE : (shown > 1.2 ? SUN : MINT), 1);
        ctx.lineWidth = 6;
        ctx.stroke();
        seg(cx, cy + 8, cx + Math.cos(a1) * (r - 8), cy + 8 + Math.sin(a1) * (r - 8), PAPER, 1, 2.5);
        disc(cx, cy + 8, 4, PAPER, 1);
        text('×' + f1(shown), cx, cy + 40, PAPER, 15, 700, 'center', 100, true);
        text(force ? 'A 키로 멈춤' : '시간표대로', cx, 178, DIM, 9.5, 600, 'center', 114);
    }
    function schedule(): void {
        const y = 196;
        const w = W - 32;
        box(8, y - 6, W - 16, 38, 10, [54, 49, 80], 1);
        const segs: [number, number][] = [[0, 1], [0.7, 0.5], [1.3, 0], [2.0, 2], [2.8, 1]];
        for (let i = 0; i < segs.length; i += 1) {
            const t0 = segs[i][0];
            const t1 = i + 1 < segs.length ? segs[i + 1][0] : LAP_S;
            const s = segs[i][1];
            box(16 + w * (t0 / LAP_S) + 1, y, w * ((t1 - t0) / LAP_S) - 2, 14, 5, s === 0 ? ROSE : (s > 1 ? SUN : (s < 1 ? SKY : MINT)), 0.9);
            text('×' + String(s), 16 + w * ((t0 + t1) / 2 / LAP_S), y + 7.5, INK, 9.5, 700, 'center', 40, true);
        }
        const px = 16 + w * clamp(sceneT / LAP_S, 0, 1);
        seg(px, y - 3, px, y + 18, PAPER, 1, 2);
        text('장면 시간표', 16, y + 26, DIM, 9, 600, 'left', 200);
    }
    function draw(): void {
        lanePanel(40, '정지 중에는 기준 시각을 갱신하지 않는 판', naive, ROSE, resumeJump > 0);
        lanePanel(114, '기준 시각은 늘 갱신 + 시간 차에 timeScale 곱하기', scaled, MINT, false);
        dial();
        schedule();
        chips([['TIME_SCALE', f1(curScale)], ['RESUME_JUMP', n0(resumeJump)], ['DIST', n0(naive.x) + '/' + n0(scaled.x)]]);
    }
    function statusText(): string {
        return fill('배율 ×{a} · 정지 판 {b}px · timeScale 판 {c}px', f1(curScale), n0(naive.x), n0(scaled.x));
    }
    function modeId(): number { return curScale === 0 ? 1 : (curScale > 1 ? 2 : 0); }
    function speakText(): string {
        return fill('일시정지에서 돌아온 첫 프레임에 기준 시각을 갱신하지 않은 판은 {a}px 를 건너뛰고, 기준 시각을 늘 갱신하며 배율을 곱한 판은 건너뛰지 않는다. 같은 시간표 끝에서 거리는 {b}px 와 {c}px 다', n0(resumeJump), n0(naive.x), n0(scaled.x));
    }
    function onKey(e: KeyboardEvent): boolean { void e; return false; }
    // A 키 — 시간표와 상관없이 배율을 0 으로 붙잡거나 푼다
    function onAction(): void { force = !force; }
    fitCanvas();
    if (still) { finalState(); } else { resetScene(); redraw(); startLoop(); }
    return function (): void {
        stopLoop();
        clearTimers();
        off.abort();
    };

}

export default function TimeScale() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    return main(rootEl);
  }, []);

  return (
    <div className={cx("ez") + " is-demo"} ref={rootRef}>
        <div className={cx("ez__pad")} data-role="pad" tabIndex={0} role="application" aria-label={'시연 무대 — Space 또는 Enter 로 일시정지, R 로 처음부터, A 키로 배율을 0 으로 붙잡거나 푼다'}>
          <canvas className={cx("ez__canvas")} data-role="canvas" width={480} height={300} role="img" aria-label={'배율을 1배·0.5배·정지·2배로 바꿀 때 복귀 첫 프레임에 튀는 판과 튀지 않는 판의 이동 거리를 비교하는 장면'}></canvas>
        </div>
        <p className={cx("ez__status")} data-role="status" aria-live="off">{'장면 준비'}</p>
        <div className={cx("ez__ctrl")}>
          <button className={cx("ez__pause")} data-role="pause" type="button" aria-pressed="false">{'일시정지'}</button>
          <button className={cx("ez__pause")} data-role="act" type="button">{'정지 붙잡기'}</button>
        </div>
        <p className={cx("ez__done")} data-role="done" role="status" aria-live="polite"></p>
    </div>
  );
}
