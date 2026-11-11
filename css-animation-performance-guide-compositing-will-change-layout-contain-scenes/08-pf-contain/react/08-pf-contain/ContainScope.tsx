// ContainScope - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./ContainScope.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

function main(root: HTMLElement): () => void {
    // 두 칸 비교 장면의 공통 뼈대 — 같은 움직임을 A·B 두 칸에 속성만 바꿔 입히고, 프레임 간격·스크립트 시간을 같은 루프에서 잰다.
    // 한 칸씩 번갈아 한 바퀴(ROUND 프레임) 돌리므로 두 칸의 값이 서로 섞이지 않는다. 절대값은 이 기기 값이고 A·B 상대 비교만 읽는다.
    type Sum = { n: number; mean: number; p95: number; drops: number; script: number; first: number };
    type Stat = { iv: number[]; sc: number[]; first: number[] };
    const ARENA_W = 220;
    const ARENA_H = 140;
    const CAP = 240;
    function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
    function f1(v: number): string { return Number.isFinite(v) ? (Math.round(v * 10) / 10).toFixed(1) : '-'; }
    function f2(v: number): string { return Number.isFinite(v) ? (Math.round(v * 100) / 100).toFixed(2) : '-'; }
    // 문구 틀의 {a}·{b}·{c} 자리에 값을 끼운다 — 화면 문구는 늘 틀 한 줄이고 로케일 사전이 통째로 바꾼다
    function fill(s: string, ...v: string[]): string {
        const keys = ['{a}', '{b}', '{c}', '{d}', '{e}', '{f}', '{g}', '{h}'];
        let o = s;
        for (let i = 0; i < keys.length; i += 1) {
            o = o.split(keys[i]).join(i < v.length ? v[i] : '');
        }
        return o;
    }
    // 고정 씨앗 난수 — 요소 배치가 렌더마다 같다
    function seeded(seed: number): () => number {
        let a = seed >>> 0;
        return function (): number {
            a = (a + 0x6d2b79f5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    // 삼각파 — 위상 p 를 0 에서 1 로 갔다 0 으로 돌아오는 값으로. 한 주기가 왕복 한 번
    function tri(p: number): number {
        const x = p - Math.floor(p);
        return x < 0.5 ? x * 2 : 2 - x * 2;
    }
    function smooth(s: number): number { return s * s * (3 - 2 * s); }
    function mk(tag: string, cls: string, parent: HTMLElement): HTMLElement {
        const e = document.createElement(tag);
        e.className = cx(cls);
        parent.appendChild(e);
        return e;
    }
    const rootEl = root;
    function q(role: string): HTMLElement | null { return rootEl.querySelector('[data-role="' + role + '"]'); }
    const pad0 = q('pad');
    const pause0 = q('pause');
    const status0 = q('status');
    const done0 = q('done');
    const fit0 = q('fit');
    const arena0 = [q('arenaA'), q('arenaB')];
    const tag0 = [q('tagA'), q('tagB')];
    const read0 = [q('readA'), q('readB')];
    const extra0 = [q('extraA'), q('extraB')];
    const barF0 = [q('barFA'), q('barFB')];
    const barS0 = [q('barSA'), q('barSB')];
    const lane0 = [q('laneA'), q('laneB')];
    if (!pad0 || !pause0 || !status0 || !done0 || !fit0 || !arena0[0] || !arena0[1] || !tag0[0] || !tag0[1] || !read0[0] || !read0[1] || !extra0[0] || !extra0[1] || !barF0[0] || !barF0[1] || !barS0[0] || !barS0[1] || !lane0[0] || !lane0[1]) {
        return function (): void { /* 무대가 없으면 할 일이 없다 */ };
    }
    const pad: HTMLElement = pad0;
    const pauseBtn: HTMLElement = pause0;
    const statusP: HTMLElement = status0;
    const doneP: HTMLElement = done0;
    const fitEl: HTMLElement = fit0;
    const arenas: HTMLElement[] = [arena0[0], arena0[1]];
    const tags: HTMLElement[] = [tag0[0], tag0[1]];
    const reads: HTMLElement[] = [read0[0], read0[1]];
    const extras: HTMLElement[] = [extra0[0], extra0[1]];
    const barFs: HTMLElement[] = [barF0[0], barF0[1]];
    const barSs: HTMLElement[] = [barS0[0], barS0[1]];
    const lanes: HTMLElement[] = [lane0[0], lane0[1]];
    // 한 칸의 표본 — 간격(iv)·스크립트 시간(sc)·바퀴 첫 프레임(first)
    const stats: Stat[] = [{ iv: [], sc: [], first: [] }, { iv: [], sc: [], first: [] }];
    const sums: (Sum | null)[] = [null, null];
    // 장면이 바꾸는 값 — 장면 파일이 sceneInit 에서 채운다
    let roundFrames = 40;
    let periodMs = 1200;
    let mode = 0;
    let roundIdx = 0;
    let clockMs = 0;
    let lastTs = -1;
    let rafId = 0;
    let paused = false;
    let still = false;
    let lastKey = '';
    function pushCap(arr: number[], v: number): void {
        arr.push(v);
        if (arr.length > CAP) { arr.shift(); }
    }
    function avgOf(a: number[]): number {
        if (a.length === 0) { return NaN; }
        let t = 0;
        for (let i = 0; i < a.length; i += 1) { t += a[i]; }
        return t / a.length;
    }
    function summarize(s: Stat): Sum {
        const n = s.iv.length;
        let p95 = NaN;
        let drops = 0;
        if (n > 0) {
            const sorted = s.iv.slice().sort(function (a: number, b: number): number { return a - b; });
            p95 = sorted[Math.floor(0.95 * (n - 1))];
            const med = sorted[Math.floor((n - 1) / 2)];
            for (let i = 0; i < n; i += 1) { if (s.iv[i] > 1.5 * med) { drops += 1; } }
        }
        return { n: n, mean: avgOf(s.iv), p95: p95, drops: drops, script: avgOf(s.sc), first: avgOf(s.first) };
    }
    // 기본 읽기 두 줄 — 장면이 따로 만들지 않을 때
    function defaultRead(s: Sum): [string, string] {
        if (!Number.isFinite(s.mean)) {
            return [
                '움직임 줄이기: 프레임 간격은 재지 않음',
                fill('스크립트 {a}ms · 표본 {b}회', f2(s.script), String(PROBE_N))
            ];
        }
        return [
            fill('평균 {a}ms · p95 {b}ms · 끊김 {c}', f1(s.mean), f1(s.p95), String(s.drops)),
            fill('스크립트 {a}ms · 표본 {b}프레임', f2(s.script), String(s.n))
        ];
    }
    const WAIT_T = '측정 중';
    // B 칸 스크립트 시간이 A 칸의 몇 배인지
    function ratio(): number {
        const a = sums[0];
        const b = sums[1];
        if (!a || !b || !(a.script > 0)) { return NaN; }
        return b.script / a.script;
    }
    function paintRead(m: number): void {
        const s = sums[m];
        if (!s) {
            reads[m].textContent = WAIT_T;
            extras[m].textContent = '';
            return;
        }
        const lines = sceneRead(m, s);
        reads[m].textContent = lines[0];
        extras[m].textContent = lines[1];
        const bars = sceneBars(m, s);
        barFs[m].style.transform = 'scaleX(' + clamp(bars[0], 0.02, 1).toFixed(3) + ')';
        barSs[m].style.transform = 'scaleX(' + clamp(bars[1], 0.02, 1).toFixed(3) + ')';
    }
    function publish(m: number): void {
        const s = sums[m];
        if (!s) { return; }
        const p = m === 0 ? 'a' : 'b';
        rootEl.dataset[p + 'N'] = String(s.n);
        rootEl.dataset[p + 'Mean'] = f2(s.mean);
        rootEl.dataset[p + 'P95'] = f2(s.p95);
        rootEl.dataset[p + 'Drops'] = String(s.drops);
        rootEl.dataset[p + 'Script'] = f2(s.script);
        rootEl.dataset[p + 'First'] = f2(s.first);
        rootEl.dataset.knob = String(knobValue());
    }
    function paintAll(): void {
        paintRead(0);
        paintRead(1);
        lanes[0].classList.toggle(cx('is-live'), mode === 0 && !paused && !still);
        lanes[1].classList.toggle(cx('is-live'), mode === 1 && !paused && !still);
        statusP.textContent = statusText();
        const key = String(paused) + String(still) + String(knobValue()) + String(sums[0] !== null && sums[1] !== null);
        if (key !== lastKey) {
            lastKey = key;
            doneP.textContent = speakText();
        }
    }
    // 바퀴 하나가 끝나면 그 칸의 표본을 요약해 화면 숫자를 갱신하고 다음 칸으로 넘긴다
    function finishRound(): void {
        sums[mode] = summarize(stats[mode]);
        publish(mode);
        mode = mode === 0 ? 1 : 0;
        roundIdx = 0;
        sceneRoundStart(mode);
        paintAll();
    }
    function frame(ts: number): void {
        rafId = 0;
        if (still || paused || document.hidden) { return; }
        const first = lastTs < 0;
        const dt = first ? 16.7 : Math.min(ts - lastTs, 50);
        if (!first && roundIdx > 0) {
            pushCap(stats[mode].iv, ts - lastTs);
        } else if (!first && roundIdx === 0) {
            pushCap(stats[mode].first, ts - lastTs);
        }
        lastTs = ts;
        clockMs += dt;
        const t1 = performance.now();
        sceneStep(mode, (clockMs / periodMs) % 1);
        // 레이아웃을 강제로 읽어 쓰기가 만든 계산 비용을 이 스크립트 시간 안으로 끌어온다 — 두 칸 모두 같은 읽기
        void rootEl.getBoundingClientRect().width;
        const t2 = performance.now();
        if (roundIdx > 0) { pushCap(stats[mode].sc, t2 - t1); }
        roundIdx += 1;
        if (roundIdx >= roundFrames) { finishRound(); }
        rafId = window.requestAnimationFrame(frame);
    }
    function startLoop(): void {
        if (rafId) { return; }
        lastTs = -1;
        rafId = window.requestAnimationFrame(frame);
    }
    function stopLoop(): void {
        if (rafId) {
            window.cancelAnimationFrame(rafId);
            rafId = 0;
        }
    }
    // 움직임 줄이기 — 화면에 보이는 움직임 없이 같은 쓰기를 동기 반복해 스크립트(레이아웃 읽기 포함) 시간만 잰다
    function probeSync(): void {
        for (let m = 0; m < 2; m += 1) {
            const st: Stat = { iv: [], sc: [], first: [] };
            sceneRoundStart(m);
            for (let i = 0; i < PROBE_N; i += 1) {
                const t1 = performance.now();
                roundIdx = Math.floor((i / PROBE_N) * roundFrames);
                sceneStep(m, i / PROBE_N);
                void rootEl.getBoundingClientRect().width;
                const t2 = performance.now();
                st.sc.push(t2 - t1);
            }
            sums[m] = summarize(st);
            publish(m);
        }
        roundIdx = 0;
        sceneStep(0, 0.5);
        sceneStep(1, 0.5);
    }
    function resetStats(): void {
        stats[0] = { iv: [], sc: [], first: [] };
        stats[1] = { iv: [], sc: [], first: [] };
        sums[0] = null;
        sums[1] = null;
        mode = 0;
        roundIdx = 0;
        clockMs = 0;
        lastKey = '';
    }
    // 장면을 처음부터 — 칸을 다시 만들고 표본을 비운다
    function restart(): void {
        stopLoop();
        resetStats();
        sceneInit();
        sceneRoundStart(0);
        if (still) { probeSync(); }
        paintAll();
        if (!paused && !still) { startLoop(); }
    }
    function togglePause(): void {
        paused = !paused;
        pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
        if (paused) { stopLoop(); } else if (!still) { startLoop(); }
        paintAll();
    }
    const off = new AbortController();
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    still = reduceQuery.matches;
    pauseBtn.addEventListener('click', function (): void { togglePause(); }, { signal: off.signal });
    pad.addEventListener('keydown', function (e: KeyboardEvent): void {
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'p' || e.key === 'P') {
            e.preventDefault();
            togglePause();
            return;
        }
        if (e.key === 'r' || e.key === 'R') {
            e.preventDefault();
            restart();
            return;
        }
        let d = 0;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { d = 1; }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { d = -1; }
        if (d !== 0) {
            e.preventDefault();
            if (sceneKnob(d)) { restart(); }
        }
    }, { signal: off.signal });
    document.addEventListener('visibilitychange', function (): void {
        if (document.hidden) { stopLoop(); } else if (!paused && !still) { startLoop(); }
    }, { signal: off.signal });
    // 설정이 바뀌면 — 켜지면 루프를 멈추고 같은 쓰기를 동기로 한 번 재서 표를 채운다, 꺼지면 다시 돈다
    reduceQuery.addEventListener('change', function (): void {
        still = reduceQuery.matches;
        restart();
    }, { signal: off.signal });
    // 480×300 고정 좌표를 칸 크기에 맞춰 줄인다
    function fitScale(): void {
        const host = fitEl.parentElement;
        if (!host) { return; }
        const k = host.clientWidth / 480;
        fitEl.style.transform = 'scale(' + k.toFixed(4) + ')';
    }
    window.addEventListener('resize', fitScale, { signal: off.signal });
    // 장면 공통 도우미 — 막대 눈금·상태 줄·낭독 문장
    // 배수 표기 — 1 보다 작으면 소수 둘째 자리, 10 이상이면 정수
    function fr(r: number): string {
        if (!Number.isFinite(r)) { return '-'; }
        if (r >= 10) { return String(Math.round(r)); }
        return r >= 1 ? f1(r) : f2(r);
    }
    function fin(v: number): number { return Number.isFinite(v) ? v : 0; }
    // 막대 둘 — 프레임 간격(33.4ms 가 가득)과 스크립트 시간(두 칸 중 큰 쪽이 가득)
    function defaultBars(m: number, s: Sum): [number, number] {
        let top = 0.3;
        for (let i = 0; i < 2; i += 1) {
            const x = sums[i];
            if (x && Number.isFinite(x.script) && x.script > top) { top = x.script; }
        }
        return [fin(s.mean) / 33.4, fin(s.script) / top];
    }
    // 상태 줄 — 지금 조절 값과 두 칸 스크립트 시간의 비
    function pairStatus(knobText: string): string {
        const r = ratio();
        if (!Number.isFinite(r)) { return fill('{a} · 측정 중', knobText); }
        return fill('{a} · 스크립트 B/A ×{b}', knobText, fr(r));
    }
    // 낭독 문장 — 모드(멈춤·움직임 줄이기·조절 값)가 바뀔 때만 쓴다
    function pairSpeak(knobText: string, nameA: string, nameB: string): string {
        const a = sums[0];
        const b = sums[1];
        if (!a || !b) { return fill('{a} 장면을 준비하는 중입니다', knobText); }
        if (still) {
            return fill('움직임 줄이기: {a}, 스크립트 시간 {b} 는 {c}ms, {d} 는 {e}ms, B 는 A 의 {f}배', knobText, nameA, f2(a.script), nameB, f2(b.script), fr(ratio()));
        }
        return fill('{a}: {b} 의 스크립트 {c}ms, {d} 의 스크립트 {e}ms, B 는 A 의 {f}배, 프레임 평균 {g} 대 {h}ms', knobText, nameA, f2(a.script), nameB, f2(b.script), fr(ratio()), f1(a.mean), f1(b.mean));
    }
    // 움직이는 상자 묶음 — 01·03·04·05·07 이 쓴다. 위치·위상은 고정 씨앗 난수라 렌더마다 같다
    type Mover = { x: number; y: number; ph: number };
    function makeMovers(n: number, seed: number, size: number, tx: number, ty: number): Mover[] {
        const rnd = seeded(seed);
        const out: Mover[] = [];
        const spanX = Math.max(1, ARENA_W - size - tx - 8);
        const spanY = Math.max(1, ARENA_H - size - ty - 8);
        for (let i = 0; i < n; i += 1) {
            out.push({ x: 4 + rnd() * spanX, y: 4 + rnd() * spanY, ph: rnd() * 0.5 });
        }
        return out;
    }
    // 상자를 칸 안에 만든다. 처음 자리는 left·top 으로, 색은 순서대로 네 가지
    function buildBoxes(arena: HTMLElement, ms: Mover[], size: number, extraCls: string): HTMLElement[] {
        arena.textContent = '';
        const out: HTMLElement[] = [];
        for (let i = 0; i < ms.length; i += 1) {
            const b = mk('i', 'pf__box pf__c' + String(i % 4) + (extraCls ? ' ' + extraCls : ''), arena);
            b.style.width = String(size) + 'px';
            b.style.height = String(size) + 'px';
            b.style.left = ms[i].x.toFixed(1) + 'px';
            b.style.top = ms[i].y.toFixed(1) + 'px';
            out.push(b);
        }
        return out;
    }
    function dxOf(mv: Mover, ph: number, tx: number): number { return tx * smooth(tri(ph + mv.ph)); }
    function dyOf(mv: Mover, ph: number, ty: number): number { return ty * smooth(tri(ph + mv.ph + 0.25)); }
    // 합성 쪽 — transform 으로 옮긴다(left·top 은 그대로)
    function moveByTransform(els: HTMLElement[], ms: Mover[], ph: number, tx: number, ty: number): void {
        for (let i = 0; i < els.length; i += 1) {
            els[i].style.transform = 'translate(' + dxOf(ms[i], ph, tx).toFixed(2) + 'px,' + dyOf(ms[i], ph, ty).toFixed(2) + 'px)';
        }
    }
    // 레이아웃 쪽 — left·top 값을 바꿔 같은 거리를 옮긴다
    function moveByLeftTop(els: HTMLElement[], ms: Mover[], ph: number, tx: number, ty: number): void {
        for (let i = 0; i < els.length; i += 1) {
            els[i].style.left = (ms[i].x + dxOf(ms[i], ph, tx)).toFixed(2) + 'px';
            els[i].style.top = (ms[i].y + dyOf(ms[i], ph, ty)).toFixed(2) + 'px';
        }
    }
    // 08 — 긴 카드 목록에서 앞쪽 카드 속 막대 폭을 바꿀 때, contain 이 없는 칸(A)과 contain: strict 를 준 칸(B). 카드 수 CARDS 를 방향키로 바꾼다
    // contain: strict 는 크기·레이아웃·페인트·스타일을 한꺼번에 가둔다. 카드 크기가 고정이라 가둬도 모양이 바뀌지 않는다
    const PROBE_N = 40;
    const CARDS_LIST = [50, 100, 200, 400];
    const LIVE_CARDS = 24;
    let cardsIdx = 2;
    let CARDS = CARDS_LIST[cardsIdx];
    let inners: HTMLElement[][] = [[], []];
    function knobValue(): number { return CARDS; }
    function sceneKnob(d: number): boolean {
        const next = clamp(cardsIdx + d, 0, CARDS_LIST.length - 1);
        if (next === cardsIdx) { return false; }
        cardsIdx = next;
        CARDS = CARDS_LIST[cardsIdx];
        return true;
    }
    function buildCards(arena: HTMLElement, contained: boolean): HTMLElement[] {
        arena.textContent = '';
        const grid = mk('div', 'pf__cards', arena);
        const out: HTMLElement[] = [];
        for (let i = 0; i < CARDS; i += 1) {
            const card = mk('div', 'pf__card', grid);
            if (contained) { card.style.contain = 'strict'; }
            const inner = mk('i', 'pf__in', card);
            if (i < LIVE_CARDS) { out.push(inner); }
        }
        return out;
    }
    function sceneInit(): void {
        roundFrames = 40;
        periodMs = 1200;
        tags[0].textContent = 'contain 없음';
        tags[1].textContent = 'contain: strict';
        inners = [buildCards(arenas[0], false), buildCards(arenas[1], true)];
    }
    function sceneRoundStart(m: number): void { /* 이 장면은 바퀴마다 준비할 것이 없다 */ }
    function sceneStep(m: number, ph: number): void {
        const els = inners[m];
        for (let i = 0; i < els.length; i += 1) {
            els[i].style.width = (16 + 80 * smooth(tri(ph + i * 0.03))).toFixed(1) + '%';
        }
    }
    function sceneRead(m: number, s: Sum): [string, string] { return defaultRead(s); }
    function sceneBars(m: number, s: Sum): [number, number] { return defaultBars(m, s); }
    function statusText(): string { return pairStatus(fill('카드 {a}장', String(CARDS))); }
    function speakText(): string { return pairSpeak(fill('카드 {a}장', String(CARDS)), 'contain 없음', 'contain strict'); }
    sceneInit();
    sceneRoundStart(0);
    fitScale();
    if (still) { probeSync(); }
    paintAll();
    if (!still) { startLoop(); }
    return function (): void {
        stopLoop();
        off.abort();
    };

}

export default function ContainScope() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    return main(rootEl);
  }, []);

  return (
    <div className={cx("pf") + " is-demo"} ref={rootRef}>
      <div className={cx("pf__fit")} data-role="fit">
        <div className={cx("pf__pad")} data-role="pad" tabIndex={0} role="application" aria-label={'시연 무대 — Space 또는 Enter 로 일시정지, R 로 처음부터, 방향키로 카드 수를 바꾼다'}>
          <section className={cx("pf__lane")} data-role="laneA">
            <h3 className={cx("pf__tag")}><b>A</b><span data-role="tagA"></span></h3>
            <div className={cx("pf__arena")} data-role="arenaA"></div>
            <p className={cx("pf__read")} data-role="readA">{'측정 중'}</p>
            <p className={cx("pf__read pf__read--sub")} data-role="extraA"></p>
            <div className={cx("pf__bars")}>
              <div className={cx("pf__bar")}><span className={cx("pf__lg")}>{'프레임'}</span><span className={cx("pf__trk")}><i data-role="barFA"></i></span></div>
              <div className={cx("pf__bar")}><span className={cx("pf__lg")}>{'스크립트'}</span><span className={cx("pf__trk pf__trk--s")}><i data-role="barSA"></i></span></div>
            </div>
          </section>
          <section className={cx("pf__lane")} data-role="laneB">
            <h3 className={cx("pf__tag")}><b>B</b><span data-role="tagB"></span></h3>
            <div className={cx("pf__arena")} data-role="arenaB"></div>
            <p className={cx("pf__read")} data-role="readB">{'측정 중'}</p>
            <p className={cx("pf__read pf__read--sub")} data-role="extraB"></p>
            <div className={cx("pf__bars")}>
              <div className={cx("pf__bar")}><span className={cx("pf__lg")}>{'프레임'}</span><span className={cx("pf__trk")}><i data-role="barFB"></i></span></div>
              <div className={cx("pf__bar")}><span className={cx("pf__lg")}>{'스크립트'}</span><span className={cx("pf__trk pf__trk--s")}><i data-role="barSB"></i></span></div>
            </div>
          </section>
        </div>
        <p className={cx("pf__status")} data-role="status" aria-live="off">{'장면 준비'}</p>
        <div className={cx("pf__ctrl")}>
          <button className={cx("pf__pause")} data-role="pause" type="button" aria-pressed="false">{'일시정지'}</button>
        </div>
        <p className={cx("pf__done")} data-role="done" role="status" aria-live="polite"></p>
      </div>
    </div>
  );
}
