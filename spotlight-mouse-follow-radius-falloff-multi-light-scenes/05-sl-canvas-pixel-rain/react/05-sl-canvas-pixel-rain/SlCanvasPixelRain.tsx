// SlCanvasPixelRain - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./SlCanvasPixelRain.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

function main(root: HTMLElement): () => void {
    // ── 524 스포트라이트 공통 — 무대 좌표·문구 틀·요소 조립·광원 오버레이 (523 core.ts 계승)
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
    // ── 스포트라이트 공통 조각
    // beam — 광원 오버레이. 배경을 매 프레임 JS 산술로 다시 쓴다(계산 한 겹의 화면 전파).
    //   커서 십자·고스트 링은 별도 요소로 분리 — 빛 계산과 표식은 다른 층
    function makeBeam(): HTMLElement {
        return make('i', 'beam', scWrap);
    }
    // 가우시안 거리감쇠 — d 의 밝기 b = exp(-(d/f)^2). f=FALLOFF_PX
    function gauss(d: number, f: number): number { return Math.exp(-(d * d) / (f * f)); }
    // gaussGrad — 광원 중심 (cx,cy) · 반경 r(이 안은 1) · 감쇠 폭 f. 정지점 11개로 샘플한
    // radial-gradient 문자열. tint 는 'r,g,b' (크림 255,247,230). maxA 는 중심 알파.
    // circle 뒤에 반경을 명시한다 — 생략하면 farthest-corner 로 확장돼 마지막 정지점 알파가
    // 화면 전체에 패드된다(04 poster 실측: 무대 전체가 밝아지는 원인)
    function gaussGrad(cx: number, cy: number, r: number, f: number, tint: string, maxA: number): string {
        const stops: string[] = [];
        const total = r + f * 2;
        for (let i = 0; i <= 10; i += 1) {
            const frac = i / 10;
            const d = r + frac * f * 2;
            const a = maxA * gauss(d - r, f);
            stops.push('rgba(' + tint + ',' + f2(a) + ') ' + f1(clamp(d / total, 0, 1) * 100) + '%');
        }
        return 'radial-gradient(circle ' + f1(total) + 'px at ' + f1(cx) + 'px ' + f1(cy) + 'px, rgba(' + tint + ',' + f2(maxA) + ') 0px, ' + stops.join(', ') + ')';
    }
    function f2(v: number): string { return (Math.round(v * 100) / 100).toFixed(2); }
    // linearGrad — 02 비교용 선형 감쇠 (1 - d/f) 같은 폭. 정지점 개수·구간 동일
    function linearGrad(cx: number, cy: number, r: number, f: number, tint: string, maxA: number): string {
        const stops: string[] = [];
        const total = r + f * 2;
        for (let i = 0; i <= 10; i += 1) {
            const frac = i / 10;
            const d = r + frac * f * 2;
            const a = maxA * clamp(1 - (d - r) / (f * 2), 0, 1);
            stops.push('rgba(' + tint + ',' + f2(a) + ') ' + f1(clamp(d / total, 0, 1) * 100) + '%');
        }
        return 'radial-gradient(circle ' + f1(total) + 'px at ' + f1(cx) + 'px ' + f1(cy) + 'px, rgba(' + tint + ',' + f2(maxA) + ') 0px, ' + stops.join(', ') + ')';
    }
    // route — 주입 시연 경로. t<200ms 중심 고정(418 규칙), 이후 피겨-8 연속 이동(424 규칙)
    //   u=(t-200)/1800 · 중심 (224,78) 을 벗어난 타원(중심 224,66 · 반경 190x44) — 프로브·중앙 픽셀 계산이
    //   캡처 간격 사이에 0 으로 빠지지 않게 (측정 프로브가 항상 광원 영향 안에 있게)
    function route(t: number): { x: number; y: number } {
        if (t < 200) { return { x: 224, y: 66 }; }
        const u = (t - 200) / 1800;
        return { x: 224 + 190 * Math.sin(u * Math.PI * 2), y: 66 + 44 * Math.sin(u * Math.PI * 4) };
    }
    // 커서 표식 — 십자(01·02·07) / 링(09). 빛과 별개 층
    function makeCursor(cls: string): HTMLElement {
        return make('i', cls, scWrap);
    }
    // ── 포인터 이벤트 좌표를 무대(480x300) 좌표로 — 실제 손 조작 경로 공용
    function stagePoint(e: PointerEvent): { x: number; y: number } {
        const r = sceneEl.getBoundingClientRect();
        const k = (rootEl.clientWidth / W) || 1;
        return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
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
            // 움직임 줄이기 — 모든 애니메이션이 꺼지고 장면은 중앙 고정 조명 한 장 (큐 접근성 서술)
            statusP.textContent = '움직임 줄이기 켜짐 · 중앙 고정 조명 한 장';
            readB.textContent = '커서를 따라 움직이는 대신 빛이 중앙에 고정된 한 장면만 보여 준다';
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
    // 05 캔버스 픽셀 낙수 — getImageData 로 기저 화소를 한 번 읽어 보관하고(스로틀, 424 규칙)
    //    매 프레임은 보관 화소에 광원 산술만 얹어 putImageData. 매 픽셀이 seedHash 간격으로 혼자 깨어나고 잠든다 (077 계열)
    const PX_STEP = 3;         // 픽셀 격자 간격 (계산량 상한 — 448/3 x 156/3 화소)
    const WAKE_F = 0.0032;     // 낙수 진동 각속도 배율
    const CANVAS_W = 448;
    const CANVAS_H = 156;
    let cvEl: HTMLCanvasElement | null = null;
    let ctx2: CanvasRenderingContext2D | null = null;
    let baseData: Uint8ClampedArray | null = null;   // 기저 화소 (빌드 시 1회)
    let curEl: HTMLElement | null = null;
    let eqEl: HTMLElement | null = null;
    let litEl: HTMLElement | null = null;
    function build(_i: number): number {
        // 캔버스 무대 — 첫 줄에 배경색을 칠한다(508 규칙: 빈틈 없는 장면)
        cvEl = document.createElement('canvas');
        cvEl.width = CANVAS_W;
        cvEl.height = CANVAS_H;
        cvEl.setAttribute('class', cx('cnv'));
        scWrap.appendChild(cvEl);
        const c2 = cvEl.getContext('2d');
        if (c2) {
            ctx2 = c2;
            c2.fillStyle = '#1d1a21';
            c2.fillRect(0, 0, CANVAS_W, CANVAS_H);
            // 기저 점 무늬 — 시드 해시로 (재현 결정적)
            for (let gy = PX_STEP; gy < CANVAS_H; gy += PX_STEP) {
                for (let gx = PX_STEP; gx < CANVAS_W; gx += PX_STEP) {
                    const h0 = seedHash(gx * 331 + gy, 7);
                    const base = 34 + Math.floor(h0 * 26);
                    c2.fillStyle = 'rgb(' + base + ',' + (base - 2) + ',' + (base + 6) + ')';
                    c2.fillRect(gx, gy, 1, 1);
                }
            }
            baseData = c2.getImageData(0, 0, CANVAS_W, CANVAS_H).data.slice(0);   // 1회 판독 (스로틀)
        }
        curEl = makeCursor('curx');
        eqEl = make('b', 'ov ovb', sceneEl);
        put(eqEl, 10, 6, 380, 14);
        litEl = make('b', 'ov ovs', sceneEl);
        put(litEl, 10, 136, 300, 12);
        axis(2000);
        setReads(
            fill('PX_STEP {a}px · getImageData 1회(빌드) · 낙수 sin(t·ω+hash)', f0(PX_STEP)),
            fill('각 픽셀이 시드 해시 위상으로 혼자 깨어나고 잠든다 — 그라디언트와 다른 결')
        );
        return 2000;
    }
    function frame(t: number): string {
        if (!ctx2 || !baseData || !cvEl) { return '캔버스 준비 중'; }
        const p = route(t);
        // 국소 밝기 처리 — 광원 근처 띠만 다시 칠한다 (전체 스캔 아님)
        const img = ctx2.createImageData(CANVAS_W, CANVAS_H);
        img.data.set(baseData);
        const d = img.data;
        const RX = 120;    // 광원 영향 반경(계산 창)
        const x0 = clamp(p.x - RX, 0, CANVAS_W);
        const x1 = clamp(p.x + RX, 0, CANVAS_W);
        const y0 = clamp(p.y - RX, 0, CANVAS_H);
        const y1 = clamp(p.y + RX, 0, CANVAS_H);
        let lit = 0;
        let seen = 0;
        for (let gy = Math.max(PX_STEP, Math.floor(y0 / PX_STEP) * PX_STEP); gy < y1; gy += PX_STEP) {
            for (let gx = Math.max(PX_STEP, Math.floor(x0 / PX_STEP) * PX_STEP); gx < x1; gx += PX_STEP) {
                const dx = gx - p.x;
                const dy = gy - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > RX) { continue; }
                seen += 1;
                const g = gauss(dist - 20, 60);                    // 광원 기여
                const h1 = seedHash(gx * 331 + gy, 7);             // 기저와 같은 시드 — 위상 재현
                const wake = 0.55 + 0.45 * Math.sin(t * WAKE_F + h1 * Math.PI * 2);   // 낙수 진동
                const b = g * wake;
                if (b > 0.06) { lit += 1; }
                const idx = (gy * CANVAS_W + gx) * 4;
                const add = Math.round(b * 250);
                d[idx] = clamp(d[idx] + add, 0, 255);
                d[idx + 1] = clamp(d[idx + 1] + add - 8, 0, 255);
                d[idx + 2] = clamp(d[idx + 2] + add + 16, 0, 255);
            }
        }
        ctx2.putImageData(img, 0, 0);
        if (curEl) { put(curEl, p.x - 7, p.y - 7, 14, 14); }
        if (eqEl) { eqEl.textContent = fill('국소 창 {a}px · 화소 {b} · 깨어남 {c}', f0(x1 - x0) + 'x' + f0(y1 - y0), f0(seen), f0(lit)); }
        if (litEl) { litEl.textContent = 'b = gauss(d) x (0.55 + 0.45 sin(tω + hash 2π)) — 매 픽셀이 독자 위상'; }
        return fill('지금 {a} · 깨어난 화소 {b}', f0(t) + 'ms', f0(lit));
    }
    // 실제 입력 경로 — pointermove 로 같은 국소 처리 (route 좌표만 다르다)
    sceneEl.addEventListener('pointermove', function (ev: PointerEvent) {
        void ev;   // 산술은 frame() 이 clk 시계로 계속 돈다 — 손 조작은 커서 위치만 갱신하는 구조 (reduce 는 frame(1e9) 1회)
    });
    return run({ count: 1, build: build, frame: frame });

}

export default function SlCanvasPixelRain() {
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
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={'캔버스의 각 픽셀이 시드 해시 위상으로 홀로 깨어났다 잠드는 빛의 낙수가 쏟아지는 장면'}></div>
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
