// Skel05GeneratorParamOutput - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./Skel05GeneratorParamOutput.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

function main(root: HTMLElement): () => void {

    // ── 535 공통 — skeleton loading css 변형 엔진 (531 core 계승)
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
    if (!innerQ || !sceneQ || !chartQ || !probeQ || !probeQ || !padQ || !pauseQ || !statusQ || !readAQ || !readBQ || !doneQ) {
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

    // ── 05 생성기 — 슬라이더 3개(줄 수 N · 마지막 줄 비율 last · 속도 PULSE_S)가 genCSS 를
    //    부른다. emit 은 선택자·선언 문자열을 만들고 코드 패널에 타이핑된다. 출력 CSS 는
    //    그대로 미리보기 카드에 붙는다 — 총 높이 = N×(행높이+간격) 이 카드 높이로 계산된다
    const ROW_H = 14;
    const GAP_PX = 4;
    let PULSE_S: number = 1.5;
    let sliders05: HTMLElement[] = [];
    let thumbEls05: HTMLElement[] = [];
    let codeEl05: HTMLElement | null = null;
    let prevEl05: HTMLElement | null = null;
    let prevLines05: HTMLElement[] = [];
    let typed05: string = '';
    let target05: string = '';
    let lastEmit05: number = -1;
    function genCSS(n: number, last: number, pulseS: number): string {
        // 선택자·선언을 문자열로 emit — 독자가 복사해 쓸 수 있는 형태 그대로
        let out = '.skel-line{height:' + ROW_H + 'px;margin-bottom:' + GAP_PX + 'px;border-radius:4px;background:#e3d9c4;animation:skel-pulse ' + f1(pulseS) + 's ease-in-out infinite}\n';
        out += '.skel-line:last-child{width:' + f0(last * 100) + '%}\n';
        out += '@keyframes skel-pulse{50%{opacity:.45}}';
        return out;
    }
    function emit(n: number, last: number, pulseS: number): void {
        target05 = genCSS(n, last, pulseS);
        typed05 = '';
        lastEmit05 = 0;
    }
    let frameSig = '';
    function frame(t: number) {
        if (!codeEl05 || !prevEl05) {
            return '';
        }
        const tt = t % 2600;
        // 슬라이더 값 — 주기 안에서 N 3→6→4, last 0.4→0.7→0.55, pulse 1.5→2.4→1.9
        const presets = [
            [3, 0.40, 1.5],
            [6, 0.70, 2.4],
            [4, 0.55, 1.9]
        ];
        const pr = presets[piNow];
        const slideK = clamp(tt / 700, 0, 1);
        const nPrev = 3;
        const n = Math.round(lerp(nPrev, pr[0], slideK));
        const last = lerp(0.4, pr[1], slideK);
        const pulseS = lerp(1.5, pr[2], slideK);
        PULSE_S = pulseS;
        // 슬라이더 thumb
        for (let s = 0; s < 3; s += 1) {
            if (thumbEls05[s]) {
                const v = s === 0 ? (n - 3) / 3 : (s === 1 ? (last - 0.3) / 0.5 : (pulseS - 1.2) / 1.6);
                thumbEls05[s].style.left = (v * 160) + 'px';
            }
        }
        // 파라미터 바뀌면 재생성
        const sig = f0(n) + '|' + f0(last * 100) + '|' + f0(pulseS * 10);
        if (sig !== frameSig) {
            frameSig = sig;
            emit(n, last, pulseS);
        }
        // 타이핑 — 시간당 일정 글자
        const want = Math.min(target05.length, Math.floor((tt - 700) / 9));
        if (want > typed05.length && tt > 700) {
            typed05 = target05.slice(0, Math.max(0, want));
            codeEl05.textContent = typed05;
        }
        // 미리보기 — 출력된 파라미터 그대로(N 줄, 마지막 줄 last 배율, pulse 주기)
        if (prevLines05.length !== n) {
            prevEl05.textContent = '';
            prevLines05 = [];
            const totalH = n * ROW_H + (n - 1) * GAP_PX; // 총 높이 = N×(행높이+간격)-간격
            for (let q = 0; q < n; q += 1) {
                const ln = make('i', 'gline', prevEl05);
                const w = q === n - 1 ? last : 0.86 + seedHash(q, 3.3) * 0.12;
                put(ln, 8, 8 + q * (ROW_H + GAP_PX), 168 * w, ROW_H - 3);
                ln.style.animationDuration = f1(pulseS) + 's';
                ln.style.animationDelay = (q * 90) + 'ms';
                prevLines05.push(ln);
            }
            prevEl05.style.height = (totalH + 16) + 'px';
        }
        return fill('줄 {a} · 마지막 {b}% · PULSE_S {c}s · 출력 {d}자',
            f0(n), f0(last * 100), f1(pulseS), f0(typed05.length));
    }
    function build(i: number) {
        // 슬라이더 패널 (왼쪽)
        const sl = make('div', 'slpanel', scWrap);
        put(sl, 8, 4, 200, 96);
        const names = ['lines', 'last %', 'speed'];
        sliders05 = [];
        thumbEls05 = [];
        for (let s = 0; s < 3; s += 1) {
            const row = make('div', 'srow', sl);
            put(row, 8, 10 + s * 30, 184, 12);
            const track = make('i', 'strack', row);
            put(track, 0, 5, 160, 4);
            const th = make('i', 'sthumb', row);
            put(th, 0, 0, 12, 14);
            const lb = make('b', 'slab', row);
            lb.textContent = names[s];
            put(lb, 164, 1, 0, 0);
            sliders05.push(row);
            thumbEls05.push(th);
        }
        // 코드 패널 (가운데)
        const cp = make('div', 'codepanel', scWrap);
        put(cp, 216, 4, 148, 148);
        codeEl05 = make('b', 'codetx', cp);
        codeEl05.textContent = '';
        put(codeEl05, 6, 6, 136, 136);
        // 미리보기 카드 (오른쪽)
        const pv = make('div', 'prevcard', scWrap);
        put(pv, 372, 4, 68, 148);
        prevEl05 = make('div', 'previn', pv);
        put(prevEl05, 0, 0, 68, 148);
        prevLines05 = [];
        frameSig = '';
        const ov = make('b', 'ov ovs', sceneEl);
        put(ov, 8, 104, 0, 0);
        ov.textContent = 'genCSS → emit → <style>';
        const ov2 = make('b', 'ov ovs ovs--m', sceneEl);
        put(ov2, 8, 124, 0, 0);
        ov2.textContent = '총높이 = N×(14+4)-4';
        drawRows([spanOf(0, 700, 0), spanOf(700, 700, 1), spanOf(1400, 1200, 2)], 2600);
        axis(2600);
        setReads(fill('생성기(genCSS·emit·PULSE_S) — 줄 수 × 비율 × 속도 → CSS 출력'),
            i === 0 ? 'three sliders drive one CSS string' : (i === 1 ? 'the output binds to the preview live' : 'card height follows N x (row + gap)'));
        doneP.textContent = '';
        return 2600;
    }

    return run({ count: 3, build: build, frame: frame });
}

export default function Skel05GeneratorParamOutput() {
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
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={'줄 수·마지막 줄 비율·속도 슬라이더가 움직일 때마다 CSS 텍스트가 생성되어 코드 패널에 타이핑되고 그 CSS 로 미리보기 카드가 pulse 되는 장면'}></div>
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
