// PtrThresholdFireBasic - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./PtrThresholdFireBasic.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

function main(root: HTMLElement): () => void {
// ── 526 당겨서 새로고침 공통 — 무대 좌표·문구 틀·요소 조립·ptr 드래그 엔진 (524 core.ts 계승)
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
// ── 아래 차트 상자 그리기 — 당김(파랑 k0)·실행(k1)·여파/스프링(k2)·자동닫힘(k0)
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
// ── ptr 드래그 엔진 — 이 편의 주역 계산을 9종이 공유한다
// ptrRoute(t) — 주입 시연용 결정적 당김 원시(raw) 좌표 시퀀스. 프리셋:
//   base   진폭 130 — 잠자리(0~250) → 당김(250~1250, sin 반파) → armed 유지(1250~1750) → 놓기(1750) → 여파
//   under  진폭 55  — 임계(70) 밑에서 놓아 미달 복귀 스프링이 주인공 (04)
//   over   진폭 170 — 깊은 당김. 포화 곡선 대비가 크게 보인다 (02)
// 좌표는 매 틱 연속 이동(424 규칙) · 첫 변화 t>=200ms(418 규칙)
function ptrRoute(t: number, amp: number): number {
    if (t < 250) { return 0; }
    if (t < 1250) { return amp * Math.sin(Math.PI * (t - 250) / 1000); }
    if (t < 1750) { return amp; }
    return 0;
}
// 변환 — raw(px) 를 표시 오프셋(px) 으로. 저항 = 발거리^k 감쇠:
//   RESIST_START 아래는 1:1, 위에서는 진행비의 0.35 제곱에 ELASTIC_SATURATE 를 곱해 포화시킨다
function elasticMap(raw: number, resPx: number, sat: number, k: number): number {
    if (raw <= resPx) { return raw; }
    const prog = 1 - resPx / Math.max(raw, 1);
    return resPx + (raw - resPx) * sat * Math.pow(clamp(prog, 0.05, 1), k);
}
// 놓기 뒤 미달 복귀 스프링 — v += (-kx - cv)dt 를 rAF 로 적분(077 물성 겹). dt 고정 1/60
interface SpringState { x: number; v: number; }
function springStep(sp: SpringState, stiff: number, damp: number, dtms: number): void {
    const dt = dtms / 1000;
    sp.v += (-stiff * sp.x - damp * sp.v) * dt;
    sp.x += sp.v * dt;
}
// 스프링 시뮬레이션(프로브 표기용 — 실제 화면은 rAF 적분): 바운스 = |v| 가 방향을 바꾼 횟수
function springSim(x0: number, stiff: number, damp: number): { settleMs: number; bounces: number } {
    const sp: SpringState = { x: x0, v: 0 };
    let t = 0;
    let bounces = 0;
    let lastV = 0;
    let settledAt = -1;
    while (t < 2000) {
        springStep(sp, stiff, damp, 1000 / 60);
        t += 1000 / 60;
        if (lastV !== 0 && sp.v * lastV < 0) { bounces += 1; }
        if (sp.v !== 0) { lastV = sp.v; }
        if (settledAt < 0 && Math.abs(sp.x) < 0.5 && Math.abs(sp.v) < 4) { settledAt = t; break; }
    }
    return { settleMs: settledAt < 0 ? t : settledAt, bounces: bounces };
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
        // 움직임 줄이기 — 루프를 돌리지 않고 완료 상태 한 장(frame(1e9) 1회) + 문구(393 규칙)
        cfg.frame(1e9);
        statusP.textContent = readB.textContent;
        doneP.textContent = readB.textContent;
    } else {
        restart();
        raf = requestAnimationFrame(tick);
    }
    return function (): void {
        cancelAnimationFrame(raf);
        off.abort();
    };
}
    // 01 기본 당김→임계→발사 — scrollY(=scrollTop 과 같은 값) 가 0(최상단)일 때 아래로 향하는 드래그만
    //    당김으로 세기 시작하고 누적 y 거리를 매 틱 임계와 비교해 놓는 순간의 통과 여부로 실행을 판정한다
    // 실제 입력은 pointerdown(=touchstart·마우스 공용 Pointer Events) — 데모 시연은 결정적 주입
    const FIRE_THRESHOLD_PX = 70;   // 발사 임계 — 이 값이 손맛의 절반
    const RESIST_START_PX = 22;     // 여기부터 저항이 붙는다
    const ELASTIC_SATURATE = 0.5;   // 1:0.5 포화
    const RESIST_K = 0.35;          // 저항 = 발거리^k 감쇠
    const RUN_MS = 620;             // 새로고침 실행 표시 시간
    const LIST_MAX = 5;             // 목록 항목 수
    interface Ptr01 { raw: number; disp: number; armed: boolean; released: boolean; done: boolean; newN: number; }
    const p01: Ptr01 = { raw: 0, disp: 0, armed: false, released: false, done: false, newN: 0 };
    let bar01: HTMLElement | null = null;
    let th01: HTMLElement | null = null;
    let ic01: HTMLElement | null = null;
    let track01: HTMLElement[] = [];
    function st01(t: number): number {
        if (t < 250) { return 0; }
        if (t < 1250) { return 130 * Math.sin(Math.PI * (t - 250) / 1000); }
        if (t < 1750) { return 130; }
        return 0;
    }
    function ph01(t: number): string {
        if (t < 250) { return '잠자리'; }
        if (t < 1250) { return '당기는 중'; }
        if (t < 1750) { return '발사 준비'; }
        if (t < 1750 + RUN_MS) { return '새로고침 실행'; }
        return '완료';
    }
    function build(_i: number): number {
        bar01 = make('i', 'pullbar', scWrap);
        th01 = make('i', 'thr', scWrap);
        put(th01, 0, RESIST_START_PX - 1, 448, 2);
        ic01 = make('i', 'ic', scWrap);
        track01 = [];
        for (let k = 0; k < LIST_MAX; k += 1) {
            const row = make('i', 'row', scWrap);
            put(row, 12, RESIST_START_PX + 8 + k * 22, 424, 18);
            track01.push(row);
        }
        drawRows([spanOf(250, 1000), spanOf(1750, RUN_MS), spanOf(1750 + RUN_MS, 200)], 2000);
        axis(2000);
        const sim = springSim(58, 0.12, 11);
        setReads(
            fill('FIRE_THRESHOLD_PX {a}px · RESIST_START_PX {b}px · armed = 표시 >= 임계', f0(FIRE_THRESHOLD_PX), f0(RESIST_START_PX)),
            fill('놓기 판정 — 미달 복귀 스프링 {a}ms · {b}번 튕김 · 통과면 실행 {c}ms', f0(sim.settleMs), f0(sim.bounces), f0(RUN_MS))
        );
        return 2000;
    }
    function apply01(raw: number): void {
        // scrollY === 0(scrollTop 과 같은 값) 판정은 이 데모 무대(고정)가 이미 만족 — 실무에서는 여기를 먼저 검사한다
        p01.raw = Math.max(0, raw);
        p01.disp = elasticMap(p01.raw, RESIST_START_PX, ELASTIC_SATURATE, RESIST_K);
        p01.armed = p01.disp >= FIRE_THRESHOLD_PX;
        if (bar01) { bar01.style.transform = 'translateY(' + f1(p01.disp) + 'px)'; }
    }
    function verdict01(): void {
        if (!p01.released && p01.armed) {
            p01.released = true;
            p01.newN = 3;
            if (ic01) { ic01.className = cx('ic ic--run'); }
        }
        p01.armed = false;
    }
    function frame(t: number): string {
        if (t < 1750) {
            apply01(st01(t));
            if (ic01) {
                if (p01.armed) { ic01.className = cx('ic ic--armed'); }
                else { ic01.className = cx('ic'); }
            }
            p01.released = false;
            p01.done = false;
            if (p01.newN > 0) { p01.newN = 0; }
            for (let k = 0; k < track01.length; k += 1) {
                track01[k].className = cx(k < p01.newN ? 'row row--new' : 'row');
            }
        } else if (!p01.released) {
            verdict01();
        } else if (t >= 1750 + RUN_MS && !p01.done) {
            p01.done = true;
            if (ic01) { ic01.className = cx('ic ic--done'); }
            for (let k = 0; k < p01.newN; k += 1) {
                if (track01[k]) { track01[k].className = cx('row row--new'); }
            }
        }
        return fill('지금 {a} · 원시 {b}px · 표시 {c}px · {d}', ph01(t), f0(p01.raw), f0(p01.disp), p01.armed ? '발사 준비' : '-');
    }
    // 실제 입력 경로 — pointerdown/move/up 이 같은 apply01·verdict01 을 탄다
    // 최상단 판정 — scrollTop 이 0 일 때만 당김을 시작한다(실무에서 첫 줄이 되는 검사)
    function pinnedTop(): boolean {
        const se = document.scrollingElement;
        return (se ? se.scrollTop : window.scrollY) === 0;
    }
    let down01 = false;
    let base01 = 0;
    sceneEl.addEventListener('pointerdown', function (ev: PointerEvent) {
        if (!pinnedTop()) { return; }
        down01 = true;
        base01 = stagePoint(ev).y - 40 - p01.raw;
        ev.preventDefault();
    });
    sceneEl.addEventListener('pointermove', function (ev: PointerEvent) {
        if (down01) { apply01(stagePoint(ev).y - 40 - base01); }
    });
    sceneEl.addEventListener('pointerup', function () {
        if (down01) { down01 = false; verdict01(); }
    });
    sceneEl.addEventListener('pointercancel', function () {
        if (down01) { down01 = false; verdict01(); }
    });
    return run({ count: 1, build: build, frame: frame });

}

export default function PtrThresholdFireBasic() {
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
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={'최상단 판정을 통과한 아래 드래그의 누적 거리가 임계를 넘는 순간 발사 준비로 스냅되고 놓으면 실행되는 장면'}></div>
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
