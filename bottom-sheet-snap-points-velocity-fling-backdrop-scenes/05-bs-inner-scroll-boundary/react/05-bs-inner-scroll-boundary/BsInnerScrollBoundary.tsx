// BsInnerScrollBoundary - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./BsInnerScrollBoundary.module.scss";

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
    // 05 내부 스크롤 경계 — 본문이 스크롤 최상단(scrollTop 0)에 있고 손가락이 아래로 끌 때만
    //    제스처를 시트 드래그로 넘긴다(handover05). 그 외에는 본문 스크롤에 그대로 둔다.
    //    scss touch-action pan-y 와 조건 전환이 만나 두 제스처가 싸우지 않는다
    const SNAP_MS = 460;
    const SCROLL_MAX = 60;
    let sh05: Sheet | null = null;
    let bd05: HTMLElement | null = null;
    let sc05: HTMLElement | null = null;
    let rows05: HTMLElement[] = [];
    let tag05: HTMLElement | null = null;
    function frame(t: number): string {
        if (!sh05) { return ''; }
        const preset = piNow; // 0 = 최상단에서 시작(핸드오버→닫힘) · 1 = 목록 중간(본문 스크롤만)
        let h = 196;
        let st = 0;
        let ph: string;
        if (preset === 0) {
            // 최상단 → 아래로 끌기 → handover → 시트가 내려가 닫힘 단계로
            if (t < 350) { h = 196; st = 0; ph = '최상단 — 핸드오버'; }
            else if (t < 1350) { h = 196 - 150 * Math.sin(Math.PI * (t - 350) / 1000); st = 0; ph = '최상단 — 핸드오버'; }
            else { h = travel(t, 46, 0, 1350, SNAP_MS); st = 0; ph = '스냅 이동'; }
        } else {
            h = 196;
            if (t < 350) { st = 0; }
            else if (t < 1350) { st = SCROLL_MAX * Math.sin(Math.PI * (t - 350) / 1000); }
            else { st = SCROLL_MAX; }
            ph = '중간 — 본문 스크롤';
        }
        putSheet(sh05, h);
        setDim(bd05, h, 1.0, 0.44);
        if (sc05) { sc05.scrollTop = Math.round(st); }
        if (tag05) { tag05.textContent = preset === 0 ? '최상단 — 핸드오버' : '중간 — 본문 스크롤'; }
        return fill('지금 {a} · scrollTop {b}px · {c}', ph, f0(st), preset === 0 ? '시트 드래그로 전환' : '목록이 먼저');
    }
    function build(_i: number): number {
        bd05 = make('i', 'bkdrop', scWrap);
        put(bd05, 0, 0, 448, 156);
        sh05 = mkSheet();
        // 본문은 진짜 스크롤 컨테이너(.sh-scroll) — scrollTop 을 실제로 움직인다
        sc05 = make('div', 'sh-scroll', sh05.body);
        put(sc05, 0, 0, 424, 60);
        rows05 = [];
        for (let k = 0; k < 5; k += 1) {
            const row = make('i', 'row row--mini', sc05 as HTMLElement);
            put(row, 10, 4 + k * 15, 300, 11);
            rows05.push(row);
        }
        tag05 = make('b', 'ov ovs', sceneEl);
        put(tag05, 12, 128, 250, 12);
        drawRows([spanOf(350, 1000), { s: 1350, e: 1350 + SNAP_MS, k: 2 }], 2000);
        axis(2000);
        setReads(
            'handover05 — scrollTop 0 이고 아래로 끌 때만 시트 드래그, 그 외 본문 스크롤',
            'touch-action pan-y 안에서 위 끝 판정이 두 제스처가 싸우지 않게 나눈다'
        );
        doneP.textContent = '';
        return 2000;
    }
    // 실제 입력 경로 — 위 끝 판정으로 전환되는 handover. 본문이 최상단이 아니면 목록이 먼저다
    let down05 = false;
    let baseY05 = 0;
    let mode05: 'sheet' | 'body' | null = null;
    sceneEl.addEventListener('pointerdown', function (ev: PointerEvent) {
        down05 = true;
        baseY05 = stagePoint(ev).y;
        mode05 = null;
        ev.preventDefault();
    });
    sceneEl.addEventListener('pointermove', function (ev: PointerEvent) {
        if (!down05 || !sh05 || !sc05) { return; }
        const dy = baseY05 - stagePoint(ev).y; // 위로 끌면 양수
        if (mode05 === null) {
            // 첫 방향에서 판정 — 본문이 최상단이 아니면 무조건 본문. 최상단 + 아래로 끌기만 시트
            if (dy < -4) { mode05 = (sc05.scrollTop === 0) ? 'sheet' : 'body'; }
            else if (dy > 4) { mode05 = 'body'; }
        }
        if (mode05 === 'sheet') {
            const h = clamp(196 + dy * 2, 0, 392);
            putSheet(sh05, h);
            setDim(bd05, h, 1.0, 0.44);
        }
    });
    function end05(): void {
        down05 = false;
        mode05 = null;
    }
    sceneEl.addEventListener('pointerup', end05);
    sceneEl.addEventListener('pointercancel', end05);
    return run({ count: 2, build: build, frame: frame });

}

export default function BsInnerScrollBoundary() {
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
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={'본문이 스크롤 최상단에 있을 때만 아래로 끄는 손이 시트 드래그로 넘어가고 그 외에는 목록 스크롤에 머무는 장면'}></div>
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
