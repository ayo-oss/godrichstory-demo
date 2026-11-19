// FallbackLadder - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./FallbackLadder.module.scss";

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
// 534-04 fallback-ladder — 호출마다 주사위가 굴러 FAIL_BASE 확률로 1차 모델이 죽으면 사다리를 내려간다.
// 누적 성공률 = 1-(1-p)^n — 3단 실패는 최종 실패 경로(nd--fail).
const FAIL_BASE = 0.18;
const SCENES04: any[] = [
    { rolls: [0.92, 0.99, 0.99], name: 'clean' },        // 1차 성공
    { rolls: [0.10, 0.88, 0.99], name: 'step2' },        // 1차 실패 → 2차 성공
    { rolls: [0.10, 0.14, 0.70], name: 'step3' },        // 1·2차 실패 → 3차 성공
    { rolls: [0.10, 0.14, 0.16], name: 'dead' }          // 3단 실패 — 최종 실패 경로
];
const ROLL_MS04 = 500;
let stepEls04: any = null;
let pkt04: any = null;
let deadEnd04: any = null;
let cum04: any = null;
let dice04: any = null;
function cumOk(n: any) {
    // n 단계까지 모두 실패할 확률 = (1-p)^n → 누적 성공률 = 1-(1-p)^n
    return 1 - Math.pow(1 - FAIL_BASE, n);
}
function build(i: any) {
    stepEls04 = [];
    const ys = [10, 44, 78];
    const names = ['primary', 'second', 'third'];
    for (let k = 0; k < 3; k += 1) {
        const nd = make('div', 'nd nd--step', scWrap);
        put(nd, 130, ys[k], 96, 22);
        const t = make('i', 'nd__t', nd);
        t.textContent = names[k];
        const st = make('b', 'stepok', scWrap);
        st.textContent = 'ok ' + f1(cumOk(k + 1) * 100) + '%';
        put(st, 234, ys[k] + 4, 74, 0);
        stepEls04.push(nd);
    }
    deadEnd04 = make('div', 'nd nd--fail deadend', scWrap);
    put(deadEnd04, 130, 112, 96, 22);
    const dt = make('i', 'nd__t', deadEnd04);
    dt.textContent = 'dead-end';
    pkt04 = make('div', 'nd nd--agent', scWrap);
    pkt04.innerHTML = '<i class="' + cx('nd__t') + '">req</i>';
    put(pkt04, 26, 26, 44, 18);
    dice04 = make('b', 'dice', scWrap);
    put(dice04, 10, 4, 190, 0);
    cum04 = make('b', 'cumtxt', scWrap);
    put(cum04, 316, 44, 120, 0);
    const ov = make('b', 'ov ovs', sceneEl);
    put(ov, 316, 10, 150, 30);
    ov.textContent = 'cum = 1-(1-p)^n · p = 0.18';
    const segs = [];
    for (let k = 0; k < SCENES04.length; k += 1) { segs.push(spanOf(k * ROLL_MS04, ROLL_MS04 - 40)); }
    drawRows(segs, 2000);
    axis(2000);
    setReads('FAIL_BASE {a} — 누적 성공 1-(1-p)^n = 3단 {b}%', f2(FAIL_BASE), f1(cumOk(3) * 100));
    doneP.textContent = '';
    return 2000;
}
function frame(t: any) {
    const si = Math.min(SCENES04.length - 1, Math.floor(demoT(t) / ROLL_MS04));
    const sc = SCENES04[si];
    const ph = clamp((demoT(t) - si * ROLL_MS04) / (ROLL_MS04 * 0.7), 0, 1);
    // 시나리오별 도달 단계 — rolls[k] < FAIL_BASE 면 k+1 단 실패
    let reach = 2; // 기본 3단
    for (let k = 0; k < 3; k += 1) {
        if (sc.rolls[k] >= FAIL_BASE) { reach = k; break; }
    }
    const dead = sc.name === 'dead';
    const active = dead ? 3 : reach;
    for (let k = 0; k < 3; k += 1) {
        const failed = k < active || (dead && k === 2);
        stepEls04[k].className = cx('nd nd--step' + (k === active && !dead ? ' nd--on' : '') + (failed && k < active ? ' nd--fail' : ''));
    }
    deadEnd04.className = cx('nd nd--fail deadend' + (dead && ph > 0.6 ? ' deadend--on' : ''));
    // 패킷 — 활성 단의 y 로 수직 이동 (사다리 하강)
    const ty = dead ? 116 : [21, 55, 89][active];
    pkt04.style.transform = 'translateY(' + f1(clamp(ph, 0, 1) * (ty - 26)) + 'px)';
    dice04.textContent = 'dice ' + f2(sc.rolls[Math.min(2, active)]) + ' vs p ' + f2(FAIL_BASE) + ' — ' + sc.name;
    cum04.textContent = 'cum ' + f1(cumOk(dead ? 0 : active + 1) * 100) + '%';
    return 'roll ' + f0(si + 1) + ' — ' + (dead ? '3단 실패 → dead-end' : stepNames(active));
}
function stepNames(k: any) {
    return ['primary ok', 'second ok (fallback 1)', 'third ok (fallback 2)'][k];
}

    return run({ count: 1, build: build, frame: frame, head: true });
}

export default function FallbackLadder() {
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
