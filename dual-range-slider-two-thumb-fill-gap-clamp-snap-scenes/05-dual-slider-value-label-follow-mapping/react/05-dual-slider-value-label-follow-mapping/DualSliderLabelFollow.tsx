// DualSliderLabelFollow - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./DualSliderLabelFollow.module.scss";

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
    // 05 값 레이블 매핑 — left 를 thumb % 그대로 두면 양끝에서 밖으로 나간다.
    //    보정 = calc(pct% - HALF_THUMB px) 로 끝단에서도 안에 머문다. 실패 판(보정 없음)을 먼저 보여준다
    const TRACK_X = 64;
    const TRACK_W = 320;
    const HALF_THUMB = 14;    // thumb 반폭 — 레이블 중심 보정값
    const EDGE_PAD = 4;
    const SWING_MS = 1700;
    const PRESETS = [0, 1];   // ←→ 0 = 실패 판(보정 없음) · 1 = 보정 판
    let trk: HTMLElement | null = null;
    let thumb: HTMLElement | null = null;
    let labGood: HTMLElement | null = null;
    let labBad: HTMLElement | null = null;
    let modeEl: HTMLElement | null = null;
    let bandEl: HTMLElement | null = null;
    let v = 0;
    function build(i: number): number {
        // 값 전파 밴드 — thumb % 에너지가 배경 톤으로 스윕한다. 보정 판(i===1)은 민트, 실패 판은 로즈 톤
        bandEl = makeBand(TRACK_X - 24, 112, TRACK_W + 48, 42);
        trk = make('i', 'trk', scWrap);
        put(trk, TRACK_X, 74, TRACK_W, 6);
        thumb = make('i', 'thm thm--hi', scWrap);
        if (thumb) { put(thumb, 0, 68, 18, 18); }
        // 실패 레이블 — left = pct% 그대로 (양끝에서 밖으로 나감)
        labBad = make('b', 'lab lab--warn', sceneEl);
        // 보정 레이블 — left = calc(pct% - 14px) + 양끝 클램프
        labGood = make('b', 'lab', sceneEl);
        modeEl = make('b', 'ov', sceneEl);
        put(modeEl, 24, 8, 400, 14);
        modeEl.style.color = '#17141a';
        modeEl.style.fontSize = '11px';
        modeEl.style.fontWeight = '800';
        // 트랙 경계 표식 — 레이블이 나갔는지 안 나갔는지의 기준선
        const bL = make('i', 'clmp', scWrap);
        put(bL, TRACK_X - 1, 60, 2, 28);
        bL.style.background = 'rgba(23,20,26,.3)';
        const bR = make('i', 'clmp', scWrap);
        put(bR, TRACK_X + TRACK_W - 1, 60, 2, 28);
        bR.style.background = 'rgba(23,20,26,.3)';
        if (i === 0) {
            if (labBad) { labBad.textContent = '75'; labBad.style.opacity = '1'; }
            if (labGood) { labGood.style.opacity = '0'; }
        } else {
            if (labBad) { labBad.style.opacity = '0'; }
            if (labGood) { labGood.textContent = '75'; labGood.style.opacity = '1'; }
        }
        axis(3600);
        return 3800;
    }
    function frame(t: number): string {
        const cyc = SWING_MS * 2;
        const ph = (t % cyc) / cyc;
        const s = ph < 1 ? ph : 2 - ph;
        // 0 → 100 → 0 왕복 — 양끝에서 실패가 드러난다
        v = s * 100;
        const pct01 = v / 100;
        const thPx = TRACK_X + pct01 * TRACK_W;
        if (bandEl) { bandH(bandEl, 'rgba(213,218,234,.22)', 'rgba(143,216,189,.62)', 'rgba(201,184,242,.5)', 0, pct01); }
        // 장면 톤 전파 — thumb 가 끝(0%·100%)에 갈수록 장면이 어두워진다: 실패(나감)가 배경으로 읽힌다
        const edgeNear = Math.max(1 - v / 28, (v - 72) / 28);
        const toneE = Math.round(240 - clamp(edgeNear, 0, 1) * 30);
        sceneEl.style.background = 'rgb(' + toneE + ',' + toneE + ',' + (toneE - 6) + ')';
        if (thumb) { put(thumb, thPx - 9, 68, 18, 18); }
        // 실패 판: left = pct% 그대로 (레이블 폭 36px 중심 안 맞춤 — 왼쪽 끝에서 왼쪽으로 삐져나감)
        const badX = thPx - 18;
        if (labBad) { put(labBad, badX, 44, 36, 20); }
        // 보정 판: left = pct% - HALF_THUMB, 양끝은 EDGE_PAD 로 클램프
        const goodX = clamp(thPx - HALF_THUMB, TRACK_X - 10, TRACK_X + TRACK_W - HALF_THUMB * 2 + 10 - EDGE_PAD);
        if (labGood) { put(labGood, goodX, 44, 36, 20); labGood.textContent = f0(v); }
        if (labBad) { labBad.textContent = f0(v); }
        const badOut = badX < TRACK_X - 12 || badX + 36 > TRACK_X + TRACK_W + 12;
        const goodOut = goodX < TRACK_X - 12 || goodX + 36 > TRACK_X + TRACK_W + 12;
        if (modeEl) {
            modeEl.textContent = (badOut ? '실패: left=pct% 그대로 — 양끝에서 나감' : '보정: calc(pct% - 14px) — 안에 머물다')
                + ' · 레이블 x=' + f0(goodX) + 'px';
            modeEl.style.color = badOut ? '#c2361a' : '#17141a';
        }
        void goodOut;
        setReads(
            fill('HALF_THUMB {a}px · EDGE_PAD {b}px · LABEL_LERP 즉시', f0(HALF_THUMB), f0(EDGE_PAD)),
            fill('레이블 left = calc(pct% - {a}px) — 0% 와 100% 에서도 트랙 안', f0(HALF_THUMB))
        );
        return fill('지금 {a}% · 레이블 x {b}px · {c}', f0(v), f0(goodX), badOut ? '실패 프레임' : '보정됨');
    }
    return run({ count: PRESETS.length, build: build, frame: frame });

}

export default function DualSliderLabelFollow() {
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
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={'값 레이블이 보정 없이는 양끝에서 밖으로 나갔다가 calc 보정으로 트랙 안에 머무는 장면'}></div>
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
