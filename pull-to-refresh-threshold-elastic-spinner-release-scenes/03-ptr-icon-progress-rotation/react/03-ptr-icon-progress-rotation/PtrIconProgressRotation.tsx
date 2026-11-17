// PtrIconProgressRotation - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./PtrIconProgressRotation.module.scss";

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
    // 03 진행 아이콘 회전 — 당김 거리를 0~360 도로 정귨화해 회전각에 대입하고, 임계를 넘는 틱에
    //    각도·색을 고정 상태로 스냅한다(ARM_SNAP_MS 트랜지션). normalize: raw/임계 를 0~1 로
    const FIRE_THRESHOLD_PX = 70;
    const ROT_MAP_MAX_DEG = 360;    // 정귨화 상한 각도
    const ARM_SNAP_MS = 160;        // armed 스냅 트랜지션(scss AUTOCLOSE_EASE 와 같은 축)
    const AMP03 = 130;
    interface St03 { raw: number; rot: number; armed: boolean; run: boolean; }
    const p03: St03 = { raw: 0, rot: 0, armed: false, run: false };
    let ring03: HTMLElement | null = null;
    let ndl03: HTMLElement | null = null;
    let ringT03: HTMLElement | null = null;
    let arm03: HTMLElement | null = null;
    let armT03: HTMLElement | null = null;
    let bar03: HTMLElement | null = null;
    let barT03: HTMLElement | null = null;
    let ringW03 = 0;
    function build(_i: number): number {
        for (let k = 1; k <= 3; k += 1) {
            const tk = make('i', 'tck tck--h', scWrap);
            put(tk, 0, FIRE_THRESHOLD_PX * k / 3 - 1, 448, 2);
        }
        ring03 = make('i', 'ring3', scWrap);
        put(ring03, 188, 78, 78, 78);
        ringW03 = 78;
        ringT03 = make('b', 'ov ovs', sceneEl);
        put(ringT03, 276, 92, 130, 12);
        ndl03 = make('i', 'ring3__fill', ring03);
        ndl03.style.height = '100%';
        ndl03.style.width = '100%';
        arm03 = make('i', 'armed', scWrap);
        put(arm03, 26, 50, 110, 20);
        armT03 = make('b', 'ov ovs', sceneEl);
        put(armT03, 26, 30, 120, 12);
        for (let k = 0; k < 2; k += 1) {
            const row = make('i', 'row row--mini', scWrap);
            put(row, 12, 128 + k * 14, 170, 10);
        }
        // 원시 당김 추적 막대 — 각도와 같은 normalize 값으로 채워진다(넓은 면 전파)
        bar03 = make('i', 'fillbar', scWrap);
        put(bar03, 300, 24, 0, 12);
        barT03 = make('b', 'ov ovs', sceneEl);
        put(barT03, 300, 8, 130, 12);
        drawRows([spanOf(250, 1000), spanOf(1250, 500), spanOf(1750, 250)], 2000);
        axis(2000);
        setReads(
            fill('ROT_MAP_MAX_DEG {a} · ARM_SNAP_MS {b}ms · 각도 = normalize(raw/{c})·{a}도', f0(ROT_MAP_MAX_DEG), f0(ARM_SNAP_MS), f0(FIRE_THRESHOLD_PX)),
            'normalize 함수가 거리를 0~1 로 묶고 임계 틱에 각도·색이 한 번에 고정된다'
        );
        return 2000;
    }
    function apply03(raw: number): void {
        p03.raw = Math.max(0, raw);
        const n = clamp(p03.raw / FIRE_THRESHOLD_PX, 0, 1);   // normalize — 0~1 정귨화
        p03.rot = n * ROT_MAP_MAX_DEG;
        p03.armed = n >= 1;
        if (ndl03) { ndl03.style.background = 'conic-gradient(' + f0(p03.rot) + 'deg, ' + f0(p03.rot) + 'deg, rgba(255,255,255,0) 0deg)'; }
        void ringW03;
        if (arm03) {
            arm03.className = cx(p03.armed ? 'armed is-on' : 'armed');
            arm03.style.transition = 'transform ' + ARM_SNAP_MS + 'ms, background-color ' + ARM_SNAP_MS + 'ms';
            arm03.style.transform = p03.armed ? 'translateX(4px)' : 'translateX(0)';
        }
        if (armT03) { armT03.textContent = fill('임계 통과 {a}', p03.armed ? '스냅' : '대기'); }
        if (ringT03) { ringT03.textContent = fill('각도 {a}도', f0(p03.rot)); }
        if (bar03) { bar03.style.width = f1(120 * n) + 'px'; }
        if (barT03) { barT03.textContent = fill('진행 {a}%', f0(n * 100)); }
    }
    function frame(t: number): string {
        const raw = wave03(t);
        apply03(raw);
        if (t >= 1750 && !p03.run) { p03.run = true; }
        if (t < 1750) { p03.run = false; }
        return fill('지금 {a} · {b}도 · {c}', p03.armed ? '발사 준비' : '회전 중', f0(p03.rot), p03.armed ? '스냅 고정' : '정규화 진행');
    }
    // 시연 파형 — 임계 70 을 오르고 내려 armed 스냅이 2회 관측되게 한다(면적·프레임 확보)
    function wave03(t: number): number {
        if (t < 250) { return 0; }
        if (t < 700) { return 110 * Math.sin(Math.PI * (t - 250) / 450); }        // 1차 상승 — 70 통과
        if (t < 900) { return 110; }
        if (t < 1150) { return 110 * Math.cos(Math.PI * (t - 900) / 500); }        // 하강 — 스냅 해제
        if (t < 1450) { return 110 * Math.sin(Math.PI * (t - 1150) / 600); }       // 2차 상승 — 재통과
        return 110;
    }
    // 실제 입력 경로 — pointerdown/move/up 이 같은 apply03 을 탄다
    let down03 = false;
    let base03 = 0;
    sceneEl.addEventListener('pointerdown', function (ev: PointerEvent) {
        down03 = true;
        base03 = stagePoint(ev).y - 40;
        ev.preventDefault();
    });
    sceneEl.addEventListener('pointermove', function (ev: PointerEvent) {
        if (down03) { apply03(stagePoint(ev).y - 40 - base03); }
    });
    sceneEl.addEventListener('pointerup', function () { down03 = false; });
    sceneEl.addEventListener('pointercancel', function () { down03 = false; });
    return run({ count: 1, build: build, frame: frame });

}

export default function PtrIconProgressRotation() {
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
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={'당김 거리가 0 부터 360 도 회전각으로 정규화되어 링을 채우다가 임계 틱에 각도와 색이 한 번에 고정되는 장면'}></div>
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
