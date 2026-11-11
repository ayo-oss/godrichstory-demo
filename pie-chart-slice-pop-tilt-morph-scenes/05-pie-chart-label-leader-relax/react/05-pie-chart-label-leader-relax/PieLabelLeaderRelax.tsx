// PieLabelLeaderRelax - vanilla 판(05-pie-chart-label-leader-relax) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./PieLabelLeaderRelax.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function PieLabelLeaderRelax() {
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
    // 이웃 라벨 사이 최소 세로 간격(px)
    const LABEL_GAP = 16;
    // 밀어내기를 되풀이하는 최대 횟수 — 겹침이 먼저 풀리면 거기서 멈춘다
    const RELAX_ITERS = 40;
    // 조각 가장자리에서 꺾이는 점까지 지시선 길이(px)
    const ELBOW_LEN = 14;
    const RELAX_STEP_MS = 40;
    const SLICE_N = 9;
    const SEED = 467;
    const CX = 300;
    const CY = 150;
    const R = 80;
    const DEMO_LOOP = 2000;
    // 라벨이 설 수 있는 높이 — 왼쪽은 버튼·상태 줄을 피한다
    const LEFT_MIN = 78;
    const LEFT_MAX = 236;
    const RIGHT_MIN = 22;
    const RIGHT_MAX = 282;
    const PILL_H = 14;
    const PILL_W = 66;
    const TXT_RELAX = '겹친 라벨을 반씩 밀어내는 중';
    const TXT_DONE = '라벨 겹침이 풀림';
    const scrambleBtn = root.querySelector('[data-role="scramble"]') as HTMLButtonElement | null;
    const solveBtn = root.querySelector('[data-role="solve"]') as HTMLButtonElement | null;
    // 작은 조각 여섯을 12시 바로 뒤에 몰아 두고 큰 조각 셋을 그 뒤에 — 작은 조각들의 라벨이 오른쪽 위에 겹치게
    function makeValues(): number[] {
        const rnd = makeRng(SEED);
        const out: number[] = [];
        for (let i = 0; i < 6; i += 1) { out.push(3 + Math.floor(rnd() * 5)); }
        for (let i = 0; i < 3; i += 1) { out.push(40 + Math.floor(rnd() * 30)); }
        return out;
    }
    const slices: Slice[] = layout(makeValues());
    type Label = { i: number; side: number; y0: number; y: number };
    const labels: Label[] = [];
    let pass = 0;
    let passAcc = 0;
    let solved = false;
    let pick = -1;
    function lo(side: number): number { return side > 0 ? RIGHT_MIN : LEFT_MIN; }
    function hi(side: number): number { return side > 0 ? RIGHT_MAX : LEFT_MAX; }
    // 첫 자리 — 조각 가운데 각에서 꺾이는 점의 높이. 오른쪽 반이면 오른쪽 무리, 아니면 왼쪽 무리
    function placeLabels(): void {
        labels.length = 0;
        for (let i = 0; i < SLICE_N; i += 1) {
            const mid = (slices[i].a0 + slices[i].a1) / 2;
            const side = dirX(mid) >= 0 ? 1 : -1;
            const y0 = CY + dirY(mid) * (R + ELBOW_LEN);
            labels.push({ i: i, side: side, y0: y0, y: clamp(y0, lo(side), hi(side)) });
        }
        pass = 0;
        passAcc = 0;
        solved = false;
    }
    function group(side: number): Label[] {
        return labels.filter(function (l: Label): boolean { return l.side === side; })
            .sort(function (a: Label, b: Label): number { return a.y - b.y; });
    }
    function overlapPairs(): number {
        let n = 0;
        for (const side of [-1, 1]) {
            const g = group(side);
            for (let j = 0; j + 1 < g.length; j += 1) { if (g[j + 1].y - g[j].y < LABEL_GAP - 0.5) { n += 1; } }
        }
        return n;
    }
    // 한 번 밀어내기 — 높이순으로 세운 이웃이 LABEL_GAP 보다 가까우면 모자란 만큼을 반씩 나눠 위아래로 민다
    function relaxPass(): number {
        let moved = 0;
        for (const side of [-1, 1]) {
            const g = group(side);
            for (let j = 0; j + 1 < g.length; j += 1) {
                const d = g[j + 1].y - g[j].y;
                // 0.25px 안쪽까지 좁혀지면 다 민 것으로 친다 — 반씩 밀기는 간격에 한없이 다가가기만 하므로
                if (d < LABEL_GAP - 0.25) {
                    const push = (LABEL_GAP - d) / 2;
                    g[j].y -= push;
                    g[j + 1].y += push;
                    moved += 1;
                }
            }
            for (let j = 0; j < g.length; j += 1) { g[j].y = clamp(g[j].y, lo(side), hi(side)); }
        }
        return moved;
    }
    function report(): void {
        if (pick >= 0) { sayPick(pick, slices[pick].share); return; }
        say(solved ? TXT_DONE : TXT_RELAX);
    }
    function oneRound(): void {
        if (solved) { return; }
        if (pass >= RELAX_ITERS || relaxPass() === 0) { solved = true; return; }
        pass += 1;
    }
    // 시연은 겹친 첫 자리에서 출발한다 — 200ms 에 밀어내기 시작, 1100ms 에 다시 흩어 한 번 더
    let relaxing = !demo;
    function step(): void {
        if (solved || !relaxing) { return; }
        passAcc += FIXED_DT;
        while (passAcc >= RELAX_STEP_MS && !solved) {
            passAcc -= RELAX_STEP_MS;
            oneRound();
        }
    }
    function settle(): void {
        while (!solved) { oneRound(); }
    }
    function demoTick(t: number): void {
        runSchedule(t, DEMO_LOOP, [0, 200, 1100], function (k: number): void {
            if (k === 0 || k === 2) { placeLabels(); }
            relaxing = k !== 0;
            report();
        });
    }
    function labelX(side: number): number { return side > 0 ? CX + R + ELBOW_LEN + 12 : CX - R - ELBOW_LEN - 12; }
    function draw(): void {
        clearStage();
        for (let i = 0; i < SLICE_N; i += 1) {
            const r = R + (i === pick ? 5 : 0);
            ctx.fillStyle = rgba(pick >= 0 && i !== pick ? mix(PAL[i], BG, 0.38) : PAL[i], 1);
            wedgePath(ctx, CX, CY, 0, r, slices[i].a0, slices[i].a1);
            ctx.fill();
            ctx.strokeStyle = rgba(BG, 1);
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
        // 겹친 라벨 표시 — 이웃과 LABEL_GAP 보다 가까운 라벨은 분홍 바탕
        const tight: boolean[] = labels.map(function (): boolean { return false; });
        for (const side of [-1, 1]) {
            const g = group(side);
            for (let j = 0; j + 1 < g.length; j += 1) {
                if (g[j + 1].y - g[j].y < LABEL_GAP - 0.5) { tight[g[j].i] = true; tight[g[j + 1].i] = true; }
            }
        }
        for (let n = 0; n < labels.length; n += 1) {
            const l = labels[n];
            const s = slices[l.i];
            const mid = (s.a0 + s.a1) / 2;
            const x0 = CX + dirX(mid) * R;
            const y0 = CY + dirY(mid) * R;
            const x1 = CX + dirX(mid) * (R + ELBOW_LEN);
            const lx = labelX(l.side);
            // 지시선 — 가장자리 → 꺾이는 점 → 라벨 높이로 비스듬히 → 라벨 앞까지 가로
            ctx.strokeStyle = rgba(l.i === pick ? PAPER : mix(PAL[l.i], PAPER, 0.3), l.i === pick ? 1 : 0.8);
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, l.y0);
            ctx.lineTo(lx - l.side * 6, l.y);
            ctx.lineTo(lx, l.y);
            ctx.stroke();
            const px = l.side > 0 ? lx : lx - PILL_W;
            ctx.fillStyle = tight[l.i] ? rgba(PAL[1], 0.95) : rgba(l.i === pick ? PAPER : PANEL, 1);
            ctx.fillRect(px, l.y - PILL_H / 2, PILL_W, PILL_H);
            ctx.fillStyle = rgba(PAL[l.i], 1);
            ctx.fillRect(px + 4, l.y - 3, 6, 6);
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.font = '600 10px sans-serif';
            ctx.fillStyle = tight[l.i] || l.i === pick ? rgba(INK, 1) : rgba(PAPER, 0.92);
            ctx.fillText(LABELS[l.i] + ' ' + pctText(s.share), px + 13, l.y + 0.5);
        }
        statRow(110, '되풀이', String(pass) + ' / ' + String(RELAX_ITERS));
        statRow(156, '겹친 쌍', String(overlapPairs()));
        statRow(202, '최소 간격', String(LABEL_GAP) + ' px');
    }
    function after(): void {
        relaxing = true;
        if (still) { settle(); }
        report();
        draw();
    }
    function scramble(): void {
        placeLabels();
        after();
    }
    function movePick(d: number): void {
        pick = pick < 0 ? (d > 0 ? 0 : SLICE_N - 1) : (pick + d + SLICE_N) % SLICE_N;
        after();
    }
    placeLabels();
    if (!demo) { settle(); }
    cv.addEventListener('pointerdown', function (ev: PointerEvent): void {
        wake();
        const p = toScene(ev);
        if (Math.hypot(p[0] - CX, p[1] - CY) <= R + 6) {
            const i = sliceAt(slices, angleAt(p[0], p[1], CX, CY));
            pick = i === pick ? -1 : i;
            after();
        } else {
            scramble();
        }
    });
    cv.addEventListener('keydown', function (ev: KeyboardEvent): void {
        if (ev.key === 'ArrowRight') { ev.preventDefault(); wake(); movePick(1); }
        else if (ev.key === 'ArrowLeft') { ev.preventDefault(); wake(); movePick(-1); }
        else if (ev.key === 'Enter') { ev.preventDefault(); wake(); scramble(); }
        else if (ev.key === ' ') { ev.preventDefault(); wake(); settle(); after(); }
        else if (ev.key === 'Escape') { ev.preventDefault(); wake(); pick = -1; after(); }
    });
    if (scrambleBtn) { scrambleBtn.addEventListener('click', function (): void { wake(); scramble(); }); }
    if (solveBtn) { solveBtn.addEventListener('click', function (): void { wake(); settle(); after(); }); }
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
        <canvas className={cx("pc__canvas")} data-role="canvas" width={480} height={300} tabIndex={0} aria-label="바깥 라벨이 지시선을 달고 겹치면 반씩 밀려나는 원형 그래프. Enter 로 다시 흩고 Space 로 한 번에 풀며 ←/→ 로 조각을 고른다"></canvas>
        <p className={cx("pc__status")} data-role="status" aria-live="off">겹친 라벨을 반씩 밀어내는 중</p>
        <div className={cx("pc__tools")}>
          <button className={cx("pc__btn")} data-role="scramble" type="button">다시 흩기</button>
          <button className={cx("pc__btn")} data-role="solve" type="button">한 번에 풀기</button>
        </div>
    </div>
  );
}
