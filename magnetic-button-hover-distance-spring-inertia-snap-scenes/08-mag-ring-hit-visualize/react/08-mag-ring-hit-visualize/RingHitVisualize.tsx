// RingHitVisualize - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./RingHitVisualize.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

function main(root: HTMLElement): (() => void) | undefined {
    // 무대 좌표 — 안쪽 상자는 늘 480x300 이고 화면 크기에 맞춰 통째로 줄인다 (왼쪽 위 모서리 기준)
    const W = 480;
    const SW = 464;   // 장면 폭 (480 - 좌우 8px)
    const SH = 190;   // 장면 높이
    function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
    function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
    // 고정 해시 — Math.random 대신 시드로 같은 값을 되돌려 받는다
    function hash(i: number, s: number): number {
        const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
        return x - Math.floor(x);
    }
    // 감쇠 스프링 한 걸음 (반명시 오일러) — 속성 트윈이 아니라 적분이다
    // k: 강성(N/m 비례) · c: 감쇠 계수 · dt: 고정 시간 간격(초)
    function spring(x: number, v: number, tx: number, k: number, c: number, dt: number): number[] {
        const a = -k * (x - tx) - c * v;
        const v2 = v + a * dt;
        return [x + v2 * dt, v2];
    }
    // 문구 틀의 {a} 자리에 값을 끼운다 — 화면 문구는 늘 틀 한 줄이고 로케일 사전이 통째로 바꾼다
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
    const padQ = rootEl.querySelector('[data-role="pad"]') as HTMLElement | null;
    const pauseQ = rootEl.querySelector('[data-role="pause"]') as HTMLButtonElement | null;
    const statusQ = rootEl.querySelector('[data-role="status"]') as HTMLElement | null;
    const readAQ = rootEl.querySelector('[data-role="reada"]') as HTMLElement | null;
    const readBQ = rootEl.querySelector('[data-role="readb"]') as HTMLElement | null;
    const doneQ = rootEl.querySelector('[data-role="done"]') as HTMLElement | null;
    if (!innerQ || !sceneQ || !padQ || !pauseQ || !statusQ || !readAQ || !readBQ || !doneQ) {
        return function (): void { /* 무대가 없으면 할 일이 없다 */ };
    }
    const innerEl: HTMLElement = innerQ;
    const sceneEl: HTMLElement = sceneQ;
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
    // 지시 텍스트 (레이블·칩 글자) — 화면 문구는 전부 문구 사전을 거친다
    function label(parent: HTMLElement, cls: string, x: number, y: number, text: string): HTMLElement {
        const e = make('b', cls, parent);
        e.textContent = text;
        put(e, x, y, 0, 0);
        return e;
    }
    // 변위 비례 그림자 — 요소의 box-shadow 깊이가 그 순간 당김 변위에서 나온다 (면 전파 레이어)
    function shadowAt(e: HTMLElement, disp: number, max: number): void {
        const k = clamp(Math.abs(disp) / max, 0, 1);
        e.style.boxShadow = '0 ' + f0(8 + 24 * k) + 'px ' + f0(16 + 28 * k) + 'px rgba(23, 20, 26, ' + (0.45 + 0.35 * k).toFixed(2) + '), 0 0 ' + f0(8 + 34 * k) + 'px rgba(255, 247, 230, ' + (0.10 + 0.22 * k).toFixed(2) + ')';
    }
    const scEl = make('div', 'sc', sceneEl);
    const clkEl = make('i', 'clk', sceneEl);
    function clearAll(): void {
        scEl.textContent = '';
    }
    function animsIn(host: HTMLElement): Animation[] {
        return host.getAnimations({ subtree: true });
    }
    function setReads(a: string, b: string): void {
        readA.textContent = a;
        readB.textContent = b;
    }
    // ── 커서 점 (시연용 가짜 커서 — 실제 포인터가 오면 숨는다)
    // 당김 필드 링: 반경은 그 순간의 당김 세기(pull01)에서 나온다 — 장식이 아니라 같은 계산의 다른 표현
    interface Cursor { set(x: number, y: number, pull01: number): void; show(b: boolean): void; el: HTMLElement; }
    function newCursor(): Cursor {
        const f = make('i', 'fld', scEl);
        const c = make('div', 'cur', scEl);
        make('i', 'cur__d', c);
        return {
            el: c,
            set(x: number, y: number, pull01: number): void {
                const s = 0.5 + 2.2 * clamp(pull01, 0, 1);
                f.style.transform = 'translate(' + (x - 96) + 'px,' + (y - 96) + 'px) scale(' + f1(s) + ')';
                f.style.opacity = pull01 > 0.02 ? String(0.28 + 0.5 * pull01) : '0';
                c.style.transform = 'translate(' + (x - 9) + 'px,' + (y - 9) + 'px)';
            },
            show(b: boolean): void { c.style.opacity = b ? '1' : '0'; },
        };
    }
    // 거리 감쇠 당김 — d 가 RADIUS 안일 때만 성립하고 p 제곱으로 멀수록 약해진다
    function pullAmt(d: number, radius: number, pullMax: number, p: number): number {
        if (d >= radius) { return 0; }
        return pullMax * Math.pow(1 - d / radius, p);
    }
    // 당김 세기 0~1 — 커서 필드 링의 크기·투명도가 이 값 하나에서 나온다
    function pull01(d: number, radius: number, p: number): number {
        if (d >= radius) { return 0; }
        return Math.pow(1 - d / radius, p);
    }
    // ── 실행 틀: 프리셋 하나가 한 주기. 시계 애니메이션(.clk)의 currentTime 이 시연 시각 t 다
    interface Cfg {
        count: number;
        build(i: number): number;                       // 장면을 짓고 한 주기 ms 를 돌려준다
        frame(t: number, overlay: boolean): string;     // 매 프레임 장면을 그리고 상태 문장을 돌려준다
        pointer(x: number, y: number, type: string, down: boolean): void;  // 실제 포인터 입력
    }
    function run(cfg: Cfg): () => void {
        const off = new AbortController();
        let pi = 0;
        let cycle = 2000;
        let paused = false;
        let raf = 0;
        let clock: Animation | null = null;
        let lastStatus = '';
        let lastPtrT = -9999;   // 마지막 실제 포인터 입력 시각 (시연 시각 t 기준)
        const FIX_T = 1200;     // 줄이기 모드에서 보여 줄 대표 순간 (끌려온 상태)
        function fit(): void {
            const k = rootEl.clientWidth / W;
            innerEl.style.transform = 'scale(' + k + ')';
        }
        function rebuild(): void {
            clearAll();
            cycle = Math.max(2000, cfg.build(pi));
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
        function nowT(): number {
            const ct = clock ? Number(clock.currentTime) : 0;
            return isFinite(ct) ? ct : 0;
        }
        function tick(): void {
            const t = nowT();
            const overlay = lastPtrT >= 0 && t - lastPtrT < 1500 && t >= lastPtrT;
            const s = cfg.frame(paused ? nowT() : t, overlay);
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
            if (reduced) {
                // 줄이기 모드에서도 프리셋 전환은 즉시 한 장 다시 그린다 (입력이 화면에 반영된다)
                statusP.textContent = cfg.frame(FIX_T, false);
            }
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
        // 실제 포인터 — 장면 좌표로 바꿔 항목에 넘긴다. 터치는 pointerType 으로 갈린다
        function toScene(ev: PointerEvent): number[] {
            const r = sceneEl.getBoundingClientRect();
            const k = r.width / SW;
            return [(ev.clientX - r.left) / k, (ev.clientY - r.top) / k];
        }
        padEl.addEventListener('pointermove', function (ev: PointerEvent) {
            const p = toScene(ev);
            lastPtrT = nowT();
            cfg.pointer(p[0], p[1], ev.pointerType || 'mouse', (ev.buttons & 1) === 1);
            // 줄이기 모드에서도 입력이 화면에 반영된다 — 목표 갱신 뒤 한 장 다시 그린다
            if (reduced) { statusP.textContent = cfg.frame(nowT(), true); }
        }, { signal: off.signal });
        padEl.addEventListener('pointerdown', function (ev: PointerEvent) {
            const p = toScene(ev);
            lastPtrT = nowT();
            cfg.pointer(p[0], p[1], ev.pointerType || 'mouse', true);
            if (reduced) { statusP.textContent = cfg.frame(nowT(), true); }
        }, { signal: off.signal });
        document.addEventListener('visibilitychange', function () {
            // 탭이 숨으면 멈추고 돌아오면 이어 간다 — 시계 애니메이션이 상태를 기억한다
            if (document.hidden) { setPaused(true); } else if (!reduced) { setPaused(false); }
        }, { signal: off.signal });
        window.addEventListener('resize', fit, { signal: off.signal });
        fit();
        rebuild();
        if (reduced) {
            // 움직임 줄이기 — 끌려온 상태 한 장만 그린다. 입력·프리셋 전환은 frame 1회 재호출로 반영된다
            statusP.textContent = cfg.frame(FIX_T, false);
        } else {
            restart();
            raf = requestAnimationFrame(tick);
        }
        return function (): void {
            cancelAnimationFrame(raf);
            off.abort();
        };
    }
    // ── 08 반경이 보이는 원형 히트 영역과 조여드는 고리
    // 고리는 항상 보이고 진입 시 반경×TIGHTEN 로 조인다. 커서 점 옆에 유도 벡터가 붙는다.
    const RING_R = [110, 88, 132];
    const TIGHTEN = 0.62;
    const CURSOR_D = 8;
    const CX8 = 232;
    const CY8 = 92;
    let btn8: HTMLElement | null = null;
    let ring8: HTMLElement | null = null;
    let ring2: HTMLElement | null = null;
    let cur8: Cursor | null = null;
    let vec: HTMLElement | null = null;
    let lab8: HTMLElement | null = null;
    let inside8 = false;
    let rC = 1;
    let ptr8: number[] = [232, 200];
    let pi8 = 0;
    let t8 = 0;
    function path8(t: number): number[] {
        const k = (t - 200) / 1600;
        return [232 + Math.cos(k * Math.PI * 2) * 128, 92 + Math.sin(k * Math.PI * 2 + 0.4) * 48];
    }
    function step8(x: number, y: number, dt: number): void {
        if (!ring8 || !ring2 || !cur8 || !vec || !lab8 || !btn8) { return; }
        const R = RING_R[pi8];
        const dx = CX8 - x;
        const dy = CY8 - y;
        const d = Math.hypot(dx, dy);
        const was = inside8;
        inside8 = d <= R;
        if (inside8 !== was) { }
        rC = lerp(rC, inside8 ? TIGHTEN : 1, Math.min(1, dt * 8));
        ring2.style.transform = 'scale(' + f1(rC) + ')';
        const a = pullAmt(d, R, 26, 2);
        let mx = 0;
        let my = 0;
        if (d > 0.001) { mx = dx / d; my = dy / d; }
        btn8.style.transform = 'translate(' + f1(a * mx) + 'px,' + f1(a * my) + 'px)';
        shadowAt(btn8, a, 26);
        // 유도 벡터 — 커서 점에서 중심 방향. 길이 = 당김 크기
        if (vec) {
            const vx = a * mx;
            const vy = a * my;
            const L = Math.hypot(vx, vy);
            const ang = Math.atan2(vy, vx);
            vec.style.transform = 'translate(' + (x - 30) + 'px,' + (y - 1) + 'px) rotate(' + f1(ang * 180 / Math.PI) + 'deg) scaleX(' + f1(L / 30) + ')';
            vec.style.opacity = inside8 ? '1' : '0';
        }
        ring8.style.borderColor = '';
        cur8.set(x, y, pull01(d, R, 2));
        lab8.textContent = fill('반경 {a} · d {b}/{c}px · θ {d}°', inside8 ? '안' : '밖', f0(d), f0(R), f0(((Math.atan2(-dy, dx) * 180 / Math.PI) + 360) % 360));
    }
    const cfg8: Cfg = {
        count: 3,
        build(i: number): number {
            pi8 = i;
            const R = RING_R[i];
            btn8 = make('div', 'mbtn mbtn--sm s8__b', scEl);
            make('span', 'mbtn__t', btn8).textContent = '클릭';
            ring8 = make('i', 'ring ring--hit s8__r1', scEl);
            put(ring8, 232 - R, 92 - R, R * 2, R * 2);
            ring2 = make('i', 'ring s8__r2', scEl);
            put(ring2, 232 - R, 92 - R, R * 2, R * 2);
            vec = make('i', 's8__v', scEl);
            put(vec, 0, 0, 30, 2);
            lab8 = label(scEl, 'tag', 16, 10, '');
            cur8 = newCursor();
            rC = 1;
            inside8 = false;
            return 2000;
        },
        frame(t: number, overlay: boolean): string {
            t8 = t;
            const dt = clamp((t - tPrev8) / 1000, 0.001, 0.05);
            tPrev8 = t;
            const p = overlay ? ptr8 : path8(t);
            step8(p[0], p[1], dt);
            return fill('지금 {a}ms · RING_R {b}px · 고리 {c} · {d}',
                f0(t), f0(RING_R[pi8]), f1(rC), inside8 ? '반경 안' : '반경 밖');
        },
        pointer(x: number, y: number, type: string, down: boolean): void {
            ptr8 = [x, y];
        },
    };
    let tPrev8 = 0;
    run(cfg8);
    setReads('RING_R ' + f0(RING_R[0]) + 'px · TIGHTEN ' + f1(TIGHTEN) + ' · CURSOR_D ' + f0(CURSOR_D),
        '진입 판정 d ≤ RING_R — 고리는 조여 들고 유도 벡터의 길이가 당김 크기다');

    return undefined;
}

export default function RingHitVisualize() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return undefined;
    return main(rootEl);
  }, []);

  return (
    <div className={cx("ez") + " is-demo"} ref={rootRef}>
      <div className={cx("ez__in")} data-role="inner">
        <div className={cx("ez__pad")} data-role="pad" tabIndex={0} role="application" aria-label={'시연 무대 — Space 또는 Enter 로 일시정지, R 로 처음부터, 왼쪽·오른쪽 방향키로 다른 값으로'}>
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={'히트 반경이 옅은 고리로 항상 보이고 커서가 들어오면 고리가 조여들며 유도 벡터가 중심을 향하는 장면'}></div>
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
