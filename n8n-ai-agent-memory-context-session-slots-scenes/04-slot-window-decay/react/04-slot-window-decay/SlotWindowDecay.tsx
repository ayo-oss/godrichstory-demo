// SlotWindowDecay - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./SlotWindowDecay.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => (styles as Record<string, string>)[n] ?? n).join(" ");

function main(root: HTMLElement): (() => void) | undefined {
// ── 533 공통 엔진 — 532 run() 시계 계승 (WAAPI 시계읽기·pause·rebuild·reduced 분기)
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
const rootEl: HTMLElement = root;
const innerEl = root.querySelector('[data-role="inner"]') as HTMLElement;
const sceneEl = root.querySelector('[data-role="scene"]') as HTMLElement;
const chartEl = root.querySelector('[data-role="chart"]') as HTMLElement;
const probeEl = root.querySelector('[data-role="probe"]') as HTMLElement;
const padEl = root.querySelector('[data-role="pad"]') as HTMLElement;
const statusP = root.querySelector('[data-role="status"]') as HTMLElement;
const readA = root.querySelector('[data-role="reada"]') as HTMLElement;
const readB = root.querySelector('[data-role="readb"]') as HTMLElement;
const doneP = root.querySelector('[data-role="done"]') as HTMLElement;
const pauseBtn = root.querySelector('[data-role="pause"]') as HTMLElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
function clearAll() {
    scWrap.textContent = '';
    chartEl.textContent = '';
    probeEl.textContent = '';
}
function seedHash(i: number, seed: number): number {
    const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
    return x - Math.floor(x);
}
function animsIn(host: HTMLElement): any[] { return host.getAnimations({ subtree: true }); }
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
function setReads(a: string, b: string): void {
    readA.textContent = a;
    readB.textContent = b;
}
// ── 533 주역 계산 — 슬롯 감쇠·자카드 승격 판정·레벤슈타인 중복 판정·요약 압축비
// TOKENS(q) — 문장을 소문자 단어 토큰으로 쪼갠다 (임베딩 없음 — 겹침 계산)
function tokens(q: string): string[] {
    return String(q).toLowerCase().split(/[^a-z0-9가-힣]+/).filter(function (s: any) { return s.length > 1; });
}
// JAC — 두 토큰 배열의 자카드 겹침(교집합/합집합). 05의 승격 판정이 쓴다
function jac(a: string[], b: string[]): number {
    let hit = 0;
    for (let i = 0; i < a.length; i += 1) {
        if (b.indexOf(a[i]) >= 0) { hit += 1; }
    }
    const uni = a.length + b.length - hit;
    return uni > 0 ? hit / uni : 0;
}
// LEV_DIST — 두 문자열의 레벤슈타인 편집 거리 (삽입·삭제·교체 각 1). 06의 중복 판정이 쓴다
function levDist(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    if (m === 0) { return n; }
    if (n === 0) { return m; }
    let prev = [];
    for (let j = 0; j <= n; j += 1) { prev.push(j); }
    for (let i = 1; i <= m; i += 1) {
        const cur = [i];
        for (let j = 1; j <= n; j += 1) {
            const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
            cur.push(Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost));
        }
        prev = cur;
    }
    return prev[n];
}
// MEM_DECAY — 예산 초과 시 오래된 턴 높이를 alpha^k 로 감쇠 (04의 주역 계산)
function memDecay(heights: number[], budget: number, alpha: number): number[] {
    let total = 0;
    for (let i = 0; i < heights.length; i += 1) { total += heights[i]; }
    const out = heights.slice();
    let k = 0;
    let idx = 0;
    while (total > budget && idx < out.length) {
        out[idx] = heights[idx] * Math.pow(alpha, k + 1);
        total = 0;
        for (let i = 0; i < out.length; i += 1) { total += out[i]; }
        k += 1;
        idx += 1;
    }
    return out;
}
// demoT — 2초 주기 래핑
function demoT(t: number): number { return t % 2000; }
// ── 실행 퀄: 프리셋 하나가 한 주기
let piNow = 0;
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
    function setPaused(p: any): void {
        paused = p;
        pauseBtn.setAttribute('aria-pressed', p ? 'true' : 'false');
        const all = animsIn(sceneEl);
        for (let i = 0; i < all.length; i += 1) {
            if (p) { all[i].pause(); }
            else { all[i].play(); }
        }
        doneP.textContent = readB.textContent;
    }
    function shift(d: any): void {
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
// 533-04 slot-window-decay — 세로 6슬롯에 턴 토큰이 쌓이고 총높이가 예산(360)을 넘으면
// 오래된 슬롯부터 높이 x DECAY_ALPHA^k 로 감쇠한다(memDecay). 밀려난 슬롯은 점선 윤곽만 남는다.
const DECAY_ALPHA = 0.72;
const H04 = [64, 56, 72, 68, 76, 70]; // 턴 토큰 높이 (총 406 — 4턴째 68 에서 360 예산 초과로 감쇠 발동)
let slots04: any = null;
let bud04: any = null;
let tot04: any = null;
let lab04: any = null;
function build(i: number): number {
    const PRE = [0, 2, 4][i]; // 프리셋: 보이는 턴 수 시작
    slots04 = [];
    const SX = [14, 90, 166, 242, 318, 394];
    for (let k = 0; k < 6; k += 1) {
        const sl = make('i', 'turnbar', scWrap);
        put(sl, SX[k], 0, 40, 0);
        sl.style.bottom = '34px';
        sl.style.top = 'auto';
        sl.style.height = '0px';
        slots04.push(sl);
        const lb = make('b', 'iterlab', scWrap);
        lb.textContent = 't' + (k + 1);
        put(lb, SX[k] + 12, 128, 20, 0);
    }
    // 예산선
    bud04 = make('i', 'budgetline', scWrap);
    bud04.style.top = '34px'; // bottom 기준: scene 높이 156 - 34(bottom) - 예산 px
    bud04.style.left = '8px';
    bud04.style.right = '8px';
    const bl = make('b', 'budgetlab', scWrap);
    bl.textContent = 'budget 360';
    put(bl, 376, 130, 60, 0);
    tot04 = make('b', 'membox__s', scWrap);
    put(tot04, 220, 10, 90, 0);
    lab04 = make('b', 'ov ovs', sceneEl);
    put(lab04, 236, 130, 190, 12);
    lab04.textContent = 'decay alpha 0.72';
    drawRows([spanOf(120, 700), spanOf(900, 300)], 2000);
    axis(2000);
    setReads(fill('memDecay — DECAY_ALPHA {a} · 예산 360 · 턴높이 합 {b} · 프리셋 t{c}부터', f1(DECAY_ALPHA), f0(406), f0(PRE + 1)), '턴 토큰이 쌓이고 오래된 슬롯이 감쇠한다');
    doneP.textContent = '';
    return 2000;
}
function frame(t: number): string {
    const ph = demoT(t) / 2000;
    const shown = clamp(Math.floor(ph * 8) + 1, 1, 6); // 8단계로 6턴 등장
    const hs = [];
    for (let k = 0; k < shown; k += 1) { hs.push(H04[k]); }
    const dec = memDecay(hs, 360, DECAY_ALPHA);
    let tot = 0;
    for (let k = 0; k < dec.length; k += 1) { tot += dec[k]; }
    for (let k = 0; k < 6; k += 1) {
        const sl = slots04[k];
        if (k < shown) {
            const h = clamp(dec[k] / 360 * 108, 0, 108); // 예산 360 -> 108px 스케일
            sl.style.height = h + 'px';
            const ghost = dec[k] < H04[k] * 0.9;
            sl.className = cx('turnbar' + (ghost ? ' turnbar--fade' : (k === shown - 1 ? ' turnbar--new' : '')));
        }
        else {
            sl.style.height = '0px';
            sl.className = cx('turnbar');
        }
    }
    // 예산선 위치 — bottom 34 + 108 = scene 안. budgetline top = 156-34-108 = 14? 고정: 108px 스케일이 곧 예산선
    bud04.style.top = (156 - 34 - 108) + 'px';
    tot04.textContent = 'total ' + f0(tot) + '/360';
    return fill('슬롯 {a}/6 — 감쇠 {b}개 · 총 {c}/360 · alpha {d}', f0(shown), f0(dec.filter(function (x: any) { return x < H04[0] * 0.99; }).length), f0(tot), f1(DECAY_ALPHA));
}

    return run({ count: 3, build: build, frame: frame });
}

export default function SlotWindowDecay() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!rootRef.current) return;
    return main(rootRef.current) as () => void;
  }, []);
  return (
    <div className={cx("ez is-demo")} ref={rootRef}>
      <div className={cx("ez__in")} data-role="inner">
        <div className={cx("ez__pad")} data-role="pad" tabIndex={0} role="application" aria-label={'시연 무대 — Space 또는 Enter 로 일시정지, R 로 처음부터, 왼쪽·오른쪽 방향키로 다른 값으로'}>
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
