// PtrLazyListAppendIntegration - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./PtrLazyListAppendIntegration.module.scss";

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
    // 07 지연 로딩 연동 — 위로 당겨 새 항목을 받고(ptr) 아래 끝에 닿으면 다음 묶음을 받는
    //    두 지점을 한 목록 상태로 묶는다. 아래 끝은 IntersectionObserver 센티넬(data-page) 이 지킨다
    const FIRE_THRESHOLD_PX = 70;
    const PAGE_SIZE = 3;            // 한 묶음 항목 수
    const STAGGER_MS = 110;
    const FLIP_MS = 220;
    interface Row07 { el: HTMLElement; fresh: boolean; }
    let rows07: Row07[] = [];
    let sent07: HTMLElement | null = null;
    let page07 = 1;
    let pageAt07 = -1;
    let spin07: HTMLElement | null = null;
    let bar07: HTMLElement | null = null;
    let cnt07: HTMLElement | null = null;
    function build(_i: number): number {
        rows07 = [];
        spin07 = make('i', 'spinner', scWrap);
        put(spin07, 16, 8, 16, 16);
        bar07 = make('i', 'pullbar', scWrap);
        for (let k = 0; k < 3; k += 1) {
            const el = make('i', 'row', scWrap);
            put(el, 40, 8 + k * 22, 300 + Math.round(seedHash(k, 5) * 80), 16);
            rows07.push({ el: el, fresh: false });
        }
        for (let k = 3; k < 6; k += 1) {
            const el = make('i', 'row', scWrap);
            put(el, 12, 8 + k * 22, 340 + Math.round(seedHash(k, 5) * 60), 16);
            rows07.push({ el: el, fresh: false });
        }
        // 아래 끝 센티넬 — IntersectionObserver 가 이 요소를 지켜 다음 묶음을 받는다
        sent07 = make('i', 'sent', scWrap);
        sent07.setAttribute('data-page', '1');
        put(sent07, 12, 142, 424, 12);
        cnt07 = make('b', 'ov ovs', sceneEl);
        put(cnt07, 340, 4, 100, 12);
        const thr = make('i', 'thr', scWrap);
        put(thr, 0, FIRE_THRESHOLD_PX - 1, 448, 2);
        drawRows([spanOf(250, 1000), spanOf(1150, 400), spanOf(1550, 450)], 2000);
        axis(2000);
        setReads(
            fill('PAGE_SIZE {a}건 · 센티넬 data-page {b} → {b}+1 · 위 ptr + 아래 무한', f0(PAGE_SIZE), f0(page07)),
            '위 끝은 당김 임계가, 아래 끝은 IntersectionObserver 센티넬이 담당한다'
        );
        return 2000;
    }
    // 실제 경로 — IntersectionObserver 센티넬이 뷰포트(장면 하단)에 들어오면 묶음을 붙인다
    function appendPage(): void {
        const np = page07 + 1;
        page07 = np;
        if (sent07) { sent07.setAttribute('data-page', f0(np)); }
        const host = sent07 ? sent07.parentElement : scWrap;
        if (!host) { return; }
        for (let k = 0; k < PAGE_SIZE; k += 1) {
            const el = make('i', 'row row--new', host);
            put(el, 12, 74 + (np - 2) * PAGE_SIZE * 22 + k * 22, 240 + Math.round(seedHash(np * 10 + k, 9) * 140), 16);
            el.style.opacity = '0.35';
            el.style.transform = 'translateY(10px)';
            const st = { el: el, u: 0 };
            const bornAt = performance.now();
            const grow = function (): void {
                st.u = clamp((performance.now() - bornAt) / FLIP_MS, 0, 1);
                el.style.opacity = f2(0.35 + 0.65 * st.u);
                el.style.transform = 'translateY(' + f1(10 * (1 - st.u)) + 'px)';
                if (st.u < 1) { requestAnimationFrame(grow); }
            };
            requestAnimationFrame(grow);
        }
        if (cnt07) { cnt07.textContent = 'page ' + f0(np); }
    }
    let io07: IntersectionObserver | null = null;
    function startIO(): void {
        // IntersectionObserver — 센티넬이 장면 아래 끝에 닿으면 appendPage. 실제 화면과
        // 시연(스크롤 강제)이 같은 옵저버를 공유한다
        io07 = new IntersectionObserver(function (ents: IntersectionObserverEntry[]): void {
            for (let i = 0; i < ents.length; i += 1) {
                if (ents[i].isIntersecting && page07 < 3) { appendPage(); }
            }
        }, { root: sceneEl, threshold: 0.6 });
        if (sent07) { io07.observe(sent07); }
    }
    startIO();
    function frame(t: number): string {
        let phase = '잠자리';
        if (t >= 250 && t < 1150) {
            phase = '당기는 중';
            if (bar07) { bar07.style.transform = 'translateY(' + f1(96 * Math.sin(Math.PI * (t - 250) / 900)) + 'px)'; }
        } else if (t < 1550) {
            phase = '새 항목 유입';
            if (bar07) { bar07.style.transform = 'translateY(42px)'; }
            for (let k = 0; k < 3; k += 1) {
                const born = 1250 + k * STAGGER_MS - 2000;
                const it = rows07[k];
                if (t >= born && !it.fresh) {
                    it.fresh = true;
                    it.el.className = cx('row row--new');
                }
            }
        } else {
            phase = '아래 끝 도달';
            if (bar07) { bar07.style.transform = 'translateY(0)'; }
            // 시연 — 센티넬이 장면 하단에 들어온 것으로 치고 같은 appendPage 를 탄다(1회)
            if (pageAt07 < 0 && page07 < 3) { pageAt07 = t; appendPage(); }
        }
        if (t < 200) {
            pageAt07 = -1;
            for (let i = 0; i < rows07.length; i += 1) {
                rows07[i].fresh = false;
                rows07[i].el.className = cx('row');
            }
        }
        if (spin07) { spin07.style.transform = 'rotate(' + f0(t * 0.5) + 'deg)'; }
        return fill('지금 {a} · page {b} · 항목 {c}건', phase, f0(page07), f0(6 + Math.max(0, page07 - 1) * PAGE_SIZE));
    }
    // 실제 입력 경로 — pointerdown/move/up 이 같은 발사를 탄다 (아래 끝은 실제 스크롤로 옵저버 발화)
    let down07 = false;
    let base07 = 0;
    sceneEl.addEventListener('pointerdown', function (ev: PointerEvent) {
        down07 = true;
        base07 = stagePoint(ev).y - 40;
        ev.preventDefault();
    });
    sceneEl.addEventListener('pointermove', function (ev: PointerEvent) {
        if (down07 && bar07) { bar07.style.transform = 'translateY(' + f1(Math.max(0, stagePoint(ev).y - 40 - base07)) + 'px)'; }
    });
    sceneEl.addEventListener('pointerup', function () {
        if (down07 && bar07) {
            down07 = false;
            const ty = parseFloat(bar07.style.transform.replace('translateY(', '').replace('px)', '')) || 0;
            if (ty >= FIRE_THRESHOLD_PX) { bar07.style.transform = 'translateY(42px)'; }
        }
    });
    sceneEl.addEventListener('pointercancel', function () { down07 = false; });
    return run({ count: 1, build: build, frame: frame });

}

export default function PtrLazyListAppendIntegration() {
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
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={'위 끝의 당김 임계와 아래 끝의 센티넬이 한 목록 상태를 함께 지켜 양끝에서 묶음이 이어지는 장면'}></div>
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
