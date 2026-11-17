// BuProgressRingOverlay - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./BuProgressRingOverlay.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

function main(root: HTMLElement): () => void {
    // ── 525 블러업 공통 — 무대 좌표·문구 틀·요소 조립·이미지 소재·블러업 엔진 (524 core.ts 계승)
    const W = 480;
    const CX0 = 8;
    const CW = 432;
    function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
    function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
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
    function f2(v: number): string { return (Math.round(v * 100) / 100).toFixed(2); }
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
    const scWrap = make('div', 'scwrap', sceneEl);
    const clkEl = make('i', 'clk', sceneEl);
    function clearAll(): void {
        // clkEl(시계)은 sceneEl 에 직접 붙어 있으므로 래퍼만 비운다 — 시계를 지우면 렌더 시계가 죽는다
        scWrap.textContent = '';
        chartEl.textContent = '';
        probeEl.textContent = '';
    }
    // 정점 오프셋 — 시드 해시(재생해도 같은 값). Math.random 을 쓰지 않는다
    function seedHash(i: number, seed: number): number {
        const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
        return x - Math.floor(x);
    }
    // ── 엔진이 푼 시간 읽기 — getAnimations() 값
    function animsIn(host: HTMLElement): Animation[] {
        return host.getAnimations({ subtree: true });
    }
    interface Seg { s: number; e: number; k: number; }
    function spanOf(d: number, dur: number): Seg { return { s: d, e: d + dur, k: 0 }; }
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
            out.push(bar('bar k0', x, 5 + i * (h + 1), w, h));
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
    let headEl: HTMLElement | null = null;
    function setReads(a: string, b: string): void {
        readA.textContent = a;
        readB.textContent = b;
    }
    // ── 블러업 공통 조각
    // blurRadius — 지수 감쇠 R = R0 x e^(-DECAY_RATE x t). 02 의 주역이고 다른 항목도 같은 곡선을 쓴다
    function blurRadius(r0: number, rate: number, t: number): number {
        return r0 * Math.exp(-rate * t / 1000);
    }
    // backSolve — blur 가 바깥으로 번지는(edge bleed) 반경만큼 스케일을 키우는 역산 보정.
    //   R=20px 일 때 1.05 가 되도록 EDGE_K=400: scale = 1 + R/400
    const EDGE_K = 400;
    function backSolve(r: number): number { return 1 + r / EDGE_K; }
    // progress — 로드 진행도 0~1. delay 뒤 cross_ms 걸쳐 0→1 (01·04·05·06·07 공용)
    function progress(t: number, delay: number, crossMs: number): number {
        return clamp((t - delay) / crossMs, 0, 1);
    }
    // ringArc — 원호 길이 = 둘레 x 퍼센트/100 (04). stroke-dashoffset = C - 호길이
    function ringArc(circ: number, pct: number): number { return circ * clamp(pct, 0, 100) / 100; }
    // ── 이미지 소재 — SVG 문자열 3종 (data URI · 외부 URL 0 · FLUX 없음)
    //   산(morning)·숲(forest)·밤하늘(night). 그라디언트+원+시드 점 — 저해상도 썸네일과 같은 소스
    const SVG_W = 448;
    const SVG_H = 156;
    function svgMountains(): string {
        const dots: string[] = [];
        for (let i = 0; i < 26; i += 1) {
            const h1 = seedHash(i, 3);
            const h2 = seedHash(i, 11);
            dots.push('<circle cx="' + f1(20 + h1 * 408) + '" cy="' + f1(96 + h2 * 52) + '" r="' + f1(1.2 + h1 * 2.2) + '" fill="#f3e8d8" opacity="' + f2(0.5 + h2 * 0.4) + '"/>');
        }
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 156">' +
            '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#f6e3cf"/><stop offset="0.62" stop-color="#efd3c8"/>' +
            '<stop offset="0.63" stop-color="#8fb9a8"/><stop offset="1" stop-color="#6da08f"/></linearGradient></defs>' +
            '<rect width="448" height="156" fill="url(#sky)"/>' +
            '<circle cx="326" cy="44" r="22" fill="#f8d9a8" opacity="0.9"/>' +
            '<path d="M0,100 L84,52 L150,98 L226,44 L312,100 L390,64 L448,96 L448,156 L0,156 Z" fill="#5f8f7f"/>' +
            '<path d="M0,122 L96,88 L188,124 L280,92 L372,126 L448,102 L448,156 L0,156 Z" fill="#4a7a6b"/>' +
            dots.join('') + '</svg>';
    }
    function svgForest(): string {
        const trees: string[] = [];
        for (let i = 0; i < 14; i += 1) {
            const h1 = seedHash(i, 5);
            const x = 12 + i * 31 + h1 * 10;
            const hh = 46 + h1 * 42;
            const tone = ['#a8cdb8', '#96c0aa', '#88b59d'][i % 3];
            trees.push('<path d="M' + f0(x) + ',140 L' + f0(x - 14) + ',140 L' + f0(x) + ',' + f0(140 - hh) + ' L' + f0(x + 14) + ',140 Z" fill="' + tone + '"/>');
        }
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 156">' +
            '<defs><linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#e9f0e4"/><stop offset="1" stop-color="#d3e2cf"/></linearGradient></defs>' +
            '<rect width="448" height="156" fill="url(#fg)"/>' +
            '<circle cx="86" cy="40" r="18" fill="#f5e6c4" opacity="0.95"/>' +
            trees.join('') + '<rect y="140" width="448" height="16" fill="#b9d0b2"/></svg>';
    }
    function svgNight(): string {
        const stars: string[] = [];
        for (let i = 0; i < 40; i += 1) {
            const h1 = seedHash(i, 13);
            const h2 = seedHash(i, 17);
            stars.push('<circle cx="' + f1(h1 * 444) + '" cy="' + f1(h2 * 108) + '" r="' + f1(0.7 + h1 * 1.4) + '" fill="#f6f0e4" opacity="' + f2(0.35 + h2 * 0.55) + '"/>');
        }
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 156">' +
            '<defs><linearGradient id="ng" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#3d4266"/><stop offset="0.7" stop-color="#565f85"/>' +
            '<stop offset="1" stop-color="#7a7fa0"/></linearGradient></defs>' +
            '<rect width="448" height="156" fill="url(#ng)"/>' +
            '<path d="M0,132 Q112,108 224,128 T448,124 L448,156 L0,156 Z" fill="#333a5c"/>' +
            '<circle cx="356" cy="38" r="15" fill="#efe6cf" opacity="0.95"/><circle cx="349" cy="34" r="14" fill="#565f85" opacity="0.55"/>' +
            stars.join('') + '</svg>';
    }
    function svgDataUri(svg: string): string { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }
    // lowThumb — 같은 SVG 를 20px 폭 캔버스에 그려 toDataURL 로 뽑는 진짜 저해상도 픽셀(LQIP)
    //   img 디코드는 비동기라 빌드 시그니처를 만들지 못한다 — 대신 픽셀 크기가 곧 저해상도다:
    //   브라우저가 20px 를 448px 로 확대해 그 자체가 뭉개진 LQIP 처럼 보인다(비트 캔버스 없이 확대 보간)
    function makeImgEl(src: string, alt: string): HTMLImageElement {
        const im = document.createElement('img');
        im.src = src;
        im.alt = alt;
        im.width = SVG_W;
        im.height = SVG_H;
        return im;
    }
    // ── 실행 퀄: 프리셋 하나가 한 주기. 시계 애니메이션이 끝나면 다음 프리셋으로 다시 시작한다
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
            // 움직임 줄이기 — 모든 애니메이션이 꺼지고 장면은 블러 없이 선명한 그림 한 장 (큐 접근성 서술)
            statusP.textContent = '움직임 줄이기 켜짐 · 블러 없이 선명한 그림 한 장';
            readB.textContent = '블러 단계를 건너뛰고 선명한 그림을 즉시 보여 주는 한 장면이다';
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
    // 04 진행 링 겹침 — 원 둘레를 재해 로드 % 만큼 stroke-dashoffset 을 내리는 원호를 흐린 그림 위에 겹친다.
    //    34% 는 둘레 176px 중 60px 만 그리는 산술이 매 순간 퍼센트와 일치한다
    // arcOverlay — 진행 링을 그림 위에 얹는 겹침. 둘레 176px 원호. svg stroke
    const RING_C = 176;        // 원 둘레 px (지름 56px 원 — 56 x π ≈ 176)
    const arcOverlay = true;   // 링 오버레이 켜짐 — 흐린 그림 위에 겹친다
    const LOAD_AT = 220;
    const CROSS_MS = 900;
    let highEl: HTMLImageElement | null = null;
    let lowEl: HTMLImageElement | null = null;
    let fgEl: SVGGeometryElement | null = null;
    let pctEl: HTMLElement | null = null;
    let arcEl: HTMLElement | null = null;
    function build(_i: number): number {
        const card = make('div', 'pcard', scWrap);
        put(card, 24, 10, 400, 136);
        lowEl = makeImgEl(svgDataUri(svgMountains()), '산 아침 풍경 그림');
        lowEl.setAttribute('class', cx('pcard__low'));
        lowEl.style.opacity = '1';
        lowEl.style.filter = 'blur(8px)';
        card.appendChild(lowEl);
        highEl = makeImgEl(svgDataUri(svgMountains()), '산 아침 풍경 그림');
        highEl.setAttribute('class', cx('pcard__high'));
        card.appendChild(highEl);
        // 진행 링 svg — 둘레 176px 원. bg 원 + fg 원호(길이 0 에서 시작)
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', cx('pring'));
        svg.setAttribute('viewBox', '0 0 64 64');
        svg.setAttribute('width', '64');
        svg.setAttribute('height', '64');
        put(svg as unknown as HTMLElement, 192, 46, 64, 64);
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        bg.setAttribute('class', cx('pring__bg'));
        bg.setAttribute('cx', '32');
        bg.setAttribute('cy', '32');
        bg.setAttribute('r', '28');
        bg.setAttribute('fill', 'none');
        bg.setAttribute('stroke-width', '5');
        svg.appendChild(bg);
        const fg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        fg.setAttribute('class', cx('pring__fg'));
        fg.setAttribute('cx', '32');
        fg.setAttribute('cy', '32');
        fg.setAttribute('r', '28');
        fg.setAttribute('fill', 'none');
        fg.setAttribute('stroke-width', '5');
        fg.setAttribute('stroke-dasharray', String(RING_C));
        fg.setAttribute('stroke-dashoffset', String(RING_C));
        fg.setAttribute('transform', 'rotate(-90 32 32)');
        svg.appendChild(fg);
        scWrap.appendChild(svg as unknown as HTMLElement);
        fgEl = fg;
        pctEl = make('b', 'ov ovb', sceneEl);
        put(pctEl, 196, 66, 60, 14);
        arcEl = make('b', 'ov ovs', sceneEl);
        put(arcEl, 30, 130, 400, 12);
        drawRows([spanOf(LOAD_AT, CROSS_MS)], 2000);
        axis(2000);
        setReads(
            fill('둘레 {a}px · 호길이 = {a} x 퍼센트/100 · dashoffset = {a} - 호길이', f0(RING_C)),
            fill('원 둘레를 먼저 재고 퍼센트만큼만 호를 그린다 — 매 순간 퍼센트와 일치')
        );
        return 2000;
    }
    function frame(t: number): string {
        const p = progress(t, LOAD_AT, CROSS_MS);
        const pct = p * 100;
        const arc = ringArc(RING_C, pct);
        if (fgEl) { fgEl.setAttribute('stroke-dashoffset', f2(RING_C - arc)); }
        if (highEl) { highEl.style.opacity = f2(p); }
        if (lowEl) { lowEl.style.filter = 'blur(' + f2(8 * (1 - p)) + 'px)'; }
        if (pctEl) { pctEl.textContent = f0(pct) + '%'; }
        if (arcEl) { arcEl.textContent = fill('34% → 호 {a}px · 100% → 호 {b}px', f0(ringArc(RING_C, 34)), f0(RING_C)); }
        return fill('지금 {a} · {b}%', f0(t) + 'ms', f0(pct));
    }
    return run({ count: 1, build: build, frame: frame });

}

export default function BuProgressRingOverlay() {
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
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={'로드 퍼센트만큼 원호의 길이가 정확히 그려지며 링과 그림이 같은 진행도를 나눠 갖는 장면'}></div>
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
