// DslKeyboardReorder - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./DslKeyboardReorder.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

function main(root: HTMLElement): () => void {
    // ── 523 드래그 정렬 공통 — 무대 좌표·문구 틀·요소 조립 (520 core.ts 계승)
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
    // ── 엔진이 푼 시간 읽기 — 모델이 아니라 getAnimations() 값
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
    // ── 523 공통 드래그 허브 — 목록 카드·핸들·고스트 조립
    const GRIP_SVG = '<svg viewBox="0 0 256 256" width="10" height="10" fill="currentColor" aria-hidden="true"><path d="M208,32V224a16,16,0,0,1-16,16H64a16,16,0,0,1-16-16V32A16,16,0,0,1,64,16H192A16,16,0,0,1,208,32Z" opacity="0.2"/><path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60,12a12,12,0,1,0-12-12A12,12,0,0,0,164,72ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z"/></svg>';
    // Phosphor Duotone dots-six-vertical (MIT) — 인라인이라 외부 의존 0
    function makeCard(i: number, label: string, x: number, y: number, w: number, h: number): HTMLElement {
        const e = make('div', 'card', scWrap);
        put(e, x, y, w, h);
        e.setAttribute('data-index', String(i));
        const grip = make('span', 'handle', e);
        grip.innerHTML = GRIP_SVG;
        const txt = make('span', 'card__tx', e);
        txt.textContent = label;
        return e;
    }
    // 고스트 — 드래그 중 실제로 떠 있는 복제 (잉크 바탕 + 크림 글자 + 그림자 = 명도차)
    function makeGhost(card: HTMLElement, x: number, y: number): HTMLElement {
        const g = make('div', 'ghost', scWrap);
        g.style.width = card.offsetWidth + 'px';
        g.style.height = card.offsetHeight + 'px';
        const grip = make('span', 'handle handle--g', g);
        grip.innerHTML = GRIP_SVG;
        const txt = make('span', 'card__tx card__tx--g', g);
        txt.textContent = (card.querySelector('.card__tx') as HTMLElement).textContent;
        put(g, x, y, 0, 0);
        return g;
    }
    // ── FLIP 4단계 — First 측정·DOM 재배치·Last 측정·역변환(Invert) 저장. Play 는 flipApply 가 매 프레임 결정적으로 한다
    // playScale: 재생 거리 배율(1.0 = 실측 거리 그대로). reduced 면 재생 없이 즉시 확정.
    // 무대는 scale(k) 로 축소되어 있으므로 rect 차이를 k 로 나눠 무대 좌표로 맞춘다 (첫측정 타이밍 함정: 강제 리플로우 없이 같은 프레임 안에서 first→last 를 잰다)
    interface FlipJob { el: HTMLElement; dx: number; dy: number; }
    const flipJobs: FlipJob[] = [];
    let flipT0 = -1;
    let flipSettleMs = 520;
    function flipCommit(container: HTMLElement, mutate: () => void, playScale: number, t: number, settleMs: number): number {
        const k = (rootEl.clientWidth / W) || 1;
        const kids: HTMLElement[] = [];
        for (let i = 0; i < container.children.length; i += 1) {
            const kk = container.children[i] as HTMLElement;
            if (kk.classList.contains(cx('card'))) { kids.push(kk); }
        }
        // First — 바꾸기 전 위치
        const first: { el: HTMLElement; x: number; y: number }[] = [];
        for (const kk of kids) {
            const r = kk.getBoundingClientRect();
            first.push({ el: kk, x: r.left, y: r.top });
        }
        // Mutate — DOM 순서를 바꾼다
        mutate();
        let moved = 0;
        flipJobs.length = 0;
        flipT0 = t;
        flipSettleMs = settleMs;
        // Last + Invert — 이동한 만큼의 역변환 벡터를 저장한다
        for (const f of first) {
            const r = f.el.getBoundingClientRect();
            const dx = (f.x - r.left) / k * playScale;
            const dy = (f.y - r.top) / k * playScale;
            if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) { f.el.style.transform = ''; continue; }
            moved += 1;
            if (reduced) { f.el.style.transform = ''; continue; }
            flipJobs.push({ el: f.el, dx: dx, dy: dy });
        }
        return moved;
    }
    // Play — 저장된 역변환을 easeOutCubic 으로 0 까지 되감는다. p(0~1) 를 돌려준다
    function flipApply(t: number): number {
        if (flipT0 < 0) { return 1; }
        const p = clamp((t - flipT0) / flipSettleMs, 0, 1);
        const e = 1 - Math.pow(1 - p, 3);
        for (const j of flipJobs) {
            j.el.style.transform = 'translate(' + f1(j.dx * (1 - e)) + 'px,' + f1(j.dy * (1 - e)) + 'px)';
        }
        if (p >= 1) {
            for (const j of flipJobs) { j.el.style.transform = ''; }
            flipJobs.length = 0;
            flipT0 = -1;
        }
        return p;
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
            // 움직임 줄이기 — 장면은 완성 상태 한 장. 드래그는 손 조작(transition 없음)으로 즉시 확정된다
            statusP.textContent = '움직임 줄이기 켜짐 · 정적 접점 상태';
            readB.textContent = 'FLIP 재생 없이 놓기 전과 놓은 뒤의 두 상태만 보여 준다';
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
    }    // 09 키보드 대체 — role=listbox 안에서 화살표 키로 한 칸씩 자리를 바꾸고 aria-live 로 바뀐 순서를 문장으로 알린다
    const KEY_STEP_SLOTS = 1;
    const ROW_H = 24;
    const GAP = 4;
    const LIST_X = 24;
    const LIST_W = 400;
    const STEPS = ['1단계 스케치', '2단계 조립', '3단계 측정', '4단계 교열', '5단계 배포'];
    let rows: HTMLElement[] = [];
    let order: number[] = [];
    let focusIdx = 0;
    let movedN = 0;
    let keyCount = 0;
    function slotTop(i: number): number { return 6 + i * (ROW_H + GAP); }
    function layoutRows(): void {
        for (const r of rows) {
            r.style.top = f1(slotTop(order.indexOf(Number(r.getAttribute('data-index'))))) + 'px';
        }
    }
    function announce(): void {
        // 화면 낭독기 문장 — 문구·모드가 바뀔 때만 갱신한다 (매 프레임 숫자 금지)
        const seq = rows.slice().sort(function (a, b) {
            return order.indexOf(Number(a.getAttribute('data-index'))) - order.indexOf(Number(b.getAttribute('data-index')));
        }).map(function (r) { return (r.querySelector('.card__tx') as HTMLElement).textContent; }).join(', ');
        doneP.textContent = '새 순서: ' + seq;
    }
    function build(_i: number): number {
        rows = [];
        order = [0, 1, 2, 3, 4];
        const listbox = make('div', 'lbwrap', scWrap);
        listbox.setAttribute('role', 'listbox');
        listbox.setAttribute('aria-label', '작업 단계 목록 — 위 아래 화살표로 순서를 바꾼다');
        for (let i = 0; i < 5; i += 1) {
            const c = makeCard(i, STEPS[i], LIST_X, slotTop(i), LIST_W, ROW_H);
            c.setAttribute('role', 'option');
            c.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
            c.setAttribute('tabindex', i === 0 ? '0' : '-1');
            listbox.appendChild(c);
            rows.push(c);
        }
        layoutRows();
        announce();
        axis(2000);
        drawRows([spanOf(400, 300), spanOf(700, 300), spanOf(1020, 300), spanOf(1360, 300), spanOf(1700, 300)], 2000);
        setReads(
            'role="listbox" · aria-live · KEY_STEP_SLOTS {a}'.replace('{a}', f0(KEY_STEP_SLOTS)),
            'ArrowUp/ArrowDown 한 번 = 인접 항목과 자리 교환 + FLIP — 포커스는 항목을 따라간다'
        );
        return 2000;
    }
    function swap(dir: number, t: number): void {
        const cur = order.indexOf(focusIdx);
        const to = clamp(cur + dir * KEY_STEP_SLOTS, 0, 4);
        if (to === cur) { return; }
        keyCount += 1;
        movedN = flipCommit(scWrap, function applyKey(): void {
            order.splice(cur, 1);
            order.splice(to, 0, focusIdx);
            const sorted = rows.slice().sort(function (a, b) {
                return order.indexOf(Number(a.getAttribute('data-index'))) - order.indexOf(Number(b.getAttribute('data-index')));
            });
            const lb = scWrap.querySelector('.lbwrap');
            if (lb) { for (const s of sorted) { lb.appendChild(s); } }
            layoutRows();
            announce();
        }, 1.0, t, 320);
        // 포커스 유지 — 항목이 움직여도 포커스는 그 항목에 남는다 (스크롤 강제 금지)
        const fe = rows[focusIdx];
        if (fe && document.activeElement === fe) { fe.focus({ preventScroll: true }); }
    }
    function frame(t: number): string {
        // 주입 시연 — keydown 이벤트를 결정적으로 흉내 낸다 (주입 시연)
        if (t < 300) {
            keyCount = 0;
            pendingDir = 0;
        } else if (t < 340) { swapOnce(1, t); }
        else if (t < 640) { /* 재생 구간 */ }
        else if (t < 680) { clearSwapGate(); swapOnce(1, t); }
        else if (t < 980) { /* 재생 */ }
        else if (t < 1020) { clearSwapGate(); swapOnce(-1, t); }
        else if (t < 1320) { /* 재생 */ }
        else if (t < 1360) { clearSwapGate(); swapOnce(-1, t); }
        else if (t < 1660) { /* 재생 */ }
        else if (t < 1700) { clearSwapGate(); swapOnce(1, t); }
        const p = flipApply(t);
        let label = '대기';
        if (t >= 340 && t < 640) { label = 'ArrowDown — 1칸 아래로'; }
        else if (t >= 680 && t < 980) { label = 'ArrowDown — {a}회 이동 · {b}행 밀림'.replace('{a}', f0(keyCount)).replace('{b}', f0(movedN)); }
        else if (t >= 1020 && t < 1320) { label = 'ArrowUp — 1칸 위로'; }
        else if (t >= 1360 && t < 1660) { label = 'ArrowUp — {a}회 이동 · {b}행 밀림'.replace('{a}', f0(keyCount)).replace('{b}', f0(movedN)); }
        else if (t >= 1700) { label = 'ArrowDown — {a}회 이동 · {b}행 밀림'.replace('{a}', f0(keyCount)).replace('{b}', f0(movedN)); }
        return '지금 {a}ms · {b}'.replace('{a}', f0(t)).replace('{b}', label);
    }
    let pendingDir = 0;
    function swapOnce(dir: number, t: number): void {
        if (pendingDir === dir) { return; }
        pendingDir = dir;
        swap(dir, t);
    }
    function clearSwapGate(): void { pendingDir = 0; } // 재생이 끝난 뒤 게이트를 풀어 다음 키를 받는다
    // 실제 키보드 — listbox 안 option 이 포커스일 때 화살표로 재정렬
    scWrap.addEventListener('keydown', function (ev: KeyboardEvent) {
        const opt = (ev.target as HTMLElement).closest ? (ev.target as HTMLElement).closest('[role="option"]') as HTMLElement : null;
        if (!opt) { return; }
        focusIdx = Number(opt.getAttribute('data-index'));
        if (ev.key === 'ArrowDown') {
            ev.preventDefault();
            swap(1, performance.now());
            // reduce 분기 — 애니메이션 없이 즉시 확정하고 화면에 반영한다
            if (reduced) { flipApply(performance.now() + 1e6); }
        } else if (ev.key === 'ArrowUp') {
            ev.preventDefault();
            swap(-1, performance.now());
            if (reduced) { flipApply(performance.now() + 1e6); }
        } else if (ev.key === 'Tab') {
            // roving tabindex — 포커스가 떠나도 선택은 유지
            for (const r of rows) { r.setAttribute('tabindex', r === rows[focusIdx] ? '0' : '-1'); }
        }
    });
    scWrap.addEventListener('focusin', function (ev: Event) {
        const opt = (ev.target as HTMLElement).closest ? (ev.target as HTMLElement).closest('[role="option"]') as HTMLElement : null;
        if (!opt) { return; }
        focusIdx = Number(opt.getAttribute('data-index'));
        for (const r of rows) {
            r.setAttribute('aria-selected', r === rows[focusIdx] ? 'true' : 'false');
            r.setAttribute('tabindex', r === rows[focusIdx] ? '0' : '-1');
        }
    });
    return run({ count: 1, build: build, frame: frame });
}

export default function DslKeyboardReorder() {
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
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={'화살표 키 한 번에 인접 항목과 자리가 바뀌고 FLIP 으로 밀리며 새 순서가 문장으로 알려지는 장면'}></div>
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
