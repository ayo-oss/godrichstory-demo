// Restore02PickVersion - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./Restore02PickVersion.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

function main(root: HTMLElement): () => void {
    // ── 540 공통 — n8n 워크플로 백업 3종 엔진 (539 base 계승)
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
        // 씬 바로 아래 두는 집계 오버레이(.ov) 도 다시 만든다 — 지우지 않으면 묶음을 바꿀 때 옛 칩이 쌓인다
        const ovs = sceneEl.querySelectorAll('.ov');
        for (let i = 0; i < ovs.length; i += 1) {
            sceneEl.removeChild(ovs[i]);
        }
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
            // 움직임 줄이기에서는 애니메이션이 꺼져 있어 tick 이 상태를 다시 그리지 않는다 — 입력(다른 묶음) 을 바로 그린다
            if (reduced) {
                statusP.textContent = cfg.frame(1e9);
            }
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
            // 마지막 상태를 보여 준다 — 상태 줄은 계산 최종값, 낭독 문장(done) 은 요약 문장
            statusP.textContent = cfg.frame(1e9);
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

    // ── 540-02 되돌리기 — 보관된 판들이 가로 시간표 위에 늘어서고(플로팅 미니멀리즘 — 넓은 여백·작은 요소),
    //    고른 판(versionIdx)이 현재 자리로 내려오며, 보관 수 KEEP_N 을 넘은 가장 오래된 판이 밀려난다.
    //    계산: 보관 판 번호 목록 kept = 최근 KEEP_N 개, 밀려남 evicted = max(0, 총 스냅샷 − KEEP_N),
    //          되돌린 간격 gap = 현재 판 − 고른 판
    const KEEP_N = 12;        // 변형 2: 12 → 3 (보관할 판 수. 데모 상수 — n8n 의 기본값이 아니다)
    const TOTAL_IN = 15;      // 2초 안에 새로 찍히는 스냅샷 수 (시작 6~9 판에 더해져 KEEP_N 12 를 넘는다)
    const SLOT_W = 33;        // 시간표 한 칸 폭 (12 칸 × 33 + 11 틈 × 4 = 440)
    const SLOT_H = 28;
    const SLOT_GAP = 4;
    const SLOT_PITCH = SLOT_W + SLOT_GAP;
    const TRACK_Y = 92;
    const T_IN0 = 200;        // 첫 변화는 150ms 뒤
    const T_IN = 56;          // 판 하나가 시간표에 들어오는 간격 (15 판 × 56 = 840ms)
    const T_PICK = 1080;      // 되돌릴 판을 고르는 순간
    const T_DROP = 1180;      // 고른 판이 현재 자리로 내려오기 시작하는 순간
    const T_LAND = 1520;      // 착지
    type Chip = { el: HTMLElement; ver: number };
    let chips: Chip[] = [];   // 시간표 위 판 칩 — build 에서 한 번에 만든다
    let seatEl: HTMLElement | null = null;        // 현재 자리
    let curEl: HTMLElement | null = null;         // 현재 자리에 적히는 판 번호
    let pickEl: HTMLElement | null = null;        // 고른 판이 내려오는 복제
    let baseVer = 0;          // 시작 판 수 (이미 찍혀 있는 스냅샷)
    let versionIdx = 0;       // 되돌릴 판 번호
    let ov2: { kept?: HTMLElement; evicted?: HTMLElement; gap?: HTMLElement } = {};
    function build(i: number): number {
        const seeds = [3.1, 5.9, 8.3];
        const seed = seeds[i];
        chips = [];
        baseVer = 6 + Math.floor(seedHash(5, seed) * 4);     // 6 에서 9 판 (시드 3.1·5.9·8.3 → 6·7·8 판)
        versionIdx = baseVer - 3 - Math.floor(seedHash(11, seed) * 2); // 현재에서 3~4 판 전 (→ v2·v3·v5)
        // 시간표 바닥 — 가는 눈금 12 칸 (노출된 격자)
        for (let n = 0; n < KEEP_N; n += 1) {
            const tick = make('i', 'tick', scWrap);
            put(tick, 4 + n * SLOT_PITCH, TRACK_Y + SLOT_H, SLOT_W, 4);
        }
        // 판 칩 — 시작 판 + 새로 찍힐 판 전부를 미리 만든다 (frame 은 위치만 정하는 순수 시간 함수)
        for (let v = 1; v <= baseVer + TOTAL_IN; v += 1) {
            const c = make('b', 'chip', scWrap);
            c.textContent = 'v' + f0(v);
            put(c, 4, TRACK_Y, SLOT_W, SLOT_H);
            chips.push({ el: c, ver: v });
        }
        // 현재 자리 — 시간표 위에 떠 있는 작은 자리
        seatEl = make('div', 'seat', scWrap);
        put(seatEl, 4, 8, 120, 40);
        const sl = make('b', 'seat__lab', seatEl);
        sl.textContent = 'current';
        curEl = make('b', 'seat__ver', seatEl);
        pickEl = make('b', 'pick', scWrap);
        put(pickEl, 4, TRACK_Y, SLOT_W, SLOT_H);
        pickEl.textContent = 'v' + f0(versionIdx);
        const ax = make('b', 'taxis', scWrap);
        put(ax, 4, TRACK_Y + SLOT_H + 8, 440, 0);
        ax.textContent = 'oldest';
        const ax2 = make('b', 'taxis taxis--r', scWrap);
        put(ax2, 4, TRACK_Y + SLOT_H + 8, 440, 0);
        ax2.textContent = 'newest';
        // 집계 — 보관 목록·밀려남·되돌린 간격. 현재 자리 옆 윗여백(x 136) 에 둔다 — 시간표(y 92~124) 와 겹치지 않는다
        ov2 = {};
        const keys: ('kept' | 'evicted' | 'gap')[] = ['kept', 'evicted', 'gap'];
        const xs = [136, 288, 136];
        const ys = [8, 8, 32];
        for (let n = 0; n < 3; n += 1) {
            const o = make('b', 'ov ovs', sceneEl);
            put(o, xs[n], ys[n], 0, 0);
            ov2[keys[n]] = o;
        }
        const f1e = make('b', 'ov ov--s', sceneEl);
        put(f1e, 136, 56, 0, 0);
        f1e.textContent = 'kept = last KEEP_N';
        const f2e = make('b', 'ov ov--s', sceneEl);
        put(f2e, 288, 32, 0, 0);
        f2e.textContent = 'rollback → versionIdx';
        setReads('restore(versionIdx) — KEEP_N ' + f0(KEEP_N) + ' · start v' + f0(baseVer),
            'the chosen version drops into the current seat, the oldest is pushed out');
        drawRows([spanOf(0, T_IN0, 0), spanOf(T_IN0, TOTAL_IN * T_IN, 1), spanOf(T_IN0 + TOTAL_IN * T_IN, T_PICK - T_IN0 - TOTAL_IN * T_IN, 0), spanOf(T_PICK, T_DROP - T_PICK, 2), spanOf(T_DROP, T_LAND - T_DROP, 2), spanOf(T_LAND, 2000 - T_LAND, 1)], 2000);
        axis(2000);
        doneP.textContent = '';
        return 2000;
    }
    function easeOut(k: number): number { return 1 - Math.pow(1 - clamp(k, 0, 1), 3); }
    // keptOf — 총 스냅샷 total 에서 보관하는 판 번호 목록(최근 KEEP_N 개)과 밀려난 수를 계산한다
    function keptOf(total: number): { list: number[]; evicted: number } {
        const list: number[] = [];
        for (let v = Math.max(1, total - KEEP_N + 1); v <= total; v += 1) {
            list.push(v);
        }
        return { list: list, evicted: Math.max(0, total - KEEP_N) };
    }
    function frame(t: number): string {
        if (chips.length === 0) {
            return '';
        }
        // 새 스냅샷 — T_IN0 부터 T_IN 간격으로 TOTAL_IN 개가 찍힌다 (연속 진행 inK — 프레임을 건너뛰지 않는다)
        const inK = clamp((t - T_IN0) / T_IN, 0, TOTAL_IN);
        const shown = baseVer + Math.floor(inK);     // 지금까지 찍힌 판 수
        const frac = inK - Math.floor(inK);          // 지금 들어오는 판의 진행 0~1
        const kp = keptOf(shown);
        const oldestKept = kp.list.length > 0 ? kp.list[0] : 1;
        // 시간표 이동 — 보관 창이 왼쪽으로 민 칸 수 = 밀려난 판 수 + 지금 들어오는 판의 진행
        const shift = clamp((oldestKept - 1) + easeOut(frac), 0, baseVer + TOTAL_IN - KEEP_N + 1);
        // 칩 위치 — 판 v 의 칸 = (v − 1) − shift. 창 안(0..KEEP_N−1) 이 보관, 음수면 밀려나는 중
        for (let n = 0; n < chips.length; n += 1) {
            const c = chips[n];
            const v = c.ver;
            if (v > shown + 1) {
                c.el.style.opacity = '0';
                continue;
            }
            const slot = (v - 1) - shift;
            const x = 4 + slot * SLOT_PITCH;
            const inside = slot >= -0.001 && v <= shown;
            const leaving = slot < -0.001;           // 보관 창 왼쪽 밖 — 밀려난 판
            c.el.style.transform = 'translateX(' + f1(x - 4) + 'px)';
            c.el.setAttribute('data-kept', inside ? '1' : '0');
            c.el.setAttribute('data-pick', v === versionIdx ? '1' : '0');
            c.el.setAttribute('data-new', v === shown ? '1' : '0');
            // 밀려난 판 — 창 밖으로 갈수록 옅어진다 (계산: −slot 칸 만큼). 플로팅: 보관 칩은 1~2px 뜬다
            c.el.style.opacity = leaving ? f2(clamp(1 + slot * 0.9, 0, 1)) : '1';
            const floatY = inside ? -Math.sin((v * 0.7) + t / 520) * 1.5 : 0;
            c.el.style.top = f1(TRACK_Y + floatY) + 'px';
        }
        // 고른 판 — T_DROP 부터 현재 자리로 낙하(중력 s = k²), 착지 뒤 살짝 눌렸다 복원
        const kd = (t - T_DROP) / (T_LAND - T_DROP);
        const slotPick = (versionIdx - 1) - shift;
        const px = 4 + slotPick * SLOT_PITCH;
        if (pickEl) {
            if (t >= T_PICK) {
                const lift = 1 - clamp((t - T_DROP) / 80, 0, 1);
                const fall = kd >= 1 ? 1 : kd * kd;
                const ks = (t - T_LAND) / 220;
                let sy = 1;
                if (ks >= 0 && ks < 1) {
                    sy = 1 - Math.sin(ks * Math.PI) * 0.14 * (1 - ks);
                }
                const fromY = TRACK_Y - 10 * lift;
                const toY = 8;
                const y = lerp(fromY, toY, fall);
                // 내려오는 동안 칩이 현재 자리 쪽으로 커진다
                const grow = lerp(1, 2.2, fall);
                pickEl.style.opacity = '1';
                pickEl.style.transform = 'translate(' + f1(px - 4) + 'px, ' + f1(y - TRACK_Y) + 'px) scale(' + f2(grow) + ') scaleY(' + f2(sy) + ')';
                pickEl.style.zIndex = '5';
            }
            else {
                pickEl.style.opacity = '0';
            }
        }
        // 현재 자리 — 착지 순간 판 번호가 바뀐다 (컷 — 반투명 유령 없음)
        const landed = t >= T_LAND;
        if (curEl) {
            curEl.textContent = 'v' + f0(landed ? versionIdx : shown);
        }
        if (seatEl) {
            seatEl.setAttribute('data-landed', landed ? '1' : '0');
        }
        // 집계
        if (ov2.kept) {
            ov2.kept.textContent = 'kept [' + kp.list[0] + '..' + kp.list[kp.list.length - 1] + '] ' + f0(kp.list.length);
        }
        if (ov2.evicted) {
            ov2.evicted.textContent = 'evicted ' + f0(kp.evicted);
        }
        if (ov2.gap) {
            ov2.gap.textContent = 'gap ' + f0(landed ? shown - versionIdx : 0);
        }
        return fill('보관 {a} · 밀려남 {b} · 되돌림 v{c}', f0(kp.list.length), f0(kp.evicted), f0(landed ? versionIdx : shown));
    }

    return run({ count: 3, build: build, frame: frame });
}

export default function Restore02PickVersion() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    return main(rootEl);
  }, []);

  return (
    <div className={cx("ez") + " is-demo"} ref={rootRef}>
      <div className={cx("ez__in")} data-role="inner">
        <div className={cx("ez__pad")} data-role="pad" tabIndex={0} role="application" aria-label={'Space 또는 Enter 로 일시정지, R 로 처음부터, 왼쪽·오른쪽 방향키로 다른 판 묶음으로'}>
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={'보관된 판들이 가로 시간표 위에 늘어서고 고른 판이 현재 자리로 내려오며 보관 수를 넘은 가장 오래된 판이 밀려나는 장면'}></div>
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
