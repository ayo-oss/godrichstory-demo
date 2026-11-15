// CalTodayRing - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./CalTodayRing.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

function main(root: HTMLElement): () => void {
    // 무대 좌표 — 안쪽 상자는 늘 480x300 이고 화면 폭에 맞춰 통체로 줄인다
    const W = 480;
    const CX0 = 8;
    const CW = 432;
    const SVGW = 448;
    const SVGH = 156;
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
    const SVGNS = 'http://www.w3.org/2000/svg';
    // 장면 안 요소를 만든다. 클래스는 cx 를 거쳐 CSS 모듈 이름으로 바뀐다
    function make(tag: string, cls: string, parent: HTMLElement): HTMLElement {
        const e = document.createElement(tag);
        if (cls) { e.className = cx(cls); }
        parent.appendChild(e);
        return e;
    }
    function svgEl(tag: string, cls: string, parent: SVGElement): SVGElement {
        const e = document.createElementNS(SVGNS, tag);
        if (cls) { e.setAttribute('class', cx(cls)); }
        parent.appendChild(e);
        return e;
    }
    function svgPath(parent: SVGSVGElement, cls: string, d: string): SVGPathElement {
        const p = svgEl('path', cls, parent) as SVGPathElement;
        p.setAttribute('d', d);
        return p;
    }
    function svgText(parent: SVGSVGElement, cls: string, x: number, y: number, txt: string): SVGTextElement {
        const t = svgEl('text', cls, parent) as SVGTextElement;
        t.setAttribute('x', String(x));
        t.setAttribute('y', String(y));
        t.textContent = txt;
        return t;
    }
    function setDraw(p: SVGPathElement, total: number, p01: number): void {
        p.setAttribute('stroke-dasharray', String(total));
        p.setAttribute('stroke-dashoffset', String(total * (1 - clamp(p01, 0, 1))));
    }
    function put(e: HTMLElement, x: number, y: number, w: number, h: number): void {
        e.style.left = x + 'px';
        e.style.top = y + 'px';
        if (w > 0) { e.style.width = w + 'px'; }
        if (h > 0) { e.style.height = h + 'px'; }
    }
    const scWrap = make('div', 'scwrap', sceneEl);
    const clkEl = make('i', 'clk', sceneEl);
    function clearAll(): void {
        // clkEl(시계)은 sceneEl 에 직접 붙어 있으므로 래퍼만 비운다 — 시계를 지우면 렌더 시계가 죽는다
        scWrap.textContent = '';
        chartEl.textContent = '';
        probeEl.textContent = '';
    }
    // ── 경로 길이 측정 — getTotalLength 는 화면에 붙은 뒤에만 값을 준다 (probe 는 visibility:hidden 상자)
    function measure(d: string): number {
        const svg = document.createElementNS(SVGNS, 'svg');
        svg.setAttribute('viewBox', '0 0 ' + SVGW + ' ' + SVGH);
        svg.setAttribute('class', cx('sc'));
        probeEl.appendChild(svg);
        const p = svgPath(svg, '', d);
        const len = p.getTotalLength();
        probeEl.removeChild(svg);
        return len;
    }
    function pointAt(d: string, at: number, vb?: string): { x: number; y: number; y2: number } {
        void vb;
        const svg = document.createElementNS(SVGNS, 'svg');
        svg.setAttribute('viewBox', '0 0 ' + SVGW + ' ' + SVGH);
        svg.setAttribute('class', cx('sc'));
        probeEl.appendChild(svg);
        const p = svgPath(svg, '', d);
        const pt = p.getPointAtLength(at);
        probeEl.removeChild(svg);
        return { x: pt.x, y: pt.y, y2: 0 };
    }
    // 정점 오프셋 — 시드 해시(재생해도 같은 값). Math.random 을 쓰지 않는다
    function seedHash(i: number, seed: number): number {
        const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
        return x - Math.floor(x);
    }
    // ── 엔진이 푼 시간 읽기 — 모델이 아니라 getAnimations() 와 getComputedTiming() 값
    function animsIn(host: HTMLElement): Animation[] {
        return host.getAnimations({ subtree: true });
    }
    interface Seg { s: number; e: number; k: number; }
    function delayOf(a: Animation): number {
        const t = a.effect ? a.effect.getComputedTiming() : null;
        return t && typeof t.delay === 'number' ? t.delay : 0;
    }
    void delayOf;
    function span(a: Animation, max: number): Seg {
        const t = a.effect ? a.effect.getComputedTiming() : null;
        if (!t) { return { s: 0, e: 0, k: 0 }; }
        const d = typeof t.delay === 'number' ? t.delay : 0;
        const e = typeof t.endTime === 'number' && isFinite(t.endTime) ? t.endTime : max;
        return { s: d, e: Math.min(e, max), k: 0 };
    }
    void span;
    function phaseStr(e: AnimationEffect | null): string {
        const t = e ? e.getComputedTiming() : null;
        if (!t || t.localTime === null || t.localTime === undefined) { return 'none'; }
        const lt = Number(t.localTime);
        const d = typeof t.delay === 'number' ? t.delay : 0;
        const end = typeof t.endTime === 'number' ? t.endTime : Infinity;
        if (lt < d) { return 'before'; }
        return lt >= end ? 'after' : 'active';
    }
    void phaseStr;
    function phaseOf(a: Animation): string { return phaseStr(a.effect); }
    void phaseOf;
    // ── 아래 차트 상자 그리기
    function bar(cls: string, x: number, y: number, w: number, h: number): HTMLElement {
        const e = make('i', cls, chartEl);
        put(e, x, y, w, h);
        return e;
    }
    function drawRows(segs: Seg[], max: number): HTMLElement[] {
        const n = segs.length;
        const h = clamp(Math.floor((34 - (n - 1)) / n), 2, 7);
        const out: HTMLElement[] = [];
        for (let i = 0; i < n; i += 1) {
            const sg = segs[i];
            const x = CX0 + clamp(sg.s, 0, max) / max * CW;
            const w = Math.max(2, (clamp(sg.e, 0, max) - clamp(sg.s, 0, max)) / max * CW);
            out.push(bar('bar k' + sg.k, x, 5 + i * (h + 1), w, h));
        }
        return out;
    }
    void drawRows;
    function axis(max: number): void {
        const a = make('b', 'ax', chartEl);
        a.textContent = '0';
        put(a, CX0, 40, 0, 0);
        const b = make('b', 'ax ax--r', chartEl);
        b.textContent = f0(max) + 'ms';
        put(b, CX0 + CW - 60, 40, 60, 0);
    }
    function marker(ms: number, max: number, cls: string): void {
        bar('mk ' + cls, CX0 + clamp(ms, 0, max) / max * CW, 2, 2, 44);
    }
    void marker;
    let headEl: HTMLElement | null = null;
    function setReads(a: string, b: string): void {
        readA.textContent = a;
        readB.textContent = b;
    }
    // ── 캘린더 공통 계산 — 달력은 그려 둔 표가 아니라 이 산술이다
    const CELLS = 42;          // 6주 고정 — 달마다 그리드 높이가 점프하지 않는다
    const DOW_KO = ['일', '월', '화', '수', '목', '금', '토'];
    // 기준 날짜 — 현재 시각이 아니라 고정 시드(2026-11-15). new Date() 를 쓰지 않는다
    const TODAY = { y: 2026, m: 10, d: 15 };   // m: 0-based (10 = 11월)
    // 그 달의 날 수 — 다음 달 0일 = 이번 달 마지막 날 (UTC 생성자로 시간대 영향을 뺀다)
    function daysInMonth(y: number, m: number): number {
        return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    }
    // 첫 요일 오프셋(일요일 시작) — getUTCDay 로 잰다. 로컬 getDay() 는 시간대 오프셋으로 하루 어긋날 수 있다(06 함정)
    function firstWeekday(y: number, m: number): number {
        return (new Date(Date.UTC(y, m, 1)).getUTCDay() + 1) % 7;
    }
    interface CellDate { y: number; m: number; d: number; out: boolean; }
    // 42칸 각각의 (연, 월, 일) — 앞뒤 이웃 달 날짜(leading-trailing)까지 한 번의 루프로
    function cellDate(i: number, y: number, m: number): CellDate {
        const lead = firstWeekday(y, m);
        const len = daysInMonth(y, m);
        const di = i - lead + 1;            // 이 달 기준 날짜 번호 (0 이하·초과 = 이웃 달)
        const ny = di <= 0 ? (m === 0 ? y - 1 : y) : (di > len ? (m === 11 ? y + 1 : y) : y);
        const nm = di <= 0 ? (m === 0 ? 11 : m - 1) : (di > len ? (m === 11 ? 0 : m + 1) : m);
        const nd = di <= 0 ? daysInMonth(ny, nm) + di : (di > len ? di - len : di);
        return { y: ny, m: nm, d: nd, out: di <= 0 || di > len };
    }
    // y/m/d 세 값을 따로 비교하는 완전 일치 — 시간대 오프셋으로 하루 어긋나지 않는다
    function matchDate(c: CellDate, y: number, m: number, d: number): boolean {
        return c.y === y && c.m === m && c.d === d;
    }
    // 일 요일 인덱스(일요일 시작) — 셋째 자리 0-인덱스 산술
    function dowOf(c: CellDate): number {
        return (new Date(Date.UTC(c.y, c.m, c.d)).getUTCDay() + 1) % 7;
    }
    const MON_LABEL = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
    // 그리드 기하 — 장면 448x156 안 7열 6주. 요일 머리 위 14px
    const GRX = 7;
    const GRY = 26;
    const CW2 = 62;      // 칸 폭 (7 x 62 = 434)
    const CH2 = 21;      // 칸 높이 (6 x 21 = 126, 머리 26 + 126 = 152)
    function cellXY(i: number): { x: number; y: number } {
        return { x: GRX + (i % 7) * CW2, y: GRY + Math.floor(i / 7) * CH2 };
    }
    // ── 캘린더 그리드 DOM — 요일 머리 7칸 + 날짜 42칸. 셀마다 (배경칩 i.bg + 숫자 b.num)
    interface GridCell { el: HTMLElement; bg: HTMLElement; num: HTMLElement; d: CellDate; }
    interface Grid { board: HTMLElement; cells: GridCell[]; lead: number; trail: number; }
    function makeGrid(y: number, m: number, parent: HTMLElement): Grid {
        const board = make('div', 'cal', parent);
        const head = make('div', 'cal__dowrow', board);
        for (let k = 0; k < 7; k += 1) {
            const h = make('b', 'cal__dow', head);
            h.textContent = DOW_KO[k];
            put(h as HTMLElement, k * CW2, 0, CW2 - 4, 14);
        }
        const lead = firstWeekday(y, m);
        const trail = CELLS - lead - daysInMonth(y, m);
        const cells: GridCell[] = [];
        for (let i = 0; i < CELLS; i += 1) {
            const d = cellDate(i, y, m);
            const el = make('div', 'cal__cell' + (d.out ? ' cal__cell--leading-trailing' : ''), board);
            const p = cellXY(i);
            put(el, p.x, p.y, CW2 - 4, CH2 - 3);
            const bg = make('i', 'cal__bg', el);
            const num = make('b', 'cal__num', el);
            num.textContent = f0(d.d);
            cells.push({ el: el, bg: bg, num: num, d: d });
        }
        return { board: board, cells: cells, lead: lead, trail: trail };
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
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) { setPaused(true); }
        }, { signal: off.signal });
        window.addEventListener('resize', fit, { signal: off.signal });
        fit();
        rebuild();
        if (reduced) {
            // 움직임 줄이기 — 모든 애니메이션이 꺼지고 장면은 완성 상태 한 장이다 (build 마지막 프레임을 그린다)
            statusP.textContent = '움직임 줄이기 켜짐 · 완성 상태 한 장';
            readB.textContent = '전환 없이 다 계산된 그리드의 최종 모습만 보여 준다';
            doneP.textContent = readB.textContent;
            cfg.frame(1e9);
        } else {
            restart();
            raf = requestAnimationFrame(tick);
        }
        return function (): void {
            cancelAnimationFrame(raf);
            off.abort();
        };
    }
    // 06 오늘 링 — 42칸 각각의 (연, 월, 일) 을 기준 날짜와 완전 일치 비교해 맞는 한 칸에만 링이 둘러진다. 시간대 오프셋 함정도 겹쳐 시연
    const PULSE_MS = 1200;
    let g6: Grid | null = null;
    let ring6: HTMLElement | null = null;
    let trapEl: HTMLElement | null = null;
    function build(i: number): number {
        void i;
        g6 = makeGrid(2026, 10, scWrap);
        put(g6.board, 0, 0, 448, 156);
        ring6 = make('i', 's6__today', sceneEl);
        trapEl = make('b', 'ov', sceneEl);
        put(trapEl, 0, 2, 448, 14);
        trapEl.style.fontSize = '10px';
        trapEl.style.fontWeight = '700';
        trapEl.style.color = '#c2361a';
        const rowA = bar('bar k0', CX0, 5, CW * 62 / 100, 7);
        void rowA;
        const labA = make('b', 'ax', chartEl);
        put(labA, CX0, 24, 320, 12);
        labA.textContent = 'y/m/d 세 값 따로 비교 — timezone safe';
        axis(PULSE_MS * 2);
        return PULSE_MS * 2 + 300;
    }
    function frame(t: number): string {
        if (!g6 || !ring6 || !trapEl) { return ''; }
        const ph = (t % PULSE_MS) / PULSE_MS;
        const pulse = 1 + 0.14 * Math.sin(ph * 2 * Math.PI);
        let hit = -1;
        let hitCnt = 0;
        for (let i2 = 0; i2 < CELLS; i2 += 1) {
            const c = g6.cells[i2];
            const isToday = matchDate(c.d, TODAY.y, TODAY.m, TODAY.d);   // 2026-11-15 고정 기준
            if (isToday) { hit = i2; hitCnt += 1; }
            c.el.className = cx('cal__cell' + (c.d.out ? ' cal__cell--leading-trailing' : '') + (isToday ? ' is-today' : ''));
            c.bg.style.opacity = isToday ? '1' : '0';
            c.num.style.color = isToday ? '#fff7e6' : (c.d.out ? 'rgba(23,20,26,.38)' : '#17141a');
        }
        if (hit >= 0) {
            const p = cellXY(hit);
            ring6.style.transform = 'translate(' + (p.x + (CW2 - 4) / 2 - 15) + 'px,' + (p.y + (CH2 - 3) / 2 - 15) + 'px) scale(' + pulse.toFixed(3) + ')';
            ring6.style.opacity = '1';
        } else {
            ring6.style.opacity = '0';
        }
        sceneEl.style.background = ph < 0.5 ? '#ffffff' : '#f3ece1';
        // 시간대 함정 — 같은 날을 두 생성자로 만들어 비교한다 (timezone safe 대조)
        const localD = new Date(2026, 10, 15);                    // 로컬 자정 생성 — 실행 환경 시간대를 따른다
        const utcD = new Date(Date.UTC(2026, 10, 14, 23, 0, 0));  // UTC 11-14 23시 = UTC+9 기준 11-15 자정
        const sameByUTC = localD.getUTCFullYear() === utcD.getUTCFullYear() && localD.getUTCMonth() === utcD.getUTCMonth() && localD.getUTCDate() === utcD.getUTCDate();
        if (trapEl) {
            trapEl.textContent = 'new Date(2026,10,15) vs Date.UTC(2026,10,14,23h) — ' + (sameByUTC ? 'getUTC* 판정: 같은 날' : 'getUTC* 판정: 다른 날');
        }
        setReads(
            fill('matchDate: y {a} · m {b} · d {c} 세 값 완전 일치 — 42칸 중 {d}칸', f0(TODAY.y), f0(TODAY.m + 1), f0(TODAY.d), f0(hitCnt)),
            fill('getDay()/getDate() 로컬 판정은 오프셋 {a}분 환경에서 하루 어긋날 수 있다', f0(localD.getTimezoneOffset()))
        );
        return fill('오늘(기준일 {a}) 한 칸만 링 — {b}일 칸이 완전 일치로 걸렸다', '2026-11-15', f0(TODAY.d));
    }
    return run({ count: 1, build: build, frame: frame });

}

export default function CalTodayRing() {
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
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={'42칸의 연월일을 기준 날짜와 완전 일치 비교해 오늘 한 칸에만 링이 둘러지는 장면'}></div>
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
