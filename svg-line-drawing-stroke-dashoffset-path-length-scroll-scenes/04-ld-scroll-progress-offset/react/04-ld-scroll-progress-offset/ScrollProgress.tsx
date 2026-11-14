// ScrollProgress - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./ScrollProgress.module.scss";

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
    function svgEl(tag: string, cls: string, parent: SVGSVGElement): SVGElement {
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
            statusP.textContent = '움직임 줄이기 켜짐 · 완성 상태';
            readB.textContent = '그려지는 과정 대신 완성된 그림을 바로 보여 준다';
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
    // 04 스크롤 퍼센트를 offset 산술로 바꾸는 진행 선 — scrollProgress: 스크롤 0~1 이 dashoffset 을 직접 물고 있다 — 스크롤 진행도를 dashoffset = L x (1 - p) 로 직접 연결한다
    const MAP_RANGE = 1.0;
    const LINE = 'M 30 64 L 418 64';
    let lineP: SVGPathElement | null = null;
    let lineLen = 0;
    let fillBar: HTMLElement | null = null;
    let scrubKnob: HTMLElement | null = null;
    let curRange = MAP_RANGE;
    let demoScroll = 0;      // 시연용 가짜 스크롤 값 (0..1) — 실제 스크롤 이벤트가 아니라 시간표로 움직인다
    let goingDown = true;
    let scrollLab: HTMLElement | null = null;
    function apply(p: number): void {
        if (lineP) { setDraw(lineP, lineLen, p); }
        if (fillBar) { fillBar.style.width = clamp(p, 0, 1) * 388 + 'px'; }
        if (scrubKnob) { scrubKnob.style.left = 30 + clamp(p, 0, 1) * 374 + 'px'; }
    }
    function build(i: number): number {
        curRange = i === 0 ? 1.0 : 0.5;
        const svg = makeSvg();
        lineP = svgPath(svg, 'st st--a', LINE);
        lineLen = lineP.getTotalLength();
        setDraw(lineP, lineLen, 0);
        svgText(svg, 'svtx', 30, 48, 'dashoffset = L x (1 - p)');
        // 스크롤 스크럽 — 아래 가로 막대. 실제 페이지에선 이 값이 window.scrollY / range 다
        const track = make('i', 's4__track', scWrap);
        put(track, 30, 104, 388, 16);
        fillBar = make('i', 's4__fill', scWrap);
        put(fillBar, 30, 104, 0, 16);
        scrubKnob = make('i', 's4__knob', scWrap);
        put(scrubKnob, 30, 96, 14, 32);
        scrollLab = make('b', 's4__lab', scWrap);
        put(scrollLab, 300, 40, 140, 14);
        const total = 2000;
        axis(total);
        setReads(
            fill('MAP_RANGE {a} · 화면 {b}만큼 스크롤하면 완성', f1(curRange), f1(curRange)),
            fill('스크롤을 되돌리면 선도 되돌아간다 — 역방향이 공짜로 얹힌다', '')
        );
        demoScroll = 0;
        goingDown = true;
        return total;
    }
    function frame(t: number): string {
        // 시연: 0 -> 1 -> 0 삼각파. 사람이 스크롤하면 스크롤 위치가 곧 이 값이다
        const half = 900;
        const ph = (t % (half * 2)) / half;
        const tri = ph < 1 ? ph : 2 - ph;
        demoScroll = t < 200 ? 0 : tri;
        apply(demoScroll);
        if (scrollLab) { scrollLab.textContent = fill('스크롤 {a}%', f0(demoScroll * 100)); }
        const off = lineLen * (1 - demoScroll);
        return fill('지금 스크롤 {a}% · dashoffset {b}px / {c}px', f0(demoScroll * 100), f1(off), f1(lineLen));
    }
    return run({ count: 2, build: build, frame: frame });

}

export default function ScrollProgress() {
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
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={'스크롤 값을 나타내는 손잡이가 좌우로 움직이며 그 값이 곧 선의 그려진 양이 되는 장면'}></div>
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
