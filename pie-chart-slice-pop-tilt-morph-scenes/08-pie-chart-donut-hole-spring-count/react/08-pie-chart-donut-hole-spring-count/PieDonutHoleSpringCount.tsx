// PieDonutHoleSpringCount - vanilla 판(08-pie-chart-donut-hole-spring-count) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./PieDonutHoleSpringCount.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function PieDonutHoleSpringCount() {
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
    // 각도 원점 — 12시 방향에서 시계 방향으로 잰다 (캔버스는 y 가 아래로 커서 양의 각이 시계 방향)
    const TOP = -Math.PI / 2;
    // 파스텔 팔레트 — 어두운 무대 위에 밝은 조각을 얹어 명도 차로 경계가 읽힌다
    const BG: RGB = [29, 26, 44];
    const PANEL: RGB = [44, 39, 64];
    const PAPER: RGB = [255, 248, 234];
    const INK: RGB = [46, 38, 62];
    const PAL: RGB[] = [
        [124, 196, 255],
        [255, 160, 190],
        [126, 226, 192],
        [190, 164, 255],
        [255, 208, 168],
        [246, 228, 140],
        [150, 222, 236],
        [232, 182, 228],
        [196, 220, 160],
    ];
    // 가상 데이터의 이름 — 실제 항목이 아니라 순서만 뜻한다
    const LABELS = ['항목 A', '항목 B', '항목 C', '항목 D', '항목 E', '항목 F', '항목 G', '항목 H', '항목 I'];
    function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
    function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
    function smooth(x: number): number { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); }
    function easeOutCubic(x: number): number { const c = 1 - clamp(x, 0, 1); return 1 - c * c * c; }
    // 앞뒤가 대칭인 거듭제곱 이징 — p 가 클수록 가운데에서 더 빨리 지나간다
    function easeInOutPow(x: number, p: number): number {
        const c = clamp(x, 0, 1);
        return c < 0.5 ? 0.5 * Math.pow(2 * c, p) : 1 - 0.5 * Math.pow(2 - 2 * c, p);
    }
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
    type Slice = { value: number; share: number; a0: number; a1: number };
    // 숫자 목록 → 부채꼴 — 합계로 나눈 몫을 앞에서부터 쌓아 시작 각과 끝 각을 만든다
    function layout(values: number[]): Slice[] {
        let total = 0;
        for (let i = 0; i < values.length; i += 1) { total += values[i]; }
        const out: Slice[] = [];
        let acc = 0;
        for (let i = 0; i < values.length; i += 1) {
            const a0 = (acc / total) * TAU;
            acc += values[i];
            out.push({ value: values[i], share: values[i] / total, a0: a0, a1: (acc / total) * TAU });
        }
        return out;
    }
    function dirX(a: number): number { return Math.cos(TOP + a); }
    function dirY(a: number): number { return Math.sin(TOP + a); }
    // 포인터가 가리키는 각 — atan2 로 구한 화면 각을 12시 기준 0 ~ 2π 로 옮긴다
    function angleAt(x: number, y: number, cx: number, cy: number): number {
        let a = Math.atan2(y - cy, x - cx) - TOP;
        while (a < 0) { a += TAU; }
        while (a >= TAU) { a -= TAU; }
        return a;
    }
    function sliceAt(slices: Slice[], a: number): number {
        for (let i = 0; i < slices.length; i += 1) {
            if (a >= slices[i].a0 && a < slices[i].a1) { return i; }
        }
        return -1;
    }
    // 부채꼴 경로 — 안쪽 반지름 r0 이 0 이면 가운데 점까지, 아니면 도넛 조각
    function wedgePath(c: CanvasRenderingContext2D, cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): void {
        c.beginPath();
        c.arc(cx, cy, r1, TOP + a0, TOP + a1, false);
        if (r0 > 0.5) { c.arc(cx, cy, r0, TOP + a1, TOP + a0, true); } else { c.lineTo(cx, cy); }
        c.closePath();
    }
    function pctText(share: number): string { return (share * 100).toFixed(1) + '%'; }
    function sayPick(i: number, share: number): void { say(LABELS[i] + ' · ' + pctText(share)); }
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
    // 왼쪽 범례 — 색 칩 + 이름 + 비율, 고른 줄은 밝게
    const LEG_X = 16;
    const LEG_Y = 100;
    const LEG_ROW = 16;
    function legendRow(row: number, label: string, value: string, c: RGB, on: boolean, dim: boolean): void {
        const y = LEG_Y + row * LEG_ROW;
        ctx.fillStyle = rgba(c, dim ? 0.3 : 1);
        ctx.fillRect(LEG_X, y - 9, 9, 9);
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
        ctx.font = (on ? '700' : '500') + ' 11px sans-serif';
        ctx.fillStyle = rgba(PAPER, on ? 1 : (dim ? 0.4 : 0.74));
        ctx.fillText(label, LEG_X + 15, y);
        ctx.textAlign = 'right';
        ctx.fillText(value, LEG_X + 132, y);
    }
    // 범례 아래 수치 한 줄 — 이름표 + 값
    function statRow(y: number, label: string, value: string): void {
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
        ctx.fillStyle = rgba(PAPER, 0.6);
        ctx.font = '500 11px sans-serif';
        ctx.fillText(label, LEG_X, y);
        ctx.fillStyle = rgba(PAPER, 0.96);
        ctx.font = '700 14px sans-serif';
        ctx.fillText(value, LEG_X, y + 17);
    }
    function clearStage(): void {
        ctx.fillStyle = rgba(BG, 1);
        ctx.fillRect(0, 0, W, H);
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
    // 감쇠 스프링 — x 가 목표 to 로 당겨지고(k, 1/s²) 속도에 비례해 끌린다(d, 1/s). 속도를 먼저 고치는 반암시 오일러
    type Spring = { x: number; v: number; to: number };
    function springStep(s: Spring, k: number, d: number, dt: number): void {
        const acc = -k * (s.x - s.to) - d * s.v;
        s.v += acc * dt;
        s.x += s.v * dt;
    }
    // 구멍이 열렸을 때 안쪽 반지름 ÷ 바깥 반지름
    const HOLE_RATIO = 0.55;
    // 구멍 스프링의 당기는 힘(1/s²) — 끄는 힘 HOLE_DAMP 와 함께 감쇠비가 정해진다
    const HOLE_SPRING = 150;
    const HOLE_DAMP = 10;
    // 가운데 숫자를 세어 올리는 시간
    const COUNT_MS = 900;
    const SLICE_N = 6;
    const SEED = 467;
    const CX = 316;
    const CY = 150;
    const R = 112;
    const DEMO_LOOP = 2000;
    const TXT_PIE = '원형 — 구멍 닫힘';
    const TXT_DONUT = '도넛 — 가운데 합계를 세는 중';
    const holeBtn = root.querySelector('[data-role="hole"]') as HTMLButtonElement | null;
    const dataBtn = root.querySelector('[data-role="data"]') as HTMLButtonElement | null;
    let seed = SEED;
    let slices: Slice[] = layout(seededValues(seed, SLICE_N, 120, 480));
    const hole: Spring = { x: 0, v: 0, to: 0 };
    let open = false;
    let pick = -1;
    let shown = 0;
    let countFrom = 0;
    let countTo = 0;
    let countMs = COUNT_MS;
    function total(): number {
        let t = 0;
        for (let i = 0; i < slices.length; i += 1) { t += slices[i].value; }
        return t;
    }
    // 숫자는 지금 보이는 값에서 새 목표까지, 같은 시간 동안 끝이 느려지는 이징으로
    function countToward(v: number): void {
        countFrom = shown;
        countTo = v;
        countMs = 0;
    }
    function target(): number { return pick >= 0 ? slices[pick].value : total(); }
    function report(): void {
        if (pick >= 0) { sayPick(pick, slices[pick].share); return; }
        say(open ? TXT_DONUT : TXT_PIE);
    }
    function setOpen(on: boolean): void {
        open = on;
        hole.to = on ? HOLE_RATIO : 0;
        if (on) { shown = 0; countToward(target()); }
        if (holeBtn) { holeBtn.setAttribute('aria-pressed', on ? 'true' : 'false'); }
    }
    function step(): void {
        springStep(hole, HOLE_SPRING, HOLE_DAMP, FIXED_DT / 1000);
        if (countMs < COUNT_MS) {
            countMs = Math.min(COUNT_MS, countMs + FIXED_DT);
            shown = lerp(countFrom, countTo, easeOutCubic(countMs / COUNT_MS));
        }
    }
    function settle(): void {
        hole.x = hole.to;
        hole.v = 0;
        countMs = COUNT_MS;
        shown = countTo;
    }
    function biggest(): number {
        let b = 0;
        for (let i = 1; i < slices.length; i += 1) { if (slices[i].value > slices[b].value) { b = i; } }
        return b;
    }
    function demoTick(t: number): void {
        runSchedule(t, DEMO_LOOP, [200, 950, 1450], function (k: number): void {
            if (k === 0) { pick = -1; setOpen(true); }
            else if (k === 1) { pick = biggest(); countToward(target()); }
            else { pick = -1; setOpen(false); }
            report();
        });
    }
    function draw(): void {
        clearStage();
        // 스프링이 0 아래로 넘치면 구멍이 없는 원으로 둔다
        const ratio = Math.max(0, hole.x);
        const r0 = R * ratio;
        // 구멍이 열릴수록 조각 사이 틈도 벌어진다
        const gap = 0.02 * clamp(ratio / HOLE_RATIO, 0, 1.3);
        for (let i = 0; i < slices.length; i += 1) {
            const s = slices[i];
            const r1 = R + (i === pick ? 6 : 0);
            ctx.fillStyle = rgba(pick >= 0 && i !== pick ? mix(PAL[i], BG, 0.38) : PAL[i], 1);
            wedgePath(ctx, CX, CY, r0, r1, s.a0 + gap / 2, s.a1 - gap / 2);
            ctx.fill();
            ctx.strokeStyle = rgba(BG, 1);
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
        if (r0 > 5) {
            ctx.strokeStyle = rgba(PAPER, 0.25);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(CX, CY, r0 - 3, 0, TAU);
            ctx.stroke();
        }
        // 가운데 숫자 — 구멍이 글자를 담을 만큼 열려야 나타난다
        const a = clamp((ratio - 0.22) / 0.2, 0, 1);
        if (a > 0) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = rgba(PAPER, 0.7 * a);
            ctx.font = '500 11px sans-serif';
            ctx.fillText(pick >= 0 ? LABELS[pick] : '합계', CX, CY - 16);
            ctx.fillStyle = rgba(PAPER, a);
            ctx.font = '800 24px sans-serif';
            ctx.fillText(groupDigits(shown), CX, CY + 6);
        }
        for (let i = 0; i < slices.length; i += 1) { legendRow(i, LABELS[i], pctText(slices[i].share), PAL[i], i === pick, false); }
        statRow(212, '구멍 비율', ratio.toFixed(2) + ' / ' + HOLE_RATIO.toFixed(2));
    }
    function after(): void {
        if (still) { settle(); }
        report();
        draw();
    }
    function movePick(d: number): void {
        pick = pick < 0 ? (d > 0 ? 0 : SLICE_N - 1) : (pick + d + SLICE_N) % SLICE_N;
        countToward(target());
        after();
    }
    function newData(): void {
        seed += 1;
        slices = layout(seededValues(seed, SLICE_N, 120, 480));
        pick = -1;
        countToward(target());
    }
    cv.addEventListener('pointerdown', function (ev: PointerEvent): void {
        wake();
        const p = toScene(ev);
        const d = Math.hypot(p[0] - CX, p[1] - CY);
        if (d <= R + 8 && d >= R * Math.max(0, hole.x)) {
            const i = sliceAt(slices, angleAt(p[0], p[1], CX, CY));
            pick = i === pick ? -1 : i;
            countToward(target());
        } else {
            setOpen(!open);
        }
        after();
    });
    cv.addEventListener('keydown', function (ev: KeyboardEvent): void {
        if (ev.key === 'ArrowRight') { ev.preventDefault(); wake(); movePick(1); }
        else if (ev.key === 'ArrowLeft') { ev.preventDefault(); wake(); movePick(-1); }
        else if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); wake(); setOpen(!open); after(); }
        else if (ev.key === 'Escape') { ev.preventDefault(); wake(); pick = -1; countToward(target()); after(); }
    });
    if (holeBtn) { holeBtn.addEventListener('click', function (): void { wake(); setOpen(!open); after(); }); }
    if (dataBtn) { dataBtn.addEventListener('click', function (): void { wake(); newData(); after(); }); }
    if (!demo) { setOpen(true); settle(); }
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
    <div className={cx("pc") + " is-demo"} ref={rootRef}>
        <canvas className={cx("pc__canvas")} data-role="canvas" width={480} height={300} tabIndex={0} aria-label="가운데 구멍이 스프링으로 열려 도넛 차트가 되고 합계 숫자가 차오르는 원형 그래프. Enter 로 구멍을 여닫고 ←/→ 로 조각을 고른다"></canvas>
        <p className={cx("pc__status")} data-role="status" aria-live="off">원형 — 구멍 닫힘</p>
        <div className={cx("pc__tools")}>
          <button className={cx("pc__btn")} data-role="hole" type="button" aria-pressed="false">도넛으로</button>
          <button className={cx("pc__btn")} data-role="data" type="button">새 데이터</button>
        </div>
    </div>
  );
}
