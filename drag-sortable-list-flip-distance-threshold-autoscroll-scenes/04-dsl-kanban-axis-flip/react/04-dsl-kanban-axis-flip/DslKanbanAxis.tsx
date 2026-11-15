// DslKanbanAxis - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./DslKanbanAxis.module.scss";

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
    }    // 04 칸반 축 전환 — 카드가 컬럼 경계를 넘으면 목표 컬럼을 계산해 옮기고, y 이동과 x 이동을 한 FLIP 에 묶는다
    const COLUMN_HIT_PADDING_PX = 8;
    const FLIP_PLAY_SCALE = 1.0;
    const COL_X = [10, 156, 302];
    const COL_W = 136;
    const CARD_H = 30;
    const RGAP = 4;
    let cols: { el: HTMLElement; cards: HTMLElement[] }[] = [];
    let gEl: HTMLElement | null = null;
    let dragIdx = '';
    let curCol = 0;
    let movedN = 0;
    const COL_NAMES = ['할 일', '하는 중', '끝'];
    let badge: HTMLElement | null = null;
    function layoutKanban(): void {
        for (let c = 0; c < 3; c += 1) {
            for (let i = 0; i < cols[c].cards.length; i += 1) {
                cols[c].cards[i].style.left = f1(COL_X[c] + 5) + 'px';
                cols[c].cards[i].style.top = f1(30 + i * (CARD_H + RGAP)) + 'px';
                cols[c].cards[i].setAttribute('data-col', String(c));
            }
        }
    }
    function build(_i: number): number {
        cols = [];
        for (let c = 0; c < 3; c += 1) {
            const hd = make('div', 'khead', scWrap);
            put(hd, COL_X[c], 6, COL_W, 18);
            hd.textContent = COL_NAMES[c];
            const zone = make('div', 'kzone', scWrap);
            put(zone, COL_X[c], 26, COL_W, 122);
            zone.setAttribute('data-col', String(c));
            cols.push({ el: zone, cards: [] });
        }
        const seed: [number, string][] = [[0, '스케치'], [0, '자료 모으기'], [1, '본문 작성'], [1, '데모 렌더'], [2, '교열']];
        for (let i = 0; i < seed.length; i += 1) {
            const c = makeCard(i, seed[i][1], 0, 0, COL_W - 10, CARD_H);
            c.setAttribute('data-id', 'k' + i);
            cols[seed[i][0]].cards.push(c);
        }
        layoutKanban();
        badge = make('i', 'kbadge', scWrap);
        put(badge, 0, 0, 0, 0);
        axis(2000);
        drawRows([spanOf(500, 680)], 2000);
        setReads(
            'COLUMN_HIT_PADDING_PX {a} · FLIP_PLAY_SCALE {b}'.replace('{a}', f0(COLUMN_HIT_PADDING_PX)).replace('{b}', f1(FLIP_PLAY_SCALE)),
            '컬럼 경계 ±{a}px 안에 닿으면 목표 컬럼을 계산한다 — x·y 가 한 역변환으로 묶인다'.replace('{a}', f0(COLUMN_HIT_PADDING_PX))
        );
        return 2000;
    }
    function frame(t: number): string {
        let label = '대기';
        const dragCard = dragIdx ? scWrap.querySelector('[data-id="' + dragIdx + '"]') as HTMLElement : null;
        if (t < 300) {
            if (gEl) { gEl.remove(); gEl = null; }
            if (dragCard) { dragCard.style.opacity = ''; }
            dragIdx = '';
            // 초기 배치 — 하는 중 첫 카드가 할 일로 간다 (세로→가로 축 전환)
            layoutKanban();
        } else if (t < 440) {
            const c0 = cols[1].cards[0];
            dragIdx = c0.getAttribute('data-id') || '';
            if (!gEl) { gEl = makeGhost(c0, COL_X[1] + 5, 30); }
            c0.style.opacity = '0.18';
            label = '잡음 — {a} 컬럼'.replace('{a}', COL_NAMES[1]);
        } else if (t < 1400) {
            // 주입 시연 — 카드를 가로(컬럼1→컬럼0)·세로(1행→2행) 동시에 이동
            const u = ease(clamp((t - 440) / 960, 0, 1));
            const x0 = COL_X[1] + 5;
            const y0 = 30;
            const x1 = COL_X[0] + 5;
            const y1 = 30 + (CARD_H + RGAP);
            if (gEl) { gEl.style.left = f1(x0 + (x1 - x0) * u) + 'px'; gEl.style.top = f1(y0 + (y1 - y0) * u) + 'px'; }
            const cxg = x0 + (x1 - x0) * u + (COL_W - 10) / 2;
            // 목표 컬럼 — 경계 ±패딭 판정
            let tc = 0;
            for (let c = 0; c < 3; c += 1) {
                if (cxg >= COL_X[c] - COLUMN_HIT_PADDING_PX && cxg <= COL_X[c] + COL_W + COLUMN_HIT_PADDING_PX) { tc = c; break; }
            }
            if (tc !== curCol || t < 500) {
                if (tc !== curCol) {
                    const card = dragCard;
                    if (card) {
                        const from = cols[curCol].cards;
                        const at = from.indexOf(card);
                        if (at >= 0) { from.splice(at, 1); }
                        cols[tc].cards.splice(1, 0, card);
                        layoutKanban();
                        curCol = tc;
                    }
                }
            }
            if (badge) { badge.textContent = '→ ' + COL_NAMES[curCol]; badge.style.left = f1(cxg - 20) + 'px'; badge.style.top = f1(y0 + (y1 - y0) * u - 16) + 'px'; badge.style.width = '44px'; badge.style.height = '14px'; badge.style.fontSize = '9px'; badge.style.lineHeight = '14px'; }
            label = '컬럼 {a} → {b}'.replace('{a}', COL_NAMES[curCol === 1 ? 2 : 1]).replace('{b}', COL_NAMES[curCol]);
        } else if (t < 1480) {
            if (gEl) { gEl.remove(); gEl = null; }
            const card = dragCard;
            if (card) { card.style.opacity = ''; }
            dragIdx = '';
            movedN = flipCommit(scWrap, function applyKanban(): void {
                const flat: HTMLElement[] = [];
                for (let c = 0; c < 3; c += 1) { flat.push.apply(flat, cols[c].cards); }
                for (const f of flat) { scWrap.appendChild(f); }
                layoutKanban();
            }, FLIP_PLAY_SCALE, t, 600);
            label = '놓음 — x+y 한 FLIP';
        } else {
            const p = flipApply(t);
            label = p < 1 ? 'Play {a}%'.replace('{a}', f0(p * 100)) : '정착 — {a}장 밀림'.replace('{a}', f0(movedN));
        }
        return '지금 {a}ms · {b}'.replace('{a}', f0(t)).replace('{b}', label);
    }
    function ease(u: number): number { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; }
    // 실제 손 조작 — pointercancel 포함
    function handRelease(): void {
        const card = dragIdx ? scWrap.querySelector('[data-id="' + dragIdx + '"]') as HTMLElement : null;
        if (!card) { dragIdx = ''; return; }
        card.style.opacity = '';
        if (gEl) { gEl.remove(); gEl = null; }
        flipCommit(scWrap, function applyKan(): void {
            const flat: HTMLElement[] = [];
            for (let c = 0; c < 3; c += 1) { flat.push.apply(flat, cols[c].cards); }
            for (const f of flat) { scWrap.appendChild(f); }
            layoutKanban();
        }, FLIP_PLAY_SCALE, performance.now(), 600);
        dragIdx = '';
    }
    scWrap.addEventListener('pointerdown', function (ev: PointerEvent) {
        const card = (ev.target as HTMLElement).closest ? (ev.target as HTMLElement).closest('.' + cx('card')) as HTMLElement : null;
        if (!card) { return; }
        ev.preventDefault();
        dragIdx = card.getAttribute('data-id') || '';
        card.setPointerCapture(ev.pointerId);
        card.style.opacity = '0.18';
        gEl = makeGhost(card, parseFloat(card.style.left) || 10, parseFloat(card.style.top) || 30);
        curCol = Number(card.getAttribute('data-col')) || 0;
    });
    scWrap.addEventListener('pointermove', function (ev: PointerEvent) {
        if (!dragIdx || !gEl) { return; }
        const card = scWrap.querySelector('[data-id="' + dragIdx + '"]') as HTMLElement;
        if (!card) { return; }
        const pt = stagePoint(ev);
        const x = clamp(pt.x - (COL_W - 10) / 2, COL_X[0], COL_X[2]);
        const y = clamp(pt.y - CARD_H / 2, 26, 140);
        gEl.style.left = f1(x) + 'px';
        gEl.style.top = f1(y) + 'px';
        let tc = curCol;
        for (let c = 0; c < 3; c += 1) {
            if (pt.x >= COL_X[c] - COLUMN_HIT_PADDING_PX && pt.x <= COL_X[c] + COL_W + COLUMN_HIT_PADDING_PX) { tc = c; break; }
        }
        if (tc !== curCol) {
            const from = cols[curCol].cards;
            const at = from.indexOf(card);
            if (at >= 0) { from.splice(at, 1); }
            const slot = clamp(Math.round((y - 30) / (CARD_H + RGAP)), 0, cols[tc].cards.length);
            cols[tc].cards.splice(slot, 0, card);
            layoutKanban();
            curCol = tc;
        }
    });
    scWrap.addEventListener('pointerup', handRelease);
    scWrap.addEventListener('pointercancel', handRelease);
    // 컬럼 헤더에 aria-live — 이동 결과를 문장으로 알린다
    return run({ count: 1, build: build, frame: frame });
}

export default function DslKanbanAxis() {
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
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={'칸반 카드가 컬럼 경계를 넘어 할 일로 옮겨질 때 가로 이동과 세로 밀림이 한 FLIP 으로 이어지는 장면'}></div>
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
