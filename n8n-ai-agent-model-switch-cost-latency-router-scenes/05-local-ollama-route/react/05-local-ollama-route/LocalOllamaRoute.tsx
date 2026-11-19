// LocalOllamaRoute - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./LocalOllamaRoute.module.scss";

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
// ── 534-05 local-ollama-route — privacyFlag/free-tier 조건이 localGate 를 열고
// 패킷이 로컬 레인으로 차선 변경. 지연 페널티 = queueLen(동시 추론 대기) × Q_PENALTY_MS.
// 게이트 규칙: 토큰 길이 ≤ LEN_CAP 일 때만 통과 — 긴 요청은 hosted 로 역차선.
const LEN_CAP = 1200;
const Q_PENALTY_MS = 90;
const SCENES05: any[] = [
    { flag: 'privacy', len: 480,  q: 1 },
    { flag: 'privacy', len: 860,  q: 4 },
    { flag: 'freeOut', len: 380,  q: 2 },
    { flag: 'plain',   len: 1600, q: 0 }   // 게이트 미발동 — hosted 유지
];
const LANE_MS05 = 500;
let gate05: any = null;
let lanePkt05: any = null;
let qbar05: any = null;
let qbg05: any = null;
let pen05: any = null;
let lenMark05: any = null;
let laneLbl05: any = null;
let hosted05: any = null;
function build(i: any) {
    // 두 레인 — 위 hosted 아래 local
    hosted05 = make('div', 'nd nd--step', scWrap);
    put(hosted05, 120, 30, 110, 22);
    const ht = make('i', 'nd__t', hosted05);
    ht.textContent = 'hosted rail';
    const localNd = make('div', 'nd nd--step nd--local', scWrap);
    put(localNd, 120, 96, 110, 22);
    const lt = make('i', 'nd__t', localNd);
    lt.textContent = 'local ollama';
    gate05 = make('div', 'gate', scWrap);
    put(gate05, 248, 30, 34, 88);
    const gt = make('i', 'gate__t', gate05);
    gt.textContent = 'gate';
    // 차선 연결선 — 게이트 통과 후 로컬 레인 하강
    const drop = make('i', 'lanejoin', scWrap);
    put(drop, 282, 58, 2, 40);
    laneLbl05 = make('b', 'lanelbl', scWrap);
    put(laneLbl05, 322, 30, 120, 0);
    laneLbl05.textContent = 'privacy: on';
    lanePkt05 = make('div', 'nd nd--agent', scWrap);
    lanePkt05.innerHTML = '<i class="' + cx('nd__t') + '">req</i>';
    put(lanePkt05, 40, 34, 44, 18);
    // queueLen 막대 — 로컬 레인 동시 추론 대기
    qbg05 = make('i', 'qbar qbar--bg', scWrap);
    put(qbg05, 322, 100, 110, 8);
    qbar05 = make('i', 'qbar', scWrap);
    put(qbar05, 322, 100, 0, 8);
    const ql = make('b', 'qlbl', scWrap);
    ql.textContent = 'queueLen';
    put(ql, 322, 86, 110, 0);
    pen05 = make('b', 'pentxt', scWrap);
    put(pen05, 322, 116, 120, 0);
    // 토큰 길이 게이지 — LEN_CAP 스텝 표시
    const lenbg = make('i', 'qbar qbar--bg', scWrap);
    put(lenbg, 24, 140, 180, 8);
    lenMark05 = make('i', 'lenfill', scWrap);
    put(lenMark05, 24, 140, 0, 8);
    const lc = make('b', 'qlbl', scWrap);
    lc.textContent = 'tok len / cap ' + f0(LEN_CAP);
    put(lc, 24, 126, 180, 0);
    const capmk = make('i', 'capmk', scWrap);
    put(capmk, 24 + 180 * 0.75 - 1, 134, 2, 20);
    const ov = make('b', 'ov ovs', sceneEl);
    put(ov, 300, 6, 172, 0);
    ov.textContent = 'pen = q × ' + f0(Q_PENALTY_MS) + 'ms · cap ' + f0(LEN_CAP);
    const segs = [];
    for (let k = 0; k < SCENES05.length; k += 1) { segs.push(spanOf(k * LANE_MS05, LANE_MS05 - 40)); }
    drawRows(segs, 2000);
    axis(2000);
    setReads('localGate: privacy|freeOut · pen = queueLen×{a}ms · len cap {b}', f0(Q_PENALTY_MS), f0(LEN_CAP));
    doneP.textContent = '';
    return 2000;
}
function frame(t: any) {
    const si = Math.min(SCENES05.length - 1, Math.floor(demoT(t) / LANE_MS05));
    const sc = SCENES05[si];
    const ph = clamp((demoT(t) - si * LANE_MS05) / (LANE_MS05 * 0.7), 0, 1);
    const gated = sc.flag !== 'plain';
    const passLen = sc.len <= LEN_CAP;
    const goesLocal = gated && passLen;
    // 게이트 개폐 — 조건 플래그가 있고 길이 통과일 때만
    gate05.className = cx('gate' + (gated && ph > 0.2 ? ' gate--open' : ''));
    laneLbl05.textContent = sc.flag === 'plain' ? 'no flag' : (sc.flag + (passLen ? ' · pass' : ' · too long'));
    // 패킷 차선 변경 — x 전진 + 로컬 행선일 때 y 하강
    const tx = clamp(ph, 0, 1) * 300;
    const ty = goesLocal ? clamp((ph - 0.45) / 0.55, 0, 1) * 62 : 0;
    lanePkt05.style.transform = 'translate(' + f1(tx) + 'px,' + f1(ty) + 'px)';
    hosted05.className = cx('nd nd--step' + (!goesLocal && ph > 0.5 ? ' nd--on' : ''));
    // queueLen 막대 — 시나리오 q (0~5) 스케일
    const qw = clamp(sc.q / 5, 0, 1) * 110;
    qbar05.style.width = f1(qw) + 'px';
    qbar05.className = cx('qbar' + (sc.q >= 4 ? ' qbar--hot' : ''));
    // 지연 페널티 = q × Q_PENALTY_MS — 로컬 행선일 때만 실측
    pen05.textContent = 'pen +' + f0(sc.q * Q_PENALTY_MS) + 'ms';
    lenMark05.style.width = f1(clamp(sc.len / (LEN_CAP * 1.6), 0, 1) * 180) + 'px';
    lenMark05.className = cx('lenfill' + (passLen ? '' : ' lenfill--over'));
    return goesLocal ? ('local lane — pen +' + f0(sc.q * Q_PENALTY_MS) + 'ms') : (gated ? 'gate blocked — too long, hosted' : 'no flag — hosted');
}

    return run({ count: 1, build: build, frame: frame, head: true });
}

export default function LocalOllamaRoute() {
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
