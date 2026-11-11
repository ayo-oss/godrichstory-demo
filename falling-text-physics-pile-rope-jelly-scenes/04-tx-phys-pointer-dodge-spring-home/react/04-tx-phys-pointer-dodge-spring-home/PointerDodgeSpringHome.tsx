// PointerDodgeSpringHome - vanilla 판(04-tx-phys-pointer-dodge-spring-home) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./PointerDodgeSpringHome.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function PointerDodgeSpringHome() {
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
    // 피하는 반경(px) — 포인터와 글자 가운데 거리가 이 안이면 밀어낸다
    const REPEL_RADIUS = 90;
    // 반발 세기 — 힘 = REPEL_FORCE x (1/거리 - 1/반경). 가까울수록 커지고 반경 끝에서 0
    const REPEL_FORCE = 44;
    // 제자리 스프링 — 원래 자리에서 벗어난 거리의 이 비율만큼 틱마다 당긴다
    const RETURN_SPRING = 0.05;
    // 감쇠 — 틱마다 속도에서 이 비율만큼 덜어 낸다
    const DAMPING = 0.12;
    // 거리가 이보다 작으면 이 값으로 본다 — 1/거리가 끝없이 커지지 않게(px)
    const MIN_DIST = 12;
    // 가상 포인터가 8자 곡선을 한 바퀴 도는 시간(ms)
    const PATH_MS = 3000;
    const KEY_STEP = 22;
    const DEMO_LOOP_MS = 3400;
    const TXT_NEAR = '글자가 포인터를 피하는 중';
    const TXT_BACK = '제자리로 돌아오는 중';
    const TXT_HOME = '제자리 — 포인터를 가까이 가져가 보기';
    const GLYPHS: Glyph[] = layoutWord(WORD, 66, 400, 240, 140);
    type Mover = { g: Glyph; x: number; y: number; vx: number; vy: number; a: number };
    let movers: Mover[] = [];
    let pointer = { on: false, x: 240, y: 140 };
    function onRestart(): void {
        movers = GLYPHS.map(function (g: Glyph): Mover { return { g: g, x: g.hx, y: g.hy, vx: 0, vy: 0, a: 0 }; });
        if (demo) { pointer = { on: false, x: 240, y: 140 }; }
    }
    function step(): void {
        for (let i = 0; i < movers.length; i += 1) {
            const m = movers[i];
            let ax = -(m.x - m.g.hx) * RETURN_SPRING;
            let ay = -(m.y - m.g.hy) * RETURN_SPRING;
            if (pointer.on) {
                const dx = m.x - pointer.x;
                const dy = m.y - pointer.y;
                const d = Math.max(Math.hypot(dx, dy), MIN_DIST);
                if (d < REPEL_RADIUS) {
                    const f = REPEL_FORCE * (1 / d - 1 / REPEL_RADIUS);
                    ax += (dx / d) * f;
                    ay += (dy / d) * f;
                }
            }
            m.vx = (m.vx + ax) * (1 - DAMPING);
            m.vy = (m.vy + ay) * (1 - DAMPING);
            m.x += m.vx;
            m.y += m.vy;
            // 기울기 — 옆으로 움직이는 속도를 따라 기울었다가 멈추면 바로 선다
            m.a = lerp(m.a, clamp(m.vx * 0.07, -0.5, 0.5), 0.2);
        }
    }
    function offsetOf(m: Mover): number { return Math.hypot(m.x - m.g.hx, m.y - m.g.hy); }
    function stateText(): string {
        let off = 0;
        for (let i = 0; i < movers.length; i += 1) { off = Math.max(off, offsetOf(movers[i])); }
        if (pointer.on && off > 1) { return TXT_NEAR; }
        return off > 0.5 ? TXT_BACK : TXT_HOME;
    }
    function draw(): void {
        clearStage();
        // 원래 자리 — 옅은 밑줄로 남겨 글자가 어디로 돌아오는지 보이게
        for (let i = 0; i < movers.length; i += 1) {
            const g = movers[i].g;
            ctx.fillStyle = rgba(PAPER, 0.12);
            ctx.fillRect(g.hx - g.w / 2, g.hy + g.h / 2 + 6, g.w, 2);
        }
        if (pointer.on) {
            const rg = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, REPEL_RADIUS);
            rg.addColorStop(0, rgba(PAL[3], 0.22));
            rg.addColorStop(1, rgba(PAL[3], 0));
            ctx.fillStyle = rg;
            ctx.beginPath();
            ctx.arc(pointer.x, pointer.y, REPEL_RADIUS, 0, TAU);
            ctx.fill();
            ctx.strokeStyle = rgba(PAPER, 0.3);
            ctx.setLineDash([4, 5]);
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.setLineDash([]);
        }
        for (let i = 0; i < movers.length; i += 1) {
            const m = movers[i];
            // 벗어난 거리만큼 떠올라 보이게 — 그림자가 멀어지고 글자가 조금 커진다
            const lift = clamp(offsetOf(m) / 50, 0, 1);
            ctx.fillStyle = rgba([0, 0, 0], 0.3 - 0.12 * lift);
            ctx.beginPath();
            ctx.ellipse(m.x + 4 + 8 * lift, m.y + m.g.h * 0.45 + 6 * lift, m.g.w * 0.45 * (1 + 0.3 * lift), 4 + 2 * lift, 0, 0, TAU);
            ctx.fill();
            const sc = 1 + 0.12 * lift;
            drawGlyph(m.g, m.x, m.y, m.a, sc, sc, m.g.col);
        }
        if (pointer.on) {
            ctx.fillStyle = rgba(PAPER, 0.95);
            ctx.beginPath();
            ctx.arc(pointer.x, pointer.y, 4, 0, TAU);
            ctx.fill();
        }
    }
    // 시연 — 포인터가 없으니 8자 곡선을 도는 가상 포인터를 지나가게 한다
    function demoDrive(t: number): void {
        if (t < LEAD_MS) { pointer = { on: false, x: 40, y: 140 }; return; }
        const u = (t - LEAD_MS) / PATH_MS;
        pointer = { on: true, x: 240 - 200 * Math.cos(TAU * u), y: 140 + 46 * Math.sin(TAU * 2 * u) };
    }
    function onPointer(type: string, x: number, y: number): boolean {
        if (type === 'leave') { pointer = { on: false, x: pointer.x, y: pointer.y }; return true; }
        if (type === 'down' || type === 'move') { pointer = { on: true, x: x, y: y }; return type === 'move'; }
        return false;
    }
    // 방향키로 키보드 포인터를 옮긴다 — Escape 는 포인터를 치운다
    function onKey(k: string): boolean {
        const p = pointer.on ? pointer : { on: true, x: 240, y: 140 };
        let x = p.x;
        let y = p.y;
        if (k === 'ArrowLeft') { x -= KEY_STEP; }
        else if (k === 'ArrowRight') { x += KEY_STEP; }
        else if (k === 'ArrowUp') { y -= KEY_STEP; }
        else if (k === 'ArrowDown') { y += KEY_STEP; }
        else if (k === 'Escape') { pointer = { on: false, x: p.x, y: p.y }; return true; }
        else { return false; }
        pointer = { on: true, x: clamp(x, 0, W), y: clamp(y, 0, H) };
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
        <p className={cx("pc__sr")} data-role="word">안녕하세요</p>
        <canvas className={cx("pc__canvas")} data-role="canvas" width={480} height={300} tabIndex={0} aria-label="글자가 포인터를 피했다가 스프링으로 제자리에 돌아오는 장면. 포인터를 움직이거나 방향키로 키보드 포인터를 옮기고, Esc 로 포인터를 치우고, Enter 로 처음 자리로 돌리고, Space 로 일시정지한다"></canvas>
        <p className={cx("pc__status")} data-role="status" aria-live="off">제자리 — 포인터를 가까이 가져가 보기</p>
        <div className={cx("pc__tools")}>
          <button className={cx("pc__btn")} data-role="restart" type="button">처음 자리로</button>
          <button className={cx("pc__btn")} data-role="pause" type="button" aria-pressed="false">일시정지</button>
        </div>
    </div>
  );
}
