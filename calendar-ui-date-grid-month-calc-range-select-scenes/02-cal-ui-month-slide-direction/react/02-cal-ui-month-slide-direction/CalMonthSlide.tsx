// CalMonthSlide - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./CalMonthSlide.module.scss";

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
    // 02 달 전환 슬라이드 — 목표 월이 현재 월보다 크면 slide-next, 작으면 slide-prev. dual grid 두 장이 반대 방향으로 같이 움직인다
    const SLIDE_MS = 280;    // 변형1: 280 → 600
    const HOLD_MS = 620;
    // 순환 경로: 2026-11 → 2026-12 (next) → 2027-1 (next) → 2026-11 (prev 롤백)
    const SEQ: { y: number; m: number; dir: number }[] = [
        { y: 2026, m: 11, dir: 1 },
        { y: 2027, m: 0, dir: 1 },
        { y: 2026, m: 10, dir: -1 },
    ];
    let gridA: Grid | null = null;   // 현재 달
    let gridB: Grid | null = null;   // 들어오는 달 (dual grid)
    let labA: HTMLElement | null = null;
    let labB: HTMLElement | null = null;
    let arrowEl: HTMLElement | null = null;
    let steps: Seg[] = [];
    function build(i: number): number {
        const from = i === 0 ? { y: 2026, m: 10 } : SEQ[i - 1];
        const to = SEQ[i];
        const dir = to.dir;   // direction: +1 = 다음 달(오른쪽으로 흐른다), -1 = 이전 달(왼쪽으로)
        dirNow = dir;
        const wrapEl = make('div', 's2__wrap', scWrap);
        gridA = makeGrid(from.y, from.m, wrapEl);
        gridB = makeGrid(to.y, to.m, wrapEl);
        put(gridA.board, 0, 0, 448, 156);
        put(gridB.board, 0, 0, 448, 156);
        wrapEl.style.overflow = 'hidden';
        put(wrapEl, 0, 0, 448, 156);
        // 이동 시작 전 위치 — dir 쪽에서 들어와 반대쪽으로 나간다
        gridA.board.style.transform = 'translateX(0px)';
        gridB.board.style.transform = 'translateX(' + (dir * 448) + 'px)';
        labA = make('b', 'ov', sceneEl);
        put(labA, 8, 4, 120, 14);
        labA.style.fontSize = '12px';
        labA.style.fontWeight = '800';
        labA.style.color = '#17141a';
        labA.textContent = from.y + '.' + (from.m + 1);
        labB = make('b', 'ov', sceneEl);
        put(labB, 320, 140, 120, 14);
        labB.style.fontSize = '12px';
        labB.style.fontWeight = '800';
        labB.style.textAlign = 'right';
        labB.style.color = '#17141a';
        labB.textContent = to.y + '.' + (to.m + 1);
        arrowEl = make('b', 'ov', sceneEl);
        put(arrowEl, 200, 4, 48, 14);
        arrowEl.style.fontSize = '13px';
        arrowEl.style.fontWeight = '800';
        arrowEl.style.textAlign = 'center';
        arrowEl.style.color = dir > 0 ? '#0a4fe8' : '#c2361a';
        arrowEl.textContent = dir > 0 ? '▶' : '◀';
        steps = [{ s: HOLD_MS, e: HOLD_MS + SLIDE_MS, k: 0 }];
        drawRows(steps, HOLD_MS * 2 + SLIDE_MS);
        axis(HOLD_MS * 2 + SLIDE_MS);
        return HOLD_MS * 2 + SLIDE_MS + 260;
    }
    let eased = 0;
    let dirNow = 1;
    function frame(t: number): string {
        if (!gridA || !gridB) { return ''; }
        const dir = dirNow;   // direction — build 에서 정한 이번 전환의 방향 (+1 next / −1 prev)
        const p = clamp((t - HOLD_MS) / SLIDE_MS, 0, 1);
        // easeInOutCubic — 전환 시간 SLIDE_MS 안에서 두 그리드가 같은 곡선으로 지나간다
        eased = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        // 목표월 > 현재월 → slide-next (오른쪽으로), 목표월 < 현재월 → slide-prev (왼쪽으로) — 부호 하나가 방향을 정한다
        gridA.board.style.transform = 'translateX(' + (-dir * eased * 448) + 'px)';
        gridB.board.style.transform = 'translateX(' + (dir * (1 - eased) * 448) + 'px)';
        gridA.board.style.opacity = String(1 - eased * 0.6);
        if (labA) { labA.style.opacity = String(1 - eased); }
        if (labB) { labB.style.opacity = String(eased); }
        sceneEl.style.background = p > 0 && p < 1 ? '#ffffff' : '#f3ece1';
        setReads(
            fill('SLIDE_MS {a} · dual grid — 현재 달과 들어오는 달이 반대 방향으로', f0(SLIDE_MS)),
            fill('direction = 목표월 - 현재월 의 부호 — 지금 {a}', dir > 0 ? 'slide-next (오른쪽으로 흐른다)' : 'slide-prev (왼쪽으로 흐른다)')
        );
        const moving = t > HOLD_MS && t < HOLD_MS + SLIDE_MS;
        return moving
            ? fill('전환 중 — 두 그리드가 지나간다 (easing {a})', f1(p))
            : (t <= HOLD_MS ? '대기 — 다음 달로 넘어간다' : '완료 — 새 달이 자리 잡았다');
    }
    return run({ count: SEQ.length, build: build, frame: frame });

}

export default function CalMonthSlide() {
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
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={'다음 달 그리드가 반대편에서 들어와 현재 달을 밀어내는 방향 판별 슬라이드의 장면'}></div>
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
