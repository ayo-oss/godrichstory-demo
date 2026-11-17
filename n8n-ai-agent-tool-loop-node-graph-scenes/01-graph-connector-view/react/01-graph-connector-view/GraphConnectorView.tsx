// GraphConnectorView - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./GraphConnectorView.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

function main(root: HTMLElement): (() => void) | undefined {

    const rootEl: HTMLElement | null = document.getElementById("ez");
    if (!rootEl) return;
    main(rootEl);
const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");
function main(root: HTMLElement): (() => void) | undefined {
// ── 532 공통 엔진 — 529 run() 시계 계승 (WAAPI 시계읽기·pause·rebuild·reduced 분기)
const W = 480;
const CX0 = 8;
const CW = 432;
function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
function fill(s: string, ...rest: any[]): string {
    const keys = ['{a}', '{b}', '{c}', '{d}', '{e}', '{f}', '{g}', '{h}'];
    const v: string[] = [];
    for (let i = 0; i < rest.length; i += 1) { v.push(String(rest[i])); }
    let o = s;
    for (let i = 0; i < keys.length; i += 1) {
        o = o.split(keys[i]).join(i < v.length ? v[i] : '');
    }
    return o;
}
function f0(v: number): string { return String(Math.round(v)); }
function f1(v: number): string { return (Math.round(v * 10) / 10).toFixed(1); }
const rootEl: HTMLElement | null = document.getElementById("ez");
const innerEl = rootEl!.querySelector('[data-role="inner"]') as HTMLElement;
const sceneEl = rootEl!.querySelector('[data-role="scene"]') as HTMLElement;
const chartEl = rootEl!.querySelector('[data-role="chart"]') as HTMLElement;
const probeEl = rootEl!.querySelector('[data-role="probe"]') as HTMLElement;
const padEl = rootEl!.querySelector('[data-role="pad"]') as HTMLElement;
const statusP = rootEl!.querySelector('[data-role="status"]') as HTMLElement;
const readA = rootEl!.querySelector('[data-role="reada"]') as HTMLElement;
const readB = rootEl!.querySelector('[data-role="readb"]') as HTMLElement;
const doneP = rootEl!.querySelector('[data-role="done"]') as HTMLElement;
const pauseBtn = rootEl!.querySelector('[data-role="pause"]') as HTMLElement;
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
function animsIn(host: HTMLElement): any[] { return host.getAnimations({ subtree: true }) as any[]; }
function spanOf(d: number, dur: number): { s: number; e: number; k: number } { return { s: d, e: d + dur, k: 0 }; }
function bar(cls: string, x: number, y: number, w: number, h: number): HTMLElement {
    const e = make('i', cls, chartEl);
    put(e, x, y, w, h);
    return e;
}
function drawRows(segs: Array<{ s: number; e: number; k: number }>, max: number): void {
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
// ── 532 주역 계산 — 도구 선택 스코어·소프트맥스·재사용 페널티·메모리 감쇠·루프 가드
// TOKENS(q, kw) — 쿼리 q 를 소문자 단어·표현 토큰으로 쪼갠다 (임베딩 없음 — 겹침 계산)
function tokens(q: string): string[] {
    return String(q).toLowerCase().split(/[^a-z0-9가-힣]+/).filter(function (s) { return s.length > 1; });
}
// TOOL_SIM — 쿼리 토큰과 도구 설명 토큰의 자카드 겹침(교집합/합집합) + 시드 가중
function toolSim(qtok: string[], desc: string, seed: number): number {
    const dt = tokens(desc);
    let hit = 0;
    for (let i = 0; i < qtok.length; i += 1) {
        if (dt.indexOf(qtok[i]) >= 0) { hit += 1; }
    }
    const uni = qtok.length + dt.length - hit;
    return uni > 0 ? (hit / uni) * (0.82 + 0.36 * seedHash(qtok.length, seed)) : 0.04 * seedHash(1, seed);
}
// SOFTMAX_T — 스코어 배열을 온도 T 로 정규화. T 가 낮으면 최고 봉우리가 독점한다
function softmaxT(scores: number[], T: number): number[] {
    let mx = -Infinity;
    for (let i = 0; i < scores.length; i += 1) { if (scores[i] > mx) { mx = scores[i]; } }
    const ex = scores.map(function (s) { return Math.exp((s - mx) / T); });
    let sm = 0;
    for (let i = 0; i < ex.length; i += 1) { sm += ex[i]; }
    return ex.map(function (e) { return e / sm; });
}
// PENALTY_P — 직전 사용 도구에 REUSE_PENALTY 를 곱해 스코어를 깎는다.
//   확률은 e^(-delta/T) 로 떨어진다 — 05의 주역 계산
const REUSE_PENALTY = 0.2;
function penalized(scores: number[], lastIdx: number, T: number): number[] {
    const s2 = scores.slice();
    if (lastIdx >= 0) {
        s2[lastIdx] = s2[lastIdx] * (1 - REUSE_PENALTY);
    }
    return softmaxT(s2, T);
}
// MEM_DECAY — 예산 초과 시 오래된 턴 높이를 alpha^k 로 감쇠 (06의 주역 계산)
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
    let cycle: number = 2000;
    let paused = false;
    let raf = 0;
    let clock: any = null;
    let lastStatus = '';
    function fit(): void {
        const k: number = (rootEl as HTMLElement).clientWidth / W;
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

// 01 그래프 커넥터 뷰 — AI Agent 노드와 도구·메모리 하위 노드의 연결(nodeGraph).
//    dot 이 연결선 위를 주행(dotTravel)하고 연결선에 위상이 다른 파형이 흐른다(connectorPhase).
const TOOLS01 = ['Calculator', 'HTTP Request', 'Vector Store'];
let nodes01: any = null;
let lines01: any = null;
let dots01: any = null;
function build(i: number): number {
    const q = ['회의 자료 요약하고 비용 계산해 줘', '그 페이지 가져와서 정리해 줘', '예전 대화 기억에서 찾아 줘'][i];
    const ag = make('div', 'nd nd--agent', scWrap);
    ag.innerHTML = '<i class="' + cx('nd__t') + '">AI Agent</i><i class="' + cx('nd__s') + '">tools + memory</i>';
    put(ag, 190, 60, 100, 34);
    nodes01 = [ag];
    lines01 = [];
    dots01 = [];
    const pos = [[10, 10], [10, 61], [10, 112]];
    const roles = ['tool', 'tool', 'mem'];
    const subs = ['calculator', 'http request', 'window buffer'];
    for (let k = 0; k < 3; k += 1) {
        const nd = make('div', 'nd nd--' + roles[k], scWrap);
        nd.innerHTML = '<i class="' + cx('nd__t') + '">' + TOOLS01[k] + '</i><i class="' + cx('nd__s') + '">' + subs[k] + '</i>';
        put(nd, pos[k][0], pos[k][1], 108, 34);
        nodes01.push(nd);
        const ln = make('i', 'cn', scWrap);
        put(ln, 118, pos[k][1] + 16, 0, 0);
        ln.style.width = '72px';
        ln.style.transform = 'rotate(' + (Math.atan2(72, 60 + 17 - (pos[k][1] + 17)) * 180 / Math.PI) + 'deg)';
        lines01.push(ln);
        const dt = make('i', 'dot', scWrap);
        dots01.push(dt);
    }
    const ov = make('b', 'ov ovs', sceneEl);
    put(ov, 236, 64, 200, 12);
    ov.textContent = 'sub-node connections';
    drawRows([spanOf(120, 560), spanOf(760, 420)], 2000);
    axis(2000);
    setReads(fill('nodeGraph — 하위 노드 3(도구 2·메모리 1) · 순차 점화 · connector 위상 {a}s', f0(i * 2 + 1)), q);
    doneP.textContent = '';
    return 2000;
}
function frame(t: number): string {
    const seq = Math.floor(demoT(t) / 520) % 3;
    for (let k = 0; k < 3; k += 1) {
        const on = k === seq;
        nodes01[k + 1].classList.toggle(cx('nd--on'), on);
        lines01[k].classList.toggle(cx('cn--on'), on);
    }
    for (let k = 0; k < 3; k += 1) {
        const ph = ((demoT(t) / 520) % 1);
        const x = 118 + ph * 72;
        const y = pos01(k) + 17 + (60 + 17 - (pos01(k) + 17)) * ph;
        dots01[k].style.left = x + 'px';
        dots01[k].style.top = y + 'px';
        dots01[k].style.opacity = k === seq ? '1' : '0.2';
    }
    return fill('하위 노드 {a}/{b} — {c} 점화 · 순환 주기 520ms', f0(seq + 1), '3', TOOLS01[seq]);
}
function pos01(k: number): number { return [10, 61, 112][k]; }
    return run({ count: 3, build: build, frame: frame });
}
}

export default function GraphConnectorView() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!rootRef.current) return;
    return main(rootRef.current) as () => void;
  }, []);
  return (
    <div className={cx("ez")} ref={rootRef}>
      <div className={cx("ez__in")} data-role="inner">
        <div className={cx("ez__pad")} data-role="pad" tabIndex={0} role="application" aria-label={'시연 무대 — Space 또는 Enter 로 일시정지, R 로 처음부터, 왼쪽·오른쪽 방향키로 다른 값으로'}>
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={'AI 에이전트 노드에 도구와 메모리 하위 노드가 연결되고 주행 점이 이번 턴의 하위 노드를 밝히는 장면'}></div>
          <div className={cx("ez__probe")} data-role="probe" aria-hidden="true"></div>
          <div className={cx("ez__chart")} data-role="chart" aria-hidden="true"></div>
          <p className={cx("ez__status")} data-role="status" aria-live="off">{'장면 준비'}</p>
          <p className={cx("ez__reada")} data-role="reada" aria-hidden="true"></p>
          <p className={cx("ez__readb")} data-role="readb" aria-hidden="true"></p>
          <div className={cx("ez__ctrl")}>
            <button className={cx("ez__pause")} data-role="pause" type="button" aria-pressed="false">{'일시정지'}</button>
          </div>
          <p className={cx("ez__done")} data-role="done" role="status" aria-live="polite"></p>
        </div>
      </div>
    </div>
  );
}
