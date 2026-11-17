// BsSnapNearestDistance - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./BsSnapNearestDistance.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

function main(root: HTMLElement): () => void {
// ── 527 바텀 시트 공통 — 무대 좌표·문구 틀·요소 조립·스냅/던짐/보간 엔진 (526 core.ts 계승)
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
// ── 아래 차트 상자 그리기 — 드래그(k0)·스냅 이동(k1)·닫힘(k2)
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
// ── 바텀 시트 엔진 — 이 편의 주역 계산을 9종이 공유한다
// 스냅 지점(px) — 닫힘 0 · 반 196 · 전체 392. 시트 높이 h(px) 는 가상 뷰포트 좌표다
const snapPoints = [0, 196, 392]; // 스냅 지점 배열(닫힘·반·전체)
const SNAP_POINTS_PX = snapPoints;
// nearestSnap — 손 뗀 높이에서 각 지점까지 거리(distance)를 재 최근접 단계를 판정한다.
//   타이(294px 지점의 98 대 98)는 위 단계가 이긴다 — 거리 판정의 동점 규칙
function nearestSnap(h: number, pts: number[]): number {
    let best = pts[0];
    let bestD = Infinity;
    for (let i = 0; i < pts.length; i += 1) {
        const distance = Math.abs(h - pts[i]); // 각 지점까지의 거리
        if (distance < bestD) { bestD = distance; best = pts[i]; } // 등호 없음 = 타이면 먼 저 온(더 위의) 지점이 유지된다
    }
    return best;
}
// flingSnap — 놓기 속도(vMs, px/ms)가 임계를 넘으면 던진 방향의 다음 단계로 통과,
//   아니면 최근접. 위로 던짐(vMs>0)=더 높은 단계, 아래 던짐=더 낮은 단계 — 우선순위 계산
function flingSnap(h: number, vMs: number, pts: number[], thr: number): number {
    if (Math.abs(vMs) >= thr) {
        const up = vMs > 0;
        const hi = pts.filter(function (p) { return p > h; });
        const lo = pts.filter(function (p) { return p < h; });
        if (up && hi.length) { return hi[0]; }
        if (!up && lo.length) { return lo[lo.length - 1]; }
    }
    return nearestSnap(h, pts);
}
// travel — 놓기 뒤 스냅 이동(순수 t 함수, ease-out cubic). from→to 를 dur ms 에 걸쳐
function travel(t: number, from: number, to: number, t0: number, dur: number): number {
    const k = clamp((t - t0) / dur, 0, 1);
    const e = 1 - Math.pow(1 - k, 3);
    return from + (to - from) * e;
}
// vOf — 주입 경로의 놓기 속도(px/ms): (route(t) - route(t-dt)) / dt. 02 의 주인공
function vOf(route: (t: number) => number, t: number, dt: number): number {
    return (route(t) - route(Math.max(0, t - dt))) / dt;
}
// ── 시트 요소 조립 — .sheet(.sh-head(.sh-handle)+.sh-body) 를 만든다
// 화면 배치: 시트는 장면(bottom:0)에 붙어 있고 높이 h(가상 px) 를 SHEET_SCALE 0.5 로 그린다
//   h=0(닫힘) → translateY(200px)(장면 밖) · h=196(반) → translateY(102px) · h=392(전체) → translateY(0)
const SHEET_SCALE = 0.5;
const SHEET_MAX_SCR = 200; // 392px × 0.5 반올림 — 시트의 최대 화면 높이
interface Sheet { el: HTMLElement; head: HTMLElement; body: HTMLElement; }
function mkSheet(): Sheet {
    const el = make('div', 'sheet', scWrap);
    const head = make('div', 'sh-head', el);
    make('i', 'sh-handle', head);
    const body = make('div', 'sh-body', el);
    return { el: el, head: head, body: body };
}
// putSheet — 높이 h(가상 px) 를 화면 배치로. translateY 로만 움직인다(will-change: transform)
function putSheet(sh: Sheet, h: number): void {
    const hh = clamp(h * SHEET_SCALE, 0, SHEET_MAX_SCR);
    sh.el.style.height = f1(SHEET_MAX_SCR) + 'px';
    sh.el.style.transform = 'translateY(' + f1(SHEET_MAX_SCR - hh) + 'px)';
}
// setDim — 백드랍 보간: ratio = h/392 를 DIM_CURVE 지수로 구부려 알파에 곱한다(04 주인공)
function setDim(bd: HTMLElement | null, h: number, curve: number, maxA: number): void {
    if (!bd) { return; }
    const ratio = clamp(h / 392, 0, 1);
    const interp = Math.pow(ratio, curve); // 보간값 — ratio^DIM_CURVE
    const alpha = interp * maxA;
    bd.style.opacity = f2(alpha);
}
// ── 포인터 이벤트 좌표를 무대(480x300) 좌표로 — 실제 손 조작 경로 공용
function stagePoint(e: PointerEvent): { x: number; y: number; } {
    const r = sceneEl.getBoundingClientRect();
    const k = (rootEl.clientWidth / W) || 1;
    return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
}
// ── 실행 퀄: 프리셋 하나가 한 주기. 시계 애니메이션이 끝나면 다음 프리셋으로 다시 시작한다
let piNow = 0; // 현재 프리셋 번호 — frame 안에서도 읽는다(run 의 pi 를 노출)
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
        piNow = pi;
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
    // 01 최근접 스냅 — 손을 뗀 시트 높이에서 세 지점(닫힘 0 · 반 196 · 전체 392px)까지의
    //    거리(distance)를 재 가장 가까운 지점으로 이동한다. 294px 지점은 반·전체와 같은 98px —
    //    타이는 위 단계(전체)가 이긴다(nearestSnap 의 동점 규칙)
    const DRAG_FOLLOW = 1.0;        // 드래그 추적 비율 — 1.0 은 이동량을 그대로 반영한다(변형: 0.55)
    const SNAP_MS = 460;            // 놓기 뒤 스냅 이동 시간
    const RELEASE1_AT = 1350;       // 놓기 시각
    const RELEASE_H = [294, 120];   // 프리셋별 놓기 높이 — 294(타이) · 120(반 우세)
    let sh01: Sheet | null = null;
    let bd01: HTMLElement | null = null;
    let seg01: HTMLElement | null = null;
    let dA01 = 0;
    let dB01 = 0;
    function drag01(t: number, rh: number): number {
        // 잠자리(0~350) → 드래그(350~1350, sin 반파) → 놓기. h 는 시작 반(196)에서 출발한다
        if (t < 350) { return 196; }
        if (t < RELEASE1_AT) {
            const w = Math.sin(Math.PI * (t - 350) / (RELEASE1_AT - 350));
            return 196 + (rh - 196) * DRAG_FOLLOW * w;
        }
        return rh;
    }
    function frame(t: number): string {
        if (!sh01) { return ''; }
        const rh = RELEASE_H[piNow];
        let h: number;
        let ph: string;
        if (t < RELEASE1_AT) {
            h = drag01(t, rh);
            ph = t < 350 ? '잠자리' : '드래그 중';
        } else {
            // 놓기 — 최근접 거리 판정으로 스냅 이동(travel). 판정은 놓기 순간 한 번
            h = travel(t, rh, nearestSnap(rh, SNAP_POINTS_PX), RELEASE1_AT, SNAP_MS);
            ph = t < RELEASE1_AT + SNAP_MS ? '스냅 이동' : '도착';
        }
        putSheet(sh01, h);
        setDim(bd01, h, 1.0, 0.44);
        dA01 = Math.abs(h - 196);
        dB01 = Math.abs(h - 392);
        return fill('지금 {a} · 높이 {b}px · 반까지 {c}px · 전체까지 {d}px', ph, f0(h), f0(dA01), f0(dB01));
    }
    function build(i: number): number {
        bd01 = make('i', 'bkdrop', scWrap);
        put(bd01, 0, 0, 448, 156);
        sh01 = mkSheet();
        for (let k = 0; k < 3; k += 1) {
            const row = make('i', 'row row--mini', sh01.body);
            put(row, 10, 10 + k * 14, 300, 10);
        }
        seg01 = make('b', 'ov ovs', sceneEl);
        put(seg01, 12, 128, 250, 12);
        drawRows([spanOf(350, 1000), { s: RELEASE1_AT, e: RELEASE1_AT + SNAP_MS, k: 1 }], 2000);
        axis(2000);
        const t1 = RELEASE_H[0];
        setReads(
            fill('SNAP_POINTS_PX 닫힘 {a} · 반 {b} · 전체 {c}px · 놓기 높이에서 최근접 거리 판정', f0(SNAP_POINTS_PX[0]), f0(SNAP_POINTS_PX[1]), f0(SNAP_POINTS_PX[2])),
            i % 2 === 0 ? '294px 놓기 — 타이(98 대 98) → 전체 승리' : '120px 놓기 — 반까지 76px 가장 가깝다'
        );
        if (seg01) { seg01.textContent = i % 2 === 0 ? '294px 놓기 — 타이(98 대 98) → 전체 승리' : '120px 놓기 — 반까지 76px 가장 가깝다'; }
        doneP.textContent = '';
        return 2000;
    }
    // 실제 입력 경로 — pointerdown/move/up 이 같은 최근접 판정을 탄다(핸들·헤드 어디서든)
    let down01 = false;
    let startH01 = 0;
    let baseY01 = 0;
    let target01 = 196;
    let rel01 = 0;
    sceneEl.addEventListener('pointerdown', function (ev: PointerEvent) {
        if (!sh01) { return; }
        down01 = true;
        startH01 = 196;
        baseY01 = stagePoint(ev).y;
        rel01 = 0;
        ev.preventDefault();
    });
    sceneEl.addEventListener('pointermove', function (ev: PointerEvent) {
        if (down01 && sh01) {
            const h = clamp(startH01 + (baseY01 - stagePoint(ev).y) * 2 * DRAG_FOLLOW, 0, 392);
            putSheet(sh01, h);
            setDim(bd01, h, 1.0, 0.44);
        }
    });
    function end01(ev: PointerEvent): void {
        if (!down01 || !sh01) { down01 = false; return; }
        down01 = false;
        const h = clamp(startH01 + (baseY01 - stagePoint(ev).y) * 2 * DRAG_FOLLOW, 0, 392);
        target01 = nearestSnap(h, SNAP_POINTS_PX);
        rel01 = performance.now();
        const step = function (now: number): void {
            if (!sh01) { return; }
            const k = clamp((now - rel01) / SNAP_MS, 0, 1);
            const hh = h + (target01 - h) * (1 - Math.pow(1 - k, 3));
            putSheet(sh01, hh);
            setDim(bd01, hh, 1.0, 0.44);
            if (k < 1) { requestAnimationFrame(step); }
        };
        requestAnimationFrame(step);
    }
    sceneEl.addEventListener('pointerup', end01);
    sceneEl.addEventListener('pointercancel', function () { down01 = false; });
    return run({ count: 2, build: build, frame: frame });

}

export default function BsSnapNearestDistance() {
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
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={'세 스냅 지점까지의 거리를 재 최근접 단계로 끌려가다 294px 지점에서는 같은 98px 거리를 이기고 전체 단계가 되는 장면'}></div>
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
