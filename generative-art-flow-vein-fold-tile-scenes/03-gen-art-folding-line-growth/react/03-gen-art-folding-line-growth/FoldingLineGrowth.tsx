// FoldingLineGrowth - vanilla 판(03-gen-art-folding-line-growth) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./FoldingLineGrowth.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function FoldingLineGrowth() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const root: HTMLElement = rootEl;
    type RGB = [number, number, number];
    const W = 480;
    const H = 300;
    const FIXED_DT = 16;
    const TAU = Math.PI * 2;
    const DEG = Math.PI / 180;
    // 파스텔 팔레트 — 어두운 무대(INK) 위에 밝은 선·면을 얹어 명도 차로 형태가 읽힌다
    const INK: RGB = [29, 26, 44];
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
    function rgba(c: RGB, a: number): string {
        return 'rgba(' + Math.round(clamp(c[0], 0, 255)) + ',' + Math.round(clamp(c[1], 0, 255)) + ',' + Math.round(clamp(c[2], 0, 255)) + ',' + clamp(a, 0, 1).toFixed(3) + ')';
    }
    function mix(a: RGB, b: RGB, k: number): RGB { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
    // 시드 고정 난수 — 같은 씨앗이면 같은 수열, 곧 같은 그림이 다시 나온다 (32비트 정수 섞기)
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
    // 다음 씨앗 — 다시 그리기를 누를 때마다 정수 하나만 바뀐다(10007~99995 사이 다섯 자리)
    function nextSeed(s: number): number { return ((s * 7919 + 104729) % 89989) + 10007; }
    const canvasEl = root.querySelector('[data-role="canvas"]') as HTMLCanvasElement | null;
    const statusEl = root.querySelector('[data-role="status"]') as HTMLElement | null;
    const ctxRaw = canvasEl ? canvasEl.getContext('2d') : null;
    // 그림판 — 자란 결과를 쌓아 두는 화면 밖 캔버스. 프레임마다 이걸 옮겨 그리고 그 위에 지금 자라는 부분만 얹는다
    const artEl = document.createElement('canvas');
    const actxRaw = artEl.getContext('2d');
    if (!canvasEl || !ctxRaw || !statusEl || !actxRaw) { return; }
    const cv: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctxRaw;
    const status: HTMLElement = statusEl;
    const actx: CanvasRenderingContext2D = actxRaw;
    const redrawBtn = root.querySelector('[data-role="redraw"]') as HTMLButtonElement | null;
    const replayBtn = root.querySelector('[data-role="replay"]') as HTMLButtonElement | null;
    const pauseBtn = root.querySelector('[data-role="pause"]') as HTMLButtonElement | null;
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    // 페이지를 연 채 동작 줄이기 설정을 바꿔도 tail 의 change 리스너가 이 값을 다시 읽는다
    let still = reduceQuery.matches;
    // 자동 시연 중인가 — 사람이 처음 만지는 순간 시연을 멈추고 상태 줄을 읽어 주기 시작한다
    let demo = root.classList.contains('is-demo');
    // 지금 그림의 씨앗과, 그 씨앗을 심은 뒤 흐른 성장 시간(ms, 일시정지 동안은 멈춘다)
    let seed = 0;
    let age = 0;
    function wake(): void {
        if (!demo) { return; }
        demo = false;
        root.classList.remove('is-demo');
        status.setAttribute('aria-live', 'polite');
    }
    function say(text: string): void {
        if (status.textContent !== text) { status.textContent = text; }
    }
    let dprNow = 0;
    function fitCanvas(): void {
        // 배율은 2 에서 자른다 — 배율 3 기기에서 화소가 2.25배로 늘어 프레임마다 일이 그만큼 커지지 않게
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (dpr === dprNow) { return; }
        // 캔버스 크기를 바꾸면 내용이 지워진다 — 그려 둔 그림판을 잠깐 옮겨 두었다가 새 배율로 다시 담는다
        const keep = document.createElement('canvas');
        keep.width = artEl.width;
        keep.height = artEl.height;
        const kctx = keep.getContext('2d');
        if (kctx && dprNow) { kctx.drawImage(artEl, 0, 0); }
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
        artEl.width = cv.width;
        artEl.height = cv.height;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        actx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (kctx && dprNow) { actx.drawImage(keep, 0, 0, W, H); }
        dprNow = dpr;
    }
    function clearArt(c: RGB): void {
        actx.fillStyle = rgba(c, 1);
        actx.fillRect(0, 0, W, H);
    }
    function blitArt(): void { ctx.drawImage(artEl, 0, 0, W, H); }
    // 오른쪽 아래 수치 상자 — 씨앗과 항목별 개수를 이름표 + 값 한 줄씩
    function drawStats(pairs: [string, string][]): void {
        ctx.font = '600 11px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'alphabetic';
        const lines: string[] = [];
        let wide = 0;
        for (let i = 0; i < pairs.length; i += 1) {
            const t = pairs[i][0] + ' ' + pairs[i][1];
            lines.push(t);
            wide = Math.max(wide, ctx.measureText(t).width);
        }
        const lh = 15;
        const bw = wide + 16;
        const bh = lines.length * lh + 8;
        ctx.fillStyle = rgba(INK, 0.66);
        ctx.fillRect(W - 10 - bw, H - 10 - bh, bw, bh);
        ctx.fillStyle = rgba(PAPER, 0.95);
        for (let i = 0; i < lines.length; i += 1) { ctx.fillText(lines[i], W - 18, H - 10 - bh + 4 + lh * (i + 1) - 3); }
    }
    // 격자 버킷 — 점 번호를 칸(한 변 cell px)별 목록에 담아 두고, 반경 안 이웃은 주변 칸만 훑어 찾는다
    type Buckets = { cell: number; cols: number; rows: number; b: number[][] };
    function makeBuckets(cell: number): Buckets {
        const cols = Math.ceil(W / cell) + 1;
        const rows = Math.ceil(H / cell) + 1;
        const b: number[][] = [];
        for (let i = 0; i < cols * rows; i += 1) { b.push([]); }
        return { cell: cell, cols: cols, rows: rows, b: b };
    }
    function bucketAdd(g: Buckets, x: number, y: number, id: number): void {
        const c = clamp(Math.floor(x / g.cell), 0, g.cols - 1);
        const r = clamp(Math.floor(y / g.cell), 0, g.rows - 1);
        g.b[r * g.cols + c].push(id);
    }
    function bucketsClear(g: Buckets): void {
        for (let i = 0; i < g.b.length; i += 1) { g.b[i].length = 0; }
    }
    // (x, y) 에서 반경 rad 를 덮는 칸들의 번호를 visit 에 넘긴다 — visit 이 true 를 돌려주면 그 자리에서 멈추고 true
    function bucketNear(g: Buckets, x: number, y: number, rad: number, visit: (id: number) => boolean): boolean {
        const c0 = clamp(Math.floor((x - rad) / g.cell), 0, g.cols - 1);
        const c1 = clamp(Math.floor((x + rad) / g.cell), 0, g.cols - 1);
        const r0 = clamp(Math.floor((y - rad) / g.cell), 0, g.rows - 1);
        const r1 = clamp(Math.floor((y + rad) / g.cell), 0, g.rows - 1);
        for (let r = r0; r <= r1; r += 1) {
            for (let c = c0; c <= c1; c += 1) {
                const list = g.b[r * g.cols + c];
                for (let k = 0; k < list.length; k += 1) {
                    if (visit(list[k])) { return true; }
                }
            }
        }
        return false;
    }
    // 마디끼리 밀어내는 반경(px) — 이 안에 든 마디는 거리에 반비례해 밀린다
    const REPEL_RADIUS = 12;
    // 마디 사이가 이보다 벌어지면 가운데에 새 마디를 끼운다(px)
    const MAX_EDGE_LENGTH = 5;
    // 양옆 마디의 가운데 쪽으로 끌어당기는 비율 — 클수록 선이 매끈해진다
    const ALIGN_FORCE = 0.4;
    // 밀어내는 힘의 크기
    const REPEL_FORCE = 0.5;
    // 이웃 마디끼리 잇는 용수철 — 쉬는 길이(px)보다 짧으면 밀고 길면 당긴다
    const SPRING_REST = 4;
    const SPRING_FORCE = 0.3;
    // 한 틱에 아무 변에나 끼우는 성장 마디 수 — 마디가 늘면 용수철이 선을 늘이려 하고, 울타리 안에서 늘어날 자리가 없으니 접힌다
    const GROWTH_PER_FRAME = 12;
    // 한 틱에 끼우는 마디 수 상한(긴 변 나누기 + 성장)과 전체 마디 수 상한 — 프레임당 계산량 상한
    const SPLITS_PER_FRAME = 24;
    const MAX_NODES = 2600;
    // 자랄 수 있는 타원 울타리
    const BOUND_CX = 300;
    const BOUND_CY = 150;
    const BOUND_RX = 168;
    const BOUND_RY = 124;
    const START_NODES = 24;
    const START_R = 22;
    const SEED0 = 47103;
    const TXT_RUN = '주름이 접히며 자라는 중';
    let xs: number[] = [];
    let ys: number[] = [];
    let lrng: () => number = makeRng(SEED0);
    let splitFrom = 0;
    const grid: Buckets = makeBuckets(REPEL_RADIUS);
    function plant(s: number): void {
        clearArt(INK);
        lrng = makeRng(s);
        xs = [];
        ys = [];
        splitFrom = 0;
        for (let i = 0; i < START_NODES; i += 1) {
            const a = (i / START_NODES) * TAU;
            const r = START_R * (1 + (lrng() - 0.5) * 0.3);
            xs.push(BOUND_CX + Math.cos(a) * r);
            ys.push(BOUND_CY + Math.sin(a) * r);
        }
    }
    // 힘 합 — 양옆 가운데로 끌기 + 반경 안 이웃(격자 근방만) 밀기 + 타원 밖이면 안으로
    function relax(): void {
        const n = xs.length;
        bucketsClear(grid);
        for (let i = 0; i < n; i += 1) { bucketAdd(grid, xs[i], ys[i], i); }
        const nx: number[] = new Array(n);
        const ny: number[] = new Array(n);
        const R = REPEL_RADIUS;
        for (let i = 0; i < n; i += 1) {
            const x = xs[i];
            const y = ys[i];
            const pv = (i + n - 1) % n;
            const nt = (i + 1) % n;
            let fx = ((xs[pv] + xs[nt]) * 0.5 - x) * ALIGN_FORCE;
            let fy = ((ys[pv] + ys[nt]) * 0.5 - y) * ALIGN_FORCE;
            const nbs = [pv, nt];
            for (let k = 0; k < 2; k += 1) {
                const j = nbs[k];
                const dx = xs[j] - x;
                const dy = ys[j] - y;
                const d = Math.hypot(dx, dy) || 1e-6;
                const pull = ((d - SPRING_REST) / d) * SPRING_FORCE * 0.5;
                fx += dx * pull;
                fy += dy * pull;
            }
            bucketNear(grid, x, y, R, function (j: number): boolean {
                if (j === i || j === pv || j === nt) { return false; }
                const dx = x - xs[j];
                const dy = y - ys[j];
                const d2 = dx * dx + dy * dy;
                if (d2 >= R * R || d2 < 1e-9) { return false; }
                const d = Math.sqrt(d2);
                const push = ((R - d) / R) * REPEL_FORCE;
                fx += (dx / d) * push;
                fy += (dy / d) * push;
                return false;
            });
            const ex = (x - BOUND_CX) / BOUND_RX;
            const ey = (y - BOUND_CY) / BOUND_RY;
            const e = ex * ex + ey * ey;
            if (e > 1) {
                fx -= (x - BOUND_CX) * (e - 1) * 0.5;
                fy -= (y - BOUND_CY) * (e - 1) * 0.5;
            }
            nx[i] = x + fx;
            ny[i] = y + fy;
        }
        xs = nx;
        ys = ny;
    }
    // 긴 변 나누기 — 시작 자리를 틱마다 옮겨 가며 MAX_EDGE_LENGTH 보다 긴 변 가운데에 마디를 끼운다
    function splitEdges(): void {
        let made = 0;
        const n0 = xs.length;
        let i = splitFrom % n0;
        for (let k = 0; k < n0 && made < SPLITS_PER_FRAME && xs.length < MAX_NODES; k += 1) {
            const j = (i + 1) % xs.length;
            const dx = xs[j] - xs[i];
            const dy = ys[j] - ys[i];
            if (dx * dx + dy * dy > MAX_EDGE_LENGTH * MAX_EDGE_LENGTH) {
                // 가운데에서 아주 조금 옆으로 — 대칭이 깨져야 주름이 접힌다
                const jit = (lrng() - 0.5) * 0.4;
                xs.splice(i + 1, 0, (xs[i] + xs[j]) * 0.5 - dy * jit * 0.1);
                ys.splice(i + 1, 0, (ys[i] + ys[j]) * 0.5 + dx * jit * 0.1);
                made += 1;
                i += 1;
            }
            i = (i + 1) % xs.length;
        }
        splitFrom = i + 37;
        // 성장 — 남은 몫만큼 시드 난수로 고른 변 가운데에 마디를 더 끼운다
        for (let g = 0; g < GROWTH_PER_FRAME && made < SPLITS_PER_FRAME && xs.length < MAX_NODES; g += 1) {
            const a = Math.floor(lrng() * xs.length);
            const b = (a + 1) % xs.length;
            xs.splice(a + 1, 0, (xs[a] + xs[b]) * 0.5);
            ys.splice(a + 1, 0, (ys[a] + ys[b]) * 0.5);
            made += 1;
        }
    }
    function grow(): boolean {
        relax();
        splitEdges();
        return xs.length >= MAX_NODES;
    }
    function perimeter(): number {
        let s = 0;
        for (let i = 0; i < xs.length; i += 1) {
            const j = (i + 1) % xs.length;
            s += Math.hypot(xs[j] - xs[i], ys[j] - ys[i]);
        }
        return s;
    }
    function paintFrame(): void {
        blitArt();
        ctx.beginPath();
        ctx.moveTo(xs[0], ys[0]);
        for (let i = 1; i < xs.length; i += 1) { ctx.lineTo(xs[i], ys[i]); }
        ctx.closePath();
        ctx.fillStyle = rgba(mix(PAL[1], PAL[7], 0.4), 0.9);
        ctx.fill();
        ctx.strokeStyle = rgba(PAPER, 0.95);
        ctx.lineWidth = 1.3;
        ctx.lineJoin = 'round';
        ctx.stroke();
    }
    function statPairs(): [string, string][] {
        return [['마디', String(xs.length)], ['둘레', Math.round(perimeter()) + 'px']];
    }
    function runText(): string { return TXT_RUN; }
    function doneText(): string { return TXT_DONE; }

    const TXT_DONE = '다 자람 — Enter 로 새 씨앗';
    const TXT_PAUSE = '일시정지 — Space 로 이어서';
    // 시연 — 첫 200ms 는 빈 판으로 두고(첫 변화 200ms 뒤) 자라게 한 뒤, 다 자라면 900ms 머물고 다음 씨앗으로
    const DEMO_LEAD = 200;
    const DEMO_HOLD_MS = 900;
    // 동작 줄이기에서 한 번에 끝까지 키울 때 틱 수 상한 — 계산이 끝나지 않는 씨앗이 있어도 화면이 멈추지 않게
    const GROW_GUARD = 6000;
    let paused = false;
    let done = false;
    let holdMs = 0;
    let clock = 0;
    function reseed(s: number): void {
        seed = s;
        age = 0;
        done = false;
        holdMs = 0;
        plant(s);
    }
    function tickGrow(): void {
        if (done) { return; }
        age += FIXED_DT;
        if (grow()) { done = true; }
    }
    // 끝까지 한 번에 — 동작 줄이기에서는 자라는 과정 없이 다 자란 그림을 바로 보인다
    function finishNow(): void {
        let g = 0;
        while (!done && g < GROW_GUARD) { tickGrow(); g += 1; }
    }
    function report(): void {
        if (paused) { say(TXT_PAUSE); }
        else if (done) { say(doneText()); }
        else { say(runText()); }
    }
    function render(): void {
        paintFrame();
        const pairs: [string, string][] = [['씨앗', String(seed)]];
        drawStats(pairs.concat(statPairs()));
        report();
    }
    function setPaused(v: boolean): void {
        paused = v;
        if (pauseBtn) { pauseBtn.setAttribute('aria-pressed', v ? 'true' : 'false'); }
    }
    // 입력 한 번 뒤 — 동작 줄이기면 그 씨앗의 다 자란 모습으로 바로 그린다
    function after(): void {
        if (still) { finishNow(); }
        render();
    }
    function newSeed(): void { setPaused(false); reseed(nextSeed(seed)); }
    function replaySeed(): void { setPaused(false); reseed(seed); }
    cv.addEventListener('pointerdown', function (): void { wake(); after(); });
    cv.addEventListener('keydown', function (ev: KeyboardEvent): void {
        const k = ev.key;
        if (k === 'Enter') { newSeed(); }
        else if (k === 'r' || k === 'R') { replaySeed(); }
        else if (k === ' ') { setPaused(!paused); }
        else { return; }
        ev.preventDefault();
        wake();
        after();
    });
    if (redrawBtn) { redrawBtn.addEventListener('click', function (): void { wake(); newSeed(); after(); }); }
    if (replayBtn) { replayBtn.addEventListener('click', function (): void { wake(); replaySeed(); after(); }); }
    if (pauseBtn) { pauseBtn.addEventListener('click', function (): void { wake(); setPaused(!paused); after(); }); }
    function onResize(): void {
        fitCanvas();
        render();
    }
    fitCanvas();
    window.addEventListener('resize', onResize);
    reseed(SEED0);
    function tick(): void {
        clock += FIXED_DT;
        if (demo) {
            if (clock < DEMO_LEAD) { return; }
            if (done) {
                holdMs += FIXED_DT;
                if (holdMs >= DEMO_HOLD_MS) { reseed(nextSeed(seed)); }
                return;
            }
        }
        if (!paused) { tickGrow(); }
    }
    let rafId = 0;
    let lastTs = -1;
    let acc = 0;
    function frame(ts: number): void {
        if (still) { rafId = 0; return; }
        if (lastTs < 0) { lastTs = ts; }
        // 탭이 숨었다 돌아와도 한 번에 100ms 까지만 따라잡는다 — 한 프레임에 성장 계산이 몰리지 않게
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
    // 동작 줄이기 설정이 페이지를 연 채 바뀌면 — 켜지면 루프를 멈추고 다 자란 그림으로, 꺼지면 루프를 다시 돈다
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
        <canvas className={cx("pc__canvas")} data-role="canvas" width={480} height={300} tabIndex={0} aria-label="닫힌 선의 마디가 서로 밀어내고 긴 변에 새 마디가 끼워지며 산호처럼 주름지는 그림. Enter 로 새 씨앗을 그리고, R 로 같은 씨앗을 처음부터 다시 키우고, Space 로 일시정지한다"></canvas>
        <p className={cx("pc__status")} data-role="status" aria-live="off">주름이 접히며 자라는 중</p>
        <div className={cx("pc__tools")}>
          <button className={cx("pc__btn")} data-role="redraw" type="button">다시 그리기</button>
          <button className={cx("pc__btn")} data-role="replay" type="button">같은 씨앗</button>
          <button className={cx("pc__btn")} data-role="pause" type="button" aria-pressed="false">일시정지</button>
        </div>
    </div>
  );
}
