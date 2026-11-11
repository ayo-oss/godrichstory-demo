// PieSlicePopSpring - vanilla 판(02-pie-chart-slice-pop-spring) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./PieSlicePopSpring.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function PieSlicePopSpring() {
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
    // 고른 조각이 가운데 각 방향(코사인·사인)으로 밀려나는 거리(px)
    const EXPLODE_DIST = 16;
    // 감쇠 스프링 — 당기는 힘(1/s²)과 끄는 힘(1/s). 감쇠비 = SPRING_DAMP / (2√SPRING_K) 이 1 보다 작아 한 번 살짝 넘쳤다 선다
    const SPRING_K = 170;
    const SPRING_DAMP = 14;
    const SLICE_N = 6;
    const SEED = 467;
    const CX = 316;
    const CY = 150;
    const R = 112;
    const DEMO_LOOP = 2000;
    const TXT_IDLE = '조각에 포인터를 올려 보기';
    const pinBtn = root.querySelector('[data-role="pin"]') as HTMLButtonElement | null;
    const resetBtn = root.querySelector('[data-role="reset"]') as HTMLButtonElement | null;
    const slices: Slice[] = layout(seededValues(SEED, SLICE_N, 8, 36));
    const springs: Spring[] = [];
    for (let i = 0; i < SLICE_N; i += 1) { springs.push({ x: 0, v: 0, to: 0 }); }
    // 시연은 큰 조각부터 네 개를 차례로 띄운다
    const DEMO_PICKS: number[] = slices.map(function (_s: Slice, i: number): number { return i; })
        .sort(function (a: number, b: number): number { return slices[b].share - slices[a].share; }).slice(0, 4);
    let hover = -1;
    let pinned = -1;
    function focusIdx(): number { return hover >= 0 ? hover : pinned; }
    function retarget(): void {
        for (let i = 0; i < SLICE_N; i += 1) { springs[i].to = i === hover || i === pinned ? EXPLODE_DIST : 0; }
    }
    function report(): void {
        const f = focusIdx();
        if (f >= 0) { sayPick(f, slices[f].share); } else { say(TXT_IDLE); }
    }
    function step(): void {
        const dt = FIXED_DT / 1000;
        for (let i = 0; i < SLICE_N; i += 1) { springStep(springs[i], SPRING_K, SPRING_DAMP, dt); }
    }
    function settle(): void {
        for (let i = 0; i < SLICE_N; i += 1) { springs[i].x = springs[i].to; springs[i].v = 0; }
    }
    function demoTick(t: number): void {
        runSchedule(t, DEMO_LOOP, [200, 600, 1000, 1400, 1800], function (k: number): void {
            hover = k < DEMO_PICKS.length ? DEMO_PICKS[k] : -1;
            retarget();
            report();
        });
    }
    function midOf(i: number): number { return (slices[i].a0 + slices[i].a1) / 2; }
    function draw(): void {
        clearStage();
        // 덜 나온 조각부터 칠해 튀어나온 조각이 맨 위에 오게 한다
        const order: number[] = slices.map(function (_s: Slice, i: number): number { return i; })
            .sort(function (a: number, b: number): number { return springs[a].x - springs[b].x; });
        // 그림자 — 튀어나온 만큼 짙어지고 아래로 멀어진다
        for (let n = 0; n < order.length; n += 1) {
            const i = order[n];
            const x = springs[i].x;
            if (x <= 0.3) { continue; }
            const m = midOf(i);
            const k = clamp(x / EXPLODE_DIST, 0, 1.4);
            ctx.fillStyle = 'rgba(8,6,16,' + (0.42 * Math.min(k, 1)).toFixed(3) + ')';
            wedgePath(ctx, CX + dirX(m) * x + x * 0.3, CY + dirY(m) * x + x * 0.6, 0, R, slices[i].a0, slices[i].a1);
            ctx.fill();
        }
        for (let n = 0; n < order.length; n += 1) {
            const i = order[n];
            const x = springs[i].x;
            const m = midOf(i);
            // 밀려난 거리만큼 밝아진다 — 같은 값이 위치·밝기·그림자 셋에 함께 쓰인다
            const lift = clamp(x / EXPLODE_DIST, 0, 1.3);
            ctx.fillStyle = rgba(mix(PAL[i], PAPER, 0.3 * lift), 1);
            wedgePath(ctx, CX + dirX(m) * x, CY + dirY(m) * x, 0, R, slices[i].a0, slices[i].a1);
            ctx.fill();
            ctx.strokeStyle = rgba(BG, 1);
            ctx.lineWidth = 2;
            ctx.stroke();
            if (slices[i].share >= 0.07) {
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = (x > 2 ? '800' : '700') + ' 12px sans-serif';
                ctx.fillStyle = rgba(INK, 0.9);
                ctx.fillText(pctText(slices[i].share), CX + dirX(m) * (R * 0.64 + x), CY + dirY(m) * (R * 0.64 + x));
            }
        }
        const f = focusIdx();
        for (let i = 0; i < SLICE_N; i += 1) { legendRow(i, LABELS[i], pctText(slices[i].share), PAL[i], i === f, false); }
        statRow(220, '튀어나온 거리', (f >= 0 ? springs[f].x : 0).toFixed(1) + ' px');
    }
    function after(): void {
        retarget();
        if (still) { settle(); }
        report();
        draw();
        if (pinBtn) { pinBtn.setAttribute('aria-pressed', pinned >= 0 ? 'true' : 'false'); }
    }
    // 포인터 자리의 조각 — 각은 atan2, 거리는 그 조각이 지금 밀려난 만큼 넉넉히 본다
    function hitSlice(x: number, y: number): number {
        const i = sliceAt(slices, angleAt(x, y, CX, CY));
        if (i < 0) { return -1; }
        return Math.hypot(x - CX, y - CY) <= R + Math.max(0, springs[i].x) + 4 ? i : -1;
    }
    function togglePin(i: number): void {
        pinned = i < 0 || pinned === i ? -1 : i;
    }
    function movePick(d: number): void {
        const f = focusIdx();
        hover = f < 0 ? (d > 0 ? 0 : SLICE_N - 1) : (f + d + SLICE_N) % SLICE_N;
        after();
    }
    cv.addEventListener('pointermove', function (ev: PointerEvent): void {
        wake();
        const p = toScene(ev);
        const i = hitSlice(p[0], p[1]);
        if (i !== hover) { hover = i; after(); }
    });
    cv.addEventListener('pointerleave', function (): void {
        if (demo) { return; }
        hover = -1;
        after();
    });
    cv.addEventListener('pointerdown', function (ev: PointerEvent): void {
        wake();
        const p = toScene(ev);
        togglePin(hitSlice(p[0], p[1]));
        after();
    });
    cv.addEventListener('keydown', function (ev: KeyboardEvent): void {
        if (ev.key === 'ArrowRight') { ev.preventDefault(); wake(); movePick(1); }
        else if (ev.key === 'ArrowLeft') { ev.preventDefault(); wake(); movePick(-1); }
        else if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); wake(); togglePin(focusIdx()); after(); }
        else if (ev.key === 'Escape') { ev.preventDefault(); wake(); hover = -1; pinned = -1; after(); }
    });
    if (pinBtn) { pinBtn.addEventListener('click', function (): void { wake(); togglePin(focusIdx() >= 0 ? focusIdx() : DEMO_PICKS[0]); after(); }); }
    if (resetBtn) { resetBtn.addEventListener('click', function (): void { wake(); hover = -1; pinned = -1; after(); }); }
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
        <canvas className={cx("pc__canvas")} data-role="canvas" width={480} height={300} tabIndex={0} aria-label="포인터를 올린 조각이 가운데 각 방향으로 스프링처럼 튀어나오는 원형 그래프. ←/→ 로 조각을 고르고 Enter 로 고정한다"></canvas>
        <p className={cx("pc__status")} data-role="status" aria-live="off">조각에 포인터를 올려 보기</p>
        <div className={cx("pc__tools")}>
          <button className={cx("pc__btn")} data-role="pin" type="button" aria-pressed="false">고른 조각 고정</button>
          <button className={cx("pc__btn")} data-role="reset" type="button">모두 넣기</button>
        </div>
    </div>
  );
}
