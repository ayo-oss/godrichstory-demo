// PtrDesktopButtonFallback - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./PtrDesktopButtonFallback.module.scss";

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
    // 08 데스크톱 버튼 폴백 — 터치가 없는 입력에서도 컨테이너 안 세로 드래그를 pointerdown 으로
    //    인식해 같은 임계·탄성 계산을 재사용한다. 드래그가 어색한 자리에는 새로고침 버튼을 항상 노출
    const FIRE_THRESHOLD_PX = 70;
    const RESIST_START_PX = 22;
    const ELASTIC_SATURATE = 0.5;
    const RESIST_K = 0.35;
    const RUN_MS = 500;
    let bar08: HTMLElement | null = null;
    let ghost08: HTMLElement | null = null;
    let btn08: HTMLButtonElement | null = null;
    let mode08 = 'idle';
    let spin08: HTMLElement | null = null;
    function build(_i: number): number {
        bar08 = make('i', 'pullbar', scWrap);
        ghost08 = make('i', 'ghost ghost--dashed', scWrap);
        for (let k = 0; k < 3; k += 1) {
            const row = make('i', 'row row--mini', scWrap);
            put(row, 12, 86 + k * 16, 340, 12);
        }
        const thr = make('i', 'thr', scWrap);
        put(thr, 0, FIRE_THRESHOLD_PX - 1, 448, 2);
        // 데스크톱 대체 경로 — 새로고침 버튼을 항상 노출한다(aria-label)
        btn08 = document.createElement('button');
        btn08.type = 'button';
        btn08.className = cx('rfbtn');
        btn08.textContent = '새로고침';
        btn08.setAttribute('aria-label', '지금 새로고침');
        scWrap.appendChild(btn08);
        put(btn08, 340, 26, 88, 26);
        spin08 = make('i', 'spinner', scWrap);
        put(spin08, 16, 10, 16, 16);
        drawRows([spanOf(250, 1000), spanOf(1750, RUN_MS), spanOf(2000, 0)], 2000);
        axis(2000);
        setReads(
            fill('pointerdown {a}px 임계 재사용 · 버튼 aria-label · prefers-reduced-motion 즉시 복귀', f0(FIRE_THRESHOLD_PX)),
            '마우스 드래그와 버튼이 같은 임계·탄성 계산을 탄다 — 경로가 끊기지 않는다'
        );
        return 2000;
    }
    function fire08(): void {
        mode08 = 'run';
        if (btn08) { btn08.className = cx('rfbtn is-on'); }
        if (bar08) { bar08.style.transform = 'translateY(44px)'; }
        doneP.textContent = '새로고침 실행 — 마우스와 버튼이 같은 계산을 탔다';
    }
    function frame(t: number): string {
        // 시연: 250~1250 마우스 드래그(같은 계산) → 1750 발사 — 1500~1710 버튼 강조(컷 1회, 창 넓게)
        if (t >= 1500 && t < 1710) {
            if (btn08) { btn08.className = cx('rfbtn is-hot'); }
        }
        let disp = 0;
        if (t >= 250 && t < 1250) {
            mode08 = 'drag';
            const raw = 120 * Math.sin(Math.PI * (t - 250) / 1000);
            disp = elasticMap(raw, RESIST_START_PX, ELASTIC_SATURATE, RESIST_K);
        } else if (t >= 1250 && t < 1750) {
            mode08 = 'armed';
            disp = elasticMap(120, RESIST_START_PX, ELASTIC_SATURATE, RESIST_K);
        } else if (t >= 1750 && mode08 !== 'run') {
            fire08();
        }
        if (mode08 !== 'run' && bar08) {
            bar08.style.transform = 'translateY(' + f1(disp) + 'px)';
        }
        if (ghost08) { ghost08.style.transform = 'translateY(' + f1(mode08 === 'idle' ? 0 : 62) + 'px)'; }
        if (spin08) { spin08.style.transform = 'rotate(' + f0(t * 0.4) + 'deg)'; spin08.style.opacity = mode08 === 'run' ? '1' : '0.25'; }
        if (t < 200) {
            mode08 = 'idle';
            if (btn08) { btn08.className = cx('rfbtn'); }
            if (bar08) { bar08.style.transform = 'translateY(0)'; }
        }
        return fill('지금 {a} · {b}', mode08 === 'drag' ? '마우스 드래그' : (mode08 === 'armed' ? '발사 준비' : (mode08 === 'run' ? '실행' : '대기')), mode08 === 'run' ? '버튼·드래그 공용' : '같은 임계 70px');
    }
    // 실제 입력 경로 1 — 마우스 pointerdown/move/up 이 같은 elasticMap·임계를 탄다
    let down08 = false;
    let base08 = 0;
    sceneEl.addEventListener('pointerdown', function (ev: PointerEvent) {
        down08 = true;
        base08 = stagePoint(ev).y - 40;
        ev.preventDefault();
    });
    sceneEl.addEventListener('pointermove', function (ev: PointerEvent) {
        if (down08 && bar08) {
            const raw = Math.max(0, stagePoint(ev).y - 40 - base08);
            bar08.style.transform = 'translateY(' + f1(elasticMap(raw, RESIST_START_PX, ELASTIC_SATURATE, RESIST_K)) + 'px)';
        }
    });
    function endDrag08(): void {
        if (!down08 || !bar08) { down08 = false; return; }
        down08 = false;
        const ty = parseFloat(bar08.style.transform.replace('translateY(', '').replace('px)', '')) || 0;
        if (ty >= FIRE_THRESHOLD_PX) { fire08(); } else { bar08.style.transform = 'translateY(0)'; }
    }
    sceneEl.addEventListener('pointerup', endDrag08);
    sceneEl.addEventListener('pointercancel', function () { down08 = false; });
    // 실제 입력 경로 2 — 버튼 클릭. reduced 에서도 즉시 실행된다(393 규칙 — 루프 밖 직접 반영)
    const btn08ref = btn08 as HTMLButtonElement | null;
    if (btn08ref) {
        btn08ref.addEventListener('click', function () { fire08(); });
        btn08ref.addEventListener('keydown', function (ev: KeyboardEvent) {
            if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); fire08(); }
        });
    }
    return run({ count: 1, build: build, frame: frame });

}

export default function PtrDesktopButtonFallback() {
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
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={'마우스 드래그가 같은 임계와 탄성 계산을 타고 항상 노출된 버튼이 같은 실행으로 이어지는 데스크톱 경로의 장면'}></div>
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
