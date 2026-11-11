// DoubleHelixTwist - vanilla 판(06-model3d-double-helix-twist) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./DoubleHelixTwist.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function DoubleHelixTwist() {
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
    // 나선이 위에서 아래까지 감기는 바퀴 수
    const HELIX_TURNS = 2.5;
    // 구슬 몇 칸마다 두 가닥을 가로대로 잇는가
    const RUNG_EVERY = 3;
    // 포인터가 모형 중심에서 화면 반 폭만큼 벗어났을 때 더해지는 꼬임 속도(rad/s)
    const TWIST_GAIN = 2.6;
    // 포인터가 가운데 있을 때의 꼬임 속도(rad/s)
    const BASE_TWIST = 0.6;
    // 가닥 하나의 구슬 수·나선 높이·반지름(px)
    const BEADS = 34;
    const HELIX_H = 236;
    const HELIX_R = 54;
    // 포인터 세로 위치 → 앞뒤 기울기 최대(rad)
    const TILT_MAX = 0.7;
    // 꼬임 속도·기울기가 목표를 따라가는 비율(스텝마다)
    const TWIST_LERP = 0.06;
    const FOCAL = 560;
    const DEMO_LOOP = 2000;
    const TXT_IDLE = '포인터 가로 위치로 꼬임 속도가 바뀌는 중';
    const TXT_STOP = '꼬임 멈춤';
    const homeBtn = root.querySelector('[data-role="home"]') as HTMLButtonElement | null;
    const stopBtn = root.querySelector('[data-role="stop"]') as HTMLButtonElement | null;
    let phase = 0;
    let twist = BASE_TWIST;
    let twistTo = BASE_TWIST;
    let tilt = 0.25;
    let tiltTo = 0.25;
    let paused = false;
    let pointerIn = false;
    function report(): void { say(paused ? TXT_STOP : TXT_IDLE); }
    // 포인터 → 꼬임 속도·기울기 목표
    function aimTwist(x: number, y: number): void {
        twistTo = BASE_TWIST + TWIST_GAIN * clamp((x - CX) / (W / 2), -1, 1);
        tiltTo = clamp((y - CY) / (H / 2), -1, 1) * TILT_MAX;
    }
    function step(): void {
        twist += (twistTo - twist) * TWIST_LERP;
        tilt += (tiltTo - tilt) * TWIST_LERP;
        if (!paused) { phase += twist * FIXED_DT / 1000; }
    }
    function settle(): void { twist = twistTo; tilt = tiltTo; }
    function demoTick(t: number): void {
        runSchedule(t, DEMO_LOOP, [200, 1100], function (k: number): void {
            if (k === 0) { ghostGo(440, 90, 380, t); }
            else { ghostGo(170, 220, 380, t); }
            report();
        });
        ghostAt(t);
        aimTwist(ghost.x, ghost.y);
    }
    type Bead = { p: V3; strand: number };
    // 두 가닥 — 같은 높이에서 각도가 180° 어긋난 두 점
    function beads(): Bead[] {
        const out: Bead[] = [];
        for (let i = 0; i < BEADS; i += 1) {
            const u = i / (BEADS - 1);
            const a = phase + u * HELIX_TURNS * TAU;
            const y = -HELIX_H / 2 + u * HELIX_H;
            out.push({ p: [HELIX_R * Math.cos(a), y, HELIX_R * Math.sin(a)], strand: 0 });
            out.push({ p: [HELIX_R * Math.cos(a + Math.PI), y, HELIX_R * Math.sin(a + Math.PI)], strand: 1 });
        }
        return out;
    }
    type Item = { z: number; kind: number; a: Proj; b: Proj; ca: RGB; cb: RGB };
    function draw(): void {
        clearStage();
        floorShadow(110, 276, 0.45);
        // 세로축 둘레 꼬임은 phase 가, 앞뒤 기울기는 가로축 회전이, 살짝 옆으로 누운 자세는 깊이축 회전이 맡는다
        const m = matMul(rotZ(-0.32), rotX(tilt));
        const bs = beads();
        const rv = bs.map(function (b: Bead): V3 { return apply(m, b.p); });
        const pv = rv.map(function (p: V3): Proj { return project(p, FOCAL); });
        const cols: RGB[] = [PAL[1], PAL[2]];
        const items: Item[] = [];
        let rungs = 0;
        for (let i = 0; i < bs.length; i += 1) {
            items.push({ z: rv[i][2], kind: 0, a: pv[i], b: pv[i], ca: cols[bs[i].strand], cb: cols[bs[i].strand] });
            // 같은 가닥 다음 구슬과 잇는 등뼈
            if (i + 2 < bs.length) {
                items.push({ z: (rv[i][2] + rv[i + 2][2]) / 2 + 0.5, kind: 1, a: pv[i], b: pv[i + 2], ca: cols[bs[i].strand], cb: cols[bs[i].strand] });
            }
        }
        for (let i = 0; i < BEADS; i += RUNG_EVERY) {
            const a = 2 * i, b = 2 * i + 1;
            items.push({ z: (rv[a][2] + rv[b][2]) / 2 + 1, kind: 2, a: pv[a], b: pv[b], ca: cols[0], cb: cols[1] });
            rungs += 1;
        }
        // 깊이순 — 먼 구슬·가로대부터
        items.sort(function (p: Item, q: Item): number { return q.z - p.z; });
        ctx.lineCap = 'round';
        for (let k = 0; k < items.length; k += 1) {
            const it = items[k];
            const t = clamp((it.z + HELIX_R) / (2 * HELIX_R), 0, 1);
            const dim = 1 - 0.55 * t;
            if (it.kind === 0) {
                const r = 7.5 * it.a.s;
                ctx.fillStyle = rgba(shadeRGB(it.ca, dim), 1);
                ctx.beginPath();
                ctx.arc(it.a.x, it.a.y, r, 0, TAU);
                ctx.fill();
                // 빛 쪽(왼쪽 위) 반짝임
                ctx.fillStyle = rgba(PAPER, 0.55 * dim);
                ctx.beginPath();
                ctx.arc(it.a.x - r * 0.35, it.a.y - r * 0.38, r * 0.32, 0, TAU);
                ctx.fill();
            } else if (it.kind === 1) {
                ctx.strokeStyle = rgba(shadeRGB(it.ca, dim * 0.8), 0.9);
                ctx.lineWidth = 2.4 * it.a.s;
                ctx.beginPath();
                ctx.moveTo(it.a.x, it.a.y);
                ctx.lineTo(it.b.x, it.b.y);
                ctx.stroke();
            } else {
                const mx = (it.a.x + it.b.x) / 2, my = (it.a.y + it.b.y) / 2;
                ctx.lineWidth = 3.4 * it.a.s;
                ctx.strokeStyle = rgba(shadeRGB(mix(it.ca, PAPER, 0.25), dim), 1);
                ctx.beginPath();
                ctx.moveTo(it.a.x, it.a.y);
                ctx.lineTo(mx, my);
                ctx.stroke();
                ctx.strokeStyle = rgba(shadeRGB(mix(it.cb, PAPER, 0.25), dim), 1);
                ctx.beginPath();
                ctx.moveTo(mx, my);
                ctx.lineTo(it.b.x, it.b.y);
                ctx.stroke();
            }
        }
        statRow(112, '꼬임 속도', fmt(paused ? 0 : twist, 2) + ' rad/s');
        statRow(160, '가로대', String(rungs));
        drawGhost();
    }
    function after(): void {
        if (still) { settle(); }
        report();
        draw();
    }
    function togglePause(): void {
        paused = !paused;
        if (stopBtn) { stopBtn.setAttribute('aria-pressed', paused ? 'true' : 'false'); }
        after();
    }
    function goHome(): void {
        twistTo = BASE_TWIST;
        tiltTo = 0.25;
        // 동작 줄이기에서는 저절로 돌지 않으니 한 번 눌릴 때마다 반 칸만큼 돌려 꼬임 방향을 보인다
        if (still) { phase += 0.4; }
        after();
    }
    cv.addEventListener('pointermove', function (ev: PointerEvent): void {
        wake();
        pointerIn = true;
        const p = toScene(ev);
        aimTwist(p[0], p[1]);
        after();
    });
    cv.addEventListener('pointerleave', function (): void {
        if (!pointerIn) { return; }
        pointerIn = false;
        goHome();
    });
    cv.addEventListener('pointerdown', function (): void { wake(); togglePause(); });
    cv.addEventListener('keydown', function (ev: KeyboardEvent): void {
        let hit = true;
        if (ev.key === 'ArrowRight') { twistTo = clamp(twistTo + 0.8, -3, 3.4); if (still) { phase -= 0.4; } }
        else if (ev.key === 'ArrowLeft') { twistTo = clamp(twistTo - 0.8, -3, 3.4); if (still) { phase += 0.4; } }
        else if (ev.key === 'ArrowUp') { tiltTo = clamp(tiltTo - 0.2, -TILT_MAX, TILT_MAX); }
        else if (ev.key === 'ArrowDown') { tiltTo = clamp(tiltTo + 0.2, -TILT_MAX, TILT_MAX); }
        else if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); wake(); togglePause(); return; }
        else if (ev.key === 'Escape') { ev.preventDefault(); wake(); goHome(); return; }
        else { hit = false; }
        if (hit) { ev.preventDefault(); wake(); after(); }
    });
    if (homeBtn) { homeBtn.addEventListener('click', function (): void { wake(); goHome(); }); }
    if (stopBtn) { stopBtn.addEventListener('click', function (): void { wake(); togglePause(); }); }
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
        <canvas className={cx("pc__canvas")} data-role="canvas" width={480} height={300} tabIndex={0} aria-label="포인터 가로 위치로 꼬임 속도가, 세로 위치로 기울기가 바뀌는 이중 나선 구슬 모형. ←/→ 로 꼬임 속도, ↑/↓ 로 기울기를 바꾸고 Enter 로 멈춘다"></canvas>
        <p className={cx("pc__status")} data-role="status" aria-live="off">포인터 가로 위치로 꼬임 속도가 바뀌는 중</p>
        <div className={cx("pc__tools")}>
          <button className={cx("pc__btn")} data-role="stop" type="button" aria-pressed="false">꼬임 멈추기</button>
          <button className={cx("pc__btn")} data-role="home" type="button">처음 속도로</button>
        </div>
    </div>
  );
}
