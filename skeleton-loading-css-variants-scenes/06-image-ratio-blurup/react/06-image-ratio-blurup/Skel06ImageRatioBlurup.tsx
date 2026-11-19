// Skel06ImageRatioBlurup - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./Skel06ImageRatioBlurup.module.scss";

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

    // ── 06 이미지형 — ratioReserve(w/h) 가 치수를 미리 계산해 높이 점프를 막는다.
    //    왼쪽 패널(예약)은 뷰포트 리사이즈에도 h = w/ratio 로 즉시 결정되고 CLS 0.
    //    오른쪽 패널(미예약)은 이미지 도착 전 h=짧은 기본값이다가 도착 시 점프 — CLS 막대가 쌓인다.
    //    이미지 도착은 blur-up(BLUR_MS) blur→선명
    const BLUR_MS = 560;
    const T_ARRIVE = 1400;
    const CYCLE = 2800;
    const RATIO = 16 / 9; // ratioReserve — w/h
    let panelRes06: HTMLElement | null = null;
    let panelRaw06: HTMLElement | null = null;
    let imgRes06: HTMLElement | null = null;
    let imgRaw06: HTMLElement | null = null;
    let clsRes06: HTMLElement | null = null;
    let clsRaw06: HTMLElement | null = null;
    let clsBarRes06: HTMLElement | null = null;
    let clsBarRaw06: HTMLElement | null = null;
    let sweep06: HTMLElement | null = null;
    let viewW06: number = 200;
    let lastJump06: number = -1;
    let clsScore06: number = 0;
    function ratioReserve(w: number, ratio: number): number {
        return w / ratio; // aspect-ratio: w/h 예약 — 폭만 알면 높이가 즉시 결정된다
    }
    function clsUnit(movedPx: number, viewportH: number): number {
        // CLS 기여 = 이동면적 / 뷰포트 면적 (웹바이탈 근사 — 한 요소의 세로 이동만 본다)
        return movedPx / viewportH;
    }
    function frame(t: number) {
        if (!panelRes06 || !panelRaw06) {
            return '';
        }
        const tt = t % CYCLE;
        // 뷰포트 폭 진동 — 리사이즈 이벤트 흉내(±18px 사인)
        viewW06 = 200 + Math.sin(tt / CYCLE * 6.28318) * 18;
        // 왼쪽(예약) — 높이는 항상 ratioReserve 즉시 계산, 점프 없음
        const hRes = ratioReserve(viewW06, RATIO);
        panelRes06.style.width = viewW06 + 'px';
        panelRes06.style.height = hRes + 'px';
        // 오른쪽(미예약) — 도착 전 64px, 도착 후 ratioReserve 로 점프
        const arrived = tt >= T_ARRIVE;
        const hRawFrom = 64;
        const hRawTo = ratioReserve(viewW06, RATIO);
        const jumpAt = T_ARRIVE;
        if (arrived && lastJump06 !== jumpAt) {
            lastJump06 = jumpAt;
            clsScore06 += clsUnit(Math.abs(hRawTo - hRawFrom), 300);
        }
        if (!arrived) {
            lastJump06 = -1;
        }
        const hRaw = arrived ? hRawTo : hRawFrom;
        panelRaw06.style.width = viewW06 + 'px';
        panelRaw06.style.height = hRaw + 'px';
        // blur-up — 도착 후 BLUR_MS 에 걸쳐 blur 8px→0
        const bk = arrived ? clamp((tt - T_ARRIVE) / BLUR_MS, 0, 1) : 0;
        if (imgRes06) {
            imgRes06.style.filter = 'blur(' + f1(8 * (1 - bk)) + 'px)';
            imgRes06.style.opacity = String(0.4 + 0.6 * bk);
        }
        if (imgRaw06) {
            imgRaw06.style.filter = 'blur(' + f1(8 * (1 - bk)) + 'px)';
            imgRaw06.style.opacity = String(arrived ? 0.4 + 0.6 * bk : 0);
        }
        // CLS 막대
        if (clsBarRes06 && clsBarRaw06) {
            const rawCls = clamp(clsScore06, 0, 1);
            clsBarRes06.style.width = '2px';
            clsBarRaw06.style.width = Math.max(2, rawCls * 120) + 'px';
        }
        if (clsRes06) {
            clsRes06.textContent = 'reserved CLS 0.00';
        }
        if (clsRaw06) {
            clsRaw06.textContent = 'raw CLS ' + f2(clamp(clsScore06, 0, 1)) + ' (+jump ' + f0(Math.abs(hRawTo - hRawFrom)) + 'px)';
        }
        // 대각 셔머 — 예약 박스를 계속 흐른다(도착 전후 모두)
        if (sweep06) {
            const k = ((tt % 1300) + 1300) % 1300 / 1300;
            sweep06.style.transform = 'translateX(' + ((k * 1.5 - 0.3) * viewW06) + 'px)';
            sweep06.style.opacity = k > 0.95 ? '0' : (arrived ? '0.25' : '0.9');
        }
        return fill('h = w÷{a} = {b}px · 점프 {c}px · BLUR_MS {d} · CLS {e}',
            f1(RATIO), f1(hRes), f0(Math.abs(hRawTo - hRawFrom)), f0(BLUR_MS), f2(clamp(clsScore06, 0, 1)));
    }
    function build(i: number) {
        clsScore06 = 0;
        lastJump06 = -1;
        // 왼쪽 — 예약 패널
        const lr = make('div', 'lab', scWrap);
        lr.textContent = 'aspect-ratio 16/9 예약';
        put(lr, 8, 0, 0, 0);
        panelRes06 = make('div', 'ipanel ipanel--res', scWrap);
        put(panelRes06, 8, 12, 200, ratioReserve(200, RATIO));
        imgRes06 = make('i', 'ipic', panelRes06);
        put(imgRes06, 0, 0, 200, ratioReserve(200, RATIO));
        imgRes06.style.opacity = '0';
        sweep06 = make('i', 'sweep', panelRes06);
        put(sweep06, 0, 0, 60, ratioReserve(200, RATIO));
        clsRes06 = make('b', 'clslab clslab--res', panelRes06);
        clsRes06.textContent = 'reserved CLS 0.00';
        put(clsRes06, 8, 0, 0, 0);
        clsBarRes06 = make('i', 'clsbar clsbar--res', panelRes06);
        put(clsBarRes06, 8, ratioReserve(200, RATIO) - 10, 120, 5);
        // 오른쪽 — 미예약 패널
        const lb = make('div', 'lab', scWrap);
        lb.textContent = '예약 없음 (height auto)';
        put(lb, 232, 0, 0, 0);
        panelRaw06 = make('div', 'ipanel ipanel--raw', scWrap);
        put(panelRaw06, 232, 12, 200, 64);
        imgRaw06 = make('i', 'ipic ipic--raw', panelRaw06);
        put(imgRaw06, 0, 0, 200, 64);
        imgRaw06.style.opacity = '0';
        clsRaw06 = make('b', 'clslab clslab--raw', panelRaw06);
        clsRaw06.textContent = 'raw CLS …';
        put(clsRaw06, 8, 0, 0, 0);
        clsBarRaw06 = make('i', 'clsbar clsbar--raw', panelRaw06);
        put(clsBarRaw06, 8, 54, 120, 5);
        // 공식 라벨
        const ov = make('b', 'ov ovs', sceneEl);
        put(ov, 8, 118, 0, 0);
        ov.textContent = 'ratioReserve: h = w ÷ (16/9)';
        const ov2 = make('b', 'ov ovs ovs--m', sceneEl);
        put(ov2, 232, 118, 0, 0);
        ov2.textContent = 'clsUnit = movedPx / viewportH';
        const ov3 = make('b', 'ov ovs', sceneEl);
        put(ov3, 8, 136, 0, 0);
        ov3.textContent = 'blur-up: blur(' + f0(8) + 'px) → 0 in ' + f0(BLUR_MS) + 'ms';
        drawRows([spanOf(0, T_ARRIVE, 0), spanOf(T_ARRIVE, BLUR_MS, 2), spanOf(T_ARRIVE + BLUR_MS, CYCLE - T_ARRIVE - BLUR_MS, 1)], CYCLE);
        axis(CYCLE);
        setReads(fill('이미지형(ratioReserve·BLUR_MS·edgeSweep) — aspect-ratio · blur-up · CLS'),
            i === 0 ? 'reservation fixes the box before the bytes' : (i === 1 ? 'the raw panel jumps on arrival and pays CLS' : 'blur-up eases the reveal, not the shift'));
        doneP.textContent = '';
        return CYCLE;
    }

    return run({ count: 3, build: build, frame: frame });
}

export default function Skel06ImageRatioBlurup() {
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
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={'aspect-ratio 로 치수를 예약한 박스는 뷰포트가 바뀌어도 높이가 튀지 않고 예약 없는 박스는 이미지 도착에 높이가 점프하며 CLS 막대가 쌓이는 장면'}></div>
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
