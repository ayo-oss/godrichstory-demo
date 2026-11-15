// CalRowRipple - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./CalRowRipple.module.scss";

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
    // 03 날짜 호버 물결 — 셀의 행 인덱스에 비례한 위상 오프셋(rowPhase)으로 호버 줄의 위·아래가 순차적으로 부풀어 오른다
    const ROW_PHASE_SPAN = 1;     // 변형2: 1 → 2.5 (이웃 줄까지 물결이 넘어간다)
    const RIPPLE_MS = 1600;
    const AMP = 0.22;
    let g3: Grid | null = null;
    let cap3: HTMLElement | null = null;
    let focusI = 0;
    // 행 위상 — 눌린 줄(r0) 기준 거리에 따라 위상이 밀리고 크기가 줄어든다
    function rowPhase(row: number, r0: number, tt: number): number {
        const dist = Math.abs(row - r0);
        const fall = Math.exp(-(dist * dist) / (ROW_PHASE_SPAN * ROW_PHASE_SPAN));
        return 1 + AMP * fall * Math.sin(tt * 2 * Math.PI - dist * 1.25);
    }
    function build(i: number): number {
        void i;
        g3 = makeGrid(2026, 10, scWrap);
        put(g3.board, 0, 0, 448, 156);
        cap3 = make('b', 'ov', sceneEl);
        put(cap3, 0, 2, 260, 14);
        cap3.style.fontSize = '11px';
        cap3.style.fontWeight = '700';
        cap3.style.color = 'rgba(23,20,26,.62)';
        cap3.textContent = 'hover 한 줄이 위상차로 물결친다';
        const rowA = bar('bar k0', CX0, 5, CW * 40 / 100, 7);
        void rowA;
        const labA = make('b', 'ax', chartEl);
        put(labA, CX0, 24, 240, 12);
        labA.textContent = '줄 위상 sin(2πt − 거리×1.25)';
        axis(RIPPLE_MS);
        return RIPPLE_MS + 300;
    }
    function frame(t: number): string {
        if (!g3) { return ''; }
        // 자동 hover — 커서 인덱스가 리사주(8자) 궤도로 주행한다 (사람이 올리면 .is-demo 루프)
        const tt = t / RIPPLE_MS;
        const lx = Math.sin(tt * 2 * Math.PI);
        const lz = Math.sin(2 * tt * 2 * Math.PI);
        focusI = clamp(Math.round(20 + lx * 20), 0, 41);
        const r0 = Math.floor(focusI / 7);
        for (let i = 0; i < CELLS; i += 1) {
            const c = g3.cells[i];
            const row = Math.floor(i / 7);
            const near = Math.abs(row - r0) <= 1;
            const s = near ? rowPhase(row, r0, tt) : 1;
            c.el.style.transform = 'scale(' + s.toFixed(3) + ')';
            c.bg.style.opacity = (near && c.d.d % 2 === 0) ? '0.5' : '0';
            c.num.style.fontWeight = row === r0 ? '800' : '400';
            c.num.style.color = row === r0 ? '#0a4fe8' : (c.d.out ? 'rgba(23,20,26,.38)' : '#17141a');
        }
        sceneEl.style.background = r0 % 2 === 0 ? '#f3ece1' : '#ede4d7';
        const near = g3.cells.filter(function (c) { return Math.abs(Math.floor(g3!.cells.indexOf(c) / 7) - r0) <= 1; }).length;
        void near;
        setReads(
            fill('ROW_PHASE_SPAN {a} · 진폭 {b} · 위상 지연 1.25 rad/줄', f1(ROW_PHASE_SPAN), f1(AMP)),
            fill('rowPhase(row) = 1 + A·e^(−거리²/span²)·sin(ωt − 거리×1.25) — 줄 {a}이 지금 주인', f0(r0))
        );
        return fill('줄 {a} 호버 — 위·아래 줄이 위상차로 순차 부풀어 오른다 (지금 {b}칸 반응)', f0(r0 + 1), f0(21));
    }
    return run({ count: 1, build: build, frame: frame });

}

export default function CalRowRipple() {
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
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={'호버한 줄을 중심으로 위아래 줄이 위상차를 두고 순차적으로 부풀어 오르는 물결의 장면'}></div>
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
