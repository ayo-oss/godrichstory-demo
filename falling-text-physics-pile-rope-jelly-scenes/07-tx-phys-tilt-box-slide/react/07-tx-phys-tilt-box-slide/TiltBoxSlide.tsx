// TiltBoxSlide - vanilla 판(07-tx-phys-tilt-box-slide) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./TiltBoxSlide.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function TiltBoxSlide() {
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
    // 기울기 상한(도) — 상자는 -값 ~ +값 사이를 천천히 오간다
    const TILT_ANGLE_MAX = 28;
    // 겹친 깊이 가운데 한 번에 밀어내는 비율 — 두 글자가 절반씩 나눠 움직인다
    const COLLISION_PUSH = 0.5;
    // 벽·바닥·다른 글자에 닿은 동안 미끄러지는 속도에서 틱마다 덜어 내는 비율
    const SLIDE_FRICTION = 0.04;
    // 상자가 한 번 오갔다 돌아오는 시간(ms)
    const TILT_PERIOD_MS = 3200;
    const TILE_GRAVITY = 0.42;
    const PUSH_ITERATIONS = 4;
    const BOX_CX = 268;
    const BOX_CY = 146;
    const BOX_W = 270;
    const BOX_H = 128;
    const KEY_TILT = 4;
    const DEMO_LOOP_MS = 3400;
    const TXT_AUTO = '상자가 기울어지는 중';
    const TXT_HAND = '직접 기울이는 중 — Esc 로 자동';
    const TXT_STILL = '기울인 채 멈춤 — 옆 방향키로 기울이기';
    const TILT_LABEL = '기울기';
    const GLYPHS: Glyph[] = layoutWord(WORD, 34, BOX_W - 30, 0, 0);
    // 글자 칸 — 상자 가운데를 원점으로 한 상자 안 좌표
    type Tile = { g: Glyph; x: number; y: number; vx: number; vy: number; tw: number; th: number; floor: boolean; wall: boolean };
    let tiles: Tile[] = [];
    let tilt = 0;
    let manualTilt: number | null = null;
    // 처음 자리 — 글자 칸을 상자 바닥 가운데에 두 줄로 쌓아 둔다(앞 절반이 아랫줄, 나머지가 윗줄). 옆으로 미끄러질 틈이 남는다
    function onRestart(): void {
        const half = Math.ceil(GLYPHS.length / 2);
        tiles = [];
        for (let row = 0; row < 2; row += 1) {
            const part = row === 0 ? GLYPHS.slice(0, half) : GLYPHS.slice(half);
            let total = 0;
            for (let i = 0; i < part.length; i += 1) { total += part[i].w + 12; }
            let x = -total / 2;
            for (let i = 0; i < part.length; i += 1) {
                const g = part[i];
                const tw = g.w + 10;
                const th = g.h + 8;
                tiles.push({ g: g, x: x + tw / 2 + 1, y: BOX_H / 2 - th / 2 - row * (th + 1), vx: 0, vy: 0, tw: tw, th: th, floor: false, wall: false });
                x += g.w + 12;
            }
        }
        tilt = 0;
    }
    // 지금 기울기(도) — 직접 정했으면 그 값, 동작 줄이기면 상한의 0.6 배에 멈춘 값, 아니면 시간에 따른 사인 곡선
    function tiltNow(): number {
        if (manualTilt !== null) { return manualTilt; }
        if (still) { return TILT_ANGLE_MAX * 0.6; }
        if (age < LEAD_MS) { return 0; }
        return TILT_ANGLE_MAX * Math.sin((TAU * (age - LEAD_MS)) / TILT_PERIOD_MS);
    }
    function step(): void {
        tilt = tiltNow();
        const th = tilt * DEG;
        // 상자 안에서 본 중력 — 세계의 아래 방향을 상자 각도만큼 거꾸로 돌린다
        const gx = TILE_GRAVITY * Math.sin(th);
        const gy = TILE_GRAVITY * Math.cos(th);
        for (let i = 0; i < tiles.length; i += 1) {
            const t = tiles[i];
            t.floor = false;
            t.wall = false;
            t.vx += gx;
            t.vy += gy;
            t.x += t.vx;
            t.y += t.vy;
        }
        for (let it = 0; it < PUSH_ITERATIONS; it += 1) {
            for (let i = 0; i < tiles.length; i += 1) {
                for (let j = i + 1; j < tiles.length; j += 1) { pushApart(tiles[i], tiles[j]); }
            }
            for (let i = 0; i < tiles.length; i += 1) { keepInBox(tiles[i]); }
        }
        // 마찰 — 밀어내기를 몇 번 되풀이했든 틱마다 한 번만. 바닥·아래 칸에 얹혔으면 옆 속도를, 벽·옆 칸에 붙었으면 세로 속도를 덜어 낸다
        for (let i = 0; i < tiles.length; i += 1) {
            const t = tiles[i];
            if (t.floor) { t.vx *= 1 - SLIDE_FRICTION; }
            if (t.wall) { t.vy *= 1 - SLIDE_FRICTION; }
        }
    }
    // 두 칸이 겹치면 덜 겹친 축으로 깊이 x COLLISION_PUSH 를 반씩 나눠 민다. 그 축 속도는 둘의 평균으로 맞추고, 닿은 쪽 표시(floor·wall)를 남긴다
    function pushApart(a: Tile, b: Tile): void {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const ox = (a.tw + b.tw) / 2 - Math.abs(dx);
        const oy = (a.th + b.th) / 2 - Math.abs(dy);
        if (ox <= 0 || oy <= 0) { return; }
        if (ox < oy) {
            const p = (ox * COLLISION_PUSH) / 2 * (dx < 0 ? -1 : 1);
            a.x -= p;
            b.x += p;
            if ((b.vx - a.vx) * dx < 0) { const m = (a.vx + b.vx) / 2; a.vx = m; b.vx = m; }
            a.wall = true;
            b.wall = true;
        } else {
            const p = (oy * COLLISION_PUSH) / 2 * (dy < 0 ? -1 : 1);
            a.y -= p;
            b.y += p;
            if ((b.vy - a.vy) * dy < 0) { const m = (a.vy + b.vy) / 2; a.vy = m; b.vy = m; }
            a.floor = true;
            b.floor = true;
        }
    }
    // 벽 — 밖으로 나간 만큼 되돌리고 벽 쪽 속도를 0 으로. 바닥·천장이면 floor, 옆벽이면 wall 표시를 남긴다
    function keepInBox(t: Tile): void {
        const hx = BOX_W / 2 - t.tw / 2;
        const hy = BOX_H / 2 - t.th / 2;
        if (t.x < -hx) { t.x = -hx; if (t.vx < 0) { t.vx = 0; } t.wall = true; }
        if (t.x > hx) { t.x = hx; if (t.vx > 0) { t.vx = 0; } t.wall = true; }
        if (t.y < -hy) { t.y = -hy; if (t.vy < 0) { t.vy = 0; } t.floor = true; }
        if (t.y > hy) { t.y = hy; if (t.vy > 0) { t.vy = 0; } t.floor = true; }
    }
    function stateText(): string {
        if (manualTilt !== null) { return TXT_HAND; }
        return still ? TXT_STILL : TXT_AUTO;
    }
    function draw(): void {
        clearStage();
        // 받침 — 상자가 이 꼭짓점을 축으로 돈다
        ctx.fillStyle = rgba(FLOOR_COL, 1);
        ctx.beginPath();
        ctx.moveTo(BOX_CX, BOX_CY + 30);
        ctx.lineTo(BOX_CX - 34, H - 18);
        ctx.lineTo(BOX_CX + 34, H - 18);
        ctx.closePath();
        ctx.fill();
        ctx.save();
        ctx.translate(BOX_CX, BOX_CY);
        ctx.rotate(tilt * DEG);
        ctx.fillStyle = rgba([0, 0, 0], 0.3);
        roundRectPath(-BOX_W / 2 - 6, -BOX_H / 2 - 2, BOX_W + 12, BOX_H + 14, 16);
        ctx.fill();
        ctx.fillStyle = rgba(BG_LOW, 1);
        roundRectPath(-BOX_W / 2 - 6, -BOX_H / 2 - 6, BOX_W + 12, BOX_H + 12, 16);
        ctx.fill();
        ctx.strokeStyle = rgba(PAPER, 0.35);
        ctx.lineWidth = 2;
        ctx.stroke();
        for (let i = 0; i < tiles.length; i += 1) {
            const t = tiles[i];
            ctx.fillStyle = rgba(t.g.col, 1);
            roundRectPath(t.x - t.tw / 2, t.y - t.th / 2, t.tw, t.th, 8);
            ctx.fill();
            // 빠르게 미끄러질수록 칸 아래 그림자가 진행 반대쪽으로 길어진다
            ctx.fillStyle = rgba([0, 0, 0], 0.18);
            ctx.fillRect(t.x - t.tw / 2 + 4 - clamp(t.vx, -6, 6), t.y + t.th / 2 - 3, t.tw - 8, 3);
            drawGlyph(t.g, t.x, t.y, 0, 1, 1, INK);
        }
        ctx.restore();
        ctx.textAlign = 'right';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = rgba(PAPER, 0.6);
        ctx.font = '500 11px sans-serif';
        ctx.fillText(TILT_LABEL, W - 16, 26);
        ctx.fillStyle = rgba(PAPER, 0.96);
        ctx.font = '700 15px sans-serif';
        ctx.fillText(Math.round(tilt) + '°', W - 16, 44);
    }
    function demoDrive(t: number): void { /* 시연 중 기울기는 tiltNow 의 사인 곡선이 정한다 */ }
    // 끌기 — 무대 가로 위치를 기울기로 (가운데 0도, 양 끝 ±상한)
    let dragging = false;
    function tiltFromX(x: number): void { manualTilt = clamp(((x - W / 2) / (W / 2)) * TILT_ANGLE_MAX, -TILT_ANGLE_MAX, TILT_ANGLE_MAX); }
    function onPointer(type: string, x: number, y: number): boolean {
        if (type === 'down') { dragging = true; tiltFromX(x); return false; }
        if (type === 'move' && dragging) { tiltFromX(x); return true; }
        if (type === 'up' || type === 'leave') { dragging = false; }
        return false;
    }
    function onKey(k: string): boolean {
        const base = manualTilt !== null ? manualTilt : Math.round(tilt);
        if (k === 'ArrowLeft') { manualTilt = clamp(base - KEY_TILT, -TILT_ANGLE_MAX, TILT_ANGLE_MAX); }
        else if (k === 'ArrowRight') { manualTilt = clamp(base + KEY_TILT, -TILT_ANGLE_MAX, TILT_ANGLE_MAX); }
        else if (k === 'Escape') { manualTilt = null; }
        else { return false; }
        return true;
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
        <p className={cx("pc__sr")} data-role="word">장바구니 담기</p>
        <canvas className={cx("pc__canvas")} data-role="canvas" width={480} height={300} tabIndex={0} aria-label="기울어지는 상자 안에서 글자 칸들이 낮은 쪽으로 미끄러져 몰리는 장면. 끌거나 옆 방향키로 직접 기울이고, Esc 로 자동 기울기로 돌리고, Enter 로 다시 놓고, Space 로 일시정지한다"></canvas>
        <p className={cx("pc__status")} data-role="status" aria-live="off">상자가 기울어지는 중</p>
        <div className={cx("pc__tools")}>
          <button className={cx("pc__btn")} data-role="restart" type="button">다시 놓기</button>
          <button className={cx("pc__btn")} data-role="pause" type="button" aria-pressed="false">일시정지</button>
        </div>
    </div>
  );
}
