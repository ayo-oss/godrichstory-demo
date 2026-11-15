// SlGaussianFalloff - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./SlGaussianFalloff.module.scss";

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
    // 02 가우시안 거리감쇠 — 각 픽셀 밝기 b = exp(-(d/FALLOFF_PX)^2). 선형 (1-d/f) 와 같은 반경에서 결이 다르다
    const FALLOFF_PX = 60;     // 변형1: 60 → 160 (빛이 반경 밖으로 넉넉히 번진다)
    const CORE_R = 26;         // 중심 만광 반경
    const PROBE_XY = { x: 232, y: 84 };   // 고정 프로브 점 — 광원 경로 중심 근방 (포스터 순간에도 rise/fall 값이 살아 있다)
    let beamEl: HTMLElement | null = null;
    let curEl: HTMLElement | null = null;
    let probeEl2: HTMLElement | null = null;
    let probeLab: HTMLElement | null = null;
    let eqEl: HTMLElement | null = null;
    let gRow: HTMLElement | null = null;
    let lRow: HTMLElement | null = null;
    function build(_i: number): number {
        beamEl = makeBeam();
        curEl = makeCursor('curx');
        probeEl2 = make('i', 'pdot', scWrap);
        put(probeEl2, PROBE_XY.x - 3, PROBE_XY.y - 3, 6, 6);
        probeLab = make('b', 'ov ovs', sceneEl);
        put(probeLab, PROBE_XY.x - 60, PROBE_XY.y + 8, 120, 12);
        eqEl = make('b', 'ov ovb', sceneEl);
        put(eqEl, 10, 6, 360, 14);
        axis(2000);
        // 차트 — 가우시안 vs 선형 곡선 (반경 밖 감쇠 구간)
        const g1 = make('i', 'curve curve--g', chartEl);
        const l1 = make('i', 'curve curve--l', chartEl);
        void g1; void l1;
        setReads(
            fill('FALLOFF_PX {a} · CORE_R {b}px · b = exp(-(d/f)^2)', f0(FALLOFF_PX), f0(CORE_R)),
            fill('같은 반경에서 감쇠 폭만 바꿔도 손전등과 무대 조명 사이를 오간다')
        );
        return 2000;
    }
    function frame(t: number): string {
        const p = route(t);
        // 가우시안 그라디언트 — 정지점 11개 샘플 (계산 한 겹)
        if (beamEl) { beamEl.style.background = gaussGrad(p.x, p.y, CORE_R, FALLOFF_PX, '255,247,230', 0.5); }
        if (curEl) { put(curEl, p.x - 7, p.y - 7, 14, 14); }
        // 프로브 점 밝기 — 광원까지 거리 d 의 가우시안 값 (모델 산출을 화면 수치로)
        const d = Math.sqrt((p.x - PROBE_XY.x) * (p.x - PROBE_XY.x) + (p.y - PROBE_XY.y) * (p.y - PROBE_XY.y));
        const bg = gauss(Math.max(0, d - CORE_R), FALLOFF_PX);
        const bl = clamp(1 - Math.max(0, d - CORE_R) / (FALLOFF_PX * 2), 0, 1);
        if (probeEl2) { probeEl2.style.background = 'rgba(201,184,242,' + f2(0.35 + 0.65 * bg) + ')'; probeEl2.style.boxShadow = '0 0 ' + f0(10 * bg) + 'px rgba(201,184,242,' + f2(0.8 * bg) + ')'; }
        if (probeLab) { probeLab.textContent = 'd ' + f0(d) + 'px · gauss ' + f2(bg) + ' · linear ' + f2(bl); }
        if (eqEl) { eqEl.textContent = fill('b(d) = exp(-(d/{a})^2) · CORE_R {b}px — 프로브 점이 빛을 만나면 밝아진다', f0(FALLOFF_PX), f0(CORE_R)); }
        // 차트 막대 두 줄 — 시간 축에 가우시안/선형 값 누적 (감쇠 결 차이를 그대로)
        const cx = CX0 + clamp(t / 2000, 0, 1) * CW;
        gRow = bar('bar bar--g', cx, 26 - bg * 22, 2, 4);
        lRow = bar('bar bar--l', cx, 44 - bl * 18, 2, 4);
        void gRow; void lRow;
        return fill('지금 {a} · 프로브 gauss {b} · 선형 {c}', f0(t) + 'ms', f2(bg), f2(bl));
    }
    // 실제 입력 경로 — pointermove 가 같은 frame 산술을 탄다 (route 대신 좌표만 다르다)
    let lastHand = -1;
    sceneEl.addEventListener('pointermove', function (ev: PointerEvent) {
        const p = stagePoint(ev);
        lastHand = 0;
        void lastHand;
        if (beamEl) { beamEl.style.background = gaussGrad(clamp(p.x - 8, 0, 448), clamp(p.y - 40, 0, 156), CORE_R, FALLOFF_PX, '255,247,230', 0.5); }
    });
    return run({ count: 1, build: build, frame: frame });

}

export default function SlGaussianFalloff() {
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
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={'광원까지 거리를 가우시안 커브로 감쇠시켜 같은 반경에서도 선형과 다른 부드러운 결이 나오는 장면'}></div>
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
