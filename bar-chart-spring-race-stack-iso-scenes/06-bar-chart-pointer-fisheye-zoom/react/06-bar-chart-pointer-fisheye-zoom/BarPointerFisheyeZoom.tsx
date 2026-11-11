// BarPointerFisheyeZoom - vanilla 판(06-bar-chart-pointer-fisheye-zoom) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./BarPointerFisheyeZoom.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function BarPointerFisheyeZoom() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const root: HTMLElement = rootEl;
    type RGB = [number, number, number];
    const W = 480;
    const H = 300;
    const FIXED_DT = 16;
    const TAU = Math.PI * 2;
    // 파스텔 팔레트 — 어두운 무대 위에 밝은 막대를 얹어 명도 차로 경계가 읽힌다
    const BG: RGB = [24, 26, 38];
    const PANEL: RGB = [36, 39, 56];
    const PAPER: RGB = [250, 246, 236];
    const INK: RGB = [30, 30, 44];
    const PAL: RGB[] = [
        [126, 190, 255],
        [255, 164, 190],
        [130, 224, 190],
        [192, 168, 255],
        [255, 206, 160],
        [244, 226, 140],
        [150, 220, 236],
        [230, 184, 226],
        [196, 220, 160],
        [176, 196, 236],
    ];
    // 가상 데이터의 이름 — 실제 항목이 아니라 순서만 뜻한다
    const LABELS = ['항목 A', '항목 B', '항목 C', '항목 D', '항목 E', '항목 F', '항목 G', '항목 H', '항목 I', '항목 J'];
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
    // 움직임 줄이기 — 열린 페이지에서 설정을 바꿔도 아래 tail 의 change 리스너가 이 값을 다시 읽는다
    let still = reduceQuery.matches;
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
    function fitCanvas(): void {
        // 배율은 2 에서 자른다 — 배율 3 기기에서 화소가 2.25배로 늘어 프레임마다 일이 그만큼 커지지 않게
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
    // 시드 고정 난수 — 같은 시드면 같은 가상 데이터가 다시 나온다 (32비트 정수 섞기)
    function makeRng(seed: number): () => number {
        let s = seed >>> 0;
        return function (): number {
            s = (s + 0x6d2b79f5) >>> 0;
            let t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    function seededValues(seed: number, n: number, lo: number, hi: number): number[] {
        const rnd = makeRng(seed);
        const out: number[] = [];
        for (let i = 0; i < n; i += 1) { out.push(lo + Math.floor(rnd() * (hi - lo + 1))); }
        return out;
    }
    // 세 자리마다 쉼표 — 지역 설정에 기대지 않는다
    function groupDigits(n: number): string {
        const s = String(Math.round(Math.abs(n)));
        let out = '';
        for (let i = 0; i < s.length; i += 1) {
            if (i > 0 && (s.length - i) % 3 === 0) { out += ','; }
            out += s[i];
        }
        return (n < 0 ? '-' : '') + out;
    }
    // 세로 막대 경로 — 기준선 base 에서 h 만큼(음수면 아래로) 뻗고, 끝 모서리만 둥글린다
    function barPath(c: CanvasRenderingContext2D, x: number, base: number, w: number, h: number, r: number): void {
        const rr = Math.min(r, Math.abs(h), w / 2);
        const tip = base - h;
        const s = h >= 0 ? 1 : -1;
        c.beginPath();
        c.moveTo(x, base);
        c.lineTo(x, tip + s * rr);
        c.quadraticCurveTo(x, tip, x + rr, tip);
        c.lineTo(x + w - rr, tip);
        c.quadraticCurveTo(x + w, tip, x + w, tip + s * rr);
        c.lineTo(x + w, base);
        c.closePath();
    }
    // 가로 막대 경로 — 왼쪽 x0 에서 len 만큼 뻗고 오른쪽 끝만 둥글린다
    function hbarPath(c: CanvasRenderingContext2D, x0: number, y: number, len: number, th: number, r: number): void {
        const rr = Math.min(r, Math.max(len, 0), th / 2);
        const x1 = x0 + Math.max(len, 0);
        c.beginPath();
        c.moveTo(x0, y);
        c.lineTo(x1 - rr, y);
        c.quadraticCurveTo(x1, y, x1, y + rr);
        c.lineTo(x1, y + th - rr);
        c.quadraticCurveTo(x1, y + th, x1 - rr, y + th);
        c.lineTo(x0, y + th);
        c.closePath();
    }
    function clearStage(): void {
        ctx.fillStyle = rgba(BG, 1);
        ctx.fillRect(0, 0, W, H);
    }
    function axisText(text: string, x: number, y: number, align: CanvasTextAlign, a: number): void {
        ctx.font = '500 10px sans-serif';
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = rgba(PAPER, a);
        ctx.fillText(text, x, y);
    }
    // 고른 막대 — 화살표 키·포인터가 가리키는 sel 과 Enter·Space·클릭으로 고정한 pinned
    let sel = -1;
    let pinned = -1;
    function focusIdx(): number { return sel >= 0 ? sel : pinned; }
    function nextIdx(cur: number, d: number, n: number): number {
        return cur < 0 ? (d > 0 ? 0 : n - 1) : (cur + d + n) % n;
    }
    function togglePin(i: number): void {
        pinned = i < 0 || pinned === i ? -1 : i;
    }
    // 고른 막대 테두리 — 화살표·포인터로 가리키기만 하면 점선, Enter·Space·클릭으로 고정하면 실선
    function ringStyle(i: number, a: number): void {
        ctx.strokeStyle = rgba(PAPER, 0.95 * a);
        ctx.lineWidth = 2;
        ctx.setLineDash(i === pinned ? [] : [4, 3]);
    }
    // 키보드 — ←/→ 막대 옮기기, Enter·Space 고르기, Esc 풀기. 셋 다 상태 줄이 이름과 값을 읽는다
    function bindKeys(move: (d: number) => void, changed: () => void): void {
        cv.addEventListener('keydown', function (ev: KeyboardEvent): void {
            if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
                ev.preventDefault();
                wake();
                move(ev.key === 'ArrowRight' ? 1 : -1);
                changed();
            } else if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault();
                wake();
                togglePin(focusIdx());
                changed();
            } else if (ev.key === 'Escape') {
                ev.preventDefault();
                wake();
                sel = -1;
                pinned = -1;
                changed();
            }
        });
    }
    // 포인터 — 올리면 sel, 누르면 그 막대를 고정(같은 막대를 다시 누르면 풀기)
    function bindPointer(hit: (x: number, y: number) => number, changed: () => void): void {
        cv.addEventListener('pointermove', function (ev: PointerEvent): void {
            if (demo) { return; }
            const p = toScene(ev);
            const i = hit(p[0], p[1]);
            if (i !== sel) { sel = i; changed(); }
        });
        cv.addEventListener('pointerdown', function (ev: PointerEvent): void {
            wake();
            const p = toScene(ev);
            const i = hit(p[0], p[1]);
            sel = i;
            togglePin(i);
            changed();
        });
    }
    // 시연 일정 — 루프 안의 시각(ms) 표를 지날 때마다 한 번씩 부른다
    let schedCycle = -1;
    let schedIdx = 0;
    function runSchedule(t: number, loop: number, marks: number[], fire: (k: number, cycle: number) => void): void {
        const cyc = Math.floor(t / loop);
        const p = t - cyc * loop;
        if (cyc !== schedCycle) { schedCycle = cyc; schedIdx = 0; }
        while (schedIdx < marks.length && p >= marks[schedIdx]) {
            fire(schedIdx, cyc);
            schedIdx += 1;
        }
    }
    // 막대 수 — 판 폭을 이 수로 똑같이 나눈 것이 원래 막대 폭
    const BAR_COUNT = 60;
    // 어안이 미치는 반경(px) — 포인터에서 이 거리 밖의 막대는 원래 자리 그대로
    const FISHEYE_RADIUS_PX = 80;
    // 어안 세기 — g(u) = (P + 1)u / (Pu + 1). 0 이면 그대로, 클수록 가운데가 넓어지고 반경 가장자리가 눌린다
    const FISHEYE_POWER = 3;
    const SEED = 4706;
    const PLOT_L = 24;
    const PLOT_R = 456;
    const PLOT_T = 70;
    const PLOT_B = 262;
    const LENS_LERP = 0.14;
    const FOCUS_LERP = 0.2;
    const DEMO_LOOP = 2000;
    const TXT_IDLE = '포인터나 ←/→ 로 막대를 넓혀 보기';
    const lensBtn = root.querySelector('[data-role="lens"]') as HTMLButtonElement | null;
    const dataBtn = root.querySelector('[data-role="data"]') as HTMLButtonElement | null;
    const barW0 = (PLOT_R - PLOT_L) / BAR_COUNT;
    let seed = SEED;
    let vals: number[] = [];
    // 하루하루 이어지는 가상 기록 — 앞 값에 시드 난수 걸음을 더해 매끈하게 오르내린다
    function makeSeries(sd: number): number[] {
        const rnd = makeRng(sd);
        const out: number[] = [];
        let v = 50;
        for (let i = 0; i < BAR_COUNT; i += 1) {
            v = clamp(v + (rnd() - 0.5) * 22, 12, 98);
            out.push(Math.round(v));
        }
        return out;
    }
    vals = makeSeries(seed);
    let focusX = (PLOT_L + PLOT_R) / 2;
    let focusGoal = focusX;
    let lens = 0;
    let lensGoal = 0;
    let lensOff = false;
    // 어안 함수 — 포인터에서 x 까지 거리를 반경으로 나눈 u 를 g(u) 로 밀어낸다. 반경 밖은 그대로라 바깥 자리가 이어진다
    function fisheye(x: number, fx: number, power: number): number {
        const d = x - fx;
        const ad = Math.abs(d);
        if (ad >= FISHEYE_RADIUS_PX || power <= 0) { return x; }
        const u = ad / FISHEYE_RADIUS_PX;
        const g = ((power + 1) * u) / (power * u + 1);
        return fx + Math.sign(d) * FISHEYE_RADIUS_PX * g;
    }
    function edge(i: number): number { return fisheye(PLOT_L + i * barW0, focusX, FISHEYE_POWER * lens); }
    function step(): void {
        focusX += (focusGoal - focusX) * FOCUS_LERP;
        lens += ((lensOff ? 0 : lensGoal) - lens) * LENS_LERP;
    }
    function settle(): void {
        focusX = focusGoal;
        lens = lensOff ? 0 : lensGoal;
    }
    function report(): void {
        const f = focusIdx();
        if (f >= 0) { say('#' + (f + 1) + ' · ' + groupDigits(vals[f]) + ' · ' + (edge(f + 1) - edge(f)).toFixed(1) + 'px'); } else { say(TXT_IDLE); }
    }
    // 시연 — 렌즈가 판을 왼쪽에서 오른쪽으로 한 번 훑고 돌아온다
    function demoTick(t: number): void {
        const p = (t % DEMO_LOOP) / DEMO_LOOP;
        focusGoal = PLOT_L + 40 + (PLOT_R - PLOT_L - 80) * (0.5 - 0.5 * Math.cos(p * TAU));
        lensGoal = 1;
    }
    function aimAt(i: number): void {
        focusGoal = PLOT_L + (i + 0.5) * barW0;
        lensGoal = 1;
    }
    function draw(): void {
        clearStage();
        for (let g = 0; g <= 100; g += 25) {
            const y = PLOT_B - g / 100 * (PLOT_B - PLOT_T);
            ctx.fillStyle = rgba(PAPER, g === 0 ? 0.3 : 0.07);
            ctx.fillRect(PLOT_L, Math.round(y), PLOT_R - PLOT_L, 1);
        }
        // 렌즈 자리 — 반경 안쪽 바닥을 옅게 밝혀 어디까지 넓어지는지 보여 준다
        if (lens > 0.02) {
            const gr = ctx.createLinearGradient(focusX - FISHEYE_RADIUS_PX, 0, focusX + FISHEYE_RADIUS_PX, 0);
            gr.addColorStop(0, rgba(PANEL, 0));
            gr.addColorStop(0.5, rgba(PANEL, lens));
            gr.addColorStop(1, rgba(PANEL, 0));
            ctx.fillStyle = gr;
            ctx.fillRect(focusX - FISHEYE_RADIUS_PX, PLOT_T - 10, FISHEYE_RADIUS_PX * 2, PLOT_B - PLOT_T + 10);
        }
        const f = focusIdx();
        for (let i = 0; i < BAR_COUNT; i += 1) {
            const x0 = edge(i);
            const x1 = edge(i + 1);
            const w = x1 - x0;
            // 넓어진 배율만큼 밝아진다 — 폭과 밝기가 같은 어안 값에서 나온다
            const zoom = clamp((w / barW0 - 1) / 2.5, 0, 1);
            const gap = w > 4 ? 1 : 0.4;
            const h = vals[i] / 100 * (PLOT_B - PLOT_T);
            const c = PAL[Math.floor(i / 10) % PAL.length];
            ctx.fillStyle = rgba(mix(c, PAPER, 0.35 * zoom), i === f ? 1 : 0.55 + 0.45 * zoom);
            barPath(ctx, x0 + gap / 2, PLOT_B, Math.max(0.5, w - gap), h, Math.min(3, w / 3));
            ctx.fill();
            if (i === f) {
                ringStyle(i, 1);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            // 막대가 글자보다 넓어지면 번호와 값을 붙인다
            if (w >= 19) {
                ctx.font = '700 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillStyle = rgba(PAPER, 0.95);
                ctx.fillText(String(vals[i]), (x0 + x1) / 2, PLOT_B - h - 3);
                axisText('#' + (i + 1), (x0 + x1) / 2, PLOT_B + 12, 'center', 0.8);
            }
        }
    }
    function after(): void {
        if (still) { settle(); }
        report();
        draw();
        if (lensBtn) { lensBtn.setAttribute('aria-pressed', lensOff ? 'true' : 'false'); }
    }
    // 포인터 자리의 막대 — 지금 휘어진 경계로 찾는다
    function hitBar(x: number, y: number): number {
        if (y < PLOT_T - 20 || y > PLOT_B + 20) { return -1; }
        for (let i = 0; i < BAR_COUNT; i += 1) { if (x >= edge(i) && x < edge(i + 1)) { return i; } }
        return -1;
    }
    cv.addEventListener('pointermove', function (ev: PointerEvent): void {
        if (demo) { return; }
        const p = toScene(ev);
        focusGoal = clamp(p[0], PLOT_L, PLOT_R);
        lensGoal = 1;
        if (still) { settle(); draw(); }
    });
    cv.addEventListener('pointerleave', function (): void {
        if (demo || pinned >= 0) { return; }
        lensGoal = 0;
        sel = -1;
        after();
    });
    bindKeys(function (d: number): void { sel = nextIdx(focusIdx(), d, BAR_COUNT); aimAt(sel); }, function (): void {
        if (focusIdx() < 0) { lensGoal = 0; } else { aimAt(focusIdx()); }
        after();
    });
    bindPointer(hitBar, after);
    if (lensBtn) { lensBtn.addEventListener('click', function (): void { wake(); lensOff = !lensOff; after(); }); }
    if (dataBtn) { dataBtn.addEventListener('click', function (): void { wake(); seed += 1; vals = makeSeries(seed); after(); }); }
    if (still) { lensGoal = 1; }
    report();

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
    function startMotion(): void {
        window.cancelAnimationFrame(rafId);
        lastTs = -1;
        acc = 0;
        if (still) {
            // 움직임 줄이기 — 루프를 돌리지 않고 지금 목표 상태로 바로 그린다
            settle();
            draw();
        } else {
            rafId = window.requestAnimationFrame(frame);
        }
    }
    // 열린 페이지에서 움직임 줄이기 설정이 바뀌어도 그 자리에서 루프를 멈추거나 다시 켠다
    function onMotionPref(): void {
        still = reduceQuery.matches;
        startMotion();
    }
    if (typeof reduceQuery.addEventListener === 'function') { reduceQuery.addEventListener('change', onMotionPref); }
    startMotion();
    return function (): void {
        window.cancelAnimationFrame(rafId);
        window.removeEventListener('resize', onResize);
        if (typeof reduceQuery.removeEventListener === 'function') { reduceQuery.removeEventListener('change', onMotionPref); }
    };

  }, []);

  return (
    <div className={cx("bc") + " is-demo"} ref={rootRef}>
        <canvas className={cx("bc__canvas")} data-role="canvas" width={480} height={300} tabIndex={0} aria-label="막대 60개 가운데 포인터 근처만 어안 렌즈처럼 넓어지는 막대 그래프. 포인터를 움직이거나 ←/→ 로 막대를 고르면 번호와 값을 읽어 준다"></canvas>
        <p className={cx("bc__status")} data-role="status" aria-live="off">포인터나 ←/→ 로 막대를 넓혀 보기</p>
        <div className={cx("bc__tools")}>
          <button className={cx("bc__btn")} data-role="lens" type="button" aria-pressed="false">렌즈 끄기</button>
          <button className={cx("bc__btn")} data-role="data" type="button">새 데이터</button>
        </div>
    </div>
  );
}
