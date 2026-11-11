// OverlapRelaxIterativePush - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./OverlapRelaxIterativePush.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function OverlapRelaxIterativePush() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const root: HTMLElement = rootEl;
    type RGB = [number, number, number];
    type RGBA = [number, number, number, number];
    // 무대 좌표 — 캔버스 안 계산은 늘 480×300. 화면에 보이는 크기와 상관없다
    const W = 480;
    const H = 300;
    const TAU = Math.PI * 2;
    function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
    function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
    function ease(x: number): number { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); }
    // 끝에서 한 번 넘쳤다 돌아오는 곡선 — 거품이 자리에 튀어 나올 때
    function backOut(x: number): number {
        const c = clamp(x, 0, 1) - 1;
        return 1 + 2.70158 * c * c * c + 1.70158 * c * c;
    }
    // 시드 고정 난수 — 선형 합동 생성기(곱 1664525, 더함 1013904223). 같은 시드면 같은 수열
    function seeded(seed: number): () => number {
        let s = (seed >>> 0) || 1;
        return function (): number {
            s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
            return s / 4294967296;
        };
    }
    // 파스텔 팔레트 — 거품은 연한 면, 글자는 늘 진한 잉크
    const BG_TOP: RGB = [248, 244, 252];
    const BG_BOT: RGB = [228, 234, 250];
    const BED: RGB = [226, 220, 242];
    const INK: RGB = [40, 36, 54];
    const INK2: RGB = [66, 60, 90];
    const PAPER: RGB = [250, 246, 240];
    const ROSE: RGB = [244, 162, 186];
    const MINT: RGB = [148, 212, 182];
    const TILES: RGB[] = [
        [200, 190, 244], [168, 222, 200], [250, 228, 150], [246, 184, 200],
        [172, 208, 246], [250, 208, 170], [196, 222, 170], [222, 190, 240],
    ];
    function mix(a: RGB, b: RGB, k: number): RGB { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
    function rgba(c: RGB, a: number): string {
        return 'rgba(' + Math.round(clamp(c[0], 0, 255)) + ',' + Math.round(clamp(c[1], 0, 255)) + ',' + Math.round(clamp(c[2], 0, 255)) + ',' + clamp(a, 0, 1).toFixed(3) + ')';
    }

    // 장면 시계(초)·판 반복 번호·시간표 — 시간표는 (시각, 할 일) 목록이고 시각이 지나면 한 번씩 부른다
    let sceneT = 0;
    let lap = 0;
    type Ev = { t: number; f: () => void };
    let script: Ev[] = [];
    let evAt = 0;

    type Rect = { x: number; y: number; w: number; h: number };
    // 키보드·클릭 대상 — 거품 하나의 사각형(캔버스 좌표)과 읽어 줄 문장
    type Hit = { x: number; y: number; w: number; h: number; label: string };

    // ── 거품 계산 ─────────────────────────────────────────────
    // 거품 하나 — 중심 (x, y), 반지름 r, 값 v, 묶음 번호 g
    type Ball = { x: number; y: number; r: number; v: number; g: number };
    // 겹침 한 번 풀기 — 두 원의 중심 거리 d 가 반지름 합에 gap 을 더한 값보다 작으면 모자란 만큼(o)을 두 원의 크기 비율로 나눠 서로 밀어낸다(작은 원이 더 많이 움직인다)
    function relaxPass(bs: Ball[], gap: number): void {
        for (let i = 0; i < bs.length; i += 1) {
            for (let j = i + 1; j < bs.length; j += 1) {
                const a = bs[i];
                const b = bs[j];
                let dx = b.x - a.x;
                let dy = b.y - a.y;
                let d = Math.sqrt(dx * dx + dy * dy);
                const need = a.r + b.r + gap;
                if (d >= need) { continue; }
                if (d < 1e-6) { dx = Math.cos(i * 2.399 + j * 1.131); dy = Math.sin(i * 2.399 + j * 1.131); d = 1; }
                const o = need - d;
                const ux = dx / d;
                const uy = dy / d;
                const sa = b.r / (a.r + b.r);
                const sb = a.r / (a.r + b.r);
                a.x -= ux * o * sa;
                a.y -= uy * o * sa;
                b.x += ux * o * sb;
                b.y += uy * o * sb;
            }
        }
    }
    // 판 안에 가두기 — 원 전체가 사각형 안에 있게 중심을 자른다
    function keepIn(bs: Ball[], R: Rect): void {
        for (const b of bs) {
            b.x = clamp(b.x, R.x + b.r, R.x + R.w - b.r);
            b.y = clamp(b.y, R.y + b.r, R.y + R.h - b.r);
        }
    }
    // 겹침 합 — 모든 원 쌍에서 (반지름 합 - 중심 거리) 가 양수인 만큼을 더한 값. 0 이면 겹침이 없다
    function overlapOf(bs: Ball[]): number {
        let s = 0;
        for (let i = 0; i < bs.length; i += 1) {
            for (let j = i + 1; j < bs.length; j += 1) {
                const d = Math.hypot(bs[j].x - bs[i].x, bs[j].y - bs[i].y);
                const o = bs[i].r + bs[j].r - d;
                if (o > 0) { s += o; }
            }
        }
        return s;
    }
    // 반복해서 풀기 — passes 번 겹침을 밀고, 매번 판 중심으로 pull 만큼 끌어당긴 뒤 판 안으로 자른다. 끝난 뒤 남은 겹침 합을 돌려준다
    function relax(bs: Ball[], R: Rect, passes: number, gap: number, pull: number): number {
        const cx = R.x + R.w / 2;
        const cy = R.y + R.h / 2;
        for (let p = 0; p < passes; p += 1) {
            relaxPass(bs, gap);
            if (pull > 0) {
                for (const b of bs) { b.x += (cx - b.x) * pull; b.y += (cy - b.y) * pull; }
            }
            keepIn(bs, R);
        }
        return overlapOf(bs);
    }
    function sumOf(vals: number[]): number { let s = 0; for (const v of vals) { s += v; } return s; }
    function r1(v: number): string { return String(Math.round(v * 10) / 10); }

    // ── 자체 가상 데이터 ──────────────────────────────────────
    const NAMES: string[] = [
        '버터', '쿠키', '우유', '차', '꿀', '잼', '빵', '국수', '밥', '김', '콩', '귤',
        '배', '밤', '깨', '팥', '쌀', '소금', '식초', '두부', '미역', '호박', '감', '쑥',
    ];
    // ── 글자 폭 어림 ──────────────────────────────────────────
    // 한글·한자·가나는 글자 크기만큼, 로마자는 0.56 배로 어림한다 — 실제 폭을 재지 않고 문자 수에서 곧바로 구한다
    function glyphW(s: string, px: number): number {
        let w = 0;
        for (let i = 0; i < s.length; i += 1) { w += (s.charCodeAt(i) >= 0x2e80 ? 1 : 0.56) * px; }
        return w;
    }
    // 문구 틀의 {a}·{b} 자리에 값을 끼운다 — 화면 문구는 늘 이 틀 한 줄로 두고 로케일 사전이 통째로 바꾼다
    function fill(s: string, a: string, b?: string): string { return s.replace('{a}', a).replace('{b}', b === undefined ? '' : b); }
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
    const pauseBtn: HTMLButtonElement = pauseEl;
    const stepBtn: HTMLButtonElement = stepEl;
    const doneP: HTMLElement = doneEl;
    const pad: HTMLElement = padEl;
    // 외부 웹폰트는 부르지 않는다 — 기기에 있는 글꼴 목록만
    const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", "Noto Sans KR", sans-serif';
    let dpr = 1;
    function fitCanvas(): void {
        // 배율은 2 에서 자른다 — 배율 3 기기에서 화소가 2.25배로 늘지 않게
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function skyFill(top: RGB, bot: RGB): void {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, rgba(top, 1));
        g.addColorStop(1, rgba(bot, 1));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
    }
    function disc(x: number, y: number, r: number, c: RGB, a: number): void {
        if (r <= 0.2 || a <= 0) { return; }
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fillStyle = rgba(c, a);
        ctx.fill();
    }
    function box(x: number, y: number, w: number, h: number, r: number, c: RGB, a: number): void {
        if (w <= 0.2 || h <= 0.2 || a <= 0) { return; }
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
        ctx.fillStyle = rgba(c, a);
        ctx.fill();
    }
    function outline(x: number, y: number, w: number, h: number, r: number, width: number, c: RGB, a: number): void {
        if (w <= 0.2 || h <= 0.2 || a <= 0) { return; }
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
        ctx.lineWidth = width;
        ctx.strokeStyle = rgba(c, a);
        ctx.stroke();
    }
    function text(s: string, x: number, y: number, c: RGB, a: number, px: number, weight: number, align: CanvasTextAlign): void {
        ctx.font = weight + ' ' + px + 'px ' + FONT_STACK;
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = rgba(c, a);
        ctx.fillText(s, x, y);
    }
    // 글자 이름표 — 바탕 알약 위에 글자
    function tag(s: string, x: number, y: number, bg: RGB, fg: RGB, px: number, align: CanvasTextAlign): void {
        ctx.font = '700 ' + px + 'px ' + FONT_STACK;
        const w = ctx.measureText(s).width + px * 1.1;
        const left = align === 'center' ? x - w / 2 : (align === 'right' ? x - w : x);
        box(left, y - px * 0.82, w, px * 1.64, px * 0.82, bg, 0.92);
        text(s, left + w / 2, y + 0.5, fg, 1, px, 700, 'center');
    }
    // 판 자리 — 왼쪽 판·오른쪽 판(대비판)·한 판짜리 히어로. 위쪽은 상태 줄·버튼 자리
    const PANEL_L: Rect = { x: 12, y: 78, w: 222, h: 208 };
    const PANEL_R: Rect = { x: 246, y: 78, w: 222, h: 208 };
    const PANEL_ONE: Rect = { x: 12, y: 60, w: 456, h: 228 };
    // 판 바닥 — 칸 사이 틈으로 비치는 연보라
    function bed(R: Rect): void {
        box(R.x - 3, R.y - 3, R.w + 6, R.h + 6, 10, BED, 1);
    }
    function panelTags(a: string, b: string): void {
        tag(a, PANEL_L.x + PANEL_L.w / 2, 66, INK, PAPER, 10, 'center');
        tag(b, PANEL_R.x + PANEL_R.w / 2, 66, PAPER, INK, 10, 'center');
    }
    // 거품 한 개 — 면, 왼쪽 위 하이라이트, 옅은 윤곽
    function orb(x: number, y: number, r: number, c: RGB, a: number): void {
        if (r <= 0.3 || a <= 0) { return; }
        disc(x, y, r, c, a);
        if (r > 5) { disc(x - r * 0.28, y - r * 0.32, r * 0.42, [255, 255, 255], 0.3 * a); }
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.lineWidth = 1;
        ctx.strokeStyle = rgba(mix(c, INK, 0.28), 0.55 * a);
        ctx.stroke();
    }
    function line(x0: number, y0: number, x1: number, y1: number, width: number, c: RGB, a: number): void {
        if (a <= 0) { return; }
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.lineWidth = width;
        ctx.strokeStyle = rgba(c, a);
        ctx.stroke();
    }
    function ring(x: number, y: number, r: number, width: number, c: RGB, a: number): void {
        if (r <= 0.3 || a <= 0) { return; }
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.lineWidth = width;
        ctx.strokeStyle = rgba(c, a);
        ctx.stroke();
    }
    function ballHit(b: Ball, label: string): Hit {
        return { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2, label: label };
    }
    let shownStatus = '';
    function pushStatus(s: string): void {
        if (!statusEl || s === shownStatus) { return; }
        shownStatus = s;
        statusEl.textContent = s;
    }
    let paused = false;
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    // 페이지를 연 채 움직임 줄이기 설정을 바꿔도 change 리스너가 다시 읽는다
    let still = reduceQuery.matches;
    // 자동 시연 표시 — 사람이 처음 손대면 떼고 상태 줄을 polite 로 켠다
    let demo = root.classList.contains('is-demo');
    const off = new AbortController();
    // 사람이 직접 하는 중이면 시간표는 멈추고 애니메이션만 흐른다
    let manual = false;
    // curOn 이면 키보드 칸 고르기가 켜진 것 — ki 가 hits() 안 번호
    let curOn = false;
    let ki = 0;
    function wake(): void {
        if (!demo) { return; }
        demo = false;
        root.classList.remove('is-demo');
        if (statusEl) { statusEl.setAttribute('aria-live', 'polite'); }
    }
    function takeOver(): void {
        if (manual) { return; }
        manual = true;
        onTake();
        wake();
        if (!curOn) { curOn = true; ki = 0; }
    }
    // 한 판 시연이 끝났음을 스크린리더에 한 번만 알린다 — 판이 되풀이돼도 다시 읽지 않는다
    let doneSaid = false;
    function checkDone(): void {
        if (!manual && !doneSaid && sceneT >= LAP_S - 0.6) {
            doneSaid = true;
            doneP.textContent = statusText();
        }
    }
    function advance(dt: number): void {
        sceneT += dt;
        if (!manual) {
            while (evAt < script.length && script[evAt].t <= sceneT) {
                const ev = script[evAt];
                evAt += 1;
                ev.f();
            }
            if (sceneT >= LAP_S) { lap += 1; begin(); return; }
        }
        update(dt);
    }
    // 첫 판은 START_S 만큼 앞서 시작한다 — 칸이 이미 움직이는 중인 장면에서 보인다
    function runTo(t: number): void {
        while (sceneT < t - 1e-6) { advance(Math.min(1 / 30, t - sceneT)); }
    }
    function begin(): void {
        sceneT = 0;
        evAt = 0;
        script = [];
        build();
        if (lap === 0 && !still) { runTo(START_S); }
    }
    const DT_MAX = 0.05;
    const SETTLE_FRAMES = 8;
    const SETTLE_DT = 0.04;
    function drawCursor(): void {
        if (!curOn) { return; }
        const hs = hits();
        if (hs.length === 0) { return; }
        const h = hs[clamp(ki, 0, hs.length - 1)];
        outline(h.x + 1, h.y + 1, h.w - 2, h.h - 2, 5, 3, INK, 1);
        outline(h.x - 1, h.y - 1, h.w + 2, h.h + 2, 6, 1.5, PAPER, 0.9);
    }
    function cursorLabel(): string {
        const hs = hits();
        return hs.length === 0 ? statusText() : hs[clamp(ki, 0, hs.length - 1)].label;
    }
    function showNow(): void {
        draw();
        drawCursor();
        pushStatus(curOn ? cursorLabel() : statusText());
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
    // 움직임 줄이기 — 루프 없이 배치가 끝난 정지 장면 한 장
    function showRest(): void {
        stopLoop();
        lap = 0;
        sceneT = 0;
        evAt = 0;
        script = [];
        build();
        runTo(REST_S);
        showNow();
    }
    // 움직임 줄이기이거나 멈춘 채 입력이 들어오면 트윈 없이 곧바로 끝 배치로 — 시간을 3초 흘려 스프링·애니메이션을 다 끝낸다
    function settleStill(): void {
        for (let k = 0; k < 90; k += 1) { sceneT += 1 / 30; update(1 / 30); }
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
        manual = false;
        curOn = false;
        doneSaid = false;
        lap += 1;
        begin();
        for (let k = 0; k < SETTLE_FRAMES; k += 1) { update(SETTLE_DT); }
        showNow();
    }
    // 한 걸음 — 멈춘 채 시간표의 다음 일 하나를 부른다. 더 부를 일이 없거나 직접 하던 중이면 다음 판을 연다
    function stepOnce(): void {
        wake();
        if (!paused) {
            paused = true;
            pauseBtn.setAttribute('aria-pressed', 'true');
            stopLoop();
        }
        if (manual || evAt >= script.length) {
            restart();
            return;
        }
        sceneT = Math.max(sceneT, script[evAt].t);
        advance(0);
        for (let k = 0; k < SETTLE_FRAMES; k += 1) { sceneT += SETTLE_DT; update(SETTLE_DT); }
        showNow();
    }
    function moveCur(d: number): void {
        const n = hits().length;
        if (n === 0) { return; }
        ki = (ki + d + n) % n;
    }
    function actCur(i: number): void {
        onAct(i);
        // 멈춘 채·움직임 줄이기에서도 입력이 화면에 바로 반영되게 한다
        if (still || paused) { settleStill(); }
    }
    pauseBtn.addEventListener('click', togglePause, { signal: off.signal });
    stepBtn.addEventListener('click', stepOnce, { signal: off.signal });
    // 키보드 — 무대에 포커스가 있을 때만. 방향키는 칸 이동, Enter·Space 는 칸 고르기, P 는 일시정지, N 은 한 걸음, R 은 다시
    pad.addEventListener('keydown', function (e: KeyboardEvent): void {
        if (e.altKey || e.ctrlKey || e.metaKey) { return; }
        const k = e.key;
        if (k === 'ArrowLeft' || k === 'ArrowUp') {
            e.preventDefault();
            takeOver();
            moveCur(-1);
            showNow();
        } else if (k === 'ArrowRight' || k === 'ArrowDown') {
            e.preventDefault();
            takeOver();
            moveCur(1);
            showNow();
        } else if (k === 'Enter' || k === ' ') {
            e.preventDefault();
            takeOver();
            actCur(ki);
            showNow();
        } else if (k === 'p' || k === 'P') {
            togglePause();
        } else if (k === 'n' || k === 'N') {
            stepOnce();
        } else if (k === 'r' || k === 'R') {
            restart();
        }
    }, { signal: off.signal });
    // 마우스·터치 — 누른 자리의 칸을 고른다
    pad.addEventListener('click', function (e: MouseEvent): void {
        const rect = cv.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width * W;
        const py = (e.clientY - rect.top) / rect.height * H;
        const hs = hits();
        let at = -1;
        for (let i = 0; i < hs.length; i += 1) {
            if (px >= hs[i].x && px <= hs[i].x + hs[i].w && py >= hs[i].y && py <= hs[i].y + hs[i].h) { at = i; }
        }
        if (at < 0) { return; }
        takeOver();
        ki = at;
        actCur(at);
        showNow();
    }, { signal: off.signal });
    // 탭이 숨으면 멈추고, 돌아오면 시계를 다시 맞춰 시작 — 숨은 동안의 몇 초가 한 프레임에 몰리지 않게
    document.addEventListener('visibilitychange', function (): void {
        if (document.hidden) { stopLoop(); } else if (!paused && !still) { startLoop(); }
    }, { signal: off.signal });
    // 설정이 바뀌면 — 켜지면 배치가 끝난 한 장, 꺼지면 다시 움직인다
    reduceQuery.addEventListener('change', function (): void {
        still = reduceQuery.matches;
        if (still) { showRest(); } else { lap = 0; play(); }
    }, { signal: off.signal });
    window.addEventListener('resize', function (): void {
        fitCanvas();
        showNow();
    }, { signal: off.signal });
    // 02 — 뭉쳐 있던 거품을 겹침 풀기로 퍼뜨린다. 한 라운드마다 PACK_ITER 번 밀고(왼쪽), 라운드마다 남은 겹침 합을 오른쪽 선에 찍는다. 점선은 라운드마다 1번만 미는 경우
    const PACK_ITER = 4;
    const ROUND_S = 0.55;
    const ROUNDS = 12;
    const N = 16;
    const LAP_S = 9.6;
    const START_S = 1.4;
    const REST_S = 8.0;
    let bs: Ball[] = [];
    let bsSlow: Ball[] = [];
    let shown: number[][] = [];
    let hist: number[] = [];
    let histSlow: number[] = [];
    let round = 0;
    function cloneBalls(a: Ball[]): Ball[] { return a.map(function (b: Ball): Ball { return { x: b.x, y: b.y, r: b.r, v: b.v, g: b.g }; }); }
    function doRound(): void {
        for (let p = 0; p < PACK_ITER; p += 1) { relaxPass(bs, 0); keepIn(bs, PANEL_L); }
        relaxPass(bsSlow, 0);
        keepIn(bsSlow, PANEL_L);
        hist.push(overlapOf(bs));
        histSlow.push(overlapOf(bsSlow));
        round += 1;
    }
    function build(): void {
        const rnd = seeded(23 + (lap % 3) * 31);
        const cx = PANEL_L.x + PANEL_L.w / 2;
        const cy = PANEL_L.y + PANEL_L.h / 2;
        bs = [];
        for (let i = 0; i < N; i += 1) {
            const v = 8 + rnd() * 40;
            const a = rnd() * TAU;
            const d = 28 * Math.sqrt(rnd());
            bs.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, r: 3.2 * Math.sqrt(v), v: v, g: i });
        }
        bsSlow = cloneBalls(bs);
        shown = bs.map(function (b: Ball): number[] { return [b.x, b.y]; });
        hist = [overlapOf(bs)];
        histSlow = [overlapOf(bsSlow)];
        round = 0;
        for (let k = 0; k < ROUNDS; k += 1) { script.push({ t: 0.3 + k * ROUND_S, f: doRound }); }
    }
    function update(dt: number): void {
        if (dt <= 0) { return; }
        const k = 1 - Math.exp(-9 * dt);
        for (let i = 0; i < bs.length; i += 1) {
            shown[i][0] += (bs[i].x - shown[i][0]) * k;
            shown[i][1] += (bs[i].y - shown[i][1]) * k;
        }
    }
    function drawChart(): void {
        const R = PANEL_R;
        bed(R);
        const gx = R.x + 30;
        const gy = R.y + 26;
        const gw = R.w - 44;
        const gh = R.h - 60;
        line(gx, gy + gh, gx + gw, gy + gh, 1.5, INK2, 0.8);
        line(gx, gy, gx, gy + gh, 1.5, INK2, 0.8);
        const top = Math.max(hist[0], 1);
        const px = function (k: number): number { return gx + gw * k / ROUNDS; };
        // 세로는 겹침 합의 제곱근 — 첫 라운드에 크게 줄어든 뒤의 작은 값도 선에서 보이게
        const py = function (v: number): number { return gy + gh - gh * Math.sqrt(v / top); };
        const plot = function (h: number[], c: RGB, w: number, a: number): void {
            for (let k = 1; k < h.length; k += 1) { line(px(k - 1), py(h[k - 1]), px(k), py(h[k]), w, c, a); }
            for (let k = 0; k < h.length; k += 1) { disc(px(k), py(h[k]), 2.6, c, a); }
        };
        plot(histSlow, ROSE, 2, 0.9);
        plot(hist, INK, 2.5, 1);
        const last = hist.length - 1;
        ring(px(last), py(hist[last]), 6, 2, INK, 0.5 + 0.5 * Math.sin(sceneT * 8));
        text('0', gx - 8, gy + gh, INK2, 1, 9, 700, 'center');
        text(String(Math.round(top)), gx - 8, gy + 2, INK2, 1, 9, 700, 'center');
        text('1', gx, gy + gh + 11, INK2, 1, 9, 700, 'center');
        text(String(ROUNDS), gx + gw, gy + gh + 11, INK2, 1, 9, 700, 'center');
        tag(fill('남은 겹침 {a}', r1(hist[last])), R.x + R.w - 10, R.y + 12, INK, PAPER, 10, 'right');
        tag(fill('라운드당 1번 {a}', r1(histSlow[last])), R.x + R.w - 10, R.y + 32, ROSE, INK, 10, 'right');
    }
    function draw(): void {
        skyFill(BG_TOP, BG_BOT);
        panelTags(fill('라운드당 {a}번 밀기', String(PACK_ITER)), '라운드별 남은 겹침');
        bed(PANEL_L);
        const order = bs.map(function (_b: Ball, i: number): number { return i; }).sort(function (a: number, b: number): number { return bs[b].r - bs[a].r; });
        for (const i of order) {
            let hit = false;
            for (let j = 0; j < bs.length; j += 1) {
                if (j !== i && Math.hypot(bs[i].x - bs[j].x, bs[i].y - bs[j].y) < bs[i].r + bs[j].r - 0.5) { hit = true; }
            }
            orb(shown[i][0], shown[i][1], bs[i].r, TILES[i % 8], 0.92);
            if (hit) { ring(shown[i][0], shown[i][1], bs[i].r + 1.5, 2, ROSE, 0.95); }
        }
        drawChart();
    }
    function statusText(): string {
        return '라운드 {n} · 남은 겹침 {o}'.replace('{n}', String(round)).replace('{o}', r1(hist[hist.length - 1]));
    }
    function hits(): Hit[] {
        return bs.map(function (b: Ball, i: number): Hit {
            return ballHit({ x: shown[i][0], y: shown[i][1], r: b.r, v: b.v, g: b.g }, '{n} 값 {v}'.replace('{n}', NAMES[i]).replace('{v}', String(Math.round(b.v))));
        });
    }
    // 직접 고르면 라운드를 한 번 더 돌린다
    function onAct(_i: number): void { if (round < ROUNDS) { doRound(); } }
    function onTake(): void { return; }
    fitCanvas();
    if (still) { showRest(); } else { play(); }
    return function (): void {
        stopLoop();
        off.abort();
    };
  }, []);

  return (
    <div className={cx("vj") + " is-demo"} ref={rootRef}>
        <div className={cx("vj__pad")} data-role="pad" tabIndex={0} role="application" aria-label={'버블 차트 시연 무대 — 방향키로 거품 이동, Enter 로 고르기, P 로 일시정지, N 으로 한 걸음, R 로 다시'}>
          <canvas className={cx("vj__canvas")} data-role="canvas" width={480} height={300} role="img" aria-label={'한 덩어리로 뭉친 거품 열여섯 개를 라운드마다 네 번씩 겹침을 밀어 서서히 퍼뜨린다. 겹친 거품에는 장미색 테두리가 붙고, 오른쪽 선그래프는 라운드마다 남은 겹침 합이 줄어드는 모습을 찍으며 점선 쪽은 라운드마다 한 번만 미는 경우다. 열두 라운드 뒤 겹침이 없어진 장면에서 쉬었다가 다시 시작한다'}></canvas>
        </div>
        <p className={cx("vj__status")} data-role="status" aria-live="off">{'버블 차트 시연'}</p>
        <div className={cx("vj__ctrl")}>
          <button className={cx("vj__pause")} data-role="pause" type="button" aria-pressed="false">{'일시정지'}</button>
          <button className={cx("vj__step")} data-role="step" type="button">{'한 걸음'}</button>
        </div>
        <p className={cx("vj__done")} data-role="done" role="status" aria-live="polite"></p>
    </div>
  );
}
