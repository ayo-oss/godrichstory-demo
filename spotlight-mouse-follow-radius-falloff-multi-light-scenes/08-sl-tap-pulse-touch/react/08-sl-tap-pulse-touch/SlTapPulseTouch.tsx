// SlTapPulseTouch - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./SlTapPulseTouch.module.scss";

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
    // 08 탭 펄스 — pointerdown 자리에서 시작해 반경이 시간에 비례해 커지고 밝기는 감쇠하는 확산 광원.
    //    마우스 없는 화면(터치)의 대체 광원. 펄스는 최대 3개 동시
    const TAP_LIFE_MS = 900;      // 펄스 수명
    const TAP_SPEED = 0.24;       // 반경 성장 px/ms
    const TAP_MAX = 3;            // 동시 펄스 상한
    const TAP_AT = [300, 900, 1500];   // 시연 탭 시각 (첫 변화 t≥200ms)
    const TAP_XY = [{ x: 120, y: 88 }, { x: 300, y: 60 }, { x: 210, y: 110 }];
    interface Pulse { x: number; y: number; t0: number; }
    let pulses: Pulse[] = [];
    let pulseEls: HTMLElement[] = [];
    let added = 0;   // 이번 주기에서 이미 추가한 시연 탭 비트 (결정적 재현)
    let infoEl: HTMLElement | null = null;
    let tipEl: HTMLElement | null = null;
    function build(_i: number): number {
        pulses = [];
        pulseEls = [];
        added = 0;
        for (let k = 0; k < TAP_MAX; k += 1) {
            const e = make('i', 'pulse', scWrap);
            pulseEls.push(e);
        }
        infoEl = make('b', 'ov ovb', sceneEl);
        put(infoEl, 10, 6, 380, 14);
        tipEl = make('b', 'ov ovs', sceneEl);
        put(tipEl, 10, 136, 380, 12);
        axis(2000);
        // 안내 — 펄스 수명 구간 표시
        const segs: Seg[] = [];
        for (let k = 0; k < TAP_AT.length; k += 1) { segs.push(spanOf(TAP_AT[k], TAP_LIFE_MS)); }
        drawRows(segs, 2000);
        setReads(
            fill('TAP_LIFE_MS {a} · r = {b}px/ms · b = 1 - age/{a}', f0(TAP_LIFE_MS), f2(TAP_SPEED)),
            fill('탭한 자리에서 반경은 자라고 밝기는 줄고, 수명이 끝나면 사라진다')
        );
        return 2000;
    }
    function addPulse(x: number, y: number, t: number): void {
        // 새 펄스 — 오래된 것부터 밀어낸다 (동시 상한)
        pulses.push({ x: x, y: y, t0: t });
        if (pulses.length > TAP_MAX) { pulses.shift(); }
    }
    function frame(t: number): string {
        // 시연 탭 — 결정적 좌표·시각 주입 (사람 손은 pointerdown). 60ms 추가 창이
        // 캡처 간격(83ms)에 지나쳐지면 펄스가 통째로 빠진다(08 poster 실측) — 시각이
        // 지났고 아직 이번 주기에서 추가된 적이 없으면 무조건 추가한다
        for (let k = 0; k < TAP_AT.length; k += 1) {
            if (t >= TAP_AT[k] && !(added & (1 << k))) {
                added |= (1 << k);
                addPulse(TAP_XY[k].x, TAP_XY[k].y, TAP_AT[k]);
            }
        }
        // 렌더 — 펄스별 반경·밝기 산술
        let alive = 0;
        let label = '대기';
        for (let i = 0; i < pulseEls.length; i += 1) {
            const e = pulseEls[i];
            const p = pulses[i];
            if (!p || t - p.t0 > TAP_LIFE_MS) { e.style.opacity = '0'; continue; }
            const age = t - p.t0;
            const r = age * TAP_SPEED;
            const b = clamp(1 - age / TAP_LIFE_MS, 0, 1);
            alive += 1;
            label = 'r=' + f0(r) + 'px b=' + f2(b);
            e.style.opacity = '1';
            e.style.borderRadius = '50%';
            e.style.left = (p.x - r) + 'px';
            e.style.top = (p.y - r) + 'px';
            e.style.width = (r * 2) + 'px';
            e.style.height = (r * 2) + 'px';
            // 확산 광원 — 안쪽은 옅어지고 테두리 링이 밝다 (파동)
            e.style.background = 'radial-gradient(circle, rgba(255,247,230,0) ' + f0(Math.max(0, r - 26)) + 'px, rgba(255,247,230,' + f2(0.55 * b) + ') ' + f0(Math.max(0, r - 10)) + 'px, rgba(143,216,189,' + f2(0.4 * b) + ') ' + f0(r) + 'px, rgba(143,216,189,0) ' + f0(r + 6) + 'px)';
        }
        if (infoEl) { infoEl.textContent = fill('살아 있는 펄스 {a}개 · {b}', f0(alive), label); }
        if (tipEl) { tipEl.textContent = '터치가 없으면 아무 일도 일어나지 않는다 — 빛은 확산으로 존재를 알린다'; }
        return fill('지금 {a} · 펄스 {b}개 · {c}', f0(t) + 'ms', f0(alive), label);
    }
    // 실제 입력 경로 — pointerdown (마우스·터치·펜 동일). 손 탭도 같은 addPulse 산술
    sceneEl.addEventListener('pointerdown', function (ev: PointerEvent) {
        const p = stagePoint(ev);
        addPulse(clamp(p.x - 8, 0, 448), clamp(p.y - 40, 0, 156), performance.now() % 1e7);
    });
    return run({ count: 1, build: build, frame: frame });

}

export default function SlTapPulseTouch() {
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
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={'탭한 자리에서 시작한 펄스의 반경이 자라며 밝기가 줄어 확산으로 빛의 존재를 알리는 장면'}></div>
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
