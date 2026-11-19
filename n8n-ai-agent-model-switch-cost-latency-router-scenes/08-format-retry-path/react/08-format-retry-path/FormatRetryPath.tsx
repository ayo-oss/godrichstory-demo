// FormatRetryPath - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./FormatRetryPath.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => (styles as Record<string, string>)[n] ?? n).join(" ");

function main(root: HTMLElement): (() => void) | undefined {
// ── 534 공통 엔진 — 533 run() 시계 계승 (WAAPI 시계읽기·pause·rebuild·reduced 분기)
const W = 480;
const CX0 = 8;
const CW = 432;
function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
function fill(s: string, ...rest: any[]): string {
    const keys = ['{a}', '{b}', '{c}', '{d}', '{e}', '{f}', '{g}', '{h}'];
    const v = [];
    for (let i = 1; i < arguments.length; i += 1) { v.push(String(arguments[i])); }
    let o = s;
    for (let i = 0; i < keys.length; i += 1) {
        o = o.split(keys[i]).join(i < v.length ? v[i] : '');
    }
    return o;
}
function f0(v: number): string { return String(Math.round(v)); }
function f1(v: number): string { return (Math.round(v * 10) / 10).toFixed(1); }
function f2(v: number): string { return (Math.round(v * 100) / 100).toFixed(2); }
const rootEl: HTMLElement = root;
const innerEl = rootEl.querySelector('[data-role="inner"]') as HTMLElement;
const sceneEl = rootEl.querySelector('[data-role="scene"]') as HTMLElement;
const chartEl = rootEl.querySelector('[data-role="chart"]') as HTMLElement;
const probeEl = rootEl.querySelector('[data-role="probe"]') as HTMLElement;
const padEl = rootEl.querySelector('[data-role="pad"]') as HTMLElement;
const statusP = rootEl.querySelector('[data-role="status"]') as HTMLElement;
const readA = rootEl.querySelector('[data-role="reada"]') as HTMLElement;
const readB = rootEl.querySelector('[data-role="readb"]') as HTMLElement;
const doneP = rootEl.querySelector('[data-role="done"]') as HTMLElement;
const pauseBtn = rootEl.querySelector('[data-role="pause"]') as HTMLElement;
const reduced: boolean = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function make(tag: string, cls: string, parent: HTMLElement): HTMLElement {
    const e = document.createElement(tag);
    if (cls) { e.className = cx(cls); }
    parent.appendChild(e);
    return e;
}
function put(e: HTMLElement, x: number, y: number, w: number, h: number): void {
    e.style.left = x + 'px';
    e.style.top = y + 'px';
    if (w > 0) { e.style.width = w + 'px'; }
    if (h > 0) { e.style.height = h + 'px'; }
}
const sweepEl = make('i', 'sweep', sceneEl);
const scWrap = make('div', 'scwrap', sceneEl);
const clkEl = make('i', 'clk', sceneEl);
function clearAll(): void {
    scWrap.textContent = '';
    chartEl.textContent = '';
    probeEl.textContent = '';
}
function seedHash(i: number, seed: number): number {
    const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
    return x - Math.floor(x);
}
function animsIn(host: HTMLElement): any[] { return host.getAnimations({ subtree: true }) as any[]; }
function spanOf(d: number, dur: number): { s: number; e: number; k: number } { return { s: d, e: d + dur, k: 0 }; }
function bar(cls: string, x: number, y: number, w: number, h: number): HTMLElement {
    const e = make('i', cls, chartEl);
    put(e, x, y, w, h);
    return e;
}
function drawRows(segs: any[], max: number): void {
    const n = segs.length;
    const h = clamp(Math.floor((34 - (n - 1)) / n), 2, 7);
    for (let i = 0; i < n; i += 1) {
        const sg = segs[i];
        const x = CX0 + clamp(sg.s, 0, max) / max * CW;
        const w = Math.max(2, (clamp(sg.e, 0, max) - clamp(sg.s, 0, max)) / max * CW);
        bar('bar k' + sg.k, x, 5 + i * (h + 1), w, h);
    }
}
function axis(max: number): void {
    const a = make('b', 'ax', chartEl);
    a.textContent = '0';
    put(a, CX0, 40, 0, 0);
    const b = make('b', 'ax ax--r', chartEl);
    b.textContent = f0(max) + 'ms';
    put(b, CX0 + CW - 60, 40, 60, 0);
}
let headEl: any = null;
function setReads(a: string, ...bs: (string | number)[]): void {
    readA.textContent = a;
    readB.textContent = bs.join(' ');
}
function demoT(t: number): number { return t % 2000; }
let piNow: any = 0;
function run(cfg: any): () => void {
    const off = new AbortController();
    let pi = 0;
    let cycle = 2000;
    let paused = false;
    let raf = 0;
    let clock: any = null;
    let lastStatus = '';
    function fit() {
        const k = rootEl.clientWidth / W;
        innerEl.style.transform = 'scale(' + k + ')';
    }
    function rebuild() {
        clearAll();
        piNow = pi;
        cycle = Math.max(2000, cfg.build(pi));
        headEl = cfg.head === false ? null : make('i', 'ph', chartEl);
        clkEl.style.animationDuration = f0(cycle) + 'ms';
        const all = animsIn(sceneEl);
        clock = null;
        for (let i = 0; i < all.length; i += 1) {
            const an = all[i];
            if (an.animationName && an.effect && an.effect.target === clkEl) {
                clock = an;
            }
        }
    }
    function restart() {
        const all = animsIn(sceneEl);
        for (let i = 0; i < all.length; i += 1) {
            all[i].currentTime = 0;
            if (paused) { all[i].pause(); }
            else { all[i].play(); }
        }
    }
    function tick() {
        const ct = clock ? Number(clock.currentTime) : 0;
        const t = isFinite(ct) ? ct : 0;
        if (headEl) {
            headEl.style.transform = 'translateX(' + (CX0 + clamp(t / cycle, 0, 1) * CW) + 'px)';
        }
        sweepEl.style.setProperty('--sw', String(Math.round(t / cycle * 100)));
        const s = cfg.frame(t);
        if (s !== lastStatus) {
            statusP.textContent = s;
            lastStatus = s;
        }
        if (!paused && clock && t >= cycle - 1) {
            pi = (pi + 1) % cfg.count;
            rebuild();
            restart();
        }
        raf = requestAnimationFrame(tick);
    }
    function setPaused(p: boolean): void {
        paused = p;
        pauseBtn.setAttribute('aria-pressed', p ? 'true' : 'false');
        const all = animsIn(sceneEl);
        for (let i = 0; i < all.length; i += 1) {
            if (p) { all[i].pause(); }
            else { all[i].play(); }
        }
        doneP.textContent = readB.textContent;
    }
    function shift(d: number): void {
        pi = (pi + d + cfg.count) % cfg.count;
        rebuild();
        restart();
        doneP.textContent = readB.textContent;
    }
    pauseBtn.addEventListener('click', function () { setPaused(!paused); }, { signal: off.signal });
    padEl.addEventListener('keydown', function (ev) {
        if (ev.target === pauseBtn) { return; }
        if (ev.key === ' ' || ev.key === 'Enter') {
            ev.preventDefault();
            setPaused(!paused);
        }
        else if (ev.key === 'r' || ev.key === 'R') { shift(-pi); }
        else if (ev.key === 'ArrowRight') { ev.preventDefault(); shift(1); }
        else if (ev.key === 'ArrowLeft') { ev.preventDefault(); shift(-1); }
    }, { signal: off.signal });
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) { setPaused(true); }
    }, { signal: off.signal });
    window.addEventListener('resize', fit, { signal: off.signal });
    fit();
    rebuild();
    if (reduced) {
        cfg.frame(1e9);
        statusP.textContent = readB.textContent;
        doneP.textContent = readB.textContent;
    }
    else {
        restart();
        raf = requestAnimationFrame(tick);
    }
    return function () {
        cancelAnimationFrame(raf);
        off.abort();
    };
}
// ── 534-08 format-retry-path — 모델 출력 JSON 이 fitCheck 스키마 격자와 겹쳐지고 어긋난 필드만 붉게.
// 유사도 = 일치 필드 / 전체 필드 ×100. 재시도 사다리: ①temp↓ ②model swap ③prompt 재구성 —
// 단계마다 유사도가 올라가다 마지막 실패는 사람 검토 경로(nd--fail)로 빠진다.
// 백오프: wait = BASE × 2^(step-1) — 400·800·1600ms.
const BASE_BACKOFF = 400;
const FIELDS: any[] = ['id', 'title', 'items', 'price', 'meta', 'tags'];
const SCENES08: any[] = [
    { match: [1, 0, 0, 0, 1, 0], step: 0 },  // 33% — 1차: 온도 낮춤
    { match: [1, 1, 0, 0, 1, 0], step: 1 },  // 50% — 2차: 모델 교체
    { match: [1, 1, 1, 1, 1, 0], step: 2 },  // 83% — 3차: 프롬프트 재구성
    { match: [1, 1, 1, 1, 1, 0], step: 3 }   // 83% — 끝내 불일치 → 사람 검토
];
const POLICY: any[] = ['temp 0.7→0.2', 'model swap', 'prompt rebuild', 'human review'];
const STEP_MS08 = 500;
let gridCells08: any = null;
let outCells08: any = null;
let fitPct08: any = null;
let ladder08: any = null;
let backoff08: any = null;
let human08: any = null;
function simScore(m: any) {
    // 유사도 = 일치 필드 수 / 전체 × 100
    let s = 0;
    for (let k = 0; k < m.length; k += 1) { s += m[k]; }
    return s / m.length * 100;
}
function build(i: any) {
    // 스키마 격자 — 상단 기대 필드 6칸
    gridCells08 = [];
    outCells08 = [];
    const gx = 26;
    const gy = 24;
    const cw = 36;
    for (let k = 0; k < FIELDS.length; k += 1) {
        const gx1 = gx + k * (cw + 4);
        const sc = make('i', 'scell', scWrap);
        put(sc, gx1, gy, cw, 20);
        const st = make('b', 'scell__t', scWrap);
        st.textContent = FIELDS[k];
        put(st, gx1, gy + 24, cw, 0);
        gridCells08.push(sc);
        // 출력 행 — 겹침 비교 (아래 20px)
        const oc = make('i', 'scell ocell', scWrap);
        put(oc, gx1, gy + 40, cw, 20);
        outCells08.push(oc);
    }
    const expT = make('b', 'qlbl2', scWrap);
    expT.textContent = 'fitCheck schema';
    put(expT, 26, 8, 200, 0);
    const gotT = make('b', 'qlbl2', scWrap);
    gotT.textContent = 'model output';
    put(gotT, 26, 62, 200, 0);
    // 유사도 리드아웃
    fitPct08 = make('b', 'fittxt', scWrap);
    put(fitPct08, 300, 24, 150, 0);
    // 재시도 사다리 — 우측 3단 + 사람 검토
    ladder08 = [];
    const ys = [64, 84, 104];
    for (let k = 0; k < 3; k += 1) {
        const b = make('b', 'ladstep', scWrap);
        b.textContent = POLICY[k];
        put(b, 300, ys[k], 150, 0);
        ladder08.push(b);
    }
    human08 = make('div', 'nd nd--fail', scWrap);
    put(human08, 300, 120, 118, 20);
    const hh = make('i', 'nd__t', human08);
    hh.textContent = 'nd--fail: human';
    backoff08 = make('b', 'urltxt2', scWrap);
    put(backoff08, 26, 110, 220, 0);
    const ov = make('b', 'ov ovs', sceneEl);
    put(ov, 26, 136, 260, 0);
    ov.textContent = 'backoff = 400 × 2^(n-1) ms';
    const segs = [];
    for (let k = 0; k < SCENES08.length; k += 1) { segs.push(spanOf(k * STEP_MS08, STEP_MS08 - 40)); }
    drawRows(segs, 2000);
    axis(2000);
    setReads('fitCheck 유사도 {a}% · 재시도 {b} — 모델 교체는 2단계일 뿐', f1(simScore(SCENES08[2].match)), POLICY[2]);
    doneP.textContent = '';
    return 2000;
}
function frame(t: any) {
    const si = Math.min(SCENES08.length - 1, Math.floor(demoT(t) / STEP_MS08));
    const sc = SCENES08[si];
    const ph = clamp((demoT(t) - si * STEP_MS08) / (STEP_MS08 * 0.7), 0, 1);
    const fit = simScore(sc.match);
    const last = si === SCENES08.length - 1;
    // 격자 대조 — 어긋난 필드만 붉게
    for (let k = 0; k < FIELDS.length; k += 1) {
        const okF = sc.match[k] === 1;
        outCells08[k].className = cx('scell ocell' + (okF ? '' : ' ocell--bad') + (ph > 0.25 ? ' ocell--lit' : ''));
    }
    fitPct08.textContent = 'fit ' + f1(fit) + '%';
    fitPct08.className = cx('fittxt' + (fit >= 95 ? ' fittxt--ok' : ''));
    // 사다리 강조 — 현재 단계
    for (let k = 0; k < 3; k += 1) {
        ladder08[k].className = cx('ladstep' + (k === sc.step && !last ? ' ladstep--on' : ''));
    }
    human08.className = cx('nd nd--fail' + (last && ph > 0.5 ? ' deadend--on' : ''));
    // 백오프 — BASE × 2^(step)
    const wait = BASE_BACKOFF * Math.pow(2, sc.step);
    backoff08.textContent = last ? ('final fit ' + f1(fit) + '% → human review') : ('retry ' + f0(sc.step + 1) + ' · ' + POLICY[sc.step] + ' · wait ' + f0(wait) + 'ms');
    return last ? ('fit ' + f1(fit) + '% — 사람 검토로') : ('retry ' + f0(sc.step + 1) + ' (' + POLICY[sc.step] + ') — fit ' + f1(fit) + '%');
}

    return run({ count: 1, build: build, frame: frame, head: true });
}

export default function FormatRetryPath() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!rootRef.current) return;
    return main(rootRef.current) as () => void;
  }, []);
  return (
    <div className={cx("ez is-demo")} ref={rootRef}>
      <div className={cx("ez__in")} data-role="inner">
        <div className={cx("ez__pad")} data-role="pad" tabIndex={0} role="application" aria-label={'시연 무대 — Space 또는 Enter 로 일시정지, R 로 처음부터, 왼쪽·오른쪽 방향키로 다음 시나리오로'}>
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={''}></div>
          <div className={cx("ez__probe")} data-role="probe" aria-hidden="true"></div>
          <div className={cx("ez__chart")} data-role="chart" aria-hidden="true"></div>
          <p className={cx("ez__status")} data-role="status" aria-live="off">{'장면 준비'}</p>
          <p className={cx("ez__reada")} data-role="reada" aria-hidden="true"></p>
          <p className={cx("ez__readb")} data-role="readb" aria-hidden="true"></p>
          <div className={cx("ez__ctrl")}>
            <button className={cx("ez__pause")} data-role="pause" type="button" aria-pressed={"false"}>{'일시정지'}</button>
          </div>
          <p className={cx("ez__done")} data-role="done" role="status" aria-live="polite"></p>
        </div>
      </div>
    </div>
  );
}
