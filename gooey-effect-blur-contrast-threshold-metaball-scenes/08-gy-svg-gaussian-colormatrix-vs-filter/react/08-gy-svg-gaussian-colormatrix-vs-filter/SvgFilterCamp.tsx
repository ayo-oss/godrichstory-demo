// SvgFilterCamp - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./SvgFilterCamp.module.scss";

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
    // 08 SVG 필터 진영 대조 — 좌(CSS blur+contrast·흰 배경) vs 우(SVG feGaussianBlur+feColorMatrix 알파 임계·투명) 같은 장면 병렬
    const THETA_A = 19;   // feColorMatrix 알파행 계수 a[3][3] — 0..1 알파를 19배
    const CLAMP_V = -9;   // a[3][4] 오프셋 — CLAMP 로 0/1 밖을 자른다 (THETA·CLAMP)
    const MERGE_DELTA = 6.9;   // 두 진영의 병합 거리 차(px) — 모델 계산값 (칩)
const BLUR8 = 8;
    const CONTRAST8 = 20;
    const SWING8 = 1300;
    let svgL: SVGSVGElement | null = null;
    let svgR: SVGSVGElement | null = null;
    let dotL1: SVGCircleElement | null = null;
    let dotL2: SVGCircleElement | null = null;
    let dotR1: SVGCircleElement | null = null;
    let dotR2: SVGCircleElement | null = null;
    function mkCirc(svg: SVGSVGElement, cls: string): SVGCircleElement {
        const c = svgEl('circle', cls, svg) as SVGCircleElement;
        c.setAttribute('r', '15');
        return c;
    }
    function build(_i: number): number {
        // 좌 — CSS gooey: div 계층 안 두 알갱이
        const gy = make('div', 'gy', scWrap);
        put(gy, 16, 20, 204, 100);
        gy.style.borderRadius = '0';
        dotL1 = mkCircSvg(gy);
        dotL2 = mkCircSvg(gy);
        // 우 — SVG 필터: 임의 배경(패널) 위 투명 blob 에 filter 적용
        const box = make('div', 'gybox', scWrap);
        put(box, 228, 20, 204, 100);
        svgR = document.createElementNS(SVGNS, 'svg');
        svgR.setAttribute('viewBox', '0 0 204 100');
        svgR.setAttribute('class', cx('sc gybox__svg'));
        box.appendChild(svgR);
        const defs = svgEl('defs', '', svgR) as SVGElement;
        const f = svgEl('filter', '', defs) as SVGElement;
        f.setAttribute('id', 'goo-alpha');
        f.setAttribute('x', '-20%');
        f.setAttribute('y', '-20%');
        f.setAttribute('width', '140%');
        f.setAttribute('height', '140%');
        const gb = svgEl('feGaussianBlur', '', f) as SVGElement;
        gb.setAttribute('stdDeviation', String(BLUR8));
        const cm = svgEl('feColorMatrix', '', f) as SVGElement;
        cm.setAttribute('type', 'matrix');
        // 알파행만 임계로 — A' = 19·A − 9 (a[3][3]=THETA·a[3][4]=CLAMP, 0..1 로 잘라 이진화)
        cm.setAttribute('values', '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ' + THETA_A + ' ' + CLAMP_V);
        const g = svgEl('g', '', svgR) as SVGGElement;
        g.setAttribute('filter', 'url(#goo-alpha)');
        dotR1 = svgEl('circle', '', g) as SVGCircleElement;
        dotR1.setAttribute('r', '15');
        dotR1.setAttribute('fill', '#fff7e6');
        dotR2 = svgEl('circle', '', g) as SVGCircleElement;
        dotR2.setAttribute('r', '15');
        dotR2.setAttribute('fill', '#fff7e6');
        // 좌측도 SVG 로 (div 안 svg — CSS filter 는 부모 div 에)
        svgL = document.createElementNS(SVGNS, 'svg');
        svgL.setAttribute('viewBox', '0 0 204 100');
        svgL.setAttribute('class', cx('sc gybox__svg'));
        gy.appendChild(svgL);
        const gl = svgEl('g', '', svgL) as SVGGElement;
        dotL1 = svgEl('circle', '', gl) as SVGCircleElement;
        dotL1.setAttribute('r', '15');
        dotL1.setAttribute('fill', '#17141a');
        dotL2 = svgEl('circle', '', gl) as SVGCircleElement;
        dotL2.setAttribute('r', '15');
        dotL2.setAttribute('fill', '#17141a');
        const capL = make('b', 'ov', sceneEl);
        put(capL, 16, 6, 204, 14);
        capL.style.color = '#17141a';
        capL.style.fontSize = '11px';
        capL.style.fontWeight = '700';
        capL.textContent = 'CSS blur+contrast';
        const capR = make('b', 'ov', sceneEl);
        put(capR, 228, 6, 204, 14);
        capR.style.color = 'rgba(255,247,230,.85)';
        capR.style.fontSize = '11px';
        capR.style.fontWeight = '700';
        capR.textContent = 'SVG feGaussian+feColorMatrix';
        // 중앙 구분선 — 두 진영을 나눈다
        const mid = make('i', 's8__mid', sceneEl);
        put(mid, 222, 16, 2, 108);
        // 하단 병합거리 비교 막대 — CSS/SVG 두 모델값을 막대로 (값 전파)
        const capBar = make('i', 's1__trail', sceneEl);
        void capBar;
        return SWING8 * 2 + 400;
    }
    function mkCircSvg(_host: HTMLElement): SVGCircleElement { return null as unknown as SVGCircleElement; }
    function frame(t: number): string {
        const ph = (t % (SWING8 * 2)) / SWING8;
        const s = ph < 1 ? ph : 2 - ph;
        const gap = 40 - 38 * s;
        const xA = 46;
        const xB = xA + 30 + gap;
        if (dotL1 && dotL2) {
            dotL1.setAttribute('cx', f1(xA));
            dotL1.setAttribute('cy', '50');
            dotL2.setAttribute('cx', f1(xB));
            dotL2.setAttribute('cy', '50');
        }
        if (dotR1 && dotR2) {
            dotR1.setAttribute('cx', f1(xA));
            dotR1.setAttribute('cy', '50');
            dotR2.setAttribute('cx', f1(xB));
            dotR2.setAttribute('cy', '50');
        }
        // 갭이 좁혀질수록 장면 톤이 밝아진다 — 값의 전파 (연속)
        const tone = Math.round(239 - (40 - gap) / 40 * 18);
        sceneEl.style.background = 'rgb(' + tone + ',' + tone + ',' + (tone - 8) + ')';
        // 병합 지점 모델 — CSS(명도 0..255 임계) 와 SVG(알파 0..1 임계) 의 병합 거리 차
        const mergeCSS = 15 * 0.9 + BLUR8 * 1.1;
        const mergeSVG = 2 * Math.sqrt(15 * 15 * (1 / 0.473)) - 2 * 15;  // 합 1 이 되는 접점 근사
        const delta = Math.abs(mergeCSS - mergeSVG);
        setReads(
            fill('THETA a[3][3]={a} · CLAMP a[3][4]={b}', f0(THETA_A), f0(CLAMP_V)),
            fill('CSS 임계는 명도(0~255), SVG 임계는 알파(0~1) — 같은 흐름 다른 단위')
        );
        void delta;
        return fill('지금 갭 {a}px · 병합 거리 CSS {b} / SVG {c}', f1(gap), f1(mergeCSS), f1(mergeSVG));
    }
    return run({ count: 1, build: build, frame: frame });

}

export default function SvgFilterCamp() {
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
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={'CSS blur+contrast 근사와 SVG feGaussianBlur+feColorMatrix 알파 임계가 같은 장면을 나란히 돌리는 장면'}></div>
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
