// ColumnPositionColorRamp - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./ColumnPositionColorRamp.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function ColumnPositionColorRamp() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const root: HTMLElement = rootEl;
    type RGB = [number, number, number];
    // 무대 좌표 — 캔버스 안 계산은 늘 480×300. 화면에 보이는 크기와 상관없다
    const W = 480;
    const H = 300;
    const TAU = Math.PI * 2;
    function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
    function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
    function ease(x: number): number { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); }
    // 파스텔 바깥 무대 — 판 바깥은 연한 면, 글자는 짙은 잉크
    const BG_TOP: RGB = [248, 244, 252];
    const BG_BOT: RGB = [228, 234, 250];
    const INK: RGB = [40, 36, 54];
    const PAPER: RGB = [250, 246, 240];
    const WHITE: RGB = [255, 255, 255];
    const ROSE: RGB = [244, 162, 186];
    const MINT: RGB = [148, 212, 182];
    const SKY: RGB = [172, 208, 246];
    const BUTTER: RGB = [250, 228, 150];
    // 전광판 판 — 짙은 남보라 바탕, 꺼진 점은 바탕보다 한 단계 밝은 보라, 켜진 점은 호박색(LED 색은 기능색이라 채도를 유지한다)
    const BOARD: RGB = [28, 22, 42];
    const BOARD_EDGE: RGB = [88, 80, 124];
    const DOT_OFF: RGB = [62, 52, 82];
    const AMBER: RGB = [255, 184, 72];
    const AMBER_HI: RGB = [255, 232, 170];
    function mix(a: RGB, b: RGB, k: number): RGB { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
    function rgba(c: RGB, a: number): string {
        return 'rgba(' + Math.round(clamp(c[0], 0, 255)) + ',' + Math.round(clamp(c[1], 0, 255)) + ',' + Math.round(clamp(c[2], 0, 255)) + ',' + clamp(a, 0, 1).toFixed(3) + ')';
    }
    // 장면 시계(초)·판 반복 번호
    let sceneT = 0;
    let lap = 0;

    // ── 5x7 점 글꼴 — 자체 정의. 글자 하나는 가로 5칸 세로 7칸의 0·1 표이고 1 인 칸이 켜진다 ──
    const GLYPH_W = 5;
    const GLYPH_H = 7;
    // 글자와 글자 사이 빈 열 한 줄
    const LETTER_GAP = 1;
    const ADV = GLYPH_W + LETTER_GAP;
    const GL: { [k: string]: string[] } = {
        ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
        'A': ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
        'B': ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
        'C': ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
        'D': ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
        'E': ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
        'F': ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
        'G': ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
        'H': ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
        'I': ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
        'J': ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
        'K': ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
        'L': ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
        'M': ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
        'N': ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
        'O': ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
        'P': ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
        'Q': ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
        'R': ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
        'S': ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
        'T': ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
        'U': ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
        'V': ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
        'W': ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
        'X': ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
        'Y': ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
        'Z': ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
        '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
        '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
        '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
        '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
        '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
        '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
        '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
        '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
        '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
        '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
        '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
        '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
        '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
        ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
        '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
        '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
        '>': ['10000', '01000', '00100', '00010', '00100', '01000', '10000'],
        '*': ['00000', '10101', '01110', '11111', '01110', '10101', '00000'],
    };
    function glyphRows(ch: string): string[] { return GL[ch] ? GL[ch] : GL[' ']; }
    // 문구를 열 목록으로 편다 — 열 하나는 7 비트 정수(0 번 비트가 맨 윗줄). 글자 사이 빈 열도 목록에 들어 있고 맨 끝 빈 열은 뺀다
    function colsOf(s: string): number[] {
        const out: number[] = [];
        for (let i = 0; i < s.length; i += 1) {
            const rows = glyphRows(s.charAt(i));
            for (let c = 0; c < GLYPH_W; c += 1) {
                let v = 0;
                for (let r = 0; r < GLYPH_H; r += 1) {
                    if (rows[r].charAt(c) === '1') { v |= 1 << r; }
                }
                out.push(v);
            }
            if (i < s.length - 1) { out.push(0); }
        }
        return out;
    }
    function bitOf(cols: number[], c: number, r: number): number {
        return c < 0 || c >= cols.length ? 0 : (cols[c] >> r) & 1;
    }
    // 순환 목록 — 문구 열 뒤에 gap 개의 빈 열을 이어 한 바퀴를 만든다. 번호는 한 바퀴 길이로 나머지를 취한다
    function loopBit(cols: number[], gap: number, c: number, r: number): number {
        const n = cols.length + gap;
        const k = ((c % n) + n) % n;
        return k < cols.length ? (cols[k] >> r) & 1 : 0;
    }

    // ── 판 그리기 도구 ──
    let ctxRef: CanvasRenderingContext2D | null = null;
    const BOARD_PAD = 6;
    function boardW(n: number, pitch: number): number { return n * pitch + 2 * BOARD_PAD; }
    // 점 하나 — halo 가 0 이면 가장자리가 딱 떨어지는 점, 0 보다 크면 그 배율 반지름의 옅은 테두리가 한 겹 더 번진다
    function dotOne(cx: number, cy: number, rad: number, round: boolean, halo: number, c: RGB, a: number): void {
        if (a <= 0.01 || !ctxRef) { return; }
        const ctx = ctxRef;
        if (round) {
            if (halo > 0) {
                ctx.beginPath();
                ctx.arc(cx, cy, rad * halo, 0, TAU);
                ctx.fillStyle = rgba(c, a * 0.28);
                ctx.fill();
            }
            ctx.beginPath();
            ctx.arc(cx, cy, rad, 0, TAU);
            ctx.fillStyle = rgba(c, a);
            ctx.fill();
        } else {
            const s = rad * 1.75;
            if (halo > 0) {
                ctx.fillStyle = rgba(c, a * 0.28);
                ctx.fillRect(cx - s * halo / 2, cy - s * halo / 2, s * halo, s * halo);
            }
            ctx.fillStyle = rgba(c, a);
            ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
        }
    }
    // 판 한 장 — 점 cols×rows. lvAt(c, r) 이 0 에서 1 의 밝기를 돌려주고 colAt 이 있으면 열마다 색을 고른다
    function board(x: number, y: number, cols: number, rows: number, pitch: number, fill: number, round: boolean, halo: number,
        lvAt: (c: number, r: number) => number, colAt: ((c: number) => RGB) | null): void {
        if (!ctxRef) { return; }
        const ctx = ctxRef;
        const w = boardW(cols, pitch);
        const h = boardW(rows, pitch);
        ctx.beginPath();
        ctx.roundRect(x - 1, y - 1, w + 2, h + 2, 8);
        ctx.fillStyle = rgba(BOARD_EDGE, 1);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 7);
        ctx.fillStyle = rgba(BOARD, 1);
        ctx.fill();
        const rad = pitch * fill;
        for (let c = 0; c < cols; c += 1) {
            const col = colAt ? colAt(c) : AMBER;
            const cx = x + BOARD_PAD + (c + 0.5) * pitch;
            for (let r = 0; r < rows; r += 1) {
                const cy = y + BOARD_PAD + (r + 0.5) * pitch;
                dotOne(cx, cy, rad, round, 0, DOT_OFF, 1);
                const lv = lvAt(c, r);
                if (lv > 0.03) {
                    dotOne(cx, cy, rad * 1.6, true, 0, col, 0.1 * lv);
                    dotOne(cx, cy, rad, round, halo, col, lv);
                    if (lv > 0.85 && round) { dotOne(cx - rad * 0.25, cy - rad * 0.25, rad * 0.34, true, 0, mix(col, [255, 255, 255], 0.6), 0.55 * lv); }
                }
            }
        }
    }
    // ── 바깥 무대 도구 ──
    const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", "Noto Sans KR", sans-serif';
    function box(x: number, y: number, w: number, h: number, r: number, c: RGB, a: number): void {
        if (!ctxRef || w <= 0.2 || h <= 0.2 || a <= 0) { return; }
        ctxRef.beginPath();
        ctxRef.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
        ctxRef.fillStyle = rgba(c, a);
        ctxRef.fill();
    }
    function text(s: string, x: number, y: number, c: RGB, a: number, px: number, weight: number, align: CanvasTextAlign): void {
        if (!ctxRef) { return; }
        ctxRef.font = weight + ' ' + px + 'px ' + FONT_STACK;
        ctxRef.textAlign = align;
        ctxRef.textBaseline = 'middle';
        ctxRef.fillStyle = rgba(c, a);
        ctxRef.fillText(s, x, y);
    }
    // 글자 이름표 — 바탕 알약 위에 글자
    function tag(s: string, x: number, y: number, bg: RGB, fg: RGB, px: number, align: CanvasTextAlign): void {
        if (!ctxRef) { return; }
        ctxRef.font = '700 ' + px + 'px ' + FONT_STACK;
        const w = ctxRef.measureText(s).width + px * 1.1;
        const left = align === 'center' ? x - w / 2 : (align === 'right' ? x - w : x);
        box(left, y - px * 0.82, w, px * 1.64, px * 0.82, bg, 0.92);
        text(s, left + w / 2, y + 0.5, fg, 1, px, 700, 'center');
    }
    function skyFill(): void {
        if (!ctxRef) { return; }
        const g = ctxRef.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, rgba(BG_TOP, 1));
        g.addColorStop(1, rgba(BG_BOT, 1));
        ctxRef.fillStyle = g;
        ctxRef.fillRect(0, 0, W, H);
    }
    // 판 줄 배치 — 위 46 은 상태 줄·단추 자리. 블록 하나는 이름표 줄 + 판 한 장
    const VIEW_X = 10;
    const VIEW_COLS = 64;
    const PITCH = 7;
    const BLOCK_Y = [46, 127, 208];
    // 블록 y0 에서 이름표는 y0+7, 판은 y0+16
    function blockTag(i: number, s: string, bg: RGB, fg: RGB): void { tag(s, VIEW_X + 4, BLOCK_Y[i] + 7, bg, fg, 10, 'left'); }
    function blockRight(i: number, s: string): void { text(s, VIEW_X + boardW(VIEW_COLS, PITCH) - 2, BLOCK_Y[i] + 7, INK, 0.9, 10, 700, 'right'); }
    function boardY(i: number): number { return BLOCK_Y[i] + 16; }
    const canvasEl = root.querySelector('[data-role="canvas"]') as HTMLCanvasElement | null;
    const padEl = root.querySelector('[data-role="pad"]') as HTMLElement | null;
    const pauseEl = root.querySelector('[data-role="pause"]') as HTMLButtonElement | null;
    const statusEl = root.querySelector('[data-role="status"]') as HTMLElement | null;
    const stepEl = root.querySelector('[data-role="step"]') as HTMLButtonElement | null;
    const doneEl = root.querySelector('[data-role="done"]') as HTMLElement | null;
    const ctxRaw = canvasEl ? canvasEl.getContext('2d') : null;
    if (!canvasEl || !ctxRaw || !pauseEl || !padEl || !stepEl || !doneEl) { return; }
    const cv: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctxRaw;
    ctxRef = ctx;
    const pauseBtn: HTMLButtonElement = pauseEl;
    const stepBtn: HTMLButtonElement = stepEl;
    const doneP: HTMLElement = doneEl;
    const pad: HTMLElement = padEl;
    let dpr = 1;
    function fitCanvas(): void {
        // 배율은 2 에서 자른다 — 배율 3 기기에서 화소가 2.25배로 늘지 않게
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    let shownStatus = '';
    function pushStatus(s: string): void {
        if (!statusEl || s === shownStatus) { return; }
        shownStatus = s;
        statusEl.textContent = s;
    }
    // 화면 낭독기로 가는 문장 — 문구·모드가 바뀔 때만 달라진다. 보이는 상태 줄(statusText)은 따로 두어 계속 바뀌어도 읽히지 않는다
    let spoken = '';
    function pushSpeak(s: string): void {
        if (s === spoken) { return; }
        spoken = s;
        doneP.textContent = s;
    }
    let paused = false;
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    // 페이지를 연 채 움직임 줄이기 설정을 바꿔도 change 리스너가 다시 읽는다
    let still = reduceQuery.matches;
    // 자동 시연 표시 — 사람이 처음 손대면 떼고 낭독용 문장을 읽히기 시작한다
    let demo = root.classList.contains('is-demo');
    const off = new AbortController();
    function wake(): void {
        if (!demo) { return; }
        demo = false;
        root.classList.remove('is-demo');
        pushSpeak(speakText());
    }
    // 한 판 시연이 끝났음을 스크린리더에 한 번만 알린다 — 판이 되풀이돼도 다시 읽지 않는다
    let doneSaid = false;
    function checkDone(): void {
        if (!doneSaid && sceneT >= LAP_S - 0.6) {
            doneSaid = true;
            pushSpeak(speakText());
        }
    }
    function advance(dt: number): void {
        sceneT += dt;
        if (sceneT >= LAP_S) { sceneT -= LAP_S; lap += 1; build(); }
        update(dt);
    }
    // 첫 판은 START_S 만큼 앞서 시작한다 — 글자가 이미 흐르는 중인 장면에서 보인다
    function runTo(t: number): void {
        while (sceneT < t - 1e-6) { advance(Math.min(1 / 30, t - sceneT)); }
    }
    function begin(): void {
        sceneT = 0;
        build();
        if (lap === 0 && !still) { runTo(START_S); }
    }
    const DT_MAX = 0.05;
    const STEP_S = 0.4;
    function showNow(): void {
        draw();
        pushStatus(statusText());
        if (!demo) { pushSpeak(speakText()); }
        checkDone();
    }
    let rafId = 0;
    let lastTs = -1;
    function frame(ts: number): void {
        if (still || paused) { rafId = 0; return; }
        if (lastTs < 0) { lastTs = ts; }
        const dt = Math.min((ts - lastTs) / 1000, DT_MAX);
        lastTs = ts;
        if (dt > 0) { advance(dt); }
        showNow();
        rafId = window.requestAnimationFrame(frame);
    }
    function startLoop(): void {
        if (rafId) { return; }
        // 멈췄던 사이의 시간을 첫 프레임 dt 로 넘기지 않는다
        lastTs = -1;
        rafId = window.requestAnimationFrame(frame);
    }
    function stopLoop(): void {
        if (rafId) { window.cancelAnimationFrame(rafId); rafId = 0; }
    }
    // 움직임 줄이기 — 루프 없이 글자가 읽히는 정지 장면 한 장
    function showRest(): void {
        stopLoop();
        lap = 0;
        sceneT = 0;
        build();
        runTo(REST_S);
        showNow();
    }
    function play(): void {
        begin();
        showNow();
        if (!paused) { startLoop(); }
    }
    function togglePause(): void {
        paused = !paused;
        pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
        wake();
        if (paused) { stopLoop(); } else if (!still) { startLoop(); }
    }
    function restart(): void {
        wake();
        doneSaid = false;
        lap += 1;
        begin();
        showNow();
    }
    // 한 걸음 — 멈춘 채 장면 시계를 0.4 초 앞으로
    function stepOnce(): void {
        wake();
        if (!paused) {
            paused = true;
            pauseBtn.setAttribute('aria-pressed', 'true');
            stopLoop();
        }
        runTo(sceneT + STEP_S);
        showNow();
    }
    pauseBtn.addEventListener('click', togglePause, { signal: off.signal });
    stepBtn.addEventListener('click', stepOnce, { signal: off.signal });
    // 키보드 — 무대에 포커스가 있을 때만. Enter·Space·P 는 일시정지, N 은 한 걸음, R 은 처음부터
    pad.addEventListener('keydown', function (e: KeyboardEvent): void {
        if (e.altKey || e.ctrlKey || e.metaKey) { return; }
        const k = e.key;
        if (k === 'Enter' || k === ' ' || k === 'p' || k === 'P') {
            e.preventDefault();
            togglePause();
        } else if (k === 'n' || k === 'N') {
            e.preventDefault();
            stepOnce();
        } else if (k === 'r' || k === 'R') {
            e.preventDefault();
            restart();
        }
    }, { signal: off.signal });
    // 마우스·터치 — 무대를 누르면 일시정지 토글
    pad.addEventListener('click', function (): void { togglePause(); }, { signal: off.signal });
    // 탭이 숨으면 멈추고, 돌아오면 시계를 다시 맞춰 시작 — 숨은 동안의 몇 초가 한 프레임에 몰리지 않게
    document.addEventListener('visibilitychange', function (): void {
        if (document.hidden) { stopLoop(); } else if (!paused && !still) { startLoop(); }
    }, { signal: off.signal });
    // 설정이 바뀌면 — 켜지면 정지 장면 한 장, 꺼지면 다시 움직인다
    reduceQuery.addEventListener('change', function (): void {
        still = reduceQuery.matches;
        if (still) { showRest(); } else { lap = 0; play(); }
    }, { signal: off.signal });
    window.addEventListener('resize', function (): void {
        fitCanvas();
        showNow();
    }, { signal: off.signal });
    // ── 08 열 위치에 따라 색이 변하는 점 — 색 단계 사이를 선형 보간 / 단계 사이를 잇지 않는 세 구역 / 한 열을 골라 rgb 값 읽기 ────
    // 문구는 오른쪽으로 갈수록 붉은색 → 호박색 → 연두색으로 읽힌다. 색은 글자가 아니라 판의 열 번호에 붙어 있어서 글자가 흘러가면 같은 글자의 색이 바뀐다
    const SCROLL_SPEED = 12;
    const GAP_COLS = 13;
    const LEAD = 4;
    const LAP_S = 10;
    const START_S = 3.2;
    const REST_S = 2.4;
    const SWEEP_S = 5;
    const MSG = 'ARRIVING NOW 3 MIN';
    const LED_RED: RGB = [255, 84, 84];
    const LED_AMBER: RGB = [255, 184, 72];
    const LED_LIME: RGB = [156, 236, 84];
    const RAMP_STOPS: Array<{ at: number; c: RGB }> = [{ at: 0, c: LED_RED }, { at: 0.5, c: LED_AMBER }, { at: 1, c: LED_LIME }];
    const cols = colsOf(MSG);
    function clock(): number { return sceneT + lap * LAP_S; }
    function build(): void { return; }
    function update(dt: number): void { if (dt < 0) { return; } }
    // 두 색 사이를 k 비율로 섞는다 — 색 세 채널을 따로 선형으로
    function lerpRgb(a: RGB, b: RGB, k: number): RGB { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
    // 판 안 위치 u(0 에서 1) 의 색 — 두 단계 사이에서는 보간한다
    function colorAt(u: number): RGB {
        const x = clamp(u, 0, 1);
        for (let i = 1; i < RAMP_STOPS.length; i += 1) {
            if (x <= RAMP_STOPS[i].at) {
                const a = RAMP_STOPS[i - 1];
                const b = RAMP_STOPS[i];
                return lerpRgb(a.c, b.c, (x - a.at) / (b.at - a.at));
            }
        }
        return RAMP_STOPS[RAMP_STOPS.length - 1].c;
    }
    // 보간 없이 세 구역으로 끊는다 — 단계 색 그대로
    function zoneAt(u: number): RGB {
        const i = Math.min(RAMP_STOPS.length - 1, Math.floor(clamp(u, 0, 0.999) * RAMP_STOPS.length));
        return RAMP_STOPS[i].c;
    }
    function uOf(c: number): number { return c / (VIEW_COLS - 1); }
    function lvAt(c: number, r: number): number { return loopBit(cols, GAP_COLS, Math.floor(clock() * SCROLL_SPEED) + c - LEAD, r); }
    function sampleCol(): number { return Math.min(VIEW_COLS - 1, Math.floor(((clock() % SWEEP_S) / SWEEP_S) * VIEW_COLS)); }
    function draw(): void {
        skyFill();
        blockTag(0, '단계 사이를 잇는다 — 선형 보간', MINT, INK);
        blockTag(1, '잇지 않고 세 구역으로 끊는다', BUTTER, INK);
        blockTag(2, '한 열을 골라 색 읽기', ROSE, INK);
        blockRight(0, 'RAMP_STOPS ' + RAMP_STOPS.length);
        blockRight(1, 'zoneAt');
        board(VIEW_X, boardY(0), VIEW_COLS, GLYPH_H, PITCH, 0.42, true, 1.3, lvAt, function (c: number): RGB { return colorAt(uOf(c)); });
        board(VIEW_X, boardY(1), VIEW_COLS, GLYPH_H, PITCH, 0.42, true, 1.3, lvAt, function (c: number): RGB { return zoneAt(uOf(c)); });
        // 색 띠 — 열마다 colorAt 값을 칠하고 고른 열 아래에 표시를 단다
        const sx = VIEW_X + 4;
        const sy = boardY(2) + 6;
        const cw = (boardW(VIEW_COLS, PITCH) - 8) / VIEW_COLS;
        for (let c = 0; c < VIEW_COLS; c += 1) { box(sx + c * cw, sy, cw + 0.4, 16, 0, colorAt(uOf(c)), 1); }
        for (const s of RAMP_STOPS) { box(sx + s.at * (VIEW_COLS - 1) * cw + cw / 2 - 1.5, sy - 3, 3, 22, 1.5, INK, 0.9); }
        const k = sampleCol();
        const rgb = colorAt(uOf(k));
        box(sx + k * cw - 1.5, sy - 5, cw + 3, 26, 3, WHITE, 0.95);
        box(sx + k * cw, sy - 3, cw, 22, 2, rgb, 1);
        text('열 ' + k + ' → rgb(' + Math.round(rgb[0]) + ', ' + Math.round(rgb[1]) + ', ' + Math.round(rgb[2]) + ')', VIEW_X + 4, sy + 34, INK, 1, 12, 700, 'left');
        text('단계 3개 · 사이는 lerpRgb 한 줄', VIEW_X + boardW(VIEW_COLS, PITCH) - 4, sy + 34, INK, 0.9, 10, 700, 'right');
    }
    // 화면 낭독기로 보내는 문장 — 표시 문구와 판 이름만 담아 장면이 흘러도 달라지지 않는다
    function speakText(): string {
        return '표시 문구 {s} · 열 위치 색 띠 판'.replace('{s}', MSG);
    }
    function statusText(): string {
        const k = sampleCol();
        const rgb = colorAt(uOf(k));
        return '열 {c} / {n} · rgb {r} {g} {b} · 색 단계 {s}개'.replace('{c}', String(k)).replace('{n}', String(VIEW_COLS)).replace('{r}', String(Math.round(rgb[0]))).replace('{g}', String(Math.round(rgb[1]))).replace('{b}', String(Math.round(rgb[2]))).replace('{s}', String(RAMP_STOPS.length));
    }
    fitCanvas();
    if (still) { showRest(); } else { play(); }
    return function (): void {
        stopLoop();
        off.abort();
    };
  }, []);

  return (
    <div className={cx("vj") + " is-demo"} ref={rootRef}>
        <div className={cx("vj__pad")} data-role="pad" tabIndex={0} role="application" aria-label={'LED 전광판 시연 무대 — Enter 나 Space 로 일시정지, N 으로 한 걸음, R 로 처음부터'}>
          <canvas className={cx("vj__canvas")} data-role="canvas" width={480} height={300} role="img" aria-label={'ARRIVING NOW 3 MIN 문구가 흐르면서 판의 열 위치에 따라 왼쪽은 붉은색 가운데는 호박색 오른쪽은 연두색으로 읽힌다. 위 판은 단계 사이를 선형 보간으로 잇고 가운데 판은 세 구역으로 끊으며, 아래 색 띠에서는 표시된 열의 rgb 값이 글자로 읽힌다'}></canvas>
        </div>
        <p className={cx("vj__status")} data-role="status" aria-live="off">{'LED 전광판 시연'}</p>
        <div className={cx("vj__ctrl")}>
          <button className={cx("vj__pause")} data-role="pause" type="button" aria-pressed="false">{'일시정지'}</button>
          <button className={cx("vj__step")} data-role="step" type="button">{'한 걸음'}</button>
        </div>
        <p className={cx("vj__done")} data-role="done" role="status" aria-live="polite"></p>
    </div>
  );
}
