// TileNeighborMatch - vanilla 판(06-gen-art-tile-neighbor-match-collapse) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./TileNeighborMatch.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function TileNeighborMatch() {
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
    // 타일마다 네 변(위·오른쪽·아래·왼쪽)의 종류 — 0 풀밭, 1 길, 2 물길. 맞닿는 두 변의 숫자가 같아야 이웃이 된다.
    // 길과 물길이 엇갈리는 타일(다리)은 없다 — 그래서 길과 물길이 한 칸에서 만나야 하는 자리가 생기면 모순이 난다
    const TILE_EDGES: string[] = [
        '0000',
        '0101', '1010',
        '1100', '0110', '0011', '1001',
        '1110', '0111', '1011', '1101',
        '1111',
        '0202', '2020',
        '2200', '0220', '0022', '2002',
    ];
    // 고를 때의 가중치 — 같은 순서. 풀밭이 가장 넓게
    const TILE_WEIGHTS: number[] = [
        6,
        2, 2,
        1, 1, 1, 1,
        0.6, 0.6, 0.6, 0.6,
        0.4,
        1.6, 1.6,
        0.8, 0.8, 0.8, 0.8,
    ];
    // 한 틱에 고르는(무너뜨리는) 칸 수 — 성장 속도이자 프레임당 계산량 상한
    const COLLAPSE_PER_FRAME = 2;
    const CELL = 20;
    const COLS = W / CELL;
    const ROWS = H / CELL;
    const NT = TILE_EDGES.length;
    const ALL = (1 << NT) - 1;
    const SEED0 = 66110;
    const TXT_RUN = '이웃과 맞는 타일을 고르는 중';
    const TXT_RESTARTS = '모순 재시작';
    // 방향 d(0 위·1 오른쪽·2 아래·3 왼쪽)의 이웃 칸 오프셋과 맞은편 변
    const DC = [0, 1, 0, -1];
    const DR = [-1, 0, 1, 0];
    function edgeOf(t: number, d: number): number { return TILE_EDGES[t].charCodeAt(d) - 48; }
    // 미리 계산 — FIT[d][e] 는 "방향 d 의 이웃으로 놓였을 때 맞은편 변이 e 인 타일" 의 비트 묶음
    const FIT: number[][] = [];
    for (let d = 0; d < 4; d += 1) {
        const row: number[] = [0, 0, 0];
        for (let t = 0; t < NT; t += 1) { row[edgeOf(t, (d + 2) % 4)] |= 1 << t; }
        FIT.push(row);
    }
    function bits(m: number): number {
        let c = 0;
        let x = m;
        while (x) { x &= x - 1; c += 1; }
        return c;
    }
    const cand = new Int32Array(COLS * ROWS);
    const fixedTile = new Int8Array(COLS * ROWS);
    const flash = new Float64Array(COLS * ROWS);
    let tie = new Float64Array(COLS * ROWS);
    let trng: () => number = makeRng(SEED0);
    let left = 0;
    let restarts = 0;
    let lastContradiction = -1;
    function resetGrid(): void {
        cand.fill(ALL);
        fixedTile.fill(-1);
        flash.fill(0);
        left = COLS * ROWS;
        clearArt(INK);
    }
    function plant(s: number): void {
        trng = makeRng(s);
        tie = new Float64Array(COLS * ROWS);
        for (let i = 0; i < tie.length; i += 1) { tie[i] = trng() * 0.1; }
        restarts = 0;
        lastContradiction = -1;
        resetGrid();
    }
    function drawTile(i: number): void {
        const t = fixedTile[i];
        const x0 = (i % COLS) * CELL;
        const y0 = Math.floor(i / COLS) * CELL;
        const mx = x0 + CELL / 2;
        const my = y0 + CELL / 2;
        actx.fillStyle = rgba(mix(PAL[8], INK, 0.18), 1);
        actx.fillRect(x0, y0, CELL, CELL);
        // 물길 먼저, 그 위에 길
        for (let kind = 2; kind >= 1; kind -= 1) {
            const half = kind === 2 ? 4.5 : 2.6;
            actx.fillStyle = kind === 2 ? rgba(PAL[6], 1) : rgba(mix(PAL[4], PAPER, 0.5), 1);
            let any = false;
            for (let d = 0; d < 4; d += 1) {
                if (edgeOf(t, d) !== kind) { continue; }
                any = true;
                if (d === 0) { actx.fillRect(mx - half, y0, half * 2, CELL / 2 + half); }
                else if (d === 1) { actx.fillRect(mx - half, my - half, CELL / 2 + half, half * 2); }
                else if (d === 2) { actx.fillRect(mx - half, my - half, half * 2, CELL / 2 + half); }
                else { actx.fillRect(x0, my - half, CELL / 2 + half, half * 2); }
            }
            if (any) {
                // 가운데 이음 — 꺾이는 자리도 끊기지 않게
                actx.beginPath();
                actx.arc(mx, my, half, 0, TAU);
                actx.fill();
            }
        }
    }
    function fix(i: number, t: number): void {
        fixedTile[i] = t;
        cand[i] = 1 << t;
        flash[i] = 1;
        left -= 1;
        drawTile(i);
    }
    // 제약 전파 — 바뀐 칸을 큐에 넣고, 이웃마다 "맞닿은 변이 맞는 후보" 만 남긴다. 후보가 0 이 되면 모순(false)
    function propagate(start: number): boolean {
        const queue: number[] = [start];
        let q = 0;
        while (q < queue.length) {
            const i = queue[q];
            q += 1;
            const c = i % COLS;
            const r = Math.floor(i / COLS);
            for (let d = 0; d < 4; d += 1) {
                const nc = c + DC[d];
                const nr = r + DR[d];
                if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) { continue; }
                const j = nr * COLS + nc;
                if (fixedTile[j] >= 0) { continue; }
                // 이 칸 후보들이 방향 d 쪽에 내놓는 변 종류 — 그 종류와 맞는 타일만 이웃에 남는다
                let allow = 0;
                for (let t = 0; t < NT; t += 1) { if (cand[i] & (1 << t)) { allow |= FIT[d][edgeOf(t, d)]; } }
                const nm = cand[j] & allow;
                if (nm === cand[j]) { continue; }
                if (nm === 0) { return false; }
                cand[j] = nm;
                if (bits(nm) === 1) { fix(j, 31 - Math.clz32(nm)); }
                queue.push(j);
            }
        }
        return true;
    }
    // 후보가 가장 적은 칸(같으면 씨앗 난수로 정한 순서) 하나를 가중치 난수로 고른다
    function collapseOne(): boolean {
        let best = -1;
        let bestScore = 1e9;
        for (let i = 0; i < cand.length; i += 1) {
            if (fixedTile[i] >= 0) { continue; }
            const s = bits(cand[i]) + tie[i];
            if (s < bestScore) { bestScore = s; best = i; }
        }
        if (best < 0) { return true; }
        let total = 0;
        for (let t = 0; t < NT; t += 1) { if (cand[best] & (1 << t)) { total += TILE_WEIGHTS[t]; } }
        let pick = trng() * total;
        let chosen = 31 - Math.clz32(cand[best]);
        for (let t = 0; t < NT; t += 1) {
            if (!(cand[best] & (1 << t))) { continue; }
            pick -= TILE_WEIGHTS[t];
            if (pick <= 0) { chosen = t; break; }
        }
        fix(best, chosen);
        if (!propagate(best)) {
            // 모순 — 어떤 칸에도 놓을 타일이 없다. 횟수를 세고 판 전체를 처음부터(난수는 이어서)
            restarts += 1;
            lastContradiction = best;
            resetGrid();
        }
        return left === 0;
    }
    function grow(): boolean {
        for (let k = 0; k < cand.length; k += 1) { flash[k] = Math.max(0, flash[k] - 0.08); }
        for (let k = 0; k < COLLAPSE_PER_FRAME; k += 1) {
            if (collapseOne()) { return true; }
        }
        return left === 0;
    }
    function paintFrame(): void {
        blitArt();
        // 아직 정해지지 않은 칸 — 남은 후보가 적을수록 안개가 옅어진다(전파가 퍼지는 모습)
        for (let i = 0; i < cand.length; i += 1) {
            const x0 = (i % COLS) * CELL;
            const y0 = Math.floor(i / COLS) * CELL;
            if (fixedTile[i] < 0) {
                const k = bits(cand[i]) / NT;
                ctx.fillStyle = rgba(mix(PAL[3], INK, 0.55), 0.25 + 0.6 * k);
                ctx.fillRect(x0 + 1, y0 + 1, CELL - 2, CELL - 2);
            } else if (flash[i] > 0) {
                ctx.strokeStyle = rgba(PAPER, flash[i]);
                ctx.lineWidth = 1.5;
                ctx.strokeRect(x0 + 1, y0 + 1, CELL - 2, CELL - 2);
            }
        }
    }
    function statPairs(): [string, string][] {
        return [['남은 칸', String(left)], [TXT_RESTARTS, String(restarts)]];
    }
    function runText(): string { return restarts > 0 ? TXT_RUN + ' · ' + TXT_RESTARTS + ' ' + restarts : TXT_RUN; }
    function doneText(): string { return TXT_DONE + ' · ' + TXT_RESTARTS + ' ' + restarts; }

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
        <canvas className={cx("pc__canvas")} data-role="canvas" width={480} height={300} tabIndex={0} aria-label="후보가 가장 적은 칸부터 이웃과 변이 맞는 타일을 골라 길과 물길 지도를 채우고, 모순이 나면 처음부터 다시 하는 그림. Enter 로 새 씨앗을 그리고, R 로 같은 씨앗을 처음부터 다시 키우고, Space 로 일시정지한다"></canvas>
        <p className={cx("pc__status")} data-role="status" aria-live="off">이웃과 맞는 타일을 고르는 중</p>
        <div className={cx("pc__tools")}>
          <button className={cx("pc__btn")} data-role="redraw" type="button">다시 그리기</button>
          <button className={cx("pc__btn")} data-role="replay" type="button">같은 씨앗</button>
          <button className={cx("pc__btn")} data-role="pause" type="button" aria-pressed="false">일시정지</button>
        </div>
    </div>
  );
}
