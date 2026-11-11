// PieDataMorphAngleLerp - vanilla 판(04-pie-chart-data-morph-angle-lerp) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./PieDataMorphAngleLerp.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function PieDataMorphAngleLerp() {
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
    // 한 기간에서 다음 기간으로 각도를 옮기는 시간
    const MORPH_MS = 700;
    // 기간 수 — 기간마다 가상 값 한 벌을 시드로 만든다
    const DATA_SETS = 3;
    // 거듭제곱 이징의 지수 — 1 이면 등속, 클수록 처음과 끝이 느리고 가운데가 빠르다
    const EASE_POW = 3;
    const ITEM_N = 7;
    const SEED = 467;
    const CX = 316;
    const CY = 150;
    const R = 112;
    const DEMO_LOOP = 2000;
    const PERIODS = ['기간 1', '기간 2', '기간 3'];
    const TXT_MORPH = '같은 항목끼리 각도를 이어 바꾸는 중';
    const periodBtns: (HTMLButtonElement | null)[] = [0, 1, 2].map(function (k: number): HTMLButtonElement | null {
        return root.querySelector('[data-role="p' + k + '"]') as HTMLButtonElement | null;
    });
    // 기간마다 들어가는 항목 — (항목 번호 + 기간 × 2) % 7 < 5 인 다섯 개. 기간을 넘길 때마다 두 개가 빠지고 두 개가 새로 들어온다
    function buildSets(): number[][] {
        const rnd = makeRng(SEED);
        const sets: number[][] = [];
        for (let k = 0; k < DATA_SETS; k += 1) {
            const row: number[] = [];
            for (let j = 0; j < ITEM_N; j += 1) {
                const v = 8 + Math.floor(rnd() * 34);
                row.push((j + k * 2) % ITEM_N < 5 ? v : 0);
            }
            sets.push(row);
        }
        return sets;
    }
    const SETS = buildSets();
    // 항목 순서를 고정하고 누적한다 — 없는 항목(값 0)은 폭 0 으로 그 자리에 남아 짝을 잃지 않는다
    function anglesOf(values: number[]): number[][] {
        let total = 0;
        for (let j = 0; j < ITEM_N; j += 1) { total += values[j]; }
        const a0: number[] = [];
        const a1: number[] = [];
        let acc = 0;
        for (let j = 0; j < ITEM_N; j += 1) {
            a0.push((acc / total) * TAU);
            acc += values[j];
            a1.push((acc / total) * TAU);
        }
        return [a0, a1];
    }
    let period = 0;
    const start0 = anglesOf(SETS[0]);
    let fromA0: number[] = start0[0].slice();
    let fromA1: number[] = start0[1].slice();
    let toA0: number[] = start0[0].slice();
    let toA1: number[] = start0[1].slice();
    const curA0: number[] = start0[0].slice();
    const curA1: number[] = start0[1].slice();
    let morphMs = MORPH_MS;
    let pick = -1;
    function width(j: number): number { return curA1[j] - curA0[j]; }
    // 시작 각과 끝 각을 따로 보간한다 — 이웃 조각이 경계를 함께 쓰므로 사이가 벌어지지 않는다
    function apply(): void {
        const e = easeInOutPow(morphMs / MORPH_MS, EASE_POW);
        for (let j = 0; j < ITEM_N; j += 1) {
            curA0[j] = lerp(fromA0[j], toA0[j], e);
            curA1[j] = lerp(fromA1[j], toA1[j], e);
        }
    }
    function report(): void {
        if (pick >= 0 && width(pick) > 0.001) { sayPick(pick, width(pick) / TAU); return; }
        say(PERIODS[period] + ' — ' + TXT_MORPH);
    }
    function goPeriod(k: number): void {
        // 지금 보이는 각에서 출발한다 — 바꾸는 도중에 눌러도 튀지 않는다
        fromA0 = curA0.slice();
        fromA1 = curA1.slice();
        const t = anglesOf(SETS[k]);
        toA0 = t[0];
        toA1 = t[1];
        period = k;
        morphMs = 0;
        if (pick >= 0 && SETS[k][pick] === 0) { pick = -1; }
        for (let b = 0; b < periodBtns.length; b += 1) {
            const btn = periodBtns[b];
            if (btn) { btn.setAttribute('aria-pressed', b === k ? 'true' : 'false'); }
        }
    }
    function step(): void {
        if (morphMs >= MORPH_MS) { return; }
        morphMs = Math.min(MORPH_MS, morphMs + FIXED_DT);
        apply();
    }
    function settle(): void {
        morphMs = MORPH_MS;
        apply();
    }
    function demoTick(t: number): void {
        runSchedule(t, DEMO_LOOP, [200, 1000], function (): void {
            goPeriod((period + 1) % DATA_SETS);
            report();
        });
    }
    function draw(): void {
        clearStage();
        ctx.fillStyle = rgba(PANEL, 1);
        ctx.beginPath();
        ctx.arc(CX, CY, R, 0, TAU);
        ctx.fill();
        for (let j = 0; j < ITEM_N; j += 1) {
            if (width(j) < 0.0005) { continue; }
            const r = R + (j === pick ? 6 : 0);
            ctx.fillStyle = rgba(pick >= 0 && j !== pick ? mix(PAL[j], BG, 0.38) : PAL[j], 1);
            wedgePath(ctx, CX, CY, 0, r, curA0[j], curA1[j]);
            ctx.fill();
            ctx.strokeStyle = rgba(BG, 1);
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '700 12px sans-serif';
        for (let j = 0; j < ITEM_N; j += 1) {
            if (width(j) < 0.4) { continue; }
            const mid = (curA0[j] + curA1[j]) / 2;
            ctx.fillStyle = rgba(INK, 0.9);
            ctx.fillText(pctText(width(j) / TAU), CX + dirX(mid) * R * 0.64, CY + dirY(mid) * R * 0.64);
        }
        for (let j = 0; j < ITEM_N; j += 1) {
            const w = width(j);
            legendRow(j, LABELS[j], w > 0.001 ? pctText(w / TAU) : '-', PAL[j], j === pick, w <= 0.001);
        }
        statRow(212, '기간', PERIODS[period]);
    }
    function after(): void {
        if (still) { settle(); }
        report();
        draw();
    }
    function movePick(d: number): void {
        let j = pick;
        for (let n = 0; n < ITEM_N; n += 1) {
            j = j < 0 ? (d > 0 ? 0 : ITEM_N - 1) : (j + d + ITEM_N) % ITEM_N;
            if (SETS[period][j] > 0) { break; }
        }
        pick = j;
        after();
    }
    cv.addEventListener('pointerdown', function (ev: PointerEvent): void {
        wake();
        const p = toScene(ev);
        if (Math.hypot(p[0] - CX, p[1] - CY) <= R + 8) {
            const a = angleAt(p[0], p[1], CX, CY);
            pick = -1;
            for (let j = 0; j < ITEM_N; j += 1) { if (a >= curA0[j] && a < curA1[j]) { pick = j; } }
        } else {
            goPeriod((period + 1) % DATA_SETS);
        }
        after();
    });
    cv.addEventListener('keydown', function (ev: KeyboardEvent): void {
        if (ev.key === 'ArrowRight') { ev.preventDefault(); wake(); movePick(1); }
        else if (ev.key === 'ArrowLeft') { ev.preventDefault(); wake(); movePick(-1); }
        else if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); wake(); goPeriod((period + 1) % DATA_SETS); after(); }
        else if (ev.key === '1' || ev.key === '2' || ev.key === '3') { ev.preventDefault(); wake(); goPeriod(Number(ev.key) - 1); after(); }
        else if (ev.key === 'Escape') { ev.preventDefault(); wake(); pick = -1; after(); }
    });
    for (let b = 0; b < periodBtns.length; b += 1) {
        const btn = periodBtns[b];
        if (btn) { btn.addEventListener('click', function (): void { wake(); goPeriod(b); after(); }); }
    }
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
        <canvas className={cx("pc__canvas")} data-role="canvas" width={480} height={300} tabIndex={0} aria-label="기간을 바꾸면 같은 항목끼리 시작 각과 끝 각을 이어 새 비율로 바뀌는 원형 그래프. Enter 나 1·2·3 으로 기간을 바꾸고 ←/→ 로 조각을 고른다"></canvas>
        <p className={cx("pc__status")} data-role="status" aria-live="off">같은 항목끼리 각도를 이어 바꾸는 중</p>
        <div className={cx("pc__tools")}>
          <button className={cx("pc__btn")} data-role="p0" type="button" aria-pressed="true">기간 1</button>
          <button className={cx("pc__btn")} data-role="p1" type="button" aria-pressed="false">기간 2</button>
          <button className={cx("pc__btn")} data-role="p2" type="button" aria-pressed="false">기간 3</button>
        </div>
    </div>
  );
}
