// RouterVerdictScore - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./RouterVerdictScore.module.scss";

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
// ── 실행 퀄: 프리셋 하나가 한 주기
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
// 534-01 router-verdict-score — 요청마다 세 모델 카드의 routeScore 가 재계산되고 최저점 카드로 경로가 이동한다.
// routeScore = estCost*(1-LATENCY_W) + queue*LATENCY_W — 비용항과 지연항의 가중 합산 (단위: 정규화 점수)
const LATENCY_W = 0.4;
const MODELS01: any[] = [
    { id: 'hosted', cost: 0.62 },
    { id: 'local', cost: 0.18 },
    { id: 'free', cost: 0.05 }
];
const REQ_MS01 = 640;
let cards01: any = null;
let scores01: any = null;
let qbars01: any = null;
let routeEl01: any = null;
let pkt01: any = null;
let verdict01: any = null;
function routeScore(m: any, t: any) {
    // queue(t) — 요청 바구니의 기저 대기줄(seedHash 로 결정적)에 시간 드리프트를 더한다 (0~1 정규화)
    const base = 0.22 + 0.6 * seedHash(Math.floor(t / REQ_MS01) + MODELS01.indexOf(m) * 7, 3);
    const q = clamp(base + 0.08 * Math.sin(t / 200 + MODELS01.indexOf(m)), 0, 1);
    return { q: q, s: m.cost * (1 - LATENCY_W) + q * LATENCY_W };
}
function build(i: any) {
    cards01 = [];
    scores01 = [];
    qbars01 = [];
    const ys = [8, 56, 104];
    for (let k = 0; k < 3; k += 1) {
        const m = MODELS01[k];
        const c = make('div', 'mcard', scWrap);
        put(c, 216, ys[k], 220, 44);
        const t = make('b', 'mcard__t', scWrap);
        t.textContent = m.id;
        put(t, 224, ys[k] + 4, 80, 0);
        const s = make('b', 'mcard__s', scWrap);
        put(s, 224, ys[k] + 24, 120, 0);
        scores01.push(s);
        const q = make('i', 'qbar', scWrap);
        put(q, 340, ys[k] + 28, 0, 8);
        qbars01.push(q);
        const qbg = make('i', 'qbar qbar--bg', scWrap);
        put(qbg, 340, ys[k] + 28, 84, 8);
        cards01.push(c);
    }
    verdict01 = make('b', 'vbadge', scWrap);
    put(verdict01, 10, 132, 196, 16);
    routeEl01 = make('i', 'cn', scWrap);
    put(routeEl01, 60, 76, 156, 0);
    routeEl01.style.width = '156px';
    pkt01 = make('div', 'nd nd--agent', scWrap);
    pkt01.innerHTML = '<i class="' + cx('nd__t') + '">req</i>';
    put(pkt01, 10, 68, 44, 18);
    const ov = make('b', 'ov ovs', sceneEl);
    put(ov, 216, 148, 200, 12);
    ov.textContent = 'score = cost*(1-W) + queue*W';
    drawRows([spanOf(0, 2000)], 2000);
    axis(2000);
    setReads('routeScore(LATENCY_W ' + f1(LATENCY_W) + ') — 요청 {a}회 × 모델 3 · 최저점 승자', f0(3));
    doneP.textContent = '';
    return 2000;
}
function frame(t: any) {
    const ti = Math.min(2, Math.floor(demoT(t) / REQ_MS01));
    const ph = clamp((demoT(t) - ti * REQ_MS01) / (REQ_MS01 * 0.55), 0, 1);
    let best = 0;
    let bs = 1e9;
    for (let k = 0; k < 3; k += 1) {
        const r = routeScore(MODELS01[k], t);
        scores01[k].textContent = 'score ' + f1(r.s * 10) + ' · queue ' + f0(r.q * 100) + '%';
        qbars01[k].style.width = f0(r.q * 84) + 'px';
        cards01[k].className = cx('mcard');
        if (r.s < bs) { bs = r.s; best = k; }
    }
    cards01[best].className = cx('mcard mcard--win');
    const ty = [8, 56, 104][best] + 22;
    routeEl01.style.transform = 'rotate(' + f1(Math.atan2(ty - 76, 156) * 180 / Math.PI) + 'deg)';
    routeEl01.style.transformOrigin = '0 0';
    pkt01.style.transform = 'translateX(' + f1(ph * 152) + 'px)';
    verdict01.textContent = 'req ' + f0(ti + 1) + ' → ' + MODELS01[best].id + ' (score ' + f1(bs * 10) + ')';
    return verdict01.textContent;
}

    return run({ count: 1, build: build, frame: frame, head: true });
}

export default function RouterVerdictScore() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!rootRef.current) return;
    return main(rootRef.current) as () => void;
  }, []);
  return (
    <div className={cx("ez is-demo")} ref={rootRef}>
      <div className={cx("ez__in")} data-role="inner">
        <div className={cx("ez__pad")} data-role="pad" tabIndex={0} role="application" aria-label={'시연 무대 — Space 또는 Enter 로 일시정지, R 로 처음부터, 왼쪽·오른쪽 방향키로 다른 요청으로'}>
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
