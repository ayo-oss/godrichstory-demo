// ModelCardGrid - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./ModelCardGrid.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => (styles as Record<string, string>)[n] ?? n).join(" ");

function main(root: HTMLElement): (() => void) | undefined {
// ── 534 공통 엔진 — 533 run() 시계 계승
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
// 534-02 model-card-grid — 모델 카드 4장의 단가 막대(priceTag)와 지연 상한(latCap) 비교. 포커스 링 순회.
// 단가 막대 높이 = 백만 토큰당 단가 / 최대 단가 * 최대높이 (정규화). latCap 초과 측정은 초과 배율로 점멸 주기 계산.
const CARDS02: any[] = [
    { id: 'hosted', price: 15.0, lat: 1.4, cap: 2.0 },
    { id: 'local', price: 0.0, lat: 4.2, cap: 3.0 },
    { id: 'free', price: 0.0, lat: 2.1, cap: 2.0 },
    { id: 'custom', price: 4.5, lat: 2.6, cap: 3.0 }
];
const PRICE_MAX02 = 15.0;
let cardEls02: any = null;
let priceBars02: any = null;
let capEls02: any = null;
let ring02: any = null;
const FOCUS_MS02 = 500;
function build(i: any) {
    cardEls02 = [];
    priceBars02 = [];
    capEls02 = [];
    const xs = [10, 118, 226, 334];
    for (let k = 0; k < 4; k += 1) {
        const c = CARDS02[k];
        const el = make('div', 'mcard', scWrap);
        put(el, xs[k], 10, 100, 132);
        cardEls02.push(el);
        const t = make('b', 'mcard__t', scWrap);
        t.textContent = c.id;
        put(t, xs[k] + 8, 16, 84, 0);
        const pb = make('i', 'pbar', scWrap);
        put(pb, xs[k] + 8, 34, 84, 0);
        priceBars02.push(pb);
        const pt = make('b', 'mcard__s', scWrap);
        pt.textContent = '$' + f1(c.price) + '/M tok';
        put(pt, xs[k] + 8, 60, 84, 0);
        const cb = make('b', 'capchip', scWrap);
        cb.textContent = 'lat ' + f1(c.lat) + 's / cap ' + f1(c.cap) + 's';
        put(cb, xs[k] + 8, 78, 84, 16);
        capEls02.push(cb);
        const lb = make('b', 'mcard__s', scWrap);
        lb.textContent = 'models ' + f0(3 + ((k * 5) % 7));
        put(lb, xs[k] + 8, 100, 84, 0);
    }
    ring02 = make('i', 'fring', scWrap);
    put(ring02, 10, 10, 100, 132);
    const ov = make('b', 'ov ovs', sceneEl);
    put(ov, 10, 148, 220, 12);
    ov.textContent = 'bar = $/M-tokens / max $15.0';
    drawRows([spanOf(0, 500), spanOf(500, 500), spanOf(1000, 500), spanOf(1500, 500)], 2000);
    axis(2000);
    setReads('modelCard(priceTag·latCap) — 카드 {a}장 · 포커스 순회 500ms · latCap 초과 점멸', f0(4));
    doneP.textContent = '';
    return 2000;
}
function frame(t: any) {
    const fi = Math.min(3, Math.floor(demoT(t) / FOCUS_MS02));
    const xs = [10, 118, 226, 334];
    ring02.style.transform = 'translateX(' + f0(xs[fi] - 10) + 'px)';
    for (let k = 0; k < 4; k += 1) {
        const c = CARDS02[k];
        const h = clamp(c.price / PRICE_MAX02 * 24, 2, 24);
        priceBars02[k].style.height = f0(h) + 'px';
        priceBars02[k].style.top = f0(58 - h) + 'px';
        const over = c.lat > c.cap;
        // 초과 배율이 크면 점멸 주기가 짧다 — 점멸은 steps 컷 대신 투명도 토글(부드러운 sine)로
        capEls02[k].className = cx('capchip' + (over && Math.sin(t / (240 / clamp(c.lat / c.cap, 1, 2))) > 0 ? ' capchip--bad' : ''));
    }
    return 'focus ' + CARDS02[fi].id + ' — $' + f1(CARDS02[fi].price) + '/M · lat ' + f1(CARDS02[fi].lat) + 's' + (CARDS02[fi].lat > CARDS02[fi].cap ? ' (cap over)' : '');
}

    return run({ count: 1, build: build, frame: frame, head: true });
}

export default function ModelCardGrid() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!rootRef.current) return;
    return main(rootRef.current) as () => void;
  }, []);
  return (
    <div className={cx("ez is-demo")} ref={rootRef}>
      <div className={cx("ez__in")} data-role="inner">
        <div className={cx("ez__pad")} data-role="pad" tabIndex={0} role="application" aria-label={'시연 무대 — Space 또는 Enter 로 일시정지, R 로 처음부터, 왼쪽·오른쪽 방향키로 다른 카드로'}>
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
