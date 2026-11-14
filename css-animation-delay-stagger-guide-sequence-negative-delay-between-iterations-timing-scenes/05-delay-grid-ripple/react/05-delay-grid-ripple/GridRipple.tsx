// GridRipple - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./GridRipple.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

function main(root: HTMLElement): () => void {
    // 무대 좌표 — 안쪽 상자는 늘 480×300 이고 화면 크기에 맞춰 통째로 축소한다
    const W = 480;
    const CX0 = 8;
    const CW = 432;
    function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
    // 문구 틀의 {a}·{b}·{c} 자리에 값을 끼운다 — 화면 문구는 늘 틀 한 줄이고 로케일 사전이 통째로 바꾼다
    function fill(s: string, ...v: string[]): string {
        const keys = ['{a}', '{b}', '{c}', '{d}', '{e}', '{f}', '{g}', '{h}'];
        let o = s;
        for (let i = 0; i < keys.length; i += 1) {
            o = o.split(keys[i]).join(i < v.length ? v[i] : '');
        }
        return o;
    }
    function f0(v: number): string { return String(Math.round(v)); }
    function f1(v: number): string { return (Math.round(v * 10) / 10).toFixed(1); }
    // ── 무대 요소
    const rootEl = root;
    const innerQ = rootEl.querySelector('[data-role="inner"]') as HTMLElement | null;
    const sceneQ = rootEl.querySelector('[data-role="scene"]') as HTMLElement | null;
    const chartQ = rootEl.querySelector('[data-role="chart"]') as HTMLElement | null;
    const probeQ = rootEl.querySelector('[data-role="probe"]') as HTMLElement | null;
    const padQ = rootEl.querySelector('[data-role="pad"]') as HTMLElement | null;
    const pauseQ = rootEl.querySelector('[data-role="pause"]') as HTMLButtonElement | null;
    const statusQ = rootEl.querySelector('[data-role="status"]') as HTMLElement | null;
    const readAQ = rootEl.querySelector('[data-role="reada"]') as HTMLElement | null;
    const readBQ = rootEl.querySelector('[data-role="readb"]') as HTMLElement | null;
    const doneQ = rootEl.querySelector('[data-role="done"]') as HTMLElement | null;
    if (!innerQ || !sceneQ || !chartQ || !probeQ || !padQ || !pauseQ || !statusQ || !readAQ || !readBQ || !doneQ) {
        return function (): void { /* 무대가 없으면 할 일이 없다 */ };
    }
    const innerEl: HTMLElement = innerQ;
    const sceneEl: HTMLElement = sceneQ;
    const chartEl: HTMLElement = chartQ;
    const probeEl: HTMLElement = probeQ;
    const padEl: HTMLElement = padQ;
    const pauseBtn: HTMLButtonElement = pauseQ;
    const statusP: HTMLElement = statusQ;
    const readA: HTMLElement = readAQ;
    const readB: HTMLElement = readBQ;
    const doneP: HTMLElement = doneQ;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // 장면 안 요소를 만든다. 클래스는 cx 를 거쳐 CSS 모듈 이름으로 바뀐다
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
    const scEl = make('div', 'sc', sceneEl);
    const clkEl = make('i', 'clk', sceneEl);
    function clearAll(): void {
        scEl.textContent = '';
        chartEl.textContent = '';
        probeEl.textContent = '';
    }
    // ── 엔진이 푼 시간 읽기 — 모델이 아니라 getAnimations() 와 getComputedTiming() 값
    function animsIn(host: HTMLElement): Animation[] {
        return host.getAnimations({ subtree: true });
    }
    interface Seg { s: number; e: number; k: number; }
    // 애니메이션 하나의 시작·끝 시각(ms) — 반복이 무한이면 끝은 max 로 자른다
    function span(a: Animation, max: number): Seg {
        const t = a.effect ? a.effect.getComputedTiming() : null;
        if (!t) { return { s: 0, e: 0, k: 0 }; }
        const d = typeof t.delay === 'number' ? t.delay : 0;
        const e = typeof t.endTime === 'number' && isFinite(t.endTime) ? t.endTime : max;
        return { s: d, e: Math.min(e, max), k: 0 };
    }
    function delayOf(a: Animation): number {
        const t = a.effect ? a.effect.getComputedTiming() : null;
        return t && typeof t.delay === 'number' ? t.delay : 0;
    }
    // 현재 단계(before·active·after) — 타입 정의에 phase 가 없는 환경이 있어 문자열로 읽는다
    function phaseStr(e: AnimationEffect | null): string {
        const t = e ? e.getComputedTiming() : null;
        if (!t || t.localTime === null || t.localTime === undefined) { return 'none'; }
        const lt = Number(t.localTime);
        const d = typeof t.delay === 'number' ? t.delay : 0;
        const end = typeof t.endTime === 'number' ? t.endTime : Infinity;
        if (lt < d) { return 'before'; }
        return lt >= end ? 'after' : 'active';
    }
    function phaseOf(a: Animation): string {
        return phaseStr(a.effect);
    }
    function progressOf(a: Animation): number {
        const t = a.effect ? a.effect.getComputedTiming() : null;
        return t && typeof t.progress === 'number' ? t.progress : 0;
    }
    // 임시 사본 애니메이션을 시각 t 에 놓고 단계(before·active·after)를 읽는다. 원본은 건드리지 않는다
    function phaseAt(a: Animation, t: number): string {
        const eff = a.effect as KeyframeEffect | null;
        if (!eff || !eff.target) { return 'none'; }
        const pr = new Animation(new KeyframeEffect(eff.target as Element, eff.getKeyframes(), eff.getTiming()), document.timeline);
        pr.pause();
        pr.currentTime = t;
        const ph = phaseStr(pr.effect);
        pr.cancel();
        return ph;
    }
    // 화면 밖 사본 요소의 애니메이션을 0 부터 to ms 까지 step ms 씩 놓으며 transform·opacity 가 바뀐 구간을 모은다
    function scrubRuns(el: HTMLElement, to: number, step: number): Seg[] {
        const an = el.getAnimations()[0];
        const out: Seg[] = [];
        if (!an) { return out; }
        an.pause();
        let prev = '';
        let open = -1;
        for (let t = 0; t <= to; t += step) {
            an.currentTime = t;
            const cs = getComputedStyle(el);
            const key = (cs.transform === 'none' ? 'matrix(1, 0, 0, 1, 0, 0)' : cs.transform) + '|' + cs.opacity;
            if (t > 0 && key !== prev) {
                if (open < 0) { open = t - step; }
            } else if (open >= 0) {
                out.push({ s: open, e: t - step, k: 0 });
                open = -1;
            }
            prev = key;
        }
        if (open >= 0) { out.push({ s: open, e: to, k: 0 }); }
        return out;
    }
    // ── 아래 차트 상자 그리기
    function bar(cls: string, x: number, y: number, w: number, h: number): HTMLElement {
        const e = make('i', cls, chartEl);
        put(e, x, y, w, h);
        return e;
    }
    // 가로 막대 줄: 한 줄 = 한 구간. 줄 높이는 줄 수에 맞춰 줄인다
    function drawRows(segs: Seg[], max: number): HTMLElement[] {
        const n = segs.length;
        const h = clamp(Math.floor((46 - (n - 1)) / n), 2, 8);
        const out: HTMLElement[] = [];
        for (let i = 0; i < n; i += 1) {
            const sg = segs[i];
            const x = CX0 + clamp(sg.s, 0, max) / max * CW;
            const w = Math.max(2, (clamp(sg.e, 0, max) - clamp(sg.s, 0, max)) / max * CW);
            out.push(bar('bar k' + sg.k, x, 6 + i * (h + 1), w, h));
        }
        return out;
    }
    function axis(max: number): void {
        const a = make('b', 'ax', chartEl);
        a.textContent = '0';
        put(a, CX0, 54, 0, 0);
        const b = make('b', 'ax ax--r', chartEl);
        b.textContent = f0(max) + 'ms';
        put(b, CX0 + CW - 60, 54, 60, 0);
    }
    function marker(ms: number, max: number, cls: string): void {
        bar('mk ' + cls, CX0 + clamp(ms, 0, max) / max * CW, 4, 2, 48);
    }
    let headEl: HTMLElement | null = null;
    function setReads(a: string, b: string): void {
        readA.textContent = a;
        readB.textContent = b;
    }
    // ── 실행 틀: 프리셋 하나가 한 주기. 시계 애니메이션이 끝나면 다음 프리셋으로 다시 시작한다
    interface Cfg {
        count: number;
        build: (i: number) => number;
        frame: (t: number) => string;
        head?: boolean;
    }
    function run(cfg: Cfg): () => void {
        const off = new AbortController();
        let pi = 0;
        let cycle = 2000;
        let paused = false;
        let raf = 0;
        let clock: Animation | null = null;
        let lastStatus = '';
        function fit(): void {
            const k = rootEl.clientWidth / W;
            innerEl.style.transform = 'scale(' + k + ')';
        }
        function rebuild(): void {
            clearAll();
            cycle = Math.max(2000, cfg.build(pi));
            headEl = cfg.head === false ? null : make('i', 'ph', chartEl);
            clkEl.style.animationDuration = f0(cycle) + 'ms';
            const all = animsIn(sceneEl);
            clock = null;
            for (let i = 0; i < all.length; i += 1) {
                const an = all[i] as CSSAnimation;
                if (an.animationName && an.effect && (an.effect as KeyframeEffect).target === clkEl) { clock = an; }
            }
        }
        function restart(): void {
            const all = animsIn(sceneEl);
            for (let i = 0; i < all.length; i += 1) {
                all[i].currentTime = 0;
                if (paused) { all[i].pause(); } else { all[i].play(); }
            }
        }
        function tick(): void {
            const ct = clock ? Number(clock.currentTime) : 0;
            const t = isFinite(ct) ? ct : 0;
            if (headEl) { headEl.style.transform = 'translateX(' + (CX0 + clamp(t / cycle, 0, 1) * CW) + 'px)'; }
            const s = cfg.frame(t);
            if (s !== lastStatus) { statusP.textContent = s; lastStatus = s; }
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
                if (p) { all[i].pause(); } else { all[i].play(); }
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
        padEl.addEventListener('keydown', function (ev: KeyboardEvent) {
            if (ev.target === pauseBtn) { return; }
            if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); setPaused(!paused); }
            else if (ev.key === 'r' || ev.key === 'R') { shift(-pi); }
            else if (ev.key === 'ArrowRight') { ev.preventDefault(); shift(1); }
            else if (ev.key === 'ArrowLeft') { ev.preventDefault(); shift(-1); }
        }, { signal: off.signal });
        window.addEventListener('resize', fit, { signal: off.signal });
        fit();
        rebuild();
        if (reduced) {
            // 움직임 줄이기 — 모든 애니메이션이 꺼져 delay 는 0 이고 장면은 끝 상태 한 장이다
            statusP.textContent = '움직임 줄이기 켜짐 · delay 0';
            readB.textContent = '순차 등장 대신 최종 상태만 보여 준다 — 모든 delay 는 0ms';
            doneP.textContent = readB.textContent;
        } else {
            restart();
            raf = requestAnimationFrame(tick);
        }
        return function (): void {
            cancelAnimationFrame(raf);
            off.abort();
        };
    }
    // 05 격자 물결 — 칸마다 중심까지의 거리 d 를 구해 delay = d × 칸당 ms. d 는 칸 폭 단위(세로는 칸 높이 비율로 환산)
    const COLS = 16;
    const ROWS = 8;
    const ASPECT = 0.532;
    const PITCH_PX = 27;
    interface Origin { cx: number; cy: number; ms: number; }
    const ORIGINS: Origin[] = [{ cx: 7.5, cy: 3.5, ms: 70 }, { cx: 0, cy: 0, ms: 50 }, { cx: 12, cy: 2, ms: 60 }];
    const DUR5 = 700;
    const BINS = 48;
    let lits: Animation[] = [];
    let delays: number[] = [];
    let binBars: HTMLElement[] = [];
    let binMs = 40;
    function build(i: number): number {
        const o = ORIGINS[i];
        const host = make('div', 's5', scEl);
        host.style.setProperty('--ms', o.ms + 'ms');
        host.style.setProperty('--dur', DUR5 + 'ms');
        let farD = 0;
        for (let r = 0; r < ROWS; r += 1) {
            for (let c = 0; c < COLS; c += 1) {
                const cell = make('div', 's5__c', host);
                const dx = c - o.cx;
                const dy = (r - o.cy) * ASPECT;
                const d = Math.sqrt(dx * dx + dy * dy);
                farD = Math.max(farD, d);
                const lit = make('i', 's5__l k' + (Math.floor(d * 0.7) % 4), cell);
                lit.style.setProperty('--d', d.toFixed(2));
            }
        }
        lits = animsIn(host);
        delays = [];
        let lastEnd = 0;
        let farDelay = 0;
        let farIdx = 0;
        for (let n = 0; n < lits.length; n += 1) {
            const sg = span(lits[n], 99999);
            delays.push(sg.s);
            lastEnd = Math.max(lastEnd, sg.e);
            if (sg.s > farDelay) { farDelay = sg.s; farIdx = n; }
        }
        const cycle = Math.max(2000, lastEnd + 360);
        binMs = cycle / BINS;
        const counts: number[] = [];
        let peak = 1;
        for (let b = 0; b < BINS; b += 1) { counts.push(0); }
        for (let n = 0; n < delays.length; n += 1) {
            const b = Math.min(BINS - 1, Math.floor(delays[n] / binMs));
            counts[b] += 1;
            peak = Math.max(peak, counts[b]);
        }
        binBars = [];
        for (let b = 0; b < BINS; b += 1) {
            const h = Math.max(2, counts[b] / peak * 40);
            binBars.push(bar('bar k' + (b % 4), CX0 + b * 9, 50 - h, 7, h));
        }
        axis(cycle);
        // 파면 속도 = 가장 먼 칸의 거리(칸 폭 단위) / 그 칸의 엔진 delay
        let farCells = 0;
        const farLit = lits[farIdx];
        if (farLit) {
            const el = farLit.effect ? (farLit.effect as KeyframeEffect).target as HTMLElement : null;
            farCells = el ? parseFloat(el.style.getPropertyValue('--d')) : 0;
        }
        const speed = farDelay > 0 ? farCells / farDelay * 1000 : 0;
        setReads(
            fill('GRID_N {a}x{b} · RIPPLE_MS_PER_CELL {c} · FAR_START {d}ms', f0(COLS), f0(ROWS), f0(o.ms), f0(farDelay)),
            fill('가장 먼 칸 {a}ms 에 시작 · 파면 속도 {b}칸/초 (약 {c}px/초)', f0(farDelay), f1(speed), f0(speed * PITCH_PX))
        );
        return cycle;
    }
    function frame(t: number): string {
        let on = 0;
        for (let n = 0; n < delays.length; n += 1) {
            if (delays[n] <= t) { on += 1; }
        }
        for (let b = 0; b < binBars.length; b += 1) {
            binBars[b].style.opacity = b * binMs <= t ? '1' : '.35';
        }
        return fill('지금 {a}ms · 켜진 칸 {b}/{c}', f0(t), f0(on), f0(delays.length));
    }
    return run({ count: ORIGINS.length, build: build, frame: frame });

}

export default function GridRipple() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    return main(rootEl);
  }, []);

  return (
    <div className={cx("ez") + " is-demo"} ref={rootRef}>
      <div className={cx("ez__in")} data-role="inner">
        <div className={cx("ez__pad")} data-role="pad" tabIndex={0} role="application" aria-label={'시연 무대 — Space 또는 Enter 로 일시정지, R 로 처음부터, 왼쪽·오른쪽 방향키로 다른 값으로'}>
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={'격자 칸이 중심에서 멀수록 늦게 켜지며 물결이 퍼지고 아래 막대 그래프에 칸의 시작 시각 분포가 쌓이는 장면'}></div>
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
