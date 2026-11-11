// DropPileCornerSpin - vanilla 판(01-tx-phys-drop-pile-corner-spin) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./DropPileCornerSpin.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function DropPileCornerSpin() {
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
    const DEG = Math.PI / 180;
    // 바닥 높이 — 왼쪽 아래 상태 줄 위에서 글자가 멈추도록 바닥을 띄워 둔다
    const FLOOR = 250;
    // 다시 떨어뜨린 뒤 첫 200ms 는 그대로 둔다 — 첫 변화가 200ms 뒤에 오게
    const LEAD_MS = 200;
    // 파스텔 팔레트 — 어두운 무대 위에 밝은 글자를 얹어 명도 차로 글자 경계가 읽힌다
    const BG: RGB = [27, 24, 38];
    const BG_LOW: RGB = [38, 33, 54];
    const FLOOR_COL: RGB = [56, 50, 78];
    const INK: RGB = [33, 29, 46];
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
    function shadeRGB(c: RGB, k: number): RGB { return [c[0] * k, c[1] * k, c[2] * k]; }
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
    const canvasEl = root.querySelector('[data-role="canvas"]') as HTMLCanvasElement | null;
    const statusEl = root.querySelector('[data-role="status"]') as HTMLElement | null;
    const wordEl = root.querySelector('[data-role="word"]') as HTMLElement | null;
    const ctxRaw = canvasEl ? canvasEl.getContext('2d') : null;
    if (!canvasEl || !ctxRaw || !statusEl || !wordEl) { return; }
    const cv: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctxRaw;
    const status: HTMLElement = statusEl;
    // 원문 한 줄 — 화면 낭독기는 이 문장만 한 번 읽는다. 캔버스에 그린 낱글자는 접근성 트리에 들어가지 않는다
    const WORD = (wordEl.textContent || '').trim();
    const restartBtn = root.querySelector('[data-role="restart"]') as HTMLButtonElement | null;
    const pauseBtn = root.querySelector('[data-role="pause"]') as HTMLButtonElement | null;
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    // 페이지를 연 채 동작 줄이기 설정을 바꿔도 아래 change 리스너가 이 값을 다시 읽는다
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
    // 화면 좌표(CSS px) → 장면 좌표(480x300). 리사이즈 뒤에도 그때그때 현재 크기로 다시 잰다
    function toScene(ev: PointerEvent): Pt {
        const r = cv.getBoundingClientRect();
        return [((ev.clientX - r.left) / r.width) * W, ((ev.clientY - r.top) / r.height) * H];
    }
    // 글자 상자 — measureText 로 잰 폭과 글자 크기로 상자를 잡고, 원래 읽는 순서대로 자리(hx, hy)를 매긴다
    type Glyph = { ch: string; w: number; h: number; hx: number; hy: number; size: number; col: RGB; i: number };
    const FONT_FAMILY = '"Segoe UI", "Malgun Gothic", "Hiragino Sans", "Noto Sans KR", sans-serif';
    // 글자 사이 간격 — 글자 크기에 대한 비율
    const GLYPH_GAP = 0.1;
    function fontAt(px: number): string { return '800 ' + px.toFixed(1) + 'px ' + FONT_FAMILY; }
    function layoutWord(text: string, sizeMax: number, maxW: number, cx: number, cy: number): Glyph[] {
        const chars = Array.from(text);
        ctx.font = fontAt(sizeMax);
        const ws: number[] = [];
        let total = 0;
        for (let i = 0; i < chars.length; i += 1) {
            const m = chars[i].trim() === '' ? sizeMax * 0.3 : ctx.measureText(chars[i]).width;
            ws.push(m);
            total += m;
        }
        total += GLYPH_GAP * sizeMax * Math.max(0, chars.length - 1);
        // 줄이 maxW 보다 길면 글자 크기를 같은 비율로 줄인다 — 언어마다 글자 수가 달라도 무대 안에 든다
        const k = total > maxW ? maxW / total : 1;
        const size = sizeMax * k;
        const out: Glyph[] = [];
        let x = cx - (total * k) / 2;
        let n = 0;
        for (let i = 0; i < chars.length; i += 1) {
            const w = ws[i] * k;
            if (chars[i].trim() !== '') {
                out.push({ ch: chars[i], w: Math.max(w, size * 0.34), h: size * 0.9, hx: x + w / 2, hy: cy, size: size, col: PAL[n % PAL.length], i: n });
                n += 1;
            }
            x += w + GLYPH_GAP * size;
        }
        return out;
    }
    // 글자 하나 그리기 — 같은 글자를 어둡게 한 번 아래로 비켜 찍어 두께를 만든 뒤 제 색으로 덮는다
    function drawGlyph(g: Glyph, x: number, y: number, a: number, sx: number, sy: number, fill: RGB): void {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a);
        ctx.scale(sx, sy);
        ctx.font = fontAt(g.size);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = rgba(shadeRGB(fill, 0.5), 1);
        ctx.fillText(g.ch, 1.4, g.size * 0.04 + 2.8);
        ctx.fillStyle = rgba(fill, 1);
        ctx.fillText(g.ch, 0, g.size * 0.04);
        ctx.restore();
    }
    // 모서리가 둥근 사각형 경로 — 가운데 (0,0) 기준 폭 w·높이 h
    function roundRectPath(x: number, y: number, w: number, h: number, r: number): void {
        const rr = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + rr, y);
        ctx.lineTo(x + w - rr, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
        ctx.lineTo(x + w, y + h - rr);
        ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
        ctx.lineTo(x + rr, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
        ctx.lineTo(x, y + rr);
        ctx.quadraticCurveTo(x, y, x + rr, y);
        ctx.closePath();
    }
    // 바닥 그림자 — 글자 아래끝이 바닥에서 멀수록 옅고 넓게. 높이 값 하나로 크기와 진하기를 함께 정한다
    function floorShadow(x: number, bottom: number, w: number): void {
        const lift = clamp((FLOOR - bottom) / 160, 0, 1);
        ctx.fillStyle = rgba([0, 0, 0], 0.34 * (1 - lift) + 0.05);
        ctx.beginPath();
        ctx.ellipse(x, FLOOR + 3, w * (0.5 + 0.4 * lift), 3.5 + 2.5 * lift, 0, 0, TAU);
        ctx.fill();
    }
    function clearStage(): void {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, rgba(BG, 1));
        g.addColorStop(1, rgba(BG_LOW, 1));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
    }
    function drawFloor(): void {
        ctx.fillStyle = rgba(FLOOR_COL, 1);
        ctx.fillRect(0, FLOOR, W, H - FLOOR);
        ctx.fillStyle = rgba(PAPER, 0.22);
        ctx.fillRect(0, FLOOR, W, 1.5);
    }
    const TXT_PAUSE = '일시정지 — Space 로 이어서';
    // 시계 — clock 은 시연 시계, age 는 다시 떨어뜨린 뒤 흐른 시간(ms). 둘 다 16ms 고정 스텝으로만 늘어난다
    let paused = false;
    let clock = 0;
    let age = 0;
    function setPaused(v: boolean): void {
        paused = v;
        if (pauseBtn) { pauseBtn.setAttribute('aria-pressed', v ? 'true' : 'false'); }
    }
    function restart(): void {
        age = 0;
        onRestart();
    }
    function tick(): void {
        age += FIXED_DT;
        step();
    }
    function report(): void { say(paused ? TXT_PAUSE : stateText()); }
    function render(): void {
        draw();
        report();
    }
    // 시연 — DEMO_LOOP_MS 마다 처음부터 다시 떨어뜨린다
    let demoCycle = -1;
    function demoTick(t: number): void {
        const cyc = Math.floor(t / DEMO_LOOP_MS);
        if (cyc !== demoCycle) {
            demoCycle = cyc;
            restart();
        }
        demoDrive(t - cyc * DEMO_LOOP_MS);
    }
    // 동작 줄이기 — 움직임을 그리지 않고 SETTLE_TICKS 스텝을 한 번에 계산해 내려앉은 결과만 그린다
    const SETTLE_TICKS = 360;
    function settle(): void {
        for (let k = 0; k < SETTLE_TICKS; k += 1) { tick(); }
    }
    // 입력 한 번 뒤 — 동작 줄이기면 그 입력이 낳은 결과까지 바로 계산해 그린다
    function after(): void {
        if (still) { settle(); }
        render();
    }
    cv.addEventListener('pointerdown', function (ev: PointerEvent): void {
        wake();
        if (cv.setPointerCapture) { cv.setPointerCapture(ev.pointerId); }
        const p = toScene(ev);
        onPointer('down', p[0], p[1]);
        after();
    });
    cv.addEventListener('pointermove', function (ev: PointerEvent): void {
        const p = toScene(ev);
        if (onPointer('move', p[0], p[1])) {
            wake();
            after();
        }
    });
    cv.addEventListener('pointerup', function (ev: PointerEvent): void {
        const p = toScene(ev);
        onPointer('up', p[0], p[1]);
    });
    cv.addEventListener('pointercancel', function (): void { onPointer('up', -1, -1); });
    cv.addEventListener('pointerleave', function (): void {
        if (onPointer('leave', -1, -1)) { after(); }
    });
    cv.addEventListener('keydown', function (ev: KeyboardEvent): void {
        const k = ev.key;
        if (k === 'Enter') { restart(); }
        else if (k === ' ') { setPaused(!paused); }
        else if (!onKey(k)) { return; }
        ev.preventDefault();
        wake();
        after();
    });
    if (restartBtn) { restartBtn.addEventListener('click', function (): void { wake(); restart(); after(); }); }
    if (pauseBtn) { pauseBtn.addEventListener('click', function (): void { wake(); setPaused(!paused); after(); }); }
    // 단단한 상자 — 글자 하나를 measureText 폭 x 글자 높이 상자로 보고 위치·속도·각도·각속도를 들고 다닌다 (01·09 가 쓴다)
    type Body = { g: Glyph; x: number; y: number; vx: number; vy: number; a: number; w: number; hw: number; hh: number; im: number; ii: number; free: boolean };
    // 한 틱을 두 번으로 나눠 옮긴다 — 빠르게 떨어진 글자가 다른 글자를 뚫고 지나가지 않게
    const SUBSTEPS = 2;
    // 접점 충격량을 되풀이해 맞추는 횟수
    const SOLVER_ITERATIONS = 6;
    // 이보다 느리게 닿으면 되튀지 않는다 — 쌓인 글자가 제자리에서 떨지 않게(px/틱)
    const BOUNCE_MIN = 1.2;
    // 이만큼(px)까지 파고든 것은 그냥 둔다 — 밀어내기가 접점을 매번 끊었다 붙였다 하지 않게
    const SLOP = 0.4;
    const WALL_L = 8;
    const WALL_R = W - 8;
    function makeBody(g: Glyph, x: number, y: number, a: number): Body {
        // 질량은 상자 넓이에 비례, 회전 관성은 상자 공식 m(w²+h²)/12
        const m = (g.w * g.h) / 900;
        const inertia = (m * (g.w * g.w + g.h * g.h)) / 12;
        return { g: g, x: x, y: y, vx: 0, vy: 0, a: a, w: 0, hw: g.w / 2, hh: g.h / 2, im: 1 / m, ii: 1 / inertia, free: true };
    }
    function corners(b: Body): Pt[] {
        const c = Math.cos(b.a);
        const s = Math.sin(b.a);
        const out: Pt[] = [];
        const sx = [-1, 1, 1, -1];
        const sy = [-1, -1, 1, 1];
        for (let k = 0; k < 4; k += 1) {
            const lx = sx[k] * b.hw;
            const ly = sy[k] * b.hh;
            out.push([b.x + lx * c - ly * s, b.y + lx * s + ly * c]);
        }
        return out;
    }
    type Contact = { a: Body; b: Body | null; px: number; py: number; nx: number; ny: number; pen: number; target: number; jn: number; jt: number };
    function addContact(out: Contact[], a: Body, b: Body | null, px: number, py: number, nx: number, ny: number, pen: number): void {
        out.push({ a: a, b: b, px: px, py: py, nx: nx, ny: ny, pen: pen, target: 0, jn: 0, jt: 0 });
    }
    // 꼭짓점 하나가 다른 상자 안에 들어갔는가 — 들어갔으면 덜 파고든 축을 법선으로 삼는다(그쪽으로 빼는 게 가장 짧다)
    function cornerInBox(out: Contact[], a: Body, p: Pt, b: Body): void {
        const dx = p[0] - b.x;
        const dy = p[1] - b.y;
        const c = Math.cos(b.a);
        const s = Math.sin(b.a);
        const lx = dx * c + dy * s;
        const ly = -dx * s + dy * c;
        const ox = b.hw - Math.abs(lx);
        const oy = b.hh - Math.abs(ly);
        if (ox <= 0 || oy <= 0) { return; }
        let nlx = 0;
        let nly = 0;
        let pen = 0;
        if (ox < oy) { nlx = lx < 0 ? -1 : 1; pen = ox; } else { nly = ly < 0 ? -1 : 1; pen = oy; }
        addContact(out, a, b, p[0], p[1], nlx * c - nly * s, nlx * s + nly * c, pen);
    }
    function findContacts(bodies: Body[]): Contact[] {
        const out: Contact[] = [];
        for (let i = 0; i < bodies.length; i += 1) {
            const a = bodies[i];
            if (!a.free) { continue; }
            const cs = corners(a);
            for (let k = 0; k < 4; k += 1) {
                const p = cs[k];
                if (p[1] > FLOOR) { addContact(out, a, null, p[0], p[1], 0, -1, p[1] - FLOOR); }
                if (p[0] < WALL_L) { addContact(out, a, null, p[0], p[1], 1, 0, WALL_L - p[0]); }
                if (p[0] > WALL_R) { addContact(out, a, null, p[0], p[1], -1, 0, p[0] - WALL_R); }
            }
            for (let j = i + 1; j < bodies.length; j += 1) {
                const b = bodies[j];
                if (!b.free) { continue; }
                const reach = Math.hypot(a.hw, a.hh) + Math.hypot(b.hw, b.hh);
                if (Math.abs(a.x - b.x) > reach || Math.abs(a.y - b.y) > reach) { continue; }
                for (let k = 0; k < 4; k += 1) { cornerInBox(out, a, cs[k], b); }
                const cb = corners(b);
                for (let k = 0; k < 4; k += 1) { cornerInBox(out, b, cb[k], a); }
            }
        }
        return out;
    }
    // 접점 속도 — 무게중심 속도 + 각속도 x 무게중심에서 접점까지의 거리
    function pointVel(b: Body, px: number, py: number): Pt {
        return [b.vx - b.w * (py - b.y), b.vy + b.w * (px - b.x)];
    }
    function relVel(c: Contact): Pt {
        const va = pointVel(c.a, c.px, c.py);
        if (!c.b) { return va; }
        const vb = pointVel(c.b, c.px, c.py);
        return [va[0] - vb[0], va[1] - vb[1]];
    }
    // 접점이 무게중심에서 벗어난 거리(r x n)가 클수록 같은 충격량이 회전으로 더 많이 간다
    function effMass(c: Contact, dx: number, dy: number): number {
        const ra = (c.px - c.a.x) * dy - (c.py - c.a.y) * dx;
        let k = c.a.im + ra * ra * c.a.ii;
        if (c.b) {
            const rb = (c.px - c.b.x) * dy - (c.py - c.b.y) * dx;
            k += c.b.im + rb * rb * c.b.ii;
        }
        return k;
    }
    function applyImpulse(b: Body, px: number, py: number, jx: number, jy: number): void {
        b.vx += jx * b.im;
        b.vy += jy * b.im;
        b.w += ((px - b.x) * jy - (py - b.y) * jx) * b.ii;
    }
    function pushPair(c: Contact, jx: number, jy: number): void {
        applyImpulse(c.a, c.px, c.py, jx, jy);
        if (c.b) { applyImpulse(c.b, c.px, c.py, -jx, -jy); }
    }
    function solveContact(c: Contact, fric: number): void {
        const rel = relVel(c);
        const vn = rel[0] * c.nx + rel[1] * c.ny;
        const jn0 = c.jn;
        c.jn = Math.max(jn0 + (c.target - vn) / effMass(c, c.nx, c.ny), 0);
        const dj = c.jn - jn0;
        pushPair(c, c.nx * dj, c.ny * dj);
        // 마찰 — 미끄러지는 방향 충격량은 누르는 충격량 x fric 을 넘지 못한다
        const tx = -c.ny;
        const ty = c.nx;
        const rel2 = relVel(c);
        const vt = rel2[0] * tx + rel2[1] * ty;
        const lim = fric * c.jn;
        const jt0 = c.jt;
        c.jt = clamp(jt0 - vt / effMass(c, tx, ty), -lim, lim);
        const djt = c.jt - jt0;
        pushPair(c, tx * djt, ty * djt);
    }
    function rigidStep(bodies: Body[], grav: number, rest: number, fric: number): void {
        for (let s = 0; s < SUBSTEPS; s += 1) {
            for (let i = 0; i < bodies.length; i += 1) {
                const b = bodies[i];
                if (!b.free) { continue; }
                b.vy += grav / SUBSTEPS;
                b.x += b.vx / SUBSTEPS;
                b.y += b.vy / SUBSTEPS;
                b.a += b.w / SUBSTEPS;
            }
            const cs = findContacts(bodies);
            for (let k = 0; k < cs.length; k += 1) {
                const c = cs[k];
                const rel = relVel(c);
                const vn = rel[0] * c.nx + rel[1] * c.ny;
                // 되튐 목표 — 닿기 직전 법선 속도의 rest 배만큼 반대로. 느린 접촉은 0
                c.target = vn < -BOUNCE_MIN ? -rest * vn : 0;
            }
            for (let it = 0; it < SOLVER_ITERATIONS; it += 1) {
                for (let k = 0; k < cs.length; k += 1) { solveContact(cs[k], fric); }
            }
            // 파고든 깊이는 질량 역수 비율로 나눠 밖으로 뺀다
            for (let k = 0; k < cs.length; k += 1) {
                const c = cs[k];
                const sum = c.a.im + (c.b ? c.b.im : 0);
                const corr = (Math.max(c.pen - SLOP, 0) * 0.45) / sum;
                c.a.x += c.nx * corr * c.a.im;
                c.a.y += c.ny * corr * c.a.im;
                if (c.b) {
                    c.b.x -= c.nx * corr * c.b.im;
                    c.b.y -= c.ny * corr * c.b.im;
                }
            }
        }
        for (let i = 0; i < bodies.length; i += 1) {
            const b = bodies[i];
            if (!b.free) { continue; }
            b.vx *= 0.998;
            b.w *= 0.985;
        }
    }
    function drawBody(b: Body): void { drawGlyph(b.g, b.x, b.y, b.a, 1, 1, b.g.col); }
    function bodyBottom(b: Body): number {
        return b.y + Math.abs(Math.sin(b.a)) * b.hw + Math.abs(Math.cos(b.a)) * b.hh;
    }
    // 중력 — 틱(16ms)마다 속도에 더하는 값(px/틱²)
    const GRAVITY = 0.45;
    // 되튐 — 닿기 직전 법선 방향 속도의 이 비율만큼 반대로 튀어 오른다
    const RESTITUTION = 0.32;
    // 마찰 — 미끄러지는 방향 충격량은 누르는 충격량 x 이 값을 넘지 못한다
    const FRICTION = 0.55;
    // 누른 자리에서 이 거리(px) 안의 글자를 튕긴다
    const POKE_R = 90;
    const DEMO_LOOP_MS = 3400;
    const TXT_RUN = '글자가 떨어져 쌓이는 중';
    const TXT_REST = '다 쌓였어요 — Enter 로 다시';
    const GLYPHS: Glyph[] = layoutWord(WORD, 74, 400, 240, 120);
    let bodies: Body[] = [];
    function onRestart(): void {
        const rng = makeRng(4721);
        bodies = GLYPHS.map(function (g: Glyph, i: number): Body {
            // 가운데로 모아 떨어뜨린다 — 겹쳐 떨어져야 모서리로 닿고 서로 위에 쌓인다
            const x = 240 + (g.hx - 240) * 0.28 + (rng() - 0.5) * 18;
            const y = -g.h - i * 62 - rng() * 24;
            const b = makeBody(g, x, y, (rng() - 0.5) * 0.8);
            b.vx = (rng() - 0.5) * 1.4;
            return b;
        });
    }
    function step(): void {
        if (age < LEAD_MS) { return; }
        rigidStep(bodies, GRAVITY, RESTITUTION, FRICTION);
    }
    function resting(): boolean {
        for (let i = 0; i < bodies.length; i += 1) {
            const b = bodies[i];
            if (b.y < 0 || Math.hypot(b.vx, b.vy) > 0.08 || Math.abs(b.w) > 0.004) { return false; }
        }
        return true;
    }
    function stateText(): string { return resting() ? TXT_REST : TXT_RUN; }
    function draw(): void {
        clearStage();
        drawFloor();
        for (let i = 0; i < bodies.length; i += 1) { floorShadow(bodies[i].x, bodyBottom(bodies[i]), bodies[i].hw); }
        for (let i = 0; i < bodies.length; i += 1) { drawBody(bodies[i]); }
    }
    function demoDrive(t: number): void { /* 시연은 떨어뜨리기만 한다 — 다시 떨어뜨리는 때는 demoTick 이 정한다 */ }
    // 누른 자리에서 가까운 글자일수록 세게, 바깥·위로 튕기고 누른 쪽 반대로 돌린다
    function poke(x: number, y: number): void {
        for (let i = 0; i < bodies.length; i += 1) {
            const b = bodies[i];
            const dx = b.x - x;
            const dy = b.y - y;
            const d = Math.max(Math.hypot(dx, dy), 1);
            if (d > POKE_R) { continue; }
            const k = 1 - d / POKE_R;
            b.vx += (dx / d) * 6 * k;
            b.vy -= 9 * k;
            b.w += (dx < 0 ? -1 : 1) * 0.14 * k;
        }
    }
    function onPointer(type: string, x: number, y: number): boolean {
        if (type === 'down') { poke(x, y); }
        return false;
    }
    function onKey(k: string): boolean {
        if (k === 'ArrowLeft' || k === 'ArrowRight') {
            const s = k === 'ArrowLeft' ? -1 : 1;
            for (let i = 0; i < bodies.length; i += 1) { bodies[i].vx += 4 * s; bodies[i].vy -= 3; }
            return true;
        }
        if (k === 'ArrowUp') {
            for (let i = 0; i < bodies.length; i += 1) { bodies[i].vy -= 8; bodies[i].w += (i % 2 ? 0.1 : -0.1); }
            return true;
        }
        return false;
    }
    function onResize(): void {
        fitCanvas();
        render();
    }
    fitCanvas();
    window.addEventListener('resize', onResize);
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
            if (!paused) {
                clock += FIXED_DT;
                if (demo) { demoTick(clock); }
                tick();
            }
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
    // 동작 줄이기 설정이 페이지를 연 채 바뀌면 — 켜지면 루프를 멈추고 내려앉은 결과로, 꺼지면 루프를 다시 돈다
    function onMotionPref(): void {
        still = reduceQuery.matches;
        if (still) {
            if (rafId) { window.cancelAnimationFrame(rafId); rafId = 0; }
            after();
        } else {
            startLoop();
        }
    }
    if (typeof reduceQuery.addEventListener === 'function') { reduceQuery.addEventListener('change', onMotionPref); }
    restart();
    if (still) {
        after();
    } else {
        render();
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
        <p className={cx("pc__sr")} data-role="word">차곡차곡 쌓기</p>
        <canvas className={cx("pc__canvas")} data-role="canvas" width={480} height={300} tabIndex={0} aria-label="글자 상자가 떨어져 모서리로 닿으면 돌면서 바닥에 쌓이는 장면. 누르면 그 자리 글자를 튕기고, 옆 방향키로 흔들고, 위 방향키로 띄우고, Enter 로 다시 떨어뜨리고, Space 로 일시정지한다"></canvas>
        <p className={cx("pc__status")} data-role="status" aria-live="off">글자가 떨어져 쌓이는 중</p>
        <div className={cx("pc__tools")}>
          <button className={cx("pc__btn")} data-role="restart" type="button">다시 떨어뜨리기</button>
          <button className={cx("pc__btn")} data-role="pause" type="button" aria-pressed="false">일시정지</button>
        </div>
    </div>
  );
}
