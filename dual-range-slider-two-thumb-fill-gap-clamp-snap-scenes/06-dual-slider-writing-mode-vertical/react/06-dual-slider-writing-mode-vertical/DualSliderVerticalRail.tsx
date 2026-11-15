// DualSliderVerticalRail - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./DualSliderVerticalRail.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

function main(root: HTMLElement): () => void {
    // 무대 좌표 — 안쪽 상자는 늘 480x300 이고 화면 폭에 맞춰 통째로 줄인다
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
    // SVG 무대 — 장면마다 이 안에 path·circle·text 를 놓는다
    function makeSvg(): SVGSVGElement {
        const s = document.createElementNS(SVGNS, 'svg');
        s.setAttribute('viewBox', '0 0 ' + SVGW + ' ' + SVGH);
        s.setAttribute('class', cx('sc'));
        scWrap.appendChild(s);
        return s;
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
    // 그리기 주역: dasharray 를 총 길이로 두고 dashoffset 을 길이 x (1 - p) 로 내린다
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
    // 경로 위 at 지점의 좌표 — getPointAtLength (probe 의 임시 사본으로 잰다)
    // vb = 메인 svg 의 viewBox — 장면이 시선을 확대했으면 같은 값을 넘겨야 좌표가 어긋나지 않는다
    function pointAt(d: string, at: number, vb?: string): { x: number; y: number } {
        const svg = document.createElementNS(SVGNS, 'svg');
        svg.setAttribute('viewBox', vb || ('0 0 ' + SVGW + ' ' + SVGH));
        svg.setAttribute('class', cx('sc'));
        probeEl.appendChild(svg);
        const p = svgPath(svg, '', d);
        const pt = p.getPointAtLength(at);
        probeEl.removeChild(svg);
        return { x: pt.x, y: pt.y };
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
    function span(a: Animation, max: number): Seg {
        const t = a.effect ? a.effect.getComputedTiming() : null;
        if (!t) { return { s: 0, e: 0, k: 0 }; }
        const d = typeof t.delay === 'number' ? t.delay : 0;
        const e = typeof t.endTime === 'number' && isFinite(t.endTime) ? t.endTime : max;
        return { s: d, e: Math.min(e, max), k: 0 };
    }
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
    // ── 아래 차트 상자 그리기
    function bar(cls: string, x: number, y: number, w: number, h: number): HTMLElement {
        const e = make('i', cls, chartEl);
        put(e, x, y, w, h);
        return e;
    }
    // 가로 막대 줄: 한 줄 = 한 구간
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
    // ── 값 전파 밴드 — 항목의 계산값(pct)을 넓은 배경 톤에 같은 함수로 흘려보낸다
    //    (컴포넌트 편 품질: 면적을 부풀리는 게 아니라 값의 전파 범위를 넓히는 것 — 경계가 값과 함께 움직인다)
    function makeBand(x: number, y: number, w: number, h: number): HTMLElement {
        const b = make('i', 'vb', scWrap);
        put(b, x, y, w, h);
        return b;
    }
    // 가로 밴드: p1..p2 (0..1) 구간만 c2a→c2b 그라디언트, 나머지 c1 — 구간이 움직이면
    // 경계 2개뿐 아니라 구간 내부 픽셀 전부가 같은 프레임에 다시 계산된다
    function bandH(b: HTMLElement, c1: string, c2a: string, c2b: string, p1: number, p2: number): void {
        const a = clamp(p1, 0, 1) * 100;
        const z = clamp(p2, 0, 1) * 100;
        b.style.background = 'linear-gradient(90deg,' + c1 + ' 0%,' + c1 + ' ' + a + '%,' + c2a + ' ' + a + '%,' + c2b + ' ' + z + '%,' + c1 + ' ' + z + '%,' + c1 + ' 100%)';
    }
    // 세로 밴드(06 세로 레일) — 180deg 로 돌려 같은 산술
    function bandV(b: HTMLElement, c1: string, c2a: string, c2b: string, p1: number, p2: number): void {
        const a = clamp(p1, 0, 1) * 100;
        const z = clamp(p2, 0, 1) * 100;
        b.style.background = 'linear-gradient(180deg,' + c1 + ' 0%,' + c1 + ' ' + a + '%,' + c2a + ' ' + a + '%,' + c2b + ' ' + z + '%,' + c1 + ' ' + z + '%,' + c1 + ' 100%)';
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
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) { setPaused(true); }
        }, { signal: off.signal });
        window.addEventListener('resize', fit, { signal: off.signal });
        fit();
        rebuild();
        if (reduced) {
            // 움직임 줄이기 — 모든 애니메이션이 꺼지고 장면은 완성 상태 한 장이다 (build 마지막 프레임을 그린다)
            statusP.textContent = '움직임 줄이기 켜짐 · 정적 접점 상태';
            readB.textContent = '늘어짐 없이 붙기 전과 붙은 뒤의 두 상태만 보여 준다';
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
    // 06 세로 이퀄라이저 — writing-mode: vertical-lr 를 걸면 thumb 가 위아래로 움직이고
    //    위 = 최대이므로 FLIP_PCT = 1 - pct 로 % 가 뒤집힌 채 같은 산술이 돈다
    const RAIL_X = 200;
    const RAIL_Y = 16;
    const RAIL_H = 128;      // 세로 레일 높이 (위=최대)
    const SWING_MS = 450;
    let rail: HTMLElement | null = null;
    let fil: HTMLElement | null = null;   // 세로 채움 — 하나를 만들어 재사용
    let loThm: HTMLElement | null = null;
    let hiThm: HTMLElement | null = null;
    let bandEl: HTMLElement | null = null;
    let labLo: HTMLElement | null = null;
    let labHi: HTMLElement | null = null;
    let eqEl: HTMLElement | null = null;
    let ticks: HTMLElement[] = [];
    let loV = 30;
    let hiV = 70;
    function flip(p: number): number { return 1 - p; }   // 위=최대 — y 산술이 뒤집힌다
    function build(_i: number): number {
        // 값 전파 밴드 — 세로 채움 구간(flip(hi)..flip(lo)) 이 레일 뒤 넓은 톤에 같은 산술로 전파된다
        bandEl = makeBand(RAIL_X - 58, RAIL_Y - 12, 120, RAIL_H + 24);
        rail = make('i', 'trk', scWrap);
        put(rail, RAIL_X, RAIL_Y, 6, RAIL_H);
        fil = make('i', 'fil', scWrap);
        ticks = [];
        for (let k = 0; k <= 8; k += 1) {
            const tk = make('i', 'tck tck--v', scWrap);
            put(tk, RAIL_X + 8, RAIL_Y + k * (RAIL_H / 8) - 1, 5, 2);
            ticks.push(tk);
        }
        loThm = make('i', 'thm thm--lo', scWrap);
        hiThm = make('i', 'thm thm--hi', scWrap);
        if (loThm) { put(loThm, 0, 0, 18, 18); }
        if (hiThm) { put(hiThm, 0, 0, 18, 18); }
        // 세로 writing-mode 레이블 — 값은 레일 오른쪽 세로 배치 (writing-mode: vertical-rl 흉내)
        labLo = make('b', 'ov', sceneEl);
        put(labLo, RAIL_X - 46, 0, 36, 14);
        labLo.style.color = '#17141a';
        labLo.style.fontSize = '11px';
        labLo.style.fontWeight = '800';
        labLo.style.textAlign = 'right';
        labHi = make('b', 'ov', sceneEl);
        put(labHi, RAIL_X + 18, 0, 44, 14);
        labHi.style.color = '#17141a';
        labHi.style.fontSize = '11px';
        labHi.style.fontWeight = '800';
        eqEl = make('b', 'ov', sceneEl);
        put(eqEl, 24, 8, 400, 14);
        eqEl.style.color = 'rgba(23,20,26,.75)';
        eqEl.style.fontSize = '10px';
        eqEl.style.fontWeight = '700';
        // 밴드 이름 — 이퀄라이저 패널 맥락
        const capA = make('b', 'ov', sceneEl);
        put(capA, 24, 40, 80, 12);
        capA.style.color = 'rgba(23,20,26,.78)';
        capA.style.fontSize = '9px';
        capA.style.fontWeight = '800';
        capA.textContent = 'LOW';
        const capB = make('b', 'ov', sceneEl);
        put(capB, 24, 108, 80, 12);
        capB.style.color = 'rgba(23,20,26,.78)';
        capB.style.fontSize = '9px';
        capB.style.fontWeight = '800';
        capB.textContent = 'MID';
        const capC = make('b', 'ov', sceneEl);
        put(capC, 356, 74, 80, 12);
        capC.style.color = 'rgba(23,20,26,.78)';
        capC.style.fontSize = '9px';
        capC.style.fontWeight = '800';
        capC.textContent = 'HIGH';
        axis(3600);
        return 3800;
    }
    function frame(t: number): string {
        const cyc = SWING_MS * 2;
        const ph = (t % cyc) / cyc;
        const s = ph < 1 ? ph : 2 - ph;
        // 두 밴드 thumb 시나리오 — LOW 는 30↔55, MID 는 70↔90 로 반대 위상
        loV = 42 + 13 * Math.sin(t / cyc * Math.PI * 2 * 2);
        hiV = 80 - 10 * s;
        // 같은 산술 + 뒤집기: y = RAIL_Y + flip(pct) * RAIL_H (위=최대)
        const loY = RAIL_Y + flip(loV / 100) * RAIL_H;
        const hiY = RAIL_Y + flip(hiV / 100) * RAIL_H;
        if (loThm) { put(loThm, RAIL_X - 6, loY - 9, 18, 18); }
        if (hiThm) { put(hiThm, RAIL_X - 6, hiY - 9, 18, 18); }
        // 세로 채움 — top = flip(max)% · 높이 = (max%-min%)%
        if (fil) { put(fil, RAIL_X, hiY, 6, Math.max(2, loY - hiY)); }
        if (bandEl) { bandV(bandEl, 'rgba(213,218,234,.2)', 'rgba(143,216,189,.6)', 'rgba(201,184,242,.48)', flip(hiV / 100), flip(loV / 100)); }
        // 장면 톤 전파 — 세로 구간(두 thumb 폭) 이 넓을수록 장면이 밝아진다 (같은 산술의 세로 전파)
        const toneV = Math.round(214 + clamp((hiV - loV - 20) / 50, 0, 1) * 40);
        sceneEl.style.background = 'rgb(' + toneV + ',' + toneV + ',' + (toneV - 6) + ')';
        if (labLo) { put(labLo, RAIL_X - 46, loY - 7, 36, 14); labLo.textContent = f0(loV); }
        if (labHi) { put(labHi, RAIL_X + 18, hiY - 7, 44, 14); labHi.textContent = f0(hiV); }
        if (eqEl) { eqEl.textContent = 'writing-mode: vertical-lr · y = RAIL_Y + (1 - pct) x ' + RAIL_H + 'px — 뒤집힌 채 같은 산술'; }
        setReads(
            fill('WRITING_MODE vertical-lr · FLIP_PCT 1-pct · RAIL_H {a}px', f0(RAIL_H)),
            fill('채움 top = flip(max)% · 높이 = (max%-min%)% — 가로 산술의 세로 사본')
        );
        return fill('지금 {a} · {b}', 'LOW ' + f0(loV), 'MID ' + f0(hiV));
    }
    return run({ count: 1, build: build, frame: frame });

}

export default function DualSliderVerticalRail() {
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
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={'writing-mode 회전으로 thumb 가 위아래로 움직이고 % 가 뒤집힌 채 같은 산술이 도는 세로 레일의 장면'}></div>
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
