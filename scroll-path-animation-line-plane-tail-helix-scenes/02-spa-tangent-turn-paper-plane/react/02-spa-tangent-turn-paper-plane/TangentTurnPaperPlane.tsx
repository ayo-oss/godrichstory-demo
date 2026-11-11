// TangentTurnPaperPlane - vanilla 판(02-spa-tangent-turn-paper-plane) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./TangentTurnPaperPlane.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function TangentTurnPaperPlane() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const root: HTMLElement = rootEl;
    type RGB = [number, number, number];
    type Pt = [number, number];
    const W = 480;
    const H = 300;
    const FIXED_DT = 16;
    const TAU = Math.PI * 2;
    // 파스텔 팔레트 — 어두운 무대 위에 밝은 선·점을 얹어 명도 차로 경계가 읽힌다
    const BG: RGB = [27, 24, 38];
    const BG_LOW: RGB = [38, 33, 54];
    const GUIDE: RGB = [86, 78, 116];
    const CREAM: RGB = [255, 248, 234];
    const SKY: RGB = [124, 196, 255];
    const PINK: RGB = [255, 160, 190];
    const MINT: RGB = [126, 226, 192];
    const LILAC: RGB = [190, 164, 255];
    const PEACH: RGB = [255, 208, 168];
    const LEMON: RGB = [246, 228, 140];
    const FONT_FAMILY = '"Segoe UI", "Malgun Gothic", "Hiragino Sans", "Noto Sans KR", sans-serif';
    function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
    function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
    function smooth(x: number): number { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); }
    function rgba(c: RGB, a: number): string {
        return 'rgba(' + Math.round(clamp(c[0], 0, 255)) + ',' + Math.round(clamp(c[1], 0, 255)) + ',' + Math.round(clamp(c[2], 0, 255)) + ',' + clamp(a, 0, 1).toFixed(3) + ')';
    }
    function mixRGB(a: RGB, b: RGB, k: number): RGB { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
    // 시드 고정 난수 — 같은 시드면 같은 시간표·배치가 다시 나온다 (32비트 정수 섞기)
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
    // 각도 접기 — 차이를 -180°~180° 로 접어 가장 짧은 방향으로 돌게 한다
    function wrapAngle(a: number): number {
        let v = a;
        while (v > Math.PI) { v -= TAU; }
        while (v < -Math.PI) { v += TAU; }
        return v;
    }
    // 곡선 — 지나는 점들을 잇는 3차 곡선(토막마다 이웃 네 점으로 정한다). u(0~1) 를 넣으면 점이 나온다.
    // u 는 토막마다 같은 몫이라, 지나는 점 간격이 다르면 같은 u 차이에 움직이는 거리가 토막마다 달라진다
    function makeCurve(pts: Pt[]): (u: number) => Pt {
        const n = pts.length - 1;
        return function (u: number): Pt {
            const x = clamp(u, 0, 1) * n;
            const i = Math.min(Math.floor(x), n - 1);
            const t = x - i;
            const p0 = pts[Math.max(i - 1, 0)];
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const p3 = pts[Math.min(i + 2, n)];
            const t2 = t * t;
            const t3 = t2 * t;
            const out: Pt = [0, 0];
            for (let k = 0; k < 2; k += 1) {
                out[k] = 0.5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t3);
            }
            return out;
        };
    }
    // 누적 길이 표 — 곡선을 samples 토막으로 잘라, 토막 끝까지의 길이를 차례로 더해 둔다
    type LengthTable = { curve: (u: number) => Pt; us: number[]; lens: number[]; total: number };
    function buildLengthTable(curve: (u: number) => Pt, samples: number): LengthTable {
        const us: number[] = [0];
        const lens: number[] = [0];
        let prev = curve(0);
        let acc = 0;
        for (let i = 1; i <= samples; i += 1) {
            const u = i / samples;
            const p = curve(u);
            acc += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
            us.push(u);
            lens.push(acc);
            prev = p;
        }
        return { curve: curve, us: us, lens: lens, total: acc };
    }
    // 길이 → u — 누적 길이 표에서 s 가 드는 토막을 이분 탐색으로 찾고, 토막 안은 길이에 비례해 나눈다
    function uAtLength(tab: LengthTable, s: number): number {
        const L = clamp(s, 0, tab.total);
        let lo = 0;
        let hi = tab.lens.length - 1;
        while (hi - lo > 1) {
            const mid = (lo + hi) >> 1;
            if (tab.lens[mid] < L) { lo = mid; } else { hi = mid; }
        }
        const span = tab.lens[hi] - tab.lens[lo];
        const k = span > 0 ? (L - tab.lens[lo]) / span : 0;
        return lerp(tab.us[lo], tab.us[hi], k);
    }
    function pointAtLength(tab: LengthTable, s: number): Pt { return tab.curve(uAtLength(tab, s)); }
    // u → 길이 — 이정표·정거장처럼 곡선 위 자리를 먼저 정한 것의 누적 길이를 미리 잰다
    function lengthAtU(tab: LengthTable, u: number): number {
        const x = clamp(u, 0, 1) * (tab.us.length - 1);
        const i = Math.min(Math.floor(x), tab.us.length - 2);
        return lerp(tab.lens[i], tab.lens[i + 1], x - i);
    }
    // 법선 — s 앞뒤 1px 점의 차로 접선을 구해 90° 돌린다
    function normalAt(tab: LengthTable, s: number): Pt {
        const a = pointAtLength(tab, s - 1);
        const b = pointAtLength(tab, s + 1);
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const d = Math.hypot(dx, dy) || 1;
        return [-dy / d, dx / d];
    }
    // 길 그리기 경로 — 길이 s0 부터 s1 까지를 u 로 잘게(전체 res 걸음 비율) 따라간다. 표의 토막 수와 상관없이 선은 매끈하다
    function tracePath(tab: LengthTable, s0: number, s1: number, res: number): void {
        const u0 = uAtLength(tab, s0);
        const u1 = uAtLength(tab, s1);
        const steps = Math.max(2, Math.ceil(res * Math.abs(u1 - u0)));
        ctx.beginPath();
        for (let k = 0; k <= steps; k += 1) {
            const p = tab.curve(lerp(u0, u1, k / steps));
            if (k === 0) { ctx.moveTo(p[0], p[1]); } else { ctx.lineTo(p[0], p[1]); }
        }
    }
    const canvasEl = root.querySelector('[data-role="canvas"]') as HTMLCanvasElement | null;
    const scrollerEl = root.querySelector('[data-role="scroller"]') as HTMLElement | null;
    const statusEl = root.querySelector('[data-role="status"]') as HTMLElement | null;
    const ctxRaw = canvasEl ? canvasEl.getContext('2d') : null;
    if (!canvasEl || !ctxRaw || !scrollerEl || !statusEl) { return; }
    const cv: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctxRaw;
    const scroller: HTMLElement = scrollerEl;
    const status: HTMLElement = statusEl;
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    // 페이지를 연 채 동작 줄이기 설정을 바꿔도 아래 change 리스너가 이 값을 다시 읽는다
    let still = reduceQuery.matches;
    // 자동 시연 중인가 — 사람이 상자를 처음 만지는 순간 시연을 멈추고 상태 줄을 읽어 주기 시작한다
    let demo = root.classList.contains('is-demo');
    // 진행률 — prog 는 지금 장면이 쓰는 값, prevProg 는 한 틱 전 값, inputP 는 사람이 상자를 굴려 정한 값
    let prog = 0;
    let prevProg = 0;
    let inputP = 0;
    // 코드가 상자를 굴린 자리 — 뒤따라 오는 scroll 이벤트를 사람 입력으로 오인하지 않게 적어 둔다
    let expectTop = -1;
    function wake(): void {
        if (!demo) { return; }
        demo = false;
        root.classList.remove('is-demo');
        status.setAttribute('aria-live', 'polite');
        // 시연이 멈춘 그 자리에서 이어 굴린다 — 상자도 시연 내내 같은 자리로 굴려 두었다
        inputP = prog;
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
    // 상자 진행률 — 굴린 거리 / 굴릴 수 있는 거리. 페이지가 아니라 무대 안 상자의 scrollTop 만 읽는다
    function maxScroll(): number { return Math.max(1, scroller.scrollHeight - scroller.clientHeight); }
    function readScroll(): number { return clamp(scroller.scrollTop / maxScroll(), 0, 1); }
    function placeScroll(p: number): void {
        scroller.scrollTop = p * maxScroll();
        expectTop = scroller.scrollTop;
    }
    function clearStage(): void {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, rgba(BG, 1));
        g.addColorStop(1, rgba(BG_LOW, 1));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
    }
    // 진행 문구 — 5% 단위로 끊는다(굴릴 때마다 화면 낭독기가 숫자를 쏟아내지 않게)
    function pctText(p: number): string { return '진행 ' + Math.round(p * 20) * 5 + '%'; }
    // 시연 시간표 — [시각 ms, 진행률] 를 잇는 왕복. 앞으로 가는 길은 토막마다 걸리는 시간과 나아가는 몫이 시드로 달라 빠르기가 바뀐다
    const DEMO_LEAD_MS = 200;
    const DEMO_FORWARD_MS = 2600;
    const DEMO_HOLD_MS = 500;
    const DEMO_BACK_MS = 1800;
    const DEMO_REST_MS = 300;
    const DEMO_LOOP_MS = DEMO_LEAD_MS + DEMO_FORWARD_MS + DEMO_HOLD_MS + DEMO_BACK_MS + DEMO_REST_MS;
    function makeSchedule(seed: number, legs: number): Pt[] {
        const rng = makeRng(seed);
        const ws: number[] = [];
        const ps: number[] = [];
        let wSum = 0;
        let pSum = 0;
        for (let i = 0; i < legs; i += 1) {
            const w = 0.45 + rng() * 1.1;
            const v = 0.6 + rng() * 0.8;
            ws.push(w);
            ps.push(v);
            wSum += w;
            pSum += v;
        }
        const out: Pt[] = [[0, 0], [DEMO_LEAD_MS, 0]];
        let t = DEMO_LEAD_MS;
        let p = 0;
        for (let i = 0; i < legs; i += 1) {
            t += DEMO_FORWARD_MS * ws[i] / wSum;
            p += ps[i] / pSum;
            out.push([t, i === legs - 1 ? 1 : p]);
        }
        t += DEMO_HOLD_MS;
        out.push([t, 1]);
        t += DEMO_BACK_MS;
        out.push([t, 0]);
        out.push([DEMO_LOOP_MS, 0]);
        return out;
    }
    // 시간표 읽기 — 토막 안은 부드럽게(처음·끝이 느린 곡선) 잇는다
    function scheduleAt(sch: Pt[], t: number): number {
        const tt = t % DEMO_LOOP_MS;
        for (let i = 0; i < sch.length - 1; i += 1) {
            if (tt <= sch[i + 1][0]) {
                const span = sch[i + 1][0] - sch[i][0];
                const k = span > 0 ? (tt - sch[i][0]) / span : 1;
                return lerp(sch[i][1], sch[i + 1][1], smooth(k));
            }
        }
        return 0;
    }
    // 아이콘 — Phosphor Duotone(MIT) SVG 의 두 경로(옅은 면 back · 윤곽 front)를 그대로 Path2D 로 옮겨 캔버스에 찍는다. 좌표는 256 칸.
    // under 는 윤곽 안을 메우는 바탕(그 아이콘의 바깥 꼭짓점을 이은 것) — 옅은 면이 일부만 덮는 아이콘에만 쓴다
    type Icon = { back: Path2D; front: Path2D; under: Path2D | null };
    function makeIcon(back: string, front: string, under: string): Icon {
        return { back: new Path2D(back), front: new Path2D(front), under: under ? new Path2D(under) : null };
    }
    // (x, y) 에 아이콘의 (ox, oy) 점을 붙이고 angle 만큼 돌린 뒤 한 변 size(px) 로 그린다. sy 는 세로 배율, alpha 는 투명도
    function drawIcon(icon: Icon, x: number, y: number, angle: number, size: number, ox: number, oy: number, back: RGB, front: RGB, sy: number, alpha: number): void {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        const k = size / 256;
        ctx.scale(k, k * sy);
        ctx.translate(-ox, -oy);
        if (icon.under) {
            ctx.fillStyle = rgba(mixRGB(back, CREAM, 0.35), alpha);
            ctx.fill(icon.under);
        }
        ctx.fillStyle = rgba(back, alpha);
        ctx.fill(icon.back);
        ctx.fillStyle = rgba(front, alpha);
        ctx.fill(icon.front);
        ctx.restore();
    }
    // 앞을 내다보는 거리(px) — 지금 점과 이만큼 앞(거꾸로 굴리면 뒤) 점을 이은 방향이 접선 각
    const FOLLOW_LOOKAHEAD = 18;
    // 머리 돌리기 감쇠 — 틱마다 남은 각도 차의 이 비율만큼만 돈다(가장 짧은 방향으로)
    const TURN_SMOOTH = 0.14;
    // 비행기 크기(px) — 아이콘 한 변
    const PLANE_SIZE = 44;
    const DEMO_SEED = 4742;
    const DEMO_LEGS = 4;
    // 동작 줄이기에서 멈춰 보일 진행률 — 진행 끝 상태
    const STILL_PROGRESS = 1;
    // 꺾임이 큰 지그재그 길 — 굽이마다 접선 각이 크게 바뀐다
    const ROUTE: Pt[] = [[34, 236], [96, 116], [170, 214], [232, 72], [300, 196], [338, 96], [392, 222], [452, 64]];
    const TABLE: LengthTable = buildLengthTable(makeCurve(ROUTE), 200);
    const PLANE: Icon = makeIcon(
        'M227.91 134.86L59.93 231a8 8 0 0 1-11.44-9.67L80 128L48.49 34.72a8 8 0 0 1 11.44-9.67l168 95.85a8 8 0 0 1-.02 13.96',
        'm231.87 114l-168-95.89a16 16 0 0 0-22.95 19.23L71.55 128l-30.63 90.67A16 16 0 0 0 56 240a16.15 16.15 0 0 0 7.93-2.1l167.92-96.05a16 16 0 0 0 .05-27.89ZM56 224a.6.6 0 0 0 0-.12L85.74 136H144a8 8 0 0 0 0-16H85.74L56.06 32.16A.5.5 0 0 0 56 32l168 95.83Z',
        '');
    // heading 은 비행기 머리 각, target 은 접선 각, turn 은 이번 틱에 돈 각(라디안), dir 은 마지막으로 움직인 방향(+1 앞 · -1 뒤)
    let heading = 0;
    let target = 0;
    let turn = 0;
    let dir = 1;
    function travel(): number { return prog * TABLE.total; }
    // 접선 각 — 앞선 점과 지금 점의 차. 길 끝이라 두 점이 겹치면 이전 각을 그대로 둔다
    function aimAt(s: number): number {
        const a = pointAtLength(TABLE, s);
        const b = pointAtLength(TABLE, s + dir * FOLLOW_LOOKAHEAD);
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        if (Math.hypot(dx, dy) < 0.5) { return target; }
        return Math.atan2(dy, dx);
    }
    function onRestart(): void {
        dir = 1;
        target = aimAt(travel());
        heading = target;
        turn = 0;
    }
    function step(dp: number): void {
        if (dp > 1e-6) { dir = 1; } else if (dp < -1e-6) { dir = -1; }
        target = aimAt(travel());
        // 가장 짧은 방향 — 각도 차를 -180°~180° 로 접은 뒤 그 비율만큼만 돈다
        turn = wrapAngle(target - heading) * TURN_SMOOTH;
        heading = wrapAngle(heading + turn);
    }
    function draw(): void {
        clearStage();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash([3, 8]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = rgba(GUIDE, 1);
        tracePath(TABLE, 0, TABLE.total, 600);
        ctx.stroke();
        const s = travel();
        // 지나온 길 — 비행운
        if (s > 0.5) {
            ctx.setLineDash([10, 9]);
            ctx.lineWidth = 4;
            ctx.strokeStyle = rgba(SKY, 0.6);
            tracePath(TABLE, 0, s, 600);
            ctx.stroke();
        }
        const p = pointAtLength(TABLE, s);
        // 목표 방향 — 접선이 가리키는 쪽. 비행기 머리는 이 선을 감쇠로 뒤쫓는다
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = rgba(PINK, 0.9);
        ctx.beginPath();
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(p[0] + Math.cos(target) * 46, p[1] + Math.sin(target) * 46);
        ctx.stroke();
        ctx.setLineDash([]);
        // 기울기 — 이번 틱에 돈 각만큼 세로로 눌러 날개를 기울인 것처럼
        const bank = 1 - clamp(Math.abs(turn) * 7, 0, 0.5);
        drawIcon(PLANE, p[0] + 9, p[1] + 15, heading, PLANE_SIZE, 136, 128, [0, 0, 0], [0, 0, 0], bank, 0.28);
        drawIcon(PLANE, p[0], p[1], heading, PLANE_SIZE, 136, 128, SKY, CREAM, bank, 1);
    }
    function stateText(): string {
        return pctText(prog) + ' — ' + (dir < 0 ? '거꾸로 나는 중' : (Math.abs(turn) > 0.01 ? '고개를 트는 중' : '곧게 나는 중'));
    }
    const SCHEDULE: Pt[] = makeSchedule(DEMO_SEED, DEMO_LEGS);
    // 시연 시계(ms) — 16ms 고정 스텝으로만 늘어난다
    let clock = 0;
    // 한 틱 — 시연이면 시간표에서, 아니면 사람이 굴린 상자에서 진행률을 받고, 한 틱 전과의 차를 항목 계산에 넘긴다
    function tick(): void {
        prevProg = prog;
        prog = demo && !still ? scheduleAt(SCHEDULE, clock) : inputP;
        step(prog - prevProg);
    }
    function render(): void {
        draw();
        say(stateText());
    }
    // 동작 줄이기 — 움직임을 그리지 않고 SETTLE_TICKS 스텝을 한 번에 계산해 자리 잡은 결과만 그린다
    const SETTLE_TICKS = 240;
    function settle(): void {
        for (let k = 0; k < SETTLE_TICKS; k += 1) { tick(); }
    }
    // 입력 한 번 뒤 — 동작 줄이기면 그 입력이 낳은 결과까지 바로 계산해 그린다
    function after(): void {
        if (still) { settle(); }
        render();
    }
    function restart(p: number): void {
        prog = p;
        prevProg = p;
        inputP = p;
        onRestart();
    }
    // 리스너는 한 묶음으로 달고 정리할 때 한 번에 뗀다
    const off = new AbortController();
    // 상자 스크롤 — 코드가 굴린 자리면 넘기고, 사람이 굴렸으면 시연을 멈추고 그 진행률을 쓴다
    scroller.addEventListener('scroll', function (): void {
        if (expectTop >= 0 && Math.abs(scroller.scrollTop - expectTop) <= 1.5) { return; }
        expectTop = -1;
        wake();
        inputP = readScroll();
        if (still) { after(); }
    }, { signal: off.signal });
    // 휠은 듣기만 한다(passive) — 기본 동작을 막지 않으니 굴림은 브라우저가 상자 안에서 한다
    scroller.addEventListener('wheel', function (): void { wake(); }, { passive: true, signal: off.signal });
    scroller.addEventListener('pointerdown', function (): void { wake(); }, { signal: off.signal });
    // 키보드로 상자에 들어오면 시연을 멈춘다 — 손대기 전까지 저절로 움직이던 장면을 멈출 방법
    scroller.addEventListener('focus', function (): void { wake(); }, { signal: off.signal });
    // 키보드 — 방향키는 KEY_STEP, PageUp·PageDown 은 PAGE_STEP, Home·End 는 처음·끝. 상자 안 진행만 바꾸고 페이지는 그대로
    const KEY_STEP = 0.04;
    const PAGE_STEP = 0.25;
    scroller.addEventListener('keydown', function (ev: KeyboardEvent): void {
        const k = ev.key;
        let d = 0;
        let to = -1;
        if (k === 'ArrowDown' || k === 'ArrowRight') { d = KEY_STEP; }
        else if (k === 'ArrowUp' || k === 'ArrowLeft') { d = -KEY_STEP; }
        else if (k === 'PageDown') { d = PAGE_STEP; }
        else if (k === 'PageUp') { d = -PAGE_STEP; }
        else if (k === 'Home') { to = 0; }
        else if (k === 'End') { to = 1; }
        else { return; }
        ev.preventDefault();
        wake();
        inputP = to >= 0 ? to : clamp(inputP + d, 0, 1);
        placeScroll(inputP);
        after();
    }, { signal: off.signal });
    function onResize(): void {
        fitCanvas();
        placeScroll(demo && !still ? prog : inputP);
        render();
    }
    fitCanvas();
    window.addEventListener('resize', onResize, { signal: off.signal });
    let rafId = 0;
    let lastTs = -1;
    let acc = 0;
    function frame(ts: number): void {
        if (still) { rafId = 0; return; }
        if (lastTs < 0) { lastTs = ts; }
        // 탭이 숨었다 돌아와도 한 번에 100ms 까지만 따라잡는다 — 순간이동 대신 이어서 움직인다
        acc += Math.min(ts - lastTs, 100);
        lastTs = ts;
        let n = 0;
        while (acc >= FIXED_DT && n < 6) {
            clock += FIXED_DT;
            tick();
            acc -= FIXED_DT;
            n += 1;
        }
        // 시연 중에는 상자도 같은 진행률로 굴려 둔다 — 스크롤 막대가 함께 움직이고, 사람이 잡으면 그 자리에서 이어진다
        if (demo) { placeScroll(prog); }
        render();
        rafId = window.requestAnimationFrame(frame);
    }
    function startLoop(): void {
        if (rafId) { return; }
        lastTs = -1;
        acc = 0;
        rafId = window.requestAnimationFrame(frame);
    }
    // 동작 줄이기 설정이 페이지를 연 채 바뀌면 — 켜지면 루프를 멈추고(시연 중이었으면 진행 끝 화면), 꺼지면 루프를 다시 돈다
    function onMotionPref(): void {
        still = reduceQuery.matches;
        if (still) {
            if (rafId) { window.cancelAnimationFrame(rafId); rafId = 0; }
            if (demo) {
                inputP = STILL_PROGRESS;
                placeScroll(STILL_PROGRESS);
            }
            after();
        } else {
            startLoop();
        }
    }
    reduceQuery.addEventListener('change', onMotionPref, { signal: off.signal });
    if (still) {
        // 동작 줄이기 — 가상 진행을 돌리지 않고 진행 끝 상태(STILL_PROGRESS)에서 멈춘 화면. 상자도 끝으로 굴려 둔다
        restart(STILL_PROGRESS);
        placeScroll(STILL_PROGRESS);
        after();
    } else {
        restart(scheduleAt(SCHEDULE, 0));
        render();
        startLoop();
    }
    return function (): void {
        window.cancelAnimationFrame(rafId);
        off.abort();
    };
  }, []);

  return (
    <div className={cx("sp") + " is-demo"} ref={rootRef}>
        <canvas className={cx("sp__canvas")} data-role="canvas" width={480} height={300} aria-hidden="true"></canvas>
        <div className={cx("sp__scroller")} data-role="scroller" tabIndex={0} role="region" aria-label="종이비행기가 길의 접선 방향으로 머리를 돌리며 나는 장면. 이 상자 안에서 휠이나 손가락으로 굴리거나, 방향키·PageUp·PageDown·Home·End 로 진행한다. 페이지 스크롤은 그대로다">
          <div className={cx("sp__track")}></div>
        </div>
        <p className={cx("sp__status")} data-role="status" aria-live="off">진행 0%</p>
    </div>
  );
}
