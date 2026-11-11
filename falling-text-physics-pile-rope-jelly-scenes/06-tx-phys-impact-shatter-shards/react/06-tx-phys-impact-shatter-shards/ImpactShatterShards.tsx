// ImpactShatterShards - vanilla 판(06-tx-phys-impact-shatter-shards) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./ImpactShatterShards.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function ImpactShatterShards() {
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
    // 조각 수 — 글자 상자 안에 뿌린 씨앗 점 수. 화소는 가장 가까운 씨앗의 조각이 된다
    const SHARD_COUNT = 12;
    // 깨지는 속도 문턱(px/틱) — 바닥에 닿는 속도가 이보다 빠르면 조각난다
    const IMPACT_SPEED = 9;
    // 조각 회전 상한(rad/틱) — 조각마다 -값 ~ +값 사이에서 돈다
    const SHARD_SPIN = 0.32;
    const SHATTER_GRAVITY = 0.5;
    // 화면 밖 캔버스 배율 — 조각 가장자리가 흐리지 않게 두 배로 그려 쪼갠다
    const SHARD_SCALE = 2;
    const DEMO_LOOP_MS = 3400;
    const TXT_RUN = '글자가 떨어지는 중';
    const TXT_REST = '내려앉음 — 아래 방향키로 세게 떨어뜨리기';
    const GLYPHS: Glyph[] = layoutWord(WORD, 76, 380, 240, 0);
    type Shard = { img: HTMLCanvasElement; sw: number; sh: number; ox: number; oy: number; x: number; y: number; vx: number; vy: number; a: number; w: number };
    type Piece = { g: Glyph; x: number; y: number; vy: number; broken: boolean; hit: number; flash: number; shards: Shard[] };
    // 조각 만들기 — 글자를 화면 밖 캔버스에 그린 뒤, 화소마다 가장 가까운 씨앗 점을 찾아 그 조각 그림에 옮긴다
    function buildShards(g: Glyph, seed: number): Shard[] {
        const side = Math.ceil(g.size * 1.4) * SHARD_SCALE;
        const off = document.createElement('canvas');
        off.width = side;
        off.height = side;
        const octx = off.getContext('2d');
        if (!octx) { return []; }
        octx.font = fontAt(g.size * SHARD_SCALE);
        octx.textAlign = 'center';
        octx.textBaseline = 'middle';
        octx.fillStyle = rgba(g.col, 1);
        octx.fillText(g.ch, side / 2, side / 2 + g.size * 0.04 * SHARD_SCALE);
        const src = octx.getImageData(0, 0, side, side);
        const rng = makeRng(seed);
        const seeds: Pt[] = [];
        for (let k = 0; k < SHARD_COUNT; k += 1) {
            seeds.push([side / 2 + (rng() - 0.5) * g.w * SHARD_SCALE, side / 2 + (rng() - 0.5) * g.h * SHARD_SCALE]);
        }
        const label = new Int16Array(side * side).fill(-1);
        const box: number[][] = [];
        for (let k = 0; k < SHARD_COUNT; k += 1) { box.push([side, side, -1, -1]); }
        for (let y = 0; y < side; y += 1) {
            for (let x = 0; x < side; x += 1) {
                const p = y * side + x;
                if (src.data[p * 4 + 3] < 8) { continue; }
                let best = 0;
                let bd = 1e12;
                for (let k = 0; k < SHARD_COUNT; k += 1) {
                    const dx = x - seeds[k][0];
                    const dy = y - seeds[k][1];
                    const d = dx * dx + dy * dy;
                    if (d < bd) { bd = d; best = k; }
                }
                label[p] = best;
                const b = box[best];
                b[0] = Math.min(b[0], x);
                b[1] = Math.min(b[1], y);
                b[2] = Math.max(b[2], x);
                b[3] = Math.max(b[3], y);
            }
        }
        const out: Shard[] = [];
        for (let k = 0; k < SHARD_COUNT; k += 1) {
            const b = box[k];
            if (b[2] < 0) { continue; }
            const sw = b[2] - b[0] + 1;
            const sh = b[3] - b[1] + 1;
            const img = document.createElement('canvas');
            img.width = sw;
            img.height = sh;
            const ictx = img.getContext('2d');
            if (!ictx) { continue; }
            const part = ictx.createImageData(sw, sh);
            for (let y = 0; y < sh; y += 1) {
                for (let x = 0; x < sw; x += 1) {
                    const p = (y + b[1]) * side + (x + b[0]);
                    if (label[p] !== k) { continue; }
                    const q = (y * sw + x) * 4;
                    part.data[q] = src.data[p * 4];
                    part.data[q + 1] = src.data[p * 4 + 1];
                    part.data[q + 2] = src.data[p * 4 + 2];
                    part.data[q + 3] = src.data[p * 4 + 3];
                }
            }
            ictx.putImageData(part, 0, 0);
            // 조각 상자 가운데가 글자 가운데에서 얼마나 떨어졌나(장면 px) — 흩어질 방향이 여기서 나온다
            out.push({ img: img, sw: sw / SHARD_SCALE, sh: sh / SHARD_SCALE, ox: (b[0] + sw / 2 - side / 2) / SHARD_SCALE, oy: (b[1] + sh / 2 - side / 2) / SHARD_SCALE, x: 0, y: 0, vx: 0, vy: 0, a: 0, w: 0 });
        }
        return out;
    }
    const SHARD_SETS: Shard[][] = GLYPHS.map(function (g: Glyph, i: number): Shard[] { return buildShards(g, 4726 + i); });
    // 떨어뜨리는 높이 — 짝수 번째는 높이(문턱보다 빠르게 닿는다), 홀수 번째는 낮게(문턱보다 느리게)
    function startY(i: number, g: Glyph): number { return i % 2 === 0 ? -g.h - 60 - i * 20 : FLOOR - g.h / 2 - 60; }
    let pieces: Piece[] = [];
    let burstRng = makeRng(4727);
    function onRestart(): void {
        burstRng = makeRng(4727);
        pieces = GLYPHS.map(function (g: Glyph, i: number): Piece {
            return { g: g, x: g.hx, y: startY(i, g), vy: 0, broken: false, hit: 0, flash: 0, shards: SHARD_SETS[i] };
        });
    }
    // 깨기 — 조각마다 글자 가운데에서 바깥쪽으로 충돌 속도에 비례한 속도와, SHARD_SPIN 이하의 회전을 준다
    function shatter(p: Piece, speed: number): void {
        p.broken = true;
        p.flash = 1;
        for (let k = 0; k < p.shards.length; k += 1) {
            const s = p.shards[k];
            const d = Math.max(Math.hypot(s.ox, s.oy), 1);
            const out = speed * (0.16 + 0.2 * burstRng());
            s.x = p.x + s.ox;
            s.y = p.y + s.oy;
            s.vx = (s.ox / d) * out + (burstRng() - 0.5);
            s.vy = (s.oy / d) * out * 0.5 - speed * (0.2 + 0.22 * burstRng());
            s.a = 0;
            s.w = (burstRng() * 2 - 1) * SHARD_SPIN;
        }
    }
    function stepPiece(p: Piece): void {
        if (p.flash > 0) { p.flash = Math.max(0, p.flash - 0.04); }
        if (p.broken) {
            for (let k = 0; k < p.shards.length; k += 1) {
                const s = p.shards[k];
                const r = Math.min(s.sw, s.sh) * 0.4;
                s.vy += SHATTER_GRAVITY;
                s.x += s.vx;
                s.y += s.vy;
                s.a += s.w;
                if (s.y + r > FLOOR) {
                    s.y = FLOOR - r;
                    s.vy = Math.abs(s.vy) > 1 ? -s.vy * 0.3 : 0;
                    s.vx *= 0.7;
                    s.w *= 0.6;
                }
                if (s.x < 6 || s.x > W - 6) { s.vx = -s.vx * 0.5; s.x = clamp(s.x, 6, W - 6); }
            }
            return;
        }
        p.vy += SHATTER_GRAVITY;
        p.y += p.vy;
        if (p.y + p.g.h / 2 > FLOOR) {
            p.y = FLOOR - p.g.h / 2;
            // 첫 충돌 속도만 남긴다 — 깨질지 말지는 이 한 번으로 정해진다
            if (p.hit === 0) { p.hit = p.vy; }
            if (p.vy > IMPACT_SPEED) { shatter(p, p.vy); }
            else { p.vy = Math.abs(p.vy) > 0.8 ? -p.vy * 0.42 : 0; }
        }
    }
    function step(): void {
        if (age < LEAD_MS) { return; }
        for (let i = 0; i < pieces.length; i += 1) { stepPiece(pieces[i]); }
    }
    function stateText(): string {
        for (let i = 0; i < pieces.length; i += 1) {
            const p = pieces[i];
            if (!p.broken && (p.vy !== 0 || p.y + p.g.h / 2 < FLOOR - 0.5)) { return TXT_RUN; }
            if (p.broken) {
                for (let k = 0; k < p.shards.length; k += 1) {
                    if (Math.abs(p.shards[k].vx) > 0.05 || p.shards[k].vy !== 0) { return TXT_RUN; }
                }
            }
        }
        return TXT_REST;
    }
    function draw(): void {
        clearStage();
        drawFloor();
        for (let i = 0; i < pieces.length; i += 1) {
            const p = pieces[i];
            if (p.flash > 0) {
                // 충돌 고리 — 깨진 자리에서 퍼지며 옅어진다. 반지름과 진하기 모두 남은 flash 값 하나에서
                ctx.strokeStyle = rgba(p.g.col, p.flash * 0.8);
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.ellipse(p.x, FLOOR, p.g.w * (0.6 + (1 - p.flash) * 1.6), 6 + (1 - p.flash) * 10, 0, 0, TAU);
                ctx.stroke();
            }
            if (p.broken) {
                for (let k = 0; k < p.shards.length; k += 1) {
                    const s = p.shards[k];
                    ctx.save();
                    ctx.translate(s.x, s.y);
                    ctx.rotate(s.a);
                    ctx.drawImage(s.img, -s.sw / 2, -s.sh / 2, s.sw, s.sh);
                    ctx.restore();
                }
            } else {
                floorShadow(p.x, p.y + p.g.h / 2, p.g.w / 2);
                drawGlyph(p.g, p.x, p.y, 0, 1, 1, p.g.col);
            }
        }
    }
    function demoDrive(t: number): void { /* 시연은 떨어뜨리기만 한다 */ }
    // 누른 글자가 멀쩡하면 문턱보다 빠르게 내리꽂는다
    function slam(p: Piece): void {
        if (p.broken) { return; }
        p.y = Math.min(p.y, FLOOR - p.g.h / 2 - 1);
        p.vy = IMPACT_SPEED + 4;
    }
    function onPointer(type: string, x: number, y: number): boolean {
        if (type !== 'down') { return false; }
        for (let i = 0; i < pieces.length; i += 1) {
            const p = pieces[i];
            if (Math.abs(p.x - x) < p.g.w / 2 + 8 && Math.abs(p.y - y) < p.g.h / 2 + 30) { slam(p); }
        }
        if (age < LEAD_MS) { age = LEAD_MS; }
        return false;
    }
    function onKey(k: string): boolean {
        if (k !== 'ArrowDown') { return false; }
        for (let i = 0; i < pieces.length; i += 1) { slam(pieces[i]); }
        if (age < LEAD_MS) { age = LEAD_MS; }
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
        <p className={cx("pc__sr")} data-role="word">산산조각</p>
        <canvas className={cx("pc__canvas")} data-role="canvas" width={480} height={300} tabIndex={0} aria-label="높이에서 떨어진 글자는 바닥에 부딪혀 조각나고 낮게 떨어진 글자는 튀기만 하는 장면. 글자를 누르거나 아래 방향키로 세게 내리꽂고, Enter 로 다시 떨어뜨리고, Space 로 일시정지한다"></canvas>
        <p className={cx("pc__status")} data-role="status" aria-live="off">글자가 떨어지는 중</p>
        <div className={cx("pc__tools")}>
          <button className={cx("pc__btn")} data-role="restart" type="button">다시 떨어뜨리기</button>
          <button className={cx("pc__btn")} data-role="pause" type="button" aria-pressed="false">일시정지</button>
        </div>
    </div>
  );
}
