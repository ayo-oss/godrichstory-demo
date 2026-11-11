// SlingshotRubberKicker - vanilla 판(04-pb-slingshot-rubber-kicker) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./SlingshotRubberKicker.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function SlingshotRubberKicker() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const root: HTMLElement = rootEl;
    type RGB = [number, number, number];
    type Pt = [number, number];
    type Seg = [number, number, number, number];
    // 논리 무대 — 물리는 화면 폭과 상관없이 이 480×300 좌표에서만 돈다. 화면이 넓든 좁든 그릴 때만 배율을 곱한다
    const W = 480;
    const H = 300;
    // 한 틱 = 16ms 고정. 실제 프레임 간격이 흔들려도 계산은 같은 걸음으로만 나아간다
    const FIXED_DT = 16;
    const DT = FIXED_DT / 1000;
    const TAU = Math.PI * 2;
    // 머리 띠 높이(논리 px) — 상태 줄과 버튼이 이 띠 위에 겹친다
    const HEADER = 30;
    // 시연이 끝난 판을 이만큼(ms) 보여 준 뒤 같은 시드로 처음부터 다시 돈다
    const LOOP_HOLD_MS = 1600;
    // 파스텔 팔레트 — 어두운 판 위에 밝은 공·핀을 얹어 명도 차로 움직임이 읽힌다
    const BG: RGB = [30, 27, 48];
    const BG_LOW: RGB = [46, 39, 70];
    const BAND: RGB = [20, 18, 32];
    const GUIDE: RGB = [104, 94, 140];
    const CREAM: RGB = [255, 248, 234];
    const SKY: RGB = [146, 208, 255];
    const PINK: RGB = [255, 172, 200];
    const MINT: RGB = [144, 232, 202];
    const LILAC: RGB = [202, 182, 255];
    const PEACH: RGB = [255, 208, 172];
    const LEMON: RGB = [250, 234, 156];
    const AQUA: RGB = [156, 238, 236];
    const CORAL: RGB = [255, 184, 166];
    const INK: RGB = [28, 24, 40];
    const BALL_COLORS: RGB[] = [PEACH, MINT, SKY, PINK, LILAC, LEMON, AQUA, CORAL, CREAM];
    // 공 이름표 — 실제 사람 이름 대신 글자
    const LABELS: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
    const FONT_FAMILY = '"Segoe UI", "Malgun Gothic", "Hiragino Sans", "Noto Sans KR", sans-serif';
    function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
    function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
    function smooth(x: number): number { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); }
    function rgba(c: RGB, a: number): string {
        return 'rgba(' + Math.round(clamp(c[0], 0, 255)) + ',' + Math.round(clamp(c[1], 0, 255)) + ',' + Math.round(clamp(c[2], 0, 255)) + ',' + clamp(a, 0, 1).toFixed(3) + ')';
    }
    function mixRGB(a: RGB, b: RGB, k: number): RGB { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
    // 시드 고정 난수 — 같은 시드면 같은 출발 자리·같은 결과가 다시 나온다 (32비트 정수 섞기)
    function makeRng(seedValue: number): () => number {
        let s = seedValue >>> 0;
        return function (): number {
            s = (s + 0x6d2b79f5) >>> 0;
            let t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    // 공 — 자리(x, y)·속도(vx, vy, px/s)·반지름. trail 은 지나온 자리(x, y 를 번갈아), slow 는 거의 멈춰 있던 시간(ms),
    // finishMs 는 결승선을 지난 시각(ms, 아직이면 -1), mul 은 공마다 다른 계수(07 구름 마찰), out 은 판 밖에서 쉬는 중
    type Ball = { x: number; y: number; vx: number; vy: number; r: number; color: RGB; label: string; trail: number[]; slow: number; finishMs: number; mul: number; out: boolean };
    function makeBall(x: number, y: number, r: number, color: RGB, label: string): Ball {
        return { x: x, y: y, vx: 0, vy: 0, r: r, color: color, label: label, trail: [], slow: 0, finishMs: -1, mul: 1, out: false };
    }
    // 속도를 먼저 갱신하는 적분 — 이번 걸음의 힘(중력)으로 속도를 바꾼 뒤, 그 새 속도로 자리를 옮긴다. h 는 초
    function integrate(b: Ball, gx: number, gy: number, h: number): void {
        b.vx += gx * h;
        b.vy += gy * h;
        b.x += b.vx * h;
        b.y += b.vy * h;
    }
    function capSpeed(b: Ball, max: number): void {
        const s = Math.hypot(b.vx, b.vy);
        if (s > max) { b.vx *= max / s; b.vy *= max / s; }
    }
    // 마지막 충돌 — 법선(공 쪽을 향함)과 닿은 자리. 범퍼·키커가 이 법선 방향으로 덧힘을 준다
    const contact = { nx: 0, ny: -1, px: 0, py: 0 };
    // 원-원 충돌(움직이지 않는 원: 핀·범퍼) — 겹친 깊이만큼 법선 방향 바깥으로 밀어내고,
    // 법선 방향 속도를 되튐 계수 e 만큼 뒤집는다. 돌려주는 값: 안 닿음 -1 · 닿았지만 멀어지는 중 0 · 다가오던 빠르기(px/s)
    function hitCircle(b: Ball, cx: number, cy: number, cr: number, e: number): number {
        const dx = b.x - cx;
        const dy = b.y - cy;
        const d = Math.hypot(dx, dy);
        const overlap = b.r + cr - d;
        if (overlap <= 0) { return -1; }
        // 중심이 정확히 겹치면 방향을 정할 수 없다 — 위로 민다
        const nx = d > 1e-9 ? dx / d : 0;
        const ny = d > 1e-9 ? dy / d : -1;
        b.x += nx * overlap;
        b.y += ny * overlap;
        contact.nx = nx;
        contact.ny = ny;
        contact.px = cx + nx * cr;
        contact.py = cy + ny * cr;
        const vn = b.vx * nx + b.vy * ny;
        if (vn >= 0) { return 0; }
        b.vx -= (1 + e) * vn * nx;
        b.vy -= (1 + e) * vn * ny;
        return -vn;
    }
    // 선분 위 가장 가까운 점 — 공 중심에서 선분으로 내린 수선의 발. t 는 0(시작점)~1(끝점)로 자른다
    function closestOnSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): [number, number, number] {
        const ex = bx - ax;
        const ey = by - ay;
        const len2 = ex * ex + ey * ey;
        const t = len2 > 0 ? clamp(((px - ax) * ex + (py - ay) * ey) / len2, 0, 1) : 0;
        return [ax + ex * t, ay + ey * t, t];
    }
    // 원-선분 충돌 — 가장 가까운 점까지 거리가 (반지름 + 선 두께의 반)보다 짧으면 겹친 만큼 밀어낸다.
    // 선분이 움직이면(도는 플리퍼·풍차 막대) 접점의 속도(svx, svy)에 대한 상대 속도로 되튐을 잰다.
    // grip 은 이번 걸음에 접선 방향 상대 속도에서 덜어 내는 몫 — 0 이면 미끄럼, 07 구름 마찰은 0 보다 크다
    function hitSegment(b: Ball, ax: number, ay: number, bx: number, by: number, half: number, e: number, svx: number, svy: number, grip: number): number {
        const c = closestOnSegment(b.x, b.y, ax, ay, bx, by);
        const dx = b.x - c[0];
        const dy = b.y - c[1];
        const d = Math.hypot(dx, dy);
        const overlap = b.r + half - d;
        if (overlap <= 0) { return -1; }
        let nx = 0;
        let ny = -1;
        if (d > 1e-9) {
            nx = dx / d;
            ny = dy / d;
        } else {
            // 중심이 선 위에 올라탔다 — 선분의 왼쪽 법선으로 민다
            const L = Math.hypot(bx - ax, by - ay) || 1;
            nx = (by - ay) / L;
            ny = -(bx - ax) / L;
        }
        b.x += nx * overlap;
        b.y += ny * overlap;
        contact.nx = nx;
        contact.ny = ny;
        contact.px = c[0];
        contact.py = c[1];
        const rvx = b.vx - svx;
        const rvy = b.vy - svy;
        const vn = rvx * nx + rvy * ny;
        if (vn >= 0) { return 0; }
        const tvx = (rvx - vn * nx) * (1 - grip);
        const tvy = (rvy - vn * ny) * (1 - grip);
        b.vx = svx + tvx - e * vn * nx;
        b.vy = svy + tvy - e * vn * ny;
        return -vn;
    }
    // 움직이지 않는 벽 묶음 — 선분 하나하나에 hitSegment
    function hitWalls(b: Ball, segs: Seg[], e: number): void {
        for (let i = 0; i < segs.length; i += 1) {
            const s = segs[i];
            hitSegment(b, s[0], s[1], s[2], s[3], 0, e, 0, 0, 0);
        }
    }
    // 공-공 충돌 — 같은 무게. 겹친 깊이를 반씩 나눠 밀어내고, 법선 방향 속도를 되튐 계수만큼 주고받는다
    function hitBalls(a: Ball, b: Ball, e: number): number {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const overlap = a.r + b.r - d;
        if (overlap <= 0) { return -1; }
        const nx = d > 1e-9 ? dx / d : 1;
        const ny = d > 1e-9 ? dy / d : 0;
        a.x -= nx * overlap * 0.5;
        a.y -= ny * overlap * 0.5;
        b.x += nx * overlap * 0.5;
        b.y += ny * overlap * 0.5;
        const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (vn >= 0) { return 0; }
        const j = -(1 + e) * vn * 0.5;
        a.vx -= j * nx;
        a.vy -= j * ny;
        b.vx += j * nx;
        b.vy += j * ny;
        return -vn;
    }
    // 움직이지 않는 둥근 기둥(핀·표적) — glow 는 맞은 뒤 번지는 빛(0~1)
    type Peg = { x: number; y: number; glow: number };
    function pushTrail(b: Ball, n: number): void {
        b.trail.push(b.x, b.y);
        while (b.trail.length > n * 2) { b.trail.splice(0, 2); }
    }
    const canvasEl = root.querySelector('[data-role="canvas"]') as HTMLCanvasElement | null;
    const statusEl = root.querySelector('[data-role="status"]') as HTMLElement | null;
    const ctxRaw = canvasEl ? canvasEl.getContext('2d') : null;
    if (!canvasEl || !ctxRaw || !statusEl) { return; }
    const cv: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctxRaw;
    const status: HTMLElement = statusEl;
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    // 페이지를 연 채 동작 줄이기 설정을 바꿔도 꼬리의 change 리스너가 이 값을 다시 읽는다
    let still = reduceQuery.matches;
    // 자동 시연 중인가 — 사람이 버튼을 처음 누르는 순간 시연(가상 입력·같은 판 되풀이)을 멈추고 결과를 읽어 주기 시작한다
    let demo = root.classList.contains('is-demo');
    // 지금 판의 시드와 시각(ms). 시각은 16ms 고정 스텝으로만 는다
    let seed = 0;
    let clock = 0;
    // 화면 배율 — 논리 1px 이 화면 CSS px 몇 개인가. 그릴 때만 쓰고 물리 계산에는 넣지 않는다
    let viewScale = 1;
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
        const cssW = cv.getBoundingClientRect().width || W;
        viewScale = cssW / W;
        const k = viewScale * dpr;
        cv.width = Math.max(1, Math.round(W * k));
        cv.height = Math.max(1, Math.round(H * k));
        // 그릴 때만 논리 좌표 → 화소 배율을 곱한다
        ctx.setTransform(k, 0, 0, k, 0, 0);
    }
    function clearStage(): void {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, rgba(BG, 1));
        g.addColorStop(1, rgba(BG_LOW, 1));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
    }
    // 머리 띠 — 상태 줄과 버튼 뒤의 어두운 띠. 판을 다 그린 뒤 맨 위에 덮는다
    function drawBand(): void {
        ctx.fillStyle = rgba(BAND, 0.92);
        ctx.fillRect(0, 0, W, HEADER);
    }
    function strokeSeg(s: Seg, width: number, c: RGB, a: number): void {
        ctx.lineCap = 'round';
        ctx.strokeStyle = rgba(c, a);
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(s[0], s[1]);
        ctx.lineTo(s[2], s[3]);
        ctx.stroke();
    }
    // 꼬리 — 지나온 자리를 이을수록 굵고 진하게
    function drawTrail(b: Ball, c: RGB, width: number): void {
        const t = b.trail;
        const n = t.length / 2;
        ctx.lineCap = 'round';
        for (let i = 1; i < n; i += 1) {
            const k = i / n;
            ctx.strokeStyle = rgba(c, 0.55 * k);
            ctx.lineWidth = width * k;
            ctx.beginPath();
            ctx.moveTo(t[i * 2 - 2], t[i * 2 - 1]);
            ctx.lineTo(t[i * 2], t[i * 2 + 1]);
            ctx.stroke();
        }
    }
    // 공 — 바닥 그림자 → 왼쪽 위가 밝은 둥근 몸통 → 진한 테두리 → 이름표 글자
    function drawBall(b: Ball): void {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.arc(b.x + 2, b.y + 3, b.r, 0, TAU);
        ctx.fill();
        const g = ctx.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.1, b.x, b.y, b.r);
        g.addColorStop(0, rgba(mixRGB(b.color, CREAM, 0.75), 1));
        g.addColorStop(1, rgba(b.color, 1));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, TAU);
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = rgba(INK, 0.6);
        ctx.stroke();
        if (b.label) {
            ctx.fillStyle = rgba(INK, 1);
            ctx.font = '700 ' + Math.round(b.r * 1.25) + 'px ' + FONT_FAMILY;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(b.label, b.x, b.y + 0.5);
        }
    }
    function drawText(text: string, x: number, y: number, size: number, c: RGB, a: number, align: CanvasTextAlign): void {
        ctx.fillStyle = rgba(c, a);
        ctx.font = '600 ' + size + 'px ' + FONT_FAMILY;
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y);
    }
    // 04 삼각 키커 — 빗변 선분 충돌 + 법선 방향 덧힘 + 빗변 가운데 휨의 감쇠 진동
    // 빗변에 닿으면 법선 방향으로 더하는 빠르기(px/s)
    const SLING_BOOST = 360;
    // 빗변 가운데가 안쪽으로 휠 수 있는 최대 깊이(px)
    const SLING_BEND_MAX = 9;
    // 휨 진동의 저항(1/s) — 클수록 빨리 펴진다
    const SLING_DAMPING = 14;
    // 휨을 되펴는 세기(1/s²)
    const SLING_STIFFNESS = 1600;
    // 다가오던 빠르기 → 휨 빠르기로 넘기는 몫
    const SLING_PRESS = 0.8;
    // 이보다 느리게 닿으면(얹혀 있을 때 등) 덧힘을 주지 않는다(px/s)
    const SLING_MIN = 40;
    const GRAVITY = 640;
    const BALL_COUNT = 3;
    const BALL_R = 8;
    const RESTITUTION = 0.5;
    const SUBSTEPS = 4;
    const MAX_SPEED = 1100;
    const DEMO_SEED = 4764;
    const SETTLE_TICKS = 180;
    // 키커 — 꼭짓점 a(위)·b(바깥 아래)·c(안쪽 아래). 빗변은 a→c, n 은 빗변의 바깥(판 가운데 위쪽) 법선
    type Sling = { a: Pt; b: Pt; c: Pt; nx: number; ny: number; bend: number; bendV: number; flash: number; hits: number };
    function makeSling(a: Pt, b: Pt, c: Pt): Sling {
        const ex = c[0] - a[0];
        const ey = c[1] - a[1];
        const L = Math.hypot(ex, ey);
        let nx = ey / L;
        let ny = -ex / L;
        // 셋째 꼭짓점 b 반대쪽이 바깥
        if ((b[0] - a[0]) * nx + (b[1] - a[1]) * ny > 0) { nx = -nx; ny = -ny; }
        return { a: a, b: b, c: c, nx: nx, ny: ny, bend: 0, bendV: 0, flash: 0, hits: 0 };
    }
    const slings: Sling[] = [makeSling([96, 146], [96, 236], [164, 254]), makeSling([384, 146], [384, 236], [316, 254])];
    const walls: Seg[] = [
        [40, 40, 40, 120], [440, 40, 440, 120],
        // 바깥 안내 — 벽에서 키커 꼭대기로
        [40, 120, 96, 146], [440, 120, 384, 146],
        // 키커의 나머지 두 변은 그냥 벽
        [96, 146, 96, 236], [96, 236, 164, 254], [384, 146, 384, 236], [384, 236, 316, 254]
    ];
    let rng = makeRng(1);
    let balls: Ball[] = [];
    function totalHits(): number { return slings[0].hits + slings[1].hits; }
    function spawn(b: Ball): void {
        const side = rng() < 0.5 ? -1 : 1;
        b.x = 240 + (rng() - 0.5) * 60;
        b.y = 44;
        b.vx = side * (150 + rng() * 90);
        b.vy = 0;
        b.trail = [];
    }
    function onRestart(): void {
        rng = makeRng(seed);
        balls = [];
        for (let i = 0; i < BALL_COUNT; i += 1) {
            const b = makeBall(0, 0, BALL_R, BALL_COLORS[(i * 3) % BALL_COLORS.length], '');
            spawn(b);
            b.y = 44 - i * 4;
            b.vx = (i % 2 ? 1 : -1) * Math.abs(b.vx);
            balls.push(b);
        }
        for (let i = 0; i < slings.length; i += 1) {
            slings[i].bend = 0;
            slings[i].bendV = 0;
            slings[i].flash = 0;
            slings[i].hits = 0;
        }
    }
    // 빗변 — 선분 충돌로 되튀긴 뒤, 법선이 빗변 바깥을 향하고 충분히 빨리 닿았으면 법선 방향 덧힘을 얹고 빗변을 안쪽으로 민다
    function hitSling(b: Ball, sl: Sling): void {
        const vn = hitSegment(b, sl.a[0], sl.a[1], sl.c[0], sl.c[1], 2, RESTITUTION, 0, 0, 0);
        if (vn <= SLING_MIN) { return; }
        if (contact.nx * sl.nx + contact.ny * sl.ny < 0.5) { return; }
        b.vx += sl.nx * SLING_BOOST;
        b.vy += sl.ny * SLING_BOOST;
        sl.bendV -= vn * SLING_PRESS;
        sl.flash = 1;
        sl.hits += 1;
    }
    // 휨 — 펴는 힘(stiff × bend)과 저항(damp × bendV)으로 감쇠 진동, 깊이는 SLING_BEND_MAX 안으로 자른다
    function bendSling(sl: Sling, h: number): void {
        sl.bendV += (-SLING_STIFFNESS * sl.bend - SLING_DAMPING * sl.bendV) * h;
        sl.bend = clamp(sl.bend + sl.bendV * h, -SLING_BEND_MAX, SLING_BEND_MAX);
        sl.flash *= Math.exp(-h * 6);
    }
    function step(): void {
        const hs = DT / SUBSTEPS;
        for (let s = 0; s < SUBSTEPS; s += 1) {
            for (let i = 0; i < balls.length; i += 1) { integrate(balls[i], 0, GRAVITY, hs); }
            for (let i = 0; i < balls.length; i += 1) {
                for (let j = i + 1; j < balls.length; j += 1) { hitBalls(balls[i], balls[j], RESTITUTION); }
            }
            for (let i = 0; i < balls.length; i += 1) {
                const b = balls[i];
                hitSling(b, slings[0]);
                hitSling(b, slings[1]);
                hitWalls(b, walls, RESTITUTION);
                capSpeed(b, MAX_SPEED);
            }
            bendSling(slings[0], hs);
            bendSling(slings[1], hs);
        }
        for (let i = 0; i < balls.length; i += 1) {
            const b = balls[i];
            pushTrail(b, 16);
            // 가운데 틈으로 빠지면 위에서 다시 떨어뜨린다
            if (b.y > H + 20 || b.x < 20 || b.x > W - 20) { spawn(b); }
        }
    }
    function finished(): boolean { return false; }
    function onControl(role: string, down: boolean): void {
        if (role === 'redraw' && down) {
            seed += 1;
            restart();
        }
    }
    function drawSling(sl: Sling): void {
        ctx.fillStyle = rgba(LILAC, 0.3);
        ctx.beginPath();
        ctx.moveTo(sl.a[0], sl.a[1]);
        ctx.lineTo(sl.b[0], sl.b[1]);
        ctx.lineTo(sl.c[0], sl.c[1]);
        ctx.closePath();
        ctx.fill();
        strokeSeg([sl.a[0], sl.a[1], sl.b[0], sl.b[1]], 3, CREAM, 0.45);
        strokeSeg([sl.b[0], sl.b[1], sl.c[0], sl.c[1]], 3, CREAM, 0.45);
        // 고무 빗변 — 가운데 조절점을 법선 방향으로 bend × 2 만큼 옮긴 2차 곡선(곡선 가운데가 bend 만큼 휜다)
        const mx = (sl.a[0] + sl.c[0]) / 2 + sl.nx * sl.bend * 2;
        const my = (sl.a[1] + sl.c[1]) / 2 + sl.ny * sl.bend * 2;
        if (sl.flash > 0.03) {
            ctx.strokeStyle = rgba(LEMON, 0.5 * sl.flash);
            ctx.lineWidth = 6 + 12 * sl.flash;
            ctx.beginPath();
            ctx.moveTo(sl.a[0], sl.a[1]);
            ctx.quadraticCurveTo(mx, my, sl.c[0], sl.c[1]);
            ctx.stroke();
        }
        ctx.strokeStyle = rgba(mixRGB(PEACH, CREAM, sl.flash), 1);
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sl.a[0], sl.a[1]);
        ctx.quadraticCurveTo(mx, my, sl.c[0], sl.c[1]);
        ctx.stroke();
        // 덧힘 화살 — 빗변 가운데에서 법선 방향
        if (sl.flash > 0.05) {
            const cx = (sl.a[0] + sl.c[0]) / 2;
            const cy = (sl.a[1] + sl.c[1]) / 2;
            const L = 14 + 26 * sl.flash;
            ctx.strokeStyle = rgba(LEMON, sl.flash);
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(cx + sl.nx * 8, cy + sl.ny * 8);
            ctx.lineTo(cx + sl.nx * L, cy + sl.ny * L);
            ctx.stroke();
        }
    }
    function draw(): void {
        clearStage();
        for (let i = 0; i < walls.length; i += 1) { if (i < 4) { strokeSeg(walls[i], 4, CREAM, 0.5); } }
        drawSling(slings[0]);
        drawSling(slings[1]);
        for (let i = 0; i < balls.length; i += 1) { drawTrail(balls[i], balls[i].color, balls[i].r * 1.3); }
        for (let i = 0; i < balls.length; i += 1) { drawBall(balls[i]); }
        drawBand();
    }
    function stateText(): string {
        return '키커 ' + totalHits() + '번 튕김';
    }
    // ── 공통 꼬리: 시계·버튼·동작 줄이기·정리 ──
    // 결과를 보여 준 시간(ms) — 시연 중 판이 끝나면 LOOP_HOLD_MS 뒤 같은 시드로 다시 돈다
    let holdMs = 0;
    function restart(): void {
        clock = 0;
        holdMs = 0;
        onRestart();
    }
    // 한 틱 — 시뮬레이션 시각을 16ms 올리고 항목 계산(step)을 한 번 돌린다
    function tick(): void {
        clock += FIXED_DT;
        step();
        if (demo && !still && finished()) {
            holdMs += FIXED_DT;
            if (holdMs >= LOOP_HOLD_MS) { restart(); }
        }
    }
    function render(): void {
        draw();
        say(stateText());
    }
    // 동작 줄이기 — 같은 시드 판을 화면에 그리지 않고 끝까지(끝이 없는 장면은 SETTLE_TICKS 틱까지) 계산한 뒤 마지막 장면만 그린다
    function settle(): void {
        for (let k = 0; k < SETTLE_TICKS; k += 1) {
            clock += FIXED_DT;
            step();
            if (finished()) { break; }
        }
    }
    // 입력 한 번 뒤 — 동작 줄이기면 그 입력이 낳은 결과까지 바로 계산해 그린다
    function after(): void {
        if (still) { settle(); }
        render();
    }
    function control(role: string, down: boolean): void {
        wake();
        onControl(role, down);
        after();
    }
    // 리스너는 한 묶음으로 달고 정리할 때 한 번에 뗀다
    const off = new AbortController();
    // 버튼 — data-role 을 항목의 onControl 에 넘긴다. data-hold 가 있으면 누르고 있는 동안 true, 떼면 false
    const buttons: HTMLButtonElement[] = Array.from(root.querySelectorAll<HTMLButtonElement>('button[data-role]'));
    buttons.forEach(function (btn: HTMLButtonElement): void {
        const role = btn.getAttribute('data-role') || '';
        if (!btn.hasAttribute('data-hold')) {
            // 한 번 누르는 버튼 — 마우스·손가락·Enter·Space 모두 click 하나로 들어온다
            btn.addEventListener('click', function (): void { control(role, true); }, { signal: off.signal });
            return;
        }
        let down = false;
        function setHeld(v: boolean): void {
            if (down === v) { return; }
            down = v;
            btn.classList.toggle('is-held', v);
            control(role, v);
        }
        // 누르고 있는 버튼 — 손가락·마우스는 pointerdown·up, 키보드는 Space·Enter 의 keydown·keyup
        btn.addEventListener('pointerdown', function (ev: PointerEvent): void {
            if (ev.button !== 0) { return; }
            btn.setPointerCapture(ev.pointerId);
            setHeld(true);
        }, { signal: off.signal });
        btn.addEventListener('pointerup', function (): void { setHeld(false); }, { signal: off.signal });
        btn.addEventListener('pointercancel', function (): void { setHeld(false); }, { signal: off.signal });
        btn.addEventListener('lostpointercapture', function (): void { setHeld(false); }, { signal: off.signal });
        btn.addEventListener('keydown', function (ev: KeyboardEvent): void {
            if (ev.key !== ' ' && ev.key !== 'Enter') { return; }
            ev.preventDefault();
            setHeld(true);
        }, { signal: off.signal });
        btn.addEventListener('keyup', function (ev: KeyboardEvent): void {
            if (ev.key !== ' ' && ev.key !== 'Enter') { return; }
            ev.preventDefault();
            setHeld(false);
        }, { signal: off.signal });
        btn.addEventListener('blur', function (): void { setHeld(false); }, { signal: off.signal });
        // 길게 누를 때 뜨는 메뉴를 막는다
        btn.addEventListener('contextmenu', function (ev: Event): void { ev.preventDefault(); }, { signal: off.signal });
    });
    function onResize(): void {
        fitCanvas();
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
            tick();
            acc -= FIXED_DT;
            n += 1;
        }
        render();
        rafId = window.requestAnimationFrame(frame);
    }
    function startLoop(): void {
        if (rafId) { return; }
        lastTs = -1;
        acc = 0;
        rafId = window.requestAnimationFrame(frame);
    }
    // 동작 줄이기 설정이 페이지를 연 채 바뀌면 — 켜지면 루프를 멈추고 같은 시드 판의 마지막 장면을, 꺼지면 루프를 다시 돈다
    function onMotionPref(): void {
        still = reduceQuery.matches;
        if (still) {
            if (rafId) { window.cancelAnimationFrame(rafId); rafId = 0; }
            if (demo) { restart(); }
            after();
        } else {
            startLoop();
        }
    }
    reduceQuery.addEventListener('change', onMotionPref, { signal: off.signal });
    seed = DEMO_SEED;
    restart();
    // probe-hook
    if (still) {
        settle();
        render();
    } else {
        render();
        startLoop();
    }
    return function (): void {
        window.cancelAnimationFrame(rafId);
        off.abort();
    };
  }, []);

  return (
    <div className={cx("pb") + " is-demo"} ref={rootRef}>
        <canvas className={cx("pb__canvas")} data-role="canvas" width={480} height={300} aria-hidden="true"></canvas>
        <div className={cx("pb__head")}>
          <p className={cx("pb__status")} data-role="status" aria-live="off">키커 0번 튕김</p>
          <div className={cx("pb__controls")}>
            <button type="button" className={cx("pb__btn")} data-role="redraw">다시 굴리기</button>
          </div>
        </div>
    </div>
  );
}
