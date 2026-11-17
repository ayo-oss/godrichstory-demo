// TurnWriteDiff - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./TurnWriteDiff.module.scss";

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
// 533-03 turn-write-diff — 한 턴이 메모리 JSON 에 줄을 붙이는 쓰기와 배열 전체를 반환하는 읽기의 diff.
// 변경 줄은 두 객체의 얕은 비교로 계산되고(shallowDiff), changed n 배지가 집계한다.
const MSG03: any = [
    ['user: 보고 초안 잡아 줘', 'ai: 3단 구조로 잡았다'],
    ['user: 두 번째 섹션 늘려 줘', 'ai: 근거 2개를 더했다'],
    ['user: 요약 한 줄로 줄여 줘', 'ai: 첫 문장 하나로 압축했다']
];
let cols03: any = null;
let badge03: any = null;
let mode03: any = null;
function shallowLines(arr: any, extra: any): string[] {
    const out = ['{', '  "messages": ['];
    for (let k = 0; k < arr.length; k += 1) {
        out.push('    "' + arr[k][0].slice(0, 20) + '"');
        out.push('    "' + arr[k][1].slice(0, 20) + '"');
    }
    if (extra) { out.push('    "' + extra.slice(0, 20) + '"'); }
    out.push('  ]');
    out.push('}');
    return out;
}
function build(i: number): number {
    cols03 = [];
    mode03 = null;
    // 프리셋 i: 쓰기(턴 i+1 추가) — before 는 턴 i 개, after 는 i+1 개
    const before = shallowLines(MSG03.slice(0, i), null);
    const after = shallowLines(MSG03.slice(0, i), MSG03[i][0]);
    const panels: any[][] = [
        ['before', before, 6],
        ['after', after, 170]
    ];
    for (let p = 0; p < 2; p += 1) {
        const col = make('div', 'jcol', scWrap);
        put(col, panels[p][2], 8, 160, 130);
        const hd = make('b', 'srow__t', col);
        hd.textContent = panels[p][0];
        const lines = [];
        for (let li = 0; li < panels[p][1].length; li += 1) {
            const ln = make('i', 'jl', col);
            ln.textContent = panels[p][1][li];
            lines.push(ln);
        }
        cols03.push(lines);
    }
    // diff 표시 — before/after 에서 처음으로 달라지는 줄(= 새 줄 위치)부터 after 끝까지
    const dStart = before.length - 2; // '  ]' 앞의 새 줄
    badge03 = make('b', 'usedbadge', scWrap);
    put(badge03, 338, 130, 96, 0);
    badge03.textContent = 'changed 0';
    const ov = make('b', 'ov ovs', sceneEl);
    put(ov, 236, 142, 190, 12);
    ov.textContent = 'write appends one line';
    drawRows([spanOf(200, 520), spanOf(840, 260)], 2000);
    axis(2000);
    const q = MSG03[i][0];
    setReads(fill('slotWrite — messages {a}행 → {b}행 · 읽기는 전체 반환 · 새 줄 1', f0(before.length), f0(after.length)), q);
    doneP.textContent = '';
    return 2000;
}
function frame(t: number): string {
    const ph = demoT(t) / 1000; // 0-1 (쓰기) 뒤 1-2 (읽기)
    const isRead = ph >= 1;
    const k2 = isRead ? clamp((ph - 1) * 2, 0, 1) : clamp(ph * 2, 0, 1);
    const after = cols03[1];
    const before = cols03[0];
    // after 의 새 줄(마지막에서 두번째) 하이라이트
    const newIdx = after.length - 2;
    let changed = 0;
    for (let li = 0; li < after.length; li += 1) {
        const isDiff = li === newIdx && k2 > 0.15;
        after[li].classList.toggle(cx('jl--diff'), isDiff);
        if (isDiff) { changed += 1; }
    }
    for (let li = 0; li < before.length; li += 1) {
        before[li].classList.toggle(cx('jl--dim'), isRead && k2 > 0.5);
    }
    badge03.textContent = 'changed ' + f0(changed);
    return fill('{a} — messages {b}행 · {c} · changed {d}', isRead ? 'read: 전체 배열 반환' : 'write: 1줄 append', f0(after.length), 'user turn', f0(changed));
}

    return run({ count: 3, build: build, frame: frame });
}

export default function TurnWriteDiff() {
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
