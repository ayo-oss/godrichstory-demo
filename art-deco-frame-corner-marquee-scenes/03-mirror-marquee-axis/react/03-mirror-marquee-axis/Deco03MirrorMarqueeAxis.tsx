// Deco03MirrorMarqueeAxis - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./Deco03MirrorMarqueeAxis.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

function main(root: HTMLElement): () => void {
    // ── 541 공통 — 아르데코 대칭 계산 장면 (539 core 계승, 시트 줄 대신 각도 분할·경로 접기·축 대칭)
    const W = 480;
    const CX0 = 8;
    const CW = 432;
    function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
    function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
    function fill(s: string, ...v: any[]): string {
        const keys = ['{a}', '{b}', '{c}', '{d}', '{e}', '{f}', '{g}', '{h}'];
        let o = s;
        for (let i = 0; i < keys.length; i += 1) {
            o = o.split(keys[i]).join(i < v.length ? String(v[i]) : '');
        }
        return o;
    }
    function f0(v: number): string { return String(Math.round(v)); }
    function f1(v: number): string { return (Math.round(v * 10) / 10).toFixed(1); }
    function f2(v: number): string { return (Math.round(v * 100) / 100).toFixed(2); }
    const rootEl = root;
    const innerQ = rootEl.querySelector('[data-role="inner"]') as HTMLElement | null;
    const sceneQ = rootEl.querySelector('[data-role="scene"]') as HTMLElement | null;
    const chartQ = rootEl.querySelector('[data-role="chart"]') as HTMLElement | null;
    const probeQ = rootEl.querySelector('[data-role="probe"]') as HTMLElement | null;
    const padQ = rootEl.querySelector('[data-role="pad"]') as HTMLElement | null;
    const pauseQ = rootEl.querySelector('[data-role="pause"]') as HTMLElement | null;
    const statusQ = rootEl.querySelector('[data-role="status"]') as HTMLElement | null;
    const readAQ = rootEl.querySelector('[data-role="reada"]') as HTMLElement | null;
    const readBQ = rootEl.querySelector('[data-role="readb"]') as HTMLElement | null;
    const doneQ = rootEl.querySelector('[data-role="done"]') as HTMLElement | null;
    if (!innerQ || !sceneQ || !chartQ || !probeQ || !padQ || !pauseQ || !statusQ || !readAQ || !readBQ || !doneQ) {
        return function () { };
    }
    const innerEl = innerQ;
    const sceneEl = sceneQ;
    const chartEl = chartQ;
    const probeEl = probeQ;
    const padEl = padQ;
    const pauseBtn = pauseQ;
    const statusP = statusQ;
    const readA = readAQ;
    const readB = readBQ;
    const doneP = doneQ;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function make(tag: string, cls: string, parent: HTMLElement): HTMLElement {
        const e = document.createElement(tag) as HTMLElement;
        if (cls) {
            e.className = cx(cls);
        }
        parent.appendChild(e);
        return e;
    }
    function put(e: HTMLElement, x: number, y: number, w: number, h: number): void {
        e.style.left = x + 'px';
        e.style.top = y + 'px';
        if (w > 0) {
            e.style.width = w + 'px';
        }
        if (h > 0) {
            e.style.height = h + 'px';
        }
    }
    const scWrap = make('div', 'scwrap', sceneEl);
    const clkEl = make('i', 'clk', sceneEl);
    function clearAll(): void {
        scWrap.textContent = '';
        chartEl.textContent = '';
        probeEl.textContent = '';
    }
    function seedHash(i: number, seed: number): number {
        const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
        return x - Math.floor(x);
    }
    function animsIn(host: HTMLElement): Animation[] {
        return host.getAnimations({ subtree: true });
    }
    function spanOf(d: number, dur: number, k?: number): { s: number; e: number; k: number } { return { s: d, e: d + dur, k: k === undefined ? 0 : k }; }
    function bar(cls: string, x: number, y: number, w: number, h: number): HTMLElement {
        const e = make('i', cls, chartEl);
        put(e, x, y, w, h);
        return e;
    }
    function drawRows(segs: { s: number; e: number; k: number }[], max: number): void {
        const n = segs.length;
        const h = clamp(Math.floor((34 - (n - 1)) / n), 2, 7);
        for (let i = 0; i < n; i += 1) {
            const sg = segs[i];
            const x = CX0 + clamp(sg.s, 0, max) / max * CW;
            const w = Math.max(2, (clamp(sg.e, 0, max) - clamp(sg.s, 0, max)) / max * CW);
            bar('bar k' + sg.k, x, 5 + i * (h + 1), w, h);
        }
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
    function ema(prev: number, x: number, k: number): number {
        return prev + (x - prev) * k;
    }
    // cdfInvert — 역누적분포 샘플링. r^expo: expo>1 이면 짧은 쪽(마지막 줄)으로 몰린다
    function cdfInvert(r: number, expo: number, lo: number, hi: number): number {
        return lo + (hi - lo) * Math.pow(r, expo);
    }
    function gammaSample(shape: number, scale: number, seed: number, i: number): number {
        const d = shape - 1 / 3;
        const c = 1 / Math.sqrt(9 * d);
        let guard = 0;
        while (guard < 64) {
            guard += 1;
            const u1 = seedHash(i * 7 + guard, seed);
            const u2 = seedHash(i * 13 + guard * 5, seed);
            const rr = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-9))) * Math.cos(6.28318 * u2);
            const v = Math.pow(1 + c * rr, 3);
            if (v <= 0) { continue; }
            const u3 = seedHash(i * 29 + guard * 11, seed);
            if (Math.log(Math.max(u3, 1e-9)) < 0.5 * rr * rr + d - d * v + d * Math.log(v)) {
                return d * v * scale;
            }
        }
        return shape * scale;
    }
    // 스켈레톤 막대 — CSS 클래스 .skel 이 자리를 잡는다 (폭은 계산이 정한다)
    function skelBar(parent: HTMLElement, x: number, y: number, w: number, h: number, delay?: number): HTMLElement {
        const e = make('i', 'skel', parent);
        put(e, x, y, Math.max(12, w), h);
        e.style.animationDelay = (delay || 0) + 'ms';
        return e;
    }
    function mkShim(host: HTMLElement): HTMLElement {
        return make('i', 'shim', host);
    }
    function shimAt(s: HTMLElement, hostW: number, t: number, period: number): void {
        const k = (((t % period) + period) % period) / period;
        s.style.transform = 'translateX(' + ((k * 1.6 - 0.3) * hostW) + 'px)';
        s.style.opacity = k > 0.94 ? '0' : '1';
    }
    let piNow: number = 0;
    function run(cfg: { count: number; build: (i: number) => number; frame: (t: number) => string; head?: boolean }): () => void {
        const off = new AbortController();
        let pi: number = 0;
        let cycle: number = 2000;
        let paused: boolean = false;
        let raf: number = 0;
        let clock: Animation | null = null;
        let lastStatus: string = '';
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
                const an = all[i] as CSSAnimation & { effect?: (AnimationEffect & { target?: EventTarget | null }) };
                if (an.animationName && an.effect && an.effect.target === clkEl) {
                    clock = an;
                }
            }
        }
        function restart(): void {
            const all = animsIn(sceneEl);
            for (let i = 0; i < all.length; i += 1) {
                all[i].currentTime = 0;
                if (paused) {
                    all[i].pause();
                }
                else {
                    all[i].play();
                }
            }
        }
        function tick(): void {
            const ct = clock ? Number(clock.currentTime) : 0;
            const t = isFinite(ct) ? ct : 0;
            if (headEl) {
                headEl.style.transform = 'translateX(' + (CX0 + clamp(t / cycle, 0, 1) * CW) + 'px)';
            }
            const s = cfg.frame(t);
            if (s !== lastStatus) {
                statusP.textContent = s;
                lastStatus = s;
            }
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
                if (p) {
                    all[i].pause();
                }
                else {
                    all[i].play();
                }
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
        padEl.addEventListener('keydown', function (ev) {
            if (ev.target === pauseBtn) {
                return;
            }
            if (ev.key === ' ' || ev.key === 'Enter') {
                ev.preventDefault();
                setPaused(!paused);
            }
            else if (ev.key === 'r' || ev.key === 'R') {
                shift(-pi);
            }
            else if (ev.key === 'ArrowRight') {
                ev.preventDefault();
                shift(1);
            }
            else if (ev.key === 'ArrowLeft') {
                ev.preventDefault();
                shift(-1);
            }
        }, { signal: off.signal });
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) {
                setPaused(true);
            }
        }, { signal: off.signal });
        window.addEventListener('resize', fit, { signal: off.signal });
        fit();
        rebuild();
        if (reduced) {
            cfg.frame(1e9);
            statusP.textContent = readB.textContent;
            doneP.textContent = readB.textContent;
        }
        else {
            restart();
            raf = requestAnimationFrame(tick);
        }
        return function () {
            cancelAnimationFrame(raf);
            off.abort();
        };
    }

    // ── 541-03 대칭 마퀴 — 글자 하나하나의 폭을 재고(getBoundingClientRect) 간격 gapPx 를 더해 조각을 놓는다.
    //    오른쪽 절반은 mirrorX(x) = 2·AXIS_X − x − w 로 축 대칭 배치한다 (글자는 뒤집지 않는다 — 간격이 대칭이다).
    //    왼쪽 트랙은 왼쪽으로, 오른쪽 트랙은 오른쪽으로 — 축을 기준으로 같은 간격으로 흐른다.
    //    REPEAT_K 번 반복 — 반복 수를 늘리면 띠의 길이(한 바퀴 거리)만 늘고 글자 간격은 그대로다.
    //    회차 셋(변형 3): REPEAT_K 1 → 4. 마퀴는 aria-hidden — 멈춤은 골격의 일시정지 버튼 (WCAG 2.2.2)
    const REPEAT_K = 1;         // 변형 3: 1 → 4
    const REPEAT_K_VAR = 4;     // 변형 3 의 값 (화살표로 넘어간 회차)
    const GAP_PX = 28;          // 글자 사이 간격 (px) — 4px 격자
    const SCENE_W = 448;        // scene 의 폭 (스테이지 480 − 좌우 16)
    const AXIS_X = 224;         // 중심축의 x (SCENE_W 의 절반)
    const WORDS = ['ART', 'DECO', '1925'];
    const T_RISE0 = 200;        // 첫 변화는 150ms 뒤 — 글자 조각이 하나씩 튀어오른다
    const T_PER = 70;           // 글자 조각 하나가 등장하는 시차
    const T_FLOW0 = 1180;      // 띠가 흐르기 시작하는 순간 (등장이 끝난 뒤)
    const FLOW_D = 560;        // 묶음 하나(unitW) 를 흐르는 시간 — 흐름이 끝나는 컷이 가장 크게 변하고 그 뒤 멈춘다
    let haloEl: HTMLElement | null = null;
    let trackL: HTMLElement | null = null;         // 왼쪽 띠 — 정적 래퍼(톤·클립)
    let trackR: HTMLElement | null = null;         // 오른쪽 띠 — 정적 래퍼(톤·클립)
    let inL: HTMLElement | null = null;            // 그 안에서 실제로 흐르는 트랙
    let inR: HTMLElement | null = null;
    let pieces: { el: HTMLElement; x: number; w: number; mirror: boolean; word?: string }[] = [];            // { el, x, w, mirror }
    let axisEl: HTMLElement | null = null;
    let gemEls: HTMLElement[] = [];
    let chipEls: HTMLElement[] = [];
    let curRepeatK = REPEAT_K;
    let unitW = 0;              // 조각 한 묶음(단어 3 개 + 간격)의 폭
    let widths: number[] = [];            // 단어별 실측 폭
    // mirrorX — 오른쪽 절반의 x. 중심축 AXIS_X 를 기준으로 거울 복제한다 (W = 2·AXIS_X)
    function mirrorX(x: number, w: number): number {
        return 2 * AXIS_X - x - w;
    }
    function easeOutC(k: number): number { return 1 - Math.pow(1 - clamp(k, 0, 1), 3); }
    function springK(k: number): number {
        k = clamp(k, 0, 1);
        if (k >= 1) { return 1; }
        return 1 - Math.exp(-5.5 * k) * Math.cos(8 * k) * (1 - k * 0.2);
    }
    // buildBand — 단어 폭을 재고 gapPx 를 더해 왼쪽 트랙에 놓는다. 묶음 하나(unitW) 를 REPEAT_K 번 이은
    // 것이 한 바퀴(loopW) 다. 띠가 흐를 때 비지 않도록 절반 폭 + 한 바퀴 만큼 더 이어 붙인다
    function buildBand() {
        pieces = [];
        if (inL) { inL.textContent = ''; }
        if (inR) { inR.textContent = ''; }
        const probe = make('b', 'mq', inL as HTMLElement);
        // 폭은 레이아웃 px 로 잰다 — inner 이 scale(k) 걸려 있어 getBoundingClientRect 는 축소된 폭을 돌려준다
        const km = innerEl.style.transform.match(/scale\(([\d.]+)\)/);
        const kFit = km ? Number(km[1]) || 1 : 1;
        widths = WORDS.map(function (w: string): number {
            (probe as HTMLElement).textContent = w;
            return Math.ceil((probe as HTMLElement).getBoundingClientRect().width / kFit);
        });
        (probe as HTMLElement).remove();
        unitW = 0;
        for (let i = 0; i < widths.length; i += 1) { unitW += widths[i] + GAP_PX; }
        const loopW = unitW * curRepeatK;
        // 트랙은 scene 전체 폭(SCENE_W) 에 놓고 clip-path 로 절반씩만 보인다 — 폭 AXIS_X 짜리 상자에 overflow:hidden 을
        // 걸면 축 바깥에서 들어올 조각이 상자 밖이라 흐를 때 축 옆이 빈다 (541 실측)
        const reps = Math.ceil((SCENE_W + loopW) / unitW) + 1;
        for (let r = 0; r < reps; r += 1) {
            for (let i = 0; i < WORDS.length; i += 1) {
                const w = widths[i];
                let x = r * unitW;
                for (let j = 0; j < i; j += 1) { x += widths[j] + GAP_PX; }
                const el = make('b', 'mq', inL as HTMLElement);
                el.textContent = WORDS[i];
                put(el, x, 0, 0, 0);
                pieces.push({ el: el, x: x, w: w, mirror: false });
                // 오른쪽 트랙 — mirrorX 로 축 대칭 배치(글자는 그대로 — 뒤집지 않는다). 트랙이 scene 전체 폭이라 mx 그대로 놓는다
                const mx = mirrorX(x, w);
                const er = make('b', 'mq', inR as HTMLElement);
                er.textContent = WORDS[i];
                put(er, mx, 0, 0, 0);
                pieces.push({ el: er, x: mx, w: w, mirror: true });
            }
        }
        return pieces.length;
    }
    function mkBand() {
        haloEl = make('i', 'mhalo', scWrap);
        put(haloEl as HTMLElement, 48, 16, 352, 128);
        // 띠 = 정적 래퍼(clip-path·톤) + 그 안에서 translateX 로 흐르는 트랙
        trackL = make('div', 'band band--l', scWrap);
        (trackL as HTMLElement).setAttribute('aria-hidden', 'true');
        put(trackL, 0, 44, SCENE_W, 72);
        inL = make('div', 'bandin', trackL as HTMLElement);
        put(inL, 0, 0, SCENE_W, 72);
        trackR = make('div', 'band band--r', scWrap);
        (trackR as HTMLElement).setAttribute('aria-hidden', 'true');
        put(trackR, 0, 44, SCENE_W, 72);
        inR = make('div', 'bandin', trackR as HTMLElement);
        put(inR, 0, 0, SCENE_W, 72);
        axisEl = make('i', 'maxis', scWrap);
        put(axisEl, AXIS_X - 1, 16, 2, 124);
        const g1 = make('i', 'mgem', scWrap);
        put(g1, AXIS_X - 4, 8, 8, 8);
        const g2 = make('i', 'mgem', scWrap);
        put(g2, AXIS_X - 4, 140, 8, 8);
        gemEls = [g1, g2];
    }
    function frame(t: number): string {
        if (!trackL) { return ''; }
        // 글자 조각이 축에서 바깥으로 통통 튀며 등장한다 — 축에 가까운 조각부터 (거울 쌍이 함께)
        const np = pieces.length;
        let shown = 0;
        for (let i = 0; i < np; i += 1) {
            const p = pieces[i];
            // 축에서부터의 거리 — 왼쪽 조각은 오른쪽 끝이, 오른쪽(거울) 조각은 왼쪽 끝이 축에서 얼마나 떨어져 있나
            const dist = p.mirror ? (p.x - AXIS_X) : (AXIS_X - (p.x + p.w));
            const order = Math.floor(dist / 60);
            const k = springK((t - T_RISE0 - order * T_PER) / 260);
            // 거울 조각은 scaleX(-1) 을 앞에 두고 translateY 를 덧붙인다 (transform 을 통째로 덮으므로)
            p.el.style.transform = 'translateY(' + f1((1 - k) * 16) + 'px)';
            p.el.style.opacity = k > 0 ? '1' : '0';
            if (k > 0.99) { shown += 1; }
        }
        // 흐름 — 왼쪽 트랙은 왼쪽으로, 오른쪽 트랙은 오른쪽으로 (거울). 속도는 묶음 하나(unitW) 를
        // FLOW_MS 에 흐르는 것으로 고정 — 한 바퀴 거리는 unitW × REPEAT_K 라 반복 수를 늘리면
        // 한 바퀴 도는 시간만 REPEAT_K 배로 늘고 글자 간격 gapPx 는 그대로다 (계산: loopMs = FLOW_MS × K)
        const kf = clamp((t - T_FLOW0) / FLOW_D, 0, 1);
        // 흐름 거리 = 한 바퀴(묶음 unitW × REPEAT_K). 반복 수를 늘리면 띠가 그만큼 길게 흐르고 글자 간격 gapPx 는 그대로다
        const shift = easeOutC(kf) * unitW * curRepeatK;
        (inL as HTMLElement).style.transform = 'translateX(' + f1(-shift) + 'px)';
        (inR as HTMLElement).style.transform = 'translateX(' + f1(shift) + 'px)';
        // 띠 톤 — 넓은 면(트랙 두 줄 448×72) 의 명도가 같은 함수(등장 비율·흐름 진행) 로 실제로 바뀐다
        const shownK = np ? shown / np : 0;
        const hA = 0.1 + shownK * 0.2 + kf * 0.22;
        const toneA = 0.04 + shownK * 0.26 + kf * 0.18;
        const tone = 'rgba(207, 195, 238, ' + f2(toneA) + ')';
        (trackL as HTMLElement).style.background = tone;
        (trackR as HTMLElement).style.background = tone;
        (haloEl as HTMLElement).style.background = 'radial-gradient(ellipse at 50% 50%, rgba(207, 195, 238, ' + f2(hA) + ') 0%, rgba(207, 195, 238, 0) 70%)';
        (haloEl as HTMLElement).style.opacity = f2(0.35 + shownK * 0.65);
        // 축 보석 — 통통 튀며 등장
        for (let g = 0; g < 2; g += 1) {
            const kg = springK((t - T_RISE0 - 200 - g * 80) / 260);
            (gemEls[g] as HTMLElement).style.transform = 'rotate(45deg) scale(' + f2(kg) + ')';
        }
        if (chipEls.length === 3) {
            chipEls[0].textContent = 'REPEAT_K ' + f0(curRepeatK);
            chipEls[1].textContent = 'mirrorX(0) = ' + f0(mirrorX(0, widths[0]));
            chipEls[2].textContent = 'gapPx ' + f0(GAP_PX);
        }
        return fill('마퀴 {a}/{b} · REPEAT_K {c} · gap {d}px · loop {e}px',
            f0(shown), f0(np), f0(curRepeatK), f0(GAP_PX), f0(unitW * curRepeatK));
    }
    function build(i: number): number {
        curRepeatK = (i === 2) ? REPEAT_K_VAR : REPEAT_K;
        clearAll();
        mkBand();
        buildBand();
        chipEls = [];
        for (let c = 0; c < 3; c += 1) {
            const e = make('b', 'ov ovs', sceneEl);
            chipEls.push(e);
        }
        put(chipEls[0], 16, 128, 0, 0);
        put(chipEls[1], 120, 128, 0, 0);
        put(chipEls[2], 296, 128, 0, 0);
        const ov = make('b', 'ov', sceneEl);
        put(ov, 16, 20, 0, 0);
        ov.textContent = 'mirrorX(x) = W − x − w';
        drawRows([spanOf(0, T_RISE0, 0), spanOf(T_RISE0, 560, 2), spanOf(T_FLOW0, FLOW_D, 1)], 2000);
        axis(2000);
        setReads(fill('대칭 마퀴 — REPEAT_K {a} · mirrorX · gapPx {b}', f0(curRepeatK), f0(GAP_PX)),
            '띠가 중심축을 기준으로 거울처럼 맞춰져 좌우 간격이 같다');
        doneP.textContent = '';
        return 2000;
    }

    return run({ count: 3, build: build, frame: frame, head: false });   // 차트 재생 헤드(검은 세로선) 는 끈다 — 538 과 같다
}

export default function Deco03MirrorMarqueeAxis() {
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
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={'글자 띠가 중심축을 기준으로 거울 복제돼 좌우가 같은 간격으로 흐르고 반복 수를 늘리면 띠의 길이만 길어지는 장면'}></div>
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
