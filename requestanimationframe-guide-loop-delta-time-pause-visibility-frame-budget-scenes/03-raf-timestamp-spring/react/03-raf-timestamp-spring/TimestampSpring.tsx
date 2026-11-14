// TimestampSpring - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./TimestampSpring.module.scss";

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
    // 03 — 스프링 한 단계를 콜백이 받는 시간 차(timestamp 의 차이)로 정확히 풀어, 가상 프레임 간격이 달라도 정착 시간이 같은지 잰다
    const LAP_S = 5.4;
    const REST_S = 5.2;
    const STIFFNESS = 200;
    const ZETA = 0.45;
    const W0 = Math.sqrt(STIFFNESS);
    const WD = W0 * Math.sqrt(1 - ZETA * ZETA);
    const POS_A = 54;
    const POS_B = 404;
    // 목표가 옮겨 가는 장면 시간(초)
    const JUMPS = [0.4, 2.2, 4.0];
    function nm(v: number): string { return v >= 0 ? n0(v) : '—'; }
    function nms(v: number): string { return v >= 0 ? n0(v) + 'ms' : '—'; }
    type Spring = { hz: number; byDt: boolean; l: Lane; x: number; v: number; target: number; t0: number; settleMs: number; settled: boolean; trail: number[]; ji: number };
    function mk(hz: number, byDt: boolean): Spring {
        return { hz: hz, byDt: byDt, l: lane(1000 / hz), x: POS_A, v: 0, target: POS_A, t0: -1, settleMs: -1, settled: true, trail: [], ji: 0 };
    }
    let rows: Spring[] = [mk(30, false), mk(30, true), mk(144, false), mk(144, true)];
    function reset(): void {
        rows = [mk(30, false), mk(30, true), mk(144, false), mk(144, true)];
    }
    // 시간 차 h(초) 만큼 감쇠 진동의 닫힌 식으로 한 번에 나아간다 — h 가 얼마든 같은 곡선 위에 있다
    function exactStep(s: Spring, h: number): void {
        const e = s.x - s.target;
        const d = Math.exp(-ZETA * W0 * h);
        const cs = Math.cos(WD * h);
        const sn = Math.sin(WD * h);
        const b = (s.v + ZETA * W0 * e) / WD;
        s.x = s.target + d * (e * cs + b * sn);
        s.v = d * (s.v * cs - ((ZETA * W0 * s.v + W0 * W0 * e) / WD) * sn);
    }
    // 간격을 모르고 프레임마다 60분의 1초라고 가정한 단계
    function guessStep(s: Spring): void {
        const h = 1 / 60;
        s.v += (-STIFFNESS * (s.x - s.target) - 2 * ZETA * W0 * s.v) * h;
        s.x += s.v * h;
    }
    function advance(ts: number, dt: number): void {
        void ts;
        void dt;
        const nowMs = sceneT * 1000;
        for (let i = 0; i < rows.length; i += 1) {
            const s = rows[i];
            runLane(s.l, nowMs, function (gap: number, vtm: number): void {
                // 가상 눈금이 점프 시각을 지나는 순간 목표를 옮긴다 — 실제 프레임 시각과 상관없이 같은 값이 나온다
                if (s.ji < JUMPS.length && vtm >= JUMPS[s.ji] * 1000) {
                    s.target = s.ji % 2 === 0 ? POS_B : POS_A;
                    s.t0 = JUMPS[s.ji] * 1000;
                    s.settled = false;
                    s.ji += 1;
                }
                if (s.byDt) { exactStep(s, gap / 1000); } else { guessStep(s); }
                if (!s.settled && Math.abs(s.x - s.target) < 1.2 && Math.abs(s.v) < 8) {
                    s.settled = true;
                    s.settleMs = vtm - s.t0;
                }
            });
            s.trail.push(s.x);
            if (s.trail.length > 16) { s.trail.shift(); }
        }
    }
    function draw(): void {
        for (let i = 0; i < rows.length; i += 1) {
            const s = rows[i];
            const y = 40 + i * 57;
            const c = s.byDt ? SKY : ROSE;
            box(8, y, W - 16, 52, 10, [54, 49, 80], 1);
            text(fill(s.byDt ? '{a}Hz · 시간 차로 풀기' : '{a}Hz · 프레임마다 60분의 1초로 가정', String(s.hz)), 20, y + 11, PAPER, 10.5, 700, 'left', 270);
            const label = s.settleMs >= 0 ? fill('정착 {a}ms', n0(s.settleMs)) : '움직이는 중';
            text(label, W - 20, y + 11, s.settleMs >= 0 ? c : DIM, 10.5, 700, 'right', 160);
            const ly = y + 33;
            seg(POS_A, ly, POS_B, ly, GRID, 1, 2);
            ring(s.target, ly, 11, PAPER, 0.9, 1.5);
            // 잔상 — 최근 위치들
            for (let k = 0; k < s.trail.length; k += 1) {
                disc(s.trail[k], ly, 3 + 6 * (k / s.trail.length), c, 0.12 + 0.3 * (k / s.trail.length));
            }
            seg(s.target, ly, s.x, ly, c, 0.55, 5);
            disc(s.x, ly, 9, c, 1);
        }
        chips([['STIFFNESS', n0(STIFFNESS)], ['SETTLE_MS', nm(rows[1].settleMs) + '/' + nm(rows[3].settleMs)], ['DT', f1(1000 / 30) + '/' + f1(1000 / 144)]]);
    }
    function statusText(): string {
        return fill('시간 차 판 정착 {a} · {b}', nms(rows[1].settleMs), nms(rows[3].settleMs));
    }
    function modeId(): number { return rows[0].ji; }
    function speakText(): string {
        return fill('시간 차로 푼 스프링은 30Hz 에서 {a}, 144Hz 에서 {b} 에 자리를 잡아 간격이 달라도 거의 같다. 프레임마다 60분의 1초라고 가정한 판은 {c} 와 {d} 로 갈라진다',
            nms(rows[1].settleMs), nms(rows[3].settleMs), nms(rows[0].settleMs), nms(rows[2].settleMs));
    }
    function onKey(e: KeyboardEvent): boolean { void e; return false; }
    function onAction(): void { /* 이 장면은 버튼 없이 시간표로만 움직인다 */ }
    fitCanvas();
    if (still) { finalState(); } else { resetScene(); redraw(); startLoop(); }
    return function (): void {
        stopLoop();
        clearTimers();
        off.abort();
    };

}

export default function TimestampSpring() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    return main(rootEl);
  }, []);

  return (
    <div className={cx("ez") + " is-demo"} ref={rootRef}>
        <div className={cx("ez__pad")} data-role="pad" tabIndex={0} role="application" aria-label={'시연 무대 — Space 또는 Enter 로 일시정지, R 로 처음부터'}>
          <canvas className={cx("ez__canvas")} data-role="canvas" width={480} height={300} role="img" aria-label={'30Hz 와 144Hz 에서 프레임마다 60분의 1초로 가정한 스프링과 시간 차로 푼 스프링이 정착하는 시간을 네 줄로 비교하는 장면'}></canvas>
        </div>
        <p className={cx("ez__status")} data-role="status" aria-live="off">{'장면 준비'}</p>
        <div className={cx("ez__ctrl")}>
          <button className={cx("ez__pause")} data-role="pause" type="button" aria-pressed="false">{'일시정지'}</button>
        </div>
        <p className={cx("ez__done")} data-role="done" role="status" aria-live="polite"></p>
    </div>
  );
}
