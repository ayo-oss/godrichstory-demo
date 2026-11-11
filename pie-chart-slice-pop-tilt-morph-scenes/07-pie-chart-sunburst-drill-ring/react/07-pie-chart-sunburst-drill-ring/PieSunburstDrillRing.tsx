// PieSunburstDrillRing - vanilla 판(07-pie-chart-sunburst-drill-ring) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./PieSunburstDrillRing.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function PieSunburstDrillRing() {
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
    // 고리 한 겹의 두께(px)
    const RING_WIDTH = 34;
    // 갈래를 펼치거나 되돌리는 시간
    const DRILL_MS = 650;
    // 나무의 깊이 — 묶음 · 하위 묶음 · 낱개, 고리 세 겹
    const LEVELS = 3;
    const HOLE_R = 28;
    const SEED = 467;
    const CX = 316;
    const CY = 150;
    const DEMO_LOOP = 2000;
    const TXT_ROOT = '전체 — 고리를 눌러 갈래 펼치기';
    const upBtn = root.querySelector('[data-role="up"]') as HTMLButtonElement | null;
    const homeBtn = root.querySelector('[data-role="home"]') as HTMLButtonElement | null;
    type TreeNode = { code: string; top: number; depth: number; value: number; f0: number; f1: number; parent: TreeNode | null; kids: TreeNode[] };
    // 가상 나무 — 맨 위 묶음 넷, 그 아래 둘이나 셋씩, 맨 끝 낱개 값은 시드로
    function buildTree(): TreeNode {
        const rnd = makeRng(SEED);
        const top: TreeNode = { code: '', top: -1, depth: 0, value: 0, f0: 0, f1: 1, parent: null, kids: [] };
        function grow(n: TreeNode): void {
            if (n.depth >= LEVELS) { n.value = 4 + Math.floor(rnd() * 17); return; }
            const k = n.depth === 0 ? 4 : 2 + Math.floor(rnd() * 2);
            for (let i = 0; i < k; i += 1) {
                const code = n.depth === 0 ? String.fromCharCode(65 + i) : n.code + '-' + String(i + 1);
                const c: TreeNode = { code: code, top: n.depth === 0 ? i : n.top, depth: n.depth + 1, value: 0, f0: 0, f1: 0, parent: n, kids: [] };
                n.kids.push(c);
                grow(c);
                n.value += c.value;
            }
        }
        // 부모의 범위 [f0, f1] 를 자식 값의 비율로 다시 나눈다 — 바깥 고리가 안쪽 조각 안에 들어맞는 까닭
        function split(n: TreeNode): void {
            let acc = n.f0;
            for (let i = 0; i < n.kids.length; i += 1) {
                const c = n.kids[i];
                c.f0 = acc;
                acc += ((n.f1 - n.f0) * c.value) / n.value;
                c.f1 = acc;
                split(c);
            }
        }
        grow(top);
        split(top);
        return top;
    }
    const tree = buildTree();
    const nodes: TreeNode[] = [];
    (function collect(n: TreeNode): void {
        for (let i = 0; i < n.kids.length; i += 1) { nodes.push(n.kids[i]); collect(n.kids[i]); }
    })(tree);
    let focus: TreeNode = tree;
    let v0 = 0;
    let v1 = 1;
    let from0 = 0;
    let from1 = 1;
    let drillMs = DRILL_MS;
    let pick = -1;
    // 비율 → 각 — 보고 있는 범위 [v0, v1] 를 0 ~ 2π 로 늘인다. 범위 밖은 양 끝에 붙어 폭 0 이 된다
    function mapA(f: number): number { return clamp((f - v0) / (v1 - v0), 0, 1) * TAU; }
    function nameOf(n: TreeNode): string { return n.depth === 1 ? LABELS[n.top] : n.code; }
    function ring0(d: number): number { return HOLE_R + (d - 1) * RING_WIDTH; }
    function report(): void {
        if (pick >= 0 && pick < focus.kids.length) {
            const k = focus.kids[pick];
            say(nameOf(k) + ' · ' + pctText(k.f1 - k.f0));
            return;
        }
        if (focus === tree) { say(TXT_ROOT); } else { say(nameOf(focus) + ' · ' + pctText(focus.f1 - focus.f0)); }
    }
    function drill(n: TreeNode): void {
        from0 = v0;
        from1 = v1;
        focus = n;
        drillMs = 0;
        pick = -1;
    }
    function step(): void {
        if (drillMs >= DRILL_MS) { return; }
        drillMs = Math.min(DRILL_MS, drillMs + FIXED_DT);
        const e = easeInOutPow(drillMs / DRILL_MS, 3);
        v0 = lerp(from0, focus.f0, e);
        v1 = lerp(from1, focus.f1, e);
    }
    function settle(): void {
        drillMs = DRILL_MS;
        v0 = focus.f0;
        v1 = focus.f1;
    }
    function biggest(n: TreeNode): TreeNode {
        let b = n.kids[0];
        for (let i = 1; i < n.kids.length; i += 1) { if (n.kids[i].value > b.value) { b = n.kids[i]; } }
        return b;
    }
    function demoTick(t: number): void {
        runSchedule(t, DEMO_LOOP, [200, 1100], function (k: number): void {
            drill(k === 0 ? biggest(tree) : tree);
            report();
        });
    }
    function colorOf(n: TreeNode, idx: number): RGB {
        const c = PAL[n.top];
        if (n.depth === 1) { return c; }
        if (n.depth === 2) { return mix(c, idx % 2 === 0 ? PAPER : BG, idx % 2 === 0 ? 0.22 : 0.12); }
        return mix(c, PAPER, 0.42 + 0.12 * (idx % 2));
    }
    function draw(): void {
        clearStage();
        for (let n = 0; n < nodes.length; n += 1) {
            const node = nodes[n];
            const a0 = mapA(node.f0);
            const a1 = mapA(node.f1);
            if (a1 - a0 < 0.002) { continue; }
            const idx = node.parent ? node.parent.kids.indexOf(node) : 0;
            const on = pick >= 0 && focus.kids[pick] === node;
            // 보고 있는 갈래의 윗대는 한 바퀴를 다 덮으니 어둡게 깐다
            const above = node.depth <= focus.depth;
            let c = colorOf(node, idx);
            if (above) { c = mix(c, BG, 0.55); }
            if (on) { c = mix(c, PAPER, 0.3); }
            ctx.fillStyle = rgba(c, 1);
            wedgePath(ctx, CX, CY, ring0(node.depth), ring0(node.depth) + RING_WIDTH - 2, a0, a1);
            ctx.fill();
            ctx.strokeStyle = rgba(BG, 1);
            ctx.lineWidth = 1.5;
            ctx.stroke();
            if (node.depth === focus.depth + 1 && a1 - a0 > 0.32) {
                const mid = (a0 + a1) / 2;
                const rr = ring0(node.depth) + RING_WIDTH / 2 - 1;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = '700 10px sans-serif';
                ctx.fillStyle = rgba(INK, 0.92);
                ctx.fillText(node.depth === 1 ? node.code : node.code.slice(2), CX + dirX(mid) * rr, CY + dirY(mid) * rr);
            }
        }
        // 가운데 — 지금 보는 갈래. 누르면 한 단계 위로
        ctx.fillStyle = rgba(PANEL, 1);
        ctx.beginPath();
        ctx.arc(CX, CY, HOLE_R - 3, 0, TAU);
        ctx.fill();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '700 11px sans-serif';
        ctx.fillStyle = rgba(PAPER, 0.95);
        ctx.fillText(focus === tree ? '100%' : focus.code, CX, CY);
        for (let i = 0; i < tree.kids.length; i += 1) {
            const k = tree.kids[i];
            legendRow(i, LABELS[i], pctText(k.f1 - k.f0), PAL[i], focus !== tree && focus.top === i, false);
        }
        statRow(190, '보는 갈래', focus === tree ? '100%' : nameOf(focus) + ' · ' + pctText(focus.f1 - focus.f0));
    }
    function after(): void {
        if (still) { settle(); }
        report();
        draw();
    }
    function goUp(): void {
        if (focus.parent) { drill(focus.parent); }
    }
    // 포인터 자리의 마디 — 거리로 고리 겹을, atan2 각을 비율로 되돌려 그 겹의 마디를 찾는다
    function hitNode(x: number, y: number): TreeNode | null {
        const d = Math.hypot(x - CX, y - CY);
        const depth = 1 + Math.floor((d - HOLE_R) / RING_WIDTH);
        if (d < HOLE_R || depth > LEVELS) { return null; }
        const f = v0 + (angleAt(x, y, CX, CY) / TAU) * (v1 - v0);
        for (let n = 0; n < nodes.length; n += 1) {
            const node = nodes[n];
            if (node.depth === depth && f >= node.f0 && f < node.f1) { return node; }
        }
        return null;
    }
    function open(node: TreeNode): void {
        if (node.kids.length > 0 && node !== focus) { drill(node); }
        else if (node.parent) {
            if (node.parent !== focus) { drill(node.parent); }
            pick = node.parent.kids.indexOf(node);
        }
    }
    function movePick(d: number): void {
        const n = focus.kids.length;
        if (n === 0) { return; }
        pick = pick < 0 ? (d > 0 ? 0 : n - 1) : (pick + d + n) % n;
        after();
    }
    cv.addEventListener('pointerdown', function (ev: PointerEvent): void {
        wake();
        const p = toScene(ev);
        if (Math.hypot(p[0] - CX, p[1] - CY) < HOLE_R) { goUp(); after(); return; }
        const node = hitNode(p[0], p[1]);
        if (node) { open(node); }
        after();
    });
    cv.addEventListener('keydown', function (ev: KeyboardEvent): void {
        if (ev.key === 'ArrowRight') { ev.preventDefault(); wake(); movePick(1); }
        else if (ev.key === 'ArrowLeft') { ev.preventDefault(); wake(); movePick(-1); }
        else if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            wake();
            if (pick >= 0 && pick < focus.kids.length && focus.kids[pick].kids.length > 0) { drill(focus.kids[pick]); }
            after();
        }
        else if (ev.key === 'Escape' || ev.key === 'Backspace') { ev.preventDefault(); wake(); goUp(); after(); }
    });
    if (upBtn) { upBtn.addEventListener('click', function (): void { wake(); goUp(); after(); }); }
    if (homeBtn) { homeBtn.addEventListener('click', function (): void { wake(); drill(tree); after(); }); }
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
        <canvas className={cx("pc__canvas")} data-role="canvas" width={480} height={300} tabIndex={0} aria-label="안쪽 고리와 바깥 고리로 나뉜 선버스트. 고리를 누르거나 Enter 로 갈래를 한 바퀴로 펼치고 Esc 로 한 단계 위로 간다"></canvas>
        <p className={cx("pc__status")} data-role="status" aria-live="off">전체 — 고리를 눌러 갈래 펼치기</p>
        <div className={cx("pc__tools")}>
          <button className={cx("pc__btn")} data-role="up" type="button">한 단계 위로</button>
          <button className={cx("pc__btn")} data-role="home" type="button">처음으로</button>
        </div>
    </div>
  );
}
