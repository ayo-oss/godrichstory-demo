// NestedRingsFlick - vanilla 판(07-model3d-nested-rings-flick) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./NestedRingsFlick.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function NestedRingsFlick() {
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
    // 끌기 속도(px/스텝) → 각속도(rad/스텝) 배율
    const FLICK_GAIN = 0.01;
    // 손을 뗀 뒤 매 스텝 각속도에 곱하는 마찰 계수 — 1 에 가까울수록 오래 돈다
    const SPIN_FRICTION = 0.96;
    // 고리 수 — 바깥부터 세로축·가로축·깊이축
    const RING_COUNT = 3;
    const RING_R = [112, 86, 60];
    const RING_AXIS = ['y', 'x', 'z'];
    // 고리 띠 반 높이(px)와 둘레 칸 수
    const BAND = 7;
    const RING_SEG = 56;
    // 각속도 상한(rad/스텝) — 세게 던져도 띠가 끊겨 보일 만큼 빨라지지 않게
    const MAX_SPIN = 0.32;
    // 각속도가 이 아래로 떨어지면 멈춘 것으로 친다
    const STOP_W = 0.0005;
    const FOCAL = 600;
    const DEMO_LOOP = 2000;
    const TXT_SPIN = '던진 힘으로 도는 중';
    const TXT_REST = '멈춤 — 끌어서 던져 보기';
    const flickBtn = root.querySelector('[data-role="flick"]') as HTMLButtonElement | null;
    const stopBtn = root.querySelector('[data-role="stop"]') as HTMLButtonElement | null;
    const view = makeView(0.35, 0.3);
    let angle = 0;
    let w = 0;
    let dragging = false;
    let px = 0;
    let py = 0;
    let lastX = 0;
    let lastY = 0;
    // 한 번 던진 뒤 돈 각(rad)
    let turned = 0;
    function report(): void { say(Math.abs(w) > STOP_W || dragging ? TXT_SPIN : TXT_REST); }
    // 끌기 한 스텝의 움직임 → 부호 있는 빠르기. 가로가 크면 가로 방향, 세로가 크면 세로 방향을 따른다
    function signedSpeed(dx: number, dy: number): number { return Math.abs(dx) >= Math.abs(dy) ? dx : dy; }
    // 손을 뗀 뒤 한 스텝 — 각속도에 마찰 계수를 곱한다
    function coast(v: number): number {
        const n = v * SPIN_FRICTION;
        return Math.abs(n) < STOP_W ? 0 : n;
    }
    function step(): void {
        if (dragging) {
            // 끄는 동안은 손 빠르기를 바로 각속도로 — 반쯤만 섞어 손 떨림을 거른다
            const target = clamp(signedSpeed(px - lastX, py - lastY) * FLICK_GAIN, -MAX_SPIN, MAX_SPIN);
            w = lerp(w, target, 0.5);
            lastX = px;
            lastY = py;
        } else {
            w = coast(w);
        }
        angle += w;
        turned += Math.abs(w);
    }
    function settle(): void {
        // 동작 줄이기 — 남은 회전을 한 번에 더해 멈춘 자리로 바로 간다 (등비급수 합 w / (1 − 마찰))
        angle += w * SPIN_FRICTION / (1 - SPIN_FRICTION);
        turned += Math.abs(w * SPIN_FRICTION / (1 - SPIN_FRICTION));
        w = 0;
        viewSnap(view);
    }
    function grab(x: number, y: number): void {
        dragging = true;
        px = lastX = x;
        py = lastY = y;
        turned = 0;
    }
    function demoTick(t: number): void {
        runSchedule(t, DEMO_LOOP, [200, 440, 1150, 1370], function (k: number): void {
            if (k === 0) { ghost.x = 230; ghost.y = 150; ghostGo(430, 160, 240, t); ghost.down = true; grab(230, 150); }
            else if (k === 1) { ghost.down = false; dragging = false; }
            else if (k === 2) { ghostGo(240, 140, 220, t); ghost.down = true; grab(ghost.x, ghost.y); }
            else { ghost.down = false; dragging = false; }
            report();
        });
        ghostAt(t);
        if (dragging) { px = ghost.x; py = ghost.y; }
    }
    // 고리 i 의 자세 — 바깥 고리 안에 가운데, 그 안에 안쪽이 매달린 짐벌. 같은 각을 각자 다른 축에 쓴다
    function axisRot(axis: string, a: number): M3 { return axis === 'y' ? rotY(a) : (axis === 'x' ? rotX(a) : rotZ(a)); }
    function ringMatrix(i: number): M3 {
        let m = axisRot(RING_AXIS[0], angle);
        for (let k = 1; k <= i; k += 1) { m = matMul(m, axisRot(RING_AXIS[k], angle)); }
        return m;
    }
    type Quad = { pts: Proj[]; z: number; c: RGB };
    function draw(): void {
        clearStage();
        floorShadow(130, 274, 0.5);
        const vm = viewMatrix(view.yaw, view.pitch);
        const quads: Quad[] = [];
        const cols: RGB[] = [PAL[0], PAL[7], PAL[5]];
        for (let i = 0; i < RING_COUNT; i += 1) {
            const m = matMul(vm, ringMatrix(i));
            const r = RING_R[i];
            for (let k = 0; k < RING_SEG; k += 1) {
                const a0 = (k / RING_SEG) * TAU, a1 = ((k + 1) / RING_SEG) * TAU;
                const p00 = apply(m, [r * Math.cos(a0), r * Math.sin(a0), -BAND]);
                const p10 = apply(m, [r * Math.cos(a1), r * Math.sin(a1), -BAND]);
                const p11 = apply(m, [r * Math.cos(a1), r * Math.sin(a1), BAND]);
                const p01 = apply(m, [r * Math.cos(a0), r * Math.sin(a0), BAND]);
                const am = (a0 + a1) / 2;
                const n = apply(m, [Math.cos(am), Math.sin(am), 0]);
                // 띠 바깥면이 화면을 보면 밝게, 등지면 고리 안쪽 면이 보이는 것이라 어둡게
                const outside = n[2] < 0;
                const lit = outside ? 0.45 + 0.55 * lambert(n) : 0.32 + 0.3 * lambert(vscale(n, -1));
                const stripe = k % 4 === 0 ? mix(cols[i], PAPER, 0.45) : cols[i];
                quads.push({ pts: [project(p00, FOCAL), project(p10, FOCAL), project(p11, FOCAL), project(p01, FOCAL)], z: (p00[2] + p10[2] + p11[2] + p01[2]) / 4, c: shadeRGB(stripe, lit) });
            }
        }
        quads.sort(function (a: Quad, b: Quad): number { return b.z - a.z; });
        // 가운데 심 — 먼 띠 다음, 앞 띠 전에 그리면 고리 사이에 끼어 보인다
        let coreDone = false;
        for (let k = 0; k < quads.length; k += 1) {
            if (!coreDone && quads[k].z < 0) {
                const g = ctx.createRadialGradient(CX - 6, CY - 6, 2, CX, CY, 26);
                g.addColorStop(0, rgba(PAPER, 1));
                g.addColorStop(1, rgba(PAL[3], 0.0));
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(CX, CY, 26, 0, TAU);
                ctx.fill();
                coreDone = true;
            }
            fillPoly(quads[k].pts, quads[k].c, 1);
        }
        statRow(112, '각속도', fmt(w, 3) + ' rad/f');
        statRow(160, '던진 뒤 돈 각', fmt(turned / DEG, 0) + '°');
        drawGhost();
    }
    function after(): void {
        if (still && !dragging) { settle(); }
        report();
        draw();
    }
    function flick(v: number): void {
        turned = 0;
        w = clamp(v, -MAX_SPIN, MAX_SPIN);
        after();
    }
    cv.addEventListener('pointerdown', function (ev: PointerEvent): void {
        wake();
        const p = toScene(ev);
        grab(p[0], p[1]);
        if (cv.setPointerCapture) { cv.setPointerCapture(ev.pointerId); }
        after();
    });
    cv.addEventListener('pointermove', function (ev: PointerEvent): void {
        if (!dragging) { return; }
        const p = toScene(ev);
        px = p[0];
        py = p[1];
        // 동작 줄이기에서는 루프가 없으니 움직인 만큼 바로 돌린다
        if (still) { angle += signedSpeed(px - lastX, py - lastY) * FLICK_GAIN; lastX = px; lastY = py; draw(); }
    });
    function release(): void {
        if (!dragging) { return; }
        dragging = false;
        after();
    }
    cv.addEventListener('pointerup', release);
    cv.addEventListener('pointercancel', release);
    cv.addEventListener('keydown', function (ev: KeyboardEvent): void {
        if (ev.key === 'ArrowRight') { ev.preventDefault(); wake(); flick(w + 0.12); }
        else if (ev.key === 'ArrowLeft') { ev.preventDefault(); wake(); flick(w - 0.12); }
        else if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') { arrowNudge(ev, view); wake(); after(); }
        else if (ev.key === 'Enter') { ev.preventDefault(); wake(); flick(0.16); }
        else if (ev.key === ' ' || ev.key === 'Escape') { ev.preventDefault(); wake(); w = 0; after(); }
    });
    if (flickBtn) { flickBtn.addEventListener('click', function (): void { wake(); flick(0.16); }); }
    if (stopBtn) { stopBtn.addEventListener('click', function (): void { wake(); w = 0; after(); }); }
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
        <canvas className={cx("pc__canvas")} data-role="canvas" width={480} height={300} tabIndex={0} aria-label="끌어서 던지면 관성으로 돌다 마찰로 서서히 멈추는 세 겹 고리. ←/→ 로 던지고 ↑/↓ 로 시점을 바꾸며 Space 로 멈춘다"></canvas>
        <p className={cx("pc__status")} data-role="status" aria-live="off">멈춤 — 끌어서 던져 보기</p>
        <div className={cx("pc__tools")}>
          <button className={cx("pc__btn")} data-role="flick" type="button">던지기</button>
          <button className={cx("pc__btn")} data-role="stop" type="button">멈추기</button>
        </div>
    </div>
  );
}
