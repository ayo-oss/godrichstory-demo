// IcosaWireInertia - vanilla 판(01-model3d-icosa-wire-inertia) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./IcosaWireInertia.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function IcosaWireInertia() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const root: HTMLElement = rootEl;
    type RGB = [number, number, number];
    type V3 = [number, number, number];
    type M3 = [number, number, number, number, number, number, number, number, number];
    const W = 480;
    const H = 300;
    const FIXED_DT = 16;
    const TAU = Math.PI * 2;
    const DEG = Math.PI / 180;
    // 모형 중심 — 왼쪽 위는 버튼, 왼쪽 아래는 상태 줄이라 모형은 오른쪽으로 비켜 둔다
    const CX = 300;
    const CY = 150;
    // 파스텔 팔레트 — 어두운 무대 위에 밝은 조각을 얹어 명도 차로 경계가 읽힌다
    const BG: RGB = [29, 26, 44];
    const PANEL: RGB = [44, 39, 64];
    const PAPER: RGB = [255, 248, 234];
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
    function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
    function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
    function smooth(x: number): number { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); }
    function rgba(c: RGB, a: number): string {
        return 'rgba(' + Math.round(clamp(c[0], 0, 255)) + ',' + Math.round(clamp(c[1], 0, 255)) + ',' + Math.round(clamp(c[2], 0, 255)) + ',' + clamp(a, 0, 1).toFixed(3) + ')';
    }
    function mix(a: RGB, b: RGB, k: number): RGB { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
    function shadeRGB(c: RGB, k: number): RGB { return [c[0] * k, c[1] * k, c[2] * k]; }
    // 3차원 계산 — 화면 오른쪽이 +x, 아래가 +y, 화면 안쪽이 +z (화면 쪽을 보는 면은 법선 z 가 음수)
    function vadd(a: V3, b: V3): V3 { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
    function vsub(a: V3, b: V3): V3 { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
    function vscale(a: V3, k: number): V3 { return [a[0] * k, a[1] * k, a[2] * k]; }
    function dot(a: V3, b: V3): number { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
    function cross(a: V3, b: V3): V3 { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
    function vnorm(a: V3): V3 {
        const l = Math.hypot(a[0], a[1], a[2]);
        return l > 1e-9 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0];
    }
    // 회전 행렬 — 가로축(x)·세로축(y)·깊이축(z) 둘레로 a 라디안
    function rotX(a: number): M3 { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; }
    function rotY(a: number): M3 { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; }
    function rotZ(a: number): M3 { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; }
    function matMul(a: M3, b: M3): M3 {
        return [
            a[0] * b[0] + a[1] * b[3] + a[2] * b[6], a[0] * b[1] + a[1] * b[4] + a[2] * b[7], a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
            a[3] * b[0] + a[4] * b[3] + a[5] * b[6], a[3] * b[1] + a[4] * b[4] + a[5] * b[7], a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
            a[6] * b[0] + a[7] * b[3] + a[8] * b[6], a[6] * b[1] + a[7] * b[4] + a[8] * b[7], a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
        ];
    }
    function apply(m: M3, p: V3): V3 {
        return [m[0] * p[0] + m[1] * p[1] + m[2] * p[2], m[3] * p[0] + m[4] * p[1] + m[5] * p[2], m[6] * p[0] + m[7] * p[1] + m[8] * p[2]];
    }
    // 회전 행렬의 역은 전치 — 화면 방향을 모형 좌표로 되돌릴 때 쓴다
    function applyT(m: M3, p: V3): V3 {
        return [m[0] * p[0] + m[3] * p[1] + m[6] * p[2], m[1] * p[0] + m[4] * p[1] + m[7] * p[2], m[2] * p[0] + m[5] * p[1] + m[8] * p[2]];
    }
    // 시점 행렬 — 먼저 세로축으로 돌리고(yaw) 그다음 가로축으로 기울인다(pitch)
    function viewMatrix(yaw: number, pitch: number): M3 { return matMul(rotX(pitch), rotY(yaw)); }
    type Proj = { x: number; y: number; s: number; z: number };
    // 원근 나눗셈 — 화면 배율 s = focal / (focal + z). 깊이 z 가 클수록(안쪽) 작아지고 가운데로 모인다
    function project(p: V3, focal: number): Proj {
        const s = focal / (focal + p[2]);
        return { x: CX + p[0] * s, y: CY + p[1] * s, s: s, z: p[2] };
    }
    // 빛 — 왼쪽 위 앞에서 비춘다
    const LIGHT: V3 = vnorm([-0.45, -0.62, -0.64]);
    function lambert(n: V3): number { return Math.max(0, dot(n, LIGHT)); }
    // 시점 추종 — 포인터가 정한 목표 각을 매 스텝 남은 차의 k 만큼 따라간다
    type View = { yaw: number; pitch: number; yawTo: number; pitchTo: number; yaw0: number; pitch0: number };
    function makeView(yaw: number, pitch: number): View { return { yaw: yaw, pitch: pitch, yawTo: yaw, pitchTo: pitch, yaw0: yaw, pitch0: pitch }; }
    function viewFollow(v: View, k: number): void {
        v.yaw += (v.yawTo - v.yaw) * k;
        v.pitch += (v.pitchTo - v.pitch) * k;
    }
    function viewSnap(v: View): void { v.yaw = v.yawTo; v.pitch = v.pitchTo; }
    function viewHome(v: View): void { v.yawTo = v.yaw0; v.pitchTo = v.pitch0; }
    function viewGap(v: View): number { return Math.hypot(v.yawTo - v.yaw, v.pitchTo - v.pitch); }
    // 포인터 → 목표 각. 모형 중심에서 가로로 벗어난 만큼 yaw, 세로로 벗어난 만큼 pitch (오른쪽을 가리키면 앞면이 오른쪽으로 돈다)
    const YAW_RANGE = 1.1;
    const PITCH_RANGE = 0.8;
    function aimAt(v: View, px: number, py: number): void {
        v.yawTo = v.yaw0 - clamp((px - CX) / (W / 2), -1, 1) * YAW_RANGE;
        v.pitchTo = v.pitch0 + clamp((py - CY) / (H / 2), -1, 1) * PITCH_RANGE;
    }
    // 방향키 한 번에 돌리는 각
    const KEY_STEP = 0.3;
    function arrowNudge(ev: KeyboardEvent, v: View): boolean {
        if (ev.key === 'ArrowLeft') { v.yawTo = clamp(v.yawTo + KEY_STEP, -Math.PI, Math.PI); }
        else if (ev.key === 'ArrowRight') { v.yawTo = clamp(v.yawTo - KEY_STEP, -Math.PI, Math.PI); }
        else if (ev.key === 'ArrowUp') { v.pitchTo = clamp(v.pitchTo - KEY_STEP, -1.3, 1.3); }
        else if (ev.key === 'ArrowDown') { v.pitchTo = clamp(v.pitchTo + KEY_STEP, -1.3, 1.3); }
        else { return false; }
        ev.preventDefault();
        return true;
    }
    const canvasEl = root.querySelector('[data-role="canvas"]') as HTMLCanvasElement | null;
    const statusEl = root.querySelector('[data-role="status"]') as HTMLElement | null;
    const ctxRaw = canvasEl ? canvasEl.getContext('2d') : null;
    if (!canvasEl || !ctxRaw || !statusEl) { return; }
    const cv: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctxRaw;
    const status: HTMLElement = statusEl;
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    // 페이지를 연 채 동작 줄이기 설정을 바꿔도 tail 의 change 리스너가 이 값을 다시 읽는다
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
    // 시드 고정 난수 — 같은 시드면 같은 배치가 다시 나온다 (32비트 정수 섞기)
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
    // 화면 투영된 다각형 칠하기
    function fillPoly(pts: Proj[], c: RGB, a: number): void {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i += 1) { ctx.lineTo(pts[i].x, pts[i].y); }
        ctx.closePath();
        ctx.fillStyle = rgba(c, a);
        ctx.fill();
        // 이웃 면 사이 머리카락 틈을 같은 색 얇은 선으로 메운다
        ctx.strokeStyle = rgba(c, a);
        ctx.lineWidth = 0.7;
        ctx.stroke();
    }
    // 왼쪽 수치 한 줄 — 이름표 + 값
    const LEG_X = 16;
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
    // 바닥 그림자 — 모형 아래 납작한 타원, 모형이 떠 있지 않고 놓여 보이게
    function floorShadow(rx: number, y: number, a: number): void {
        const g = ctx.createRadialGradient(CX, y, 0, CX, y, rx);
        g.addColorStop(0, rgba([0, 0, 0], a));
        g.addColorStop(1, rgba([0, 0, 0], 0));
        ctx.save();
        ctx.translate(CX, y);
        ctx.scale(1, 0.18);
        ctx.translate(-CX, -y);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(CX, y, rx, 0, TAU);
        ctx.fill();
        ctx.restore();
    }
    // 시연용 가상 포인터 — 시연 동안만 고리로 그려 무엇이 모형을 움직이는지 보이게 한다
    type Ghost = { x: number; y: number; fx: number; fy: number; tx: number; ty: number; t0: number; dur: number; down: boolean };
    const ghost: Ghost = { x: -1, y: -1, fx: 0, fy: 0, tx: 0, ty: 0, t0: 0, dur: 1, down: false };
    function ghostGo(x: number, y: number, dur: number, t: number): void {
        ghost.fx = ghost.x < 0 ? x : ghost.x;
        ghost.fy = ghost.y < 0 ? y : ghost.y;
        ghost.tx = x;
        ghost.ty = y;
        ghost.t0 = t;
        ghost.dur = Math.max(1, dur);
    }
    function ghostAt(t: number): void {
        const e = smooth((t - ghost.t0) / ghost.dur);
        ghost.x = lerp(ghost.fx, ghost.tx, e);
        ghost.y = lerp(ghost.fy, ghost.ty, e);
    }
    function drawGhost(): void {
        if (!demo || ghost.x < 0) { return; }
        ctx.strokeStyle = rgba(PAPER, 0.9);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ghost.x, ghost.y, ghost.down ? 7 : 10, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = rgba(PAPER, ghost.down ? 0.9 : 0.5);
        ctx.beginPath();
        ctx.arc(ghost.x, ghost.y, ghost.down ? 4 : 2.5, 0, TAU);
        ctx.fill();
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
    function fmt(v: number, d: number): string { return v.toFixed(d); }
    // 남은 각도 차를 매 스텝 이 비율만큼 줄인다 — 클수록 포인터에 바짝 붙어 돈다
    const ROT_LERP = 0.08;
    // 초점 거리(px) — 화면 배율 = FOCAL_PX / (FOCAL_PX + 깊이). 작을수록 앞뒤 크기 차가 커진다
    const FOCAL_PX = 600;
    // 가장 먼 모서리에서 굵기·투명도를 덜어 내는 비율 — 0 이면 앞뒤가 같은 선
    const DEPTH_FADE = 0.75;
    // 외접구 반지름(px)
    const R = 110;
    // 황금비 — 정이십면체 꼭짓점 좌표 (0, ±1, ±φ) 의 φ
    const PHI = (1 + Math.sqrt(5)) / 2;
    const LINE_W = 3.4;
    const DEMO_LOOP = 2000;
    const TXT_IDLE = '포인터 쪽으로 늦게 돌아보는 중';
    const TXT_HOME = '정면으로 돌아가는 중';
    const homeBtn = root.querySelector('[data-role="home"]') as HTMLButtonElement | null;
    const fadeBtn = root.querySelector('[data-role="fade"]') as HTMLButtonElement | null;
    // 꼭짓점 12개 — (0, ±1, ±φ) 를 x·y·z 자리로 돌려 세 벌 만든다
    function icosaRaw(): V3[] {
        const out: V3[] = [];
        for (let i = 0; i < 4; i += 1) {
            const a = i & 1 ? 1 : -1;
            const b = i & 2 ? PHI : -PHI;
            out.push([0, a, b]);
            out.push([a, b, 0]);
            out.push([b, 0, a]);
        }
        return out;
    }
    const RAW = icosaRaw();
    const VERTS: V3[] = RAW.map(function (p: V3): V3 { return vscale(vnorm(p), R); });
    // 모서리 30개 — 원래 좌표에서 거리가 2 인 꼭짓점 쌍
    const EDGES: [number, number][] = [];
    for (let i = 0; i < RAW.length; i += 1) {
        for (let j = i + 1; j < RAW.length; j += 1) {
            const d = vsub(RAW[i], RAW[j]);
            if (Math.abs(dot(d, d) - 4) < 1e-6) { EDGES.push([i, j]); }
        }
    }
    // 면 20개 — 서로 모두 이웃인 세 꼭짓점
    const FACES: [number, number, number][] = [];
    function linked(a: number, b: number): boolean {
        for (let k = 0; k < EDGES.length; k += 1) {
            if ((EDGES[k][0] === a && EDGES[k][1] === b) || (EDGES[k][0] === b && EDGES[k][1] === a)) { return true; }
        }
        return false;
    }
    for (let i = 0; i < 12; i += 1) {
        for (let j = i + 1; j < 12; j += 1) {
            for (let k = j + 1; k < 12; k += 1) {
                if (linked(i, j) && linked(j, k) && linked(i, k)) { FACES.push([i, j, k]); }
            }
        }
    }
    const view = makeView(0.35, 0.25);
    let fadeOn = true;
    let pointerIn = false;
    function fade(): number { return fadeOn ? DEPTH_FADE : 0; }
    // 깊이 0~1 — 0 이 가장 가까운 쪽, 1 이 가장 먼 쪽
    function depthT(z: number): number { return clamp((z + R) / (2 * R), 0, 1); }
    function report(): void {
        say(Math.abs(view.yawTo - view.yaw0) + Math.abs(view.pitchTo - view.pitch0) < 1e-3 ? TXT_HOME : TXT_IDLE);
    }
    function step(): void { viewFollow(view, ROT_LERP); }
    function settle(): void { viewSnap(view); }
    function demoTick(t: number): void {
        runSchedule(t, DEMO_LOOP, [200, 850, 1450], function (k: number): void {
            if (k === 0) { ghostGo(440, 70, 240, t); }
            else if (k === 1) { ghostGo(190, 240, 240, t); }
            else { ghostGo(450, 245, 240, t); }
            report();
        });
        ghostAt(t);
        aimAt(view, ghost.x, ghost.y);
    }
    function draw(): void {
        clearStage();
        floorShadow(130, 272, 0.55);
        const m = viewMatrix(view.yaw, view.pitch);
        const rv: V3[] = VERTS.map(function (p: V3): V3 { return apply(m, p); });
        const pv: Proj[] = rv.map(function (p: V3): Proj { return project(p, FOCAL_PX); });
        // 화면 쪽 면만 아주 옅게 — 선 사이가 비어 보이지 않게 빛 방향 내적으로 밝기를 준다
        for (let f = 0; f < FACES.length; f += 1) {
            const a = rv[FACES[f][0]], b = rv[FACES[f][1]], c = rv[FACES[f][2]];
            let n = vnorm(cross(vsub(b, a), vsub(c, a)));
            const mid = vscale(vadd(vadd(a, b), c), 1 / 3);
            if (dot(n, mid) < 0) { n = vscale(n, -1); }
            if (n[2] >= 0) { continue; }
            fillPoly([pv[FACES[f][0]], pv[FACES[f][1]], pv[FACES[f][2]]], mix(PAL[3], PAPER, 0.15), 0.05 + 0.16 * lambert(n));
        }
        // 모서리 — 먼 것부터 그려 가까운 선이 위에 오게
        const order = EDGES.map(function (_e: [number, number], i: number): number { return i; });
        const zm = EDGES.map(function (e: [number, number]): number { return (rv[e[0]][2] + rv[e[1]][2]) / 2; });
        order.sort(function (a: number, b: number): number { return zm[b] - zm[a]; });
        ctx.lineCap = 'round';
        for (let k = 0; k < order.length; k += 1) {
            const e = EDGES[order[k]];
            const t = depthT(zm[order[k]]);
            const keep = 1 - fade() * t;
            ctx.strokeStyle = rgba(mix(PAL[0], PAL[3], t), keep);
            ctx.lineWidth = LINE_W * keep * pv[e[0]].s;
            ctx.beginPath();
            ctx.moveTo(pv[e[0]].x, pv[e[0]].y);
            ctx.lineTo(pv[e[1]].x, pv[e[1]].y);
            ctx.stroke();
        }
        for (let i = 0; i < pv.length; i += 1) {
            const t = depthT(rv[i][2]);
            ctx.fillStyle = rgba(mix(PAPER, PAL[3], t), 1 - fade() * t);
            ctx.beginPath();
            ctx.arc(pv[i].x, pv[i].y, 4.2 * pv[i].s * (1 - 0.5 * fade() * t), 0, TAU);
            ctx.fill();
        }
        statRow(112, '남은 각도 차', fmt(viewGap(view) / DEG, 1) + '°');
        statRow(160, '앞 · 뒤 배율', fmt(FOCAL_PX / (FOCAL_PX - R), 2) + '× · ' + fmt(FOCAL_PX / (FOCAL_PX + R), 2) + '×');
        drawGhost();
    }
    function after(): void {
        if (still) { settle(); }
        report();
        draw();
    }
    cv.addEventListener('pointermove', function (ev: PointerEvent): void {
        wake();
        pointerIn = true;
        const p = toScene(ev);
        aimAt(view, p[0], p[1]);
        after();
    });
    cv.addEventListener('pointerleave', function (): void {
        if (!pointerIn) { return; }
        pointerIn = false;
        viewHome(view);
        after();
    });
    cv.addEventListener('pointerdown', function (ev: PointerEvent): void {
        wake();
        const p = toScene(ev);
        aimAt(view, p[0], p[1]);
        after();
    });
    cv.addEventListener('keydown', function (ev: KeyboardEvent): void {
        if (arrowNudge(ev, view)) { wake(); after(); return; }
        if (ev.key === 'Enter' || ev.key === 'Escape') { ev.preventDefault(); wake(); viewHome(view); after(); }
        else if (ev.key === ' ') { ev.preventDefault(); wake(); toggleFade(); }
    });
    function toggleFade(): void {
        fadeOn = !fadeOn;
        if (fadeBtn) { fadeBtn.setAttribute('aria-pressed', fadeOn ? 'false' : 'true'); }
        after();
    }
    if (homeBtn) { homeBtn.addEventListener('click', function (): void { wake(); viewHome(view); after(); }); }
    if (fadeBtn) { fadeBtn.addEventListener('click', function (): void { wake(); toggleFade(); }); }
    report();

    let rafId = 0;
    let lastTs = -1;
    let acc = 0;
    let clock = 0;
    function frame(ts: number): void {
        if (still) { rafId = 0; return; }
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
    function startLoop(): void {
        if (rafId) { return; }
        lastTs = -1;
        acc = 0;
        rafId = window.requestAnimationFrame(frame);
    }
    // 동작 줄이기 설정이 페이지를 연 채 바뀌면 — 켜지면 루프를 멈추고 끝 상태로, 꺼지면 루프를 다시 돈다
    function onMotionPref(): void {
        still = reduceQuery.matches;
        if (still) {
            if (rafId) { window.cancelAnimationFrame(rafId); rafId = 0; }
            settle();
            report();
            draw();
        } else {
            startLoop();
        }
    }
    if (typeof reduceQuery.addEventListener === 'function') { reduceQuery.addEventListener('change', onMotionPref); }
    if (still) {
        settle();
        draw();
    } else {
        startLoop();
    }
    return function (): void {
        window.cancelAnimationFrame(rafId);
        window.removeEventListener('resize', onResize);
        if (typeof reduceQuery.removeEventListener === 'function') { reduceQuery.removeEventListener('change', onMotionPref); }
    };

  }, []);

  return (
    <div className={cx("pc") + " is-demo"} ref={rootRef}>
        <canvas className={cx("pc__canvas")} data-role="canvas" width={480} height={300} tabIndex={0} aria-label="포인터 쪽으로 관성을 두고 돌아보며 먼 모서리일수록 가늘고 흐려지는 와이어프레임 정이십면체. 방향키로 돌리고 Enter 로 정면, Space 로 깊이 흐림을 끄고 켠다"></canvas>
        <p className={cx("pc__status")} data-role="status" aria-live="off">포인터 쪽으로 늦게 돌아보는 중</p>
        <div className={cx("pc__tools")}>
          <button className={cx("pc__btn")} data-role="home" type="button">정면으로</button>
          <button className={cx("pc__btn")} data-role="fade" type="button" aria-pressed="false">깊이 흐림 끄기</button>
        </div>
    </div>
  );
}
