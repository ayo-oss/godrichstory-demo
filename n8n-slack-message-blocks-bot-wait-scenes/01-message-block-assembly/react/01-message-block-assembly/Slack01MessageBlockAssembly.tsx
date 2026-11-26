// Slack01MessageBlockAssembly - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./Slack01MessageBlockAssembly.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

function main(root: HTMLElement): () => void {

    // ── 536 공통 — n8n slack 메시지 포맷 엔진 (535 core 계승, JSON 블록 스택·발송 검증·대기 시간표 판)
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
    function f3(v: number): string { return (Math.round(v * 1000) / 1000).toFixed(3); }
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
    function make(tag: string, cls: string | null, parent: HTMLElement): HTMLElement {
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
    function clearAll() {
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
    function spanOf(d: number, dur: number, k?: number) { return { s: d, e: d + dur, k: k === undefined ? 0 : k }; }
    let headEl: HTMLElement | null = null;
    let piNow = 0;
    let cycleNow = 2000;
    let restoreClock = null as unknown as HTMLElement;
    function run(cfg: { count: number; build: (i: number) => number; frame: (t: number) => string; head?: boolean }): () => void {
        const off = new AbortController();
        let pi = 0;
        let cycle = 2000;
        let paused: boolean = false;
        let raf: number = 0;
        let clock: Animation | null = null;
        let lastStatus = '';
        function fit() {
            const k = rootEl.clientWidth / W;
            innerEl.style.transform = 'scale(' + k + ')';
        }
        function rebuild() {
            clearAll();
            piNow = pi;
            cycle = Math.max(2000, cfg.build(pi));
            cycleNow = cycle;
            headEl = cfg.head === false ? null : make('i', 'ph', chartEl);
            clkEl.style.animationDuration = f0(cycle) + 'ms';
            const all = animsIn(sceneEl);
            clock = null;
            for (let i = 0; i < all.length; i += 1) {
                const an = all[i];
                const css = an as CSSAnimation;
                if (css.animationName && css.effect && (css.effect as KeyframeEffect).target === clkEl) {
                    clock = an;
                }
            }
        }
        function restart() {
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
        function tick() {
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
            const all = animsIn(sceneEl);
            for (let i = 0; i < all.length; i += 1) {
                if (p) {
                    all[i].pause();
                }
                else {
                    all[i].play();
                }
            }
            pauseBtn.setAttribute('aria-pressed', p ? 'true' : 'false');
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
            // reduce — 보간 없이 목표 상태 한 장. 입력(키·버튼)은 rebuild 로 바로 화면에 반영된다
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

    // ── 01 메시지 블록 조립 — blocks 배열이 순서대로 조립된다. section 마다 fields(최대 10개)와
    //    accessory(1개)가 붙는다. 블록 수 게이지는 BLOCK_LIMIT(50) 을 향해 차오르고 남은 개수는
    //    left = BLOCK_LIMIT - n, 필드 누적은 fields Σ, 다음 블록의 한도 판정은 n + 1 <= BLOCK_LIMIT 이다.
    //    텍스트 예산도 같이 세고 있다: section.text 누적 textSum 이 MSG_LEN(메시지 길이 예산)을 따라 자라며
    //    Slack section.text 최대 TEXT_MAX(3,000자) 를 넘는지 판정한다. 변형 1: MSG_LEN 1,200 → 2,800
    const BLOCK_LIMIT = 50;   // 한 메시지의 blocks 상한 (Slack 공식 — 메시지당 50, 모달·홈탭은 100)
    const FIELDS_MAX = 10;    // 한 section 의 fields 상한 (Slack 공식)
    const TEXT_MAX = 3000;    // 한 section.text 의 상한 (Slack 공식)
    const MSG_LEN = 1200;     // 변형 1: 1,200 → 2,800 (메시지 한 건의 텍스트 길이 예산, 자)
    const STACK_N = 12;       // 회차 1 에 조립하는 블록 수 (회차 2·3 은 36·48)
    const T0 = 200;           // 첫 조립 시작(첫 변화는 150ms 뒤)
    const STACK_X = 12;
    const STACK_W = 256;
    const ROW_H = 22;
    const ROW_GAP = 4;
    const VISIBLE = 6;        // 스택 창에 보이는 줄 수 — 넘치면 오래된 줄이 위로 밀려 올라간다
    const WIN_Y = 156 - VISIBLE * (ROW_H + ROW_GAP);
    const GAUGE_X = 284;
    const GAUGE_Y = 36;       // 게이지 윗변 — 그 위 4~34 에 제목·부제가 놓인다 (안쪽이면 눈금 45·40 을 덮는다)
    const GAUGE_W = 160;
    const GAUGE_H = 120;      // 36 + 120 = 156 (씬 바닥). 눈금 k × 5 는 k × 12px
    let rowEls = [] as any[];
    let gaugeFill = null as unknown as HTMLElement;
    let gaugeLbl = null as unknown as HTMLElement;
    let gaugeSub = null as unknown as HTMLElement;
    let stepMs = 120;
    const CH_X = 8;          // chart 안쪽 여백
    let secN = 0;           // section 블록 수 — build 에서 한 번 센다
    let chartNote = null as unknown as HTMLElement;
    let fldBar = null as unknown as HTMLElement;
    let leftBar = null as unknown as HTMLElement;
    let txtBar = null as unknown as HTMLElement;
    let txtScale = 0;

    // 블록 i 의 구성 — 4개마다 divider, section 은 fields 1~10 개·짝수 section 에 accessory 1개
    function planOf(i: number): { kind: string; fields: number; accessory: number; text: number } {
        const kind = i % 4 === 3 ? 'divider' : 'section';
        const fields = kind === 'section' ? 1 + Math.floor(seedHash(i, 5.1) * FIELDS_MAX) : 0;
        const accessory = kind === 'section' && i % 2 === 0 ? 1 : 0;
        // section.text 길이 가중치 — 시드로 0.55~1.45 사이를 준다. textScale(n) 을 곱하면 section 들의 합이 정확히 MSG_LEN 이 된다
        const text = kind === 'section' ? 0.55 + seedHash(i, 9.3) * 0.9 : 0;
        return { kind: kind, fields: fields, accessory: accessory, text: text };
    }
    // section.text 길이 정규화 — 시드 가중치 합이 MSG_LEN 이 되게 곱셈표를 만든다 (계수는 회차마다 한 번)
    function textScale(n: number): number {
        let w = 0;
        for (let b = 0; b < n; b += 1) {
            w += planOf(b).text;
        }
        return w > 0 ? MSG_LEN / w : 0;
    }
    function build(i: number): number {
        rowEls = [];
        const n = [STACK_N, 36, 48][Math.min(i, 2)];
        secN = 0;
        for (let b = 0; b < n; b += 1) {
            if (planOf(b).kind === 'section') {
                secN += 1;
            }
        }
        stepMs = (1800 - T0) / n;   // 주기 2000ms 안에서 n 개를 똑같이 나눠 조립한다
        txtScale = textScale(n);    // 이 회차의 section.text 계수 — 다 더하면 MSG_LEN
        const win = make('div', 'win', scWrap);
        put(win, STACK_X, WIN_Y, STACK_W, VISIBLE * (ROW_H + ROW_GAP) - ROW_GAP);
        for (let b = 0; b < n; b += 1) {
            const plan = planOf(b);
            const row = make('div', 'row row--' + plan.kind, win);
            put(row, 0, 0, STACK_W, ROW_H);
            row.style.opacity = '0';
            const tag = make('b', 'rtag', row);
            tag.textContent = plan.kind;
            const fwrap = make('div', 'rfields', row);
            put(fwrap, 64, 4, STACK_W - 96, 14);
            let fx = 0;
            for (let f = 0; f < plan.fields; f += 1) {
                const fw = 12 + Math.floor(seedHash(f, 7.7 + b) * 16);
                const fd = make('i', 'rfield', fwrap);
                put(fd, fx, 0, fw, 14);
                fx += fw + 4;
            }
            const acc = make('i', 'racc', row);
            put(acc, STACK_W - 28, 4, 16, 14);
            rowEls.push({ el: row, plan: plan, fields: fwrap, acc: acc });
        }
        const shell = make('div', 'gauge', scWrap);
        put(shell, GAUGE_X, GAUGE_Y, GAUGE_W, GAUGE_H);
        gaugeFill = make('i', 'gfill', scWrap);
        put(gaugeFill, GAUGE_X, GAUGE_Y + GAUGE_H, GAUGE_W, 0);
        for (let k = 1; k <= 9; k += 1) {
            const tk = make('i', 'gtick', shell);
            tk.style.bottom = (k * GAUGE_H / 10) + 'px';
            tk.textContent = k * 5 + '';
        }
        gaugeLbl = make('b', 'glbl', scWrap);
        put(gaugeLbl, GAUGE_X, 4, GAUGE_W, 16);
        gaugeSub = make('b', 'gsub', scWrap);
        put(gaugeSub, GAUGE_X, 20, GAUGE_W, 14);
        // chart — 필드 누적 막대(fields Σ, 최대 = section 수 × FIELDS_MAX)와 남은 블록 비율 막대
        chartNote = make('b', 'cnote', chartEl);
        put(chartNote, CH_X, 4, 432, 14);
        fldBar = make('i', 'cbar cbar--f', chartEl);
        put(fldBar, CH_X, 20, 0, 6);
        leftBar = make('i', 'cbar cbar--l', chartEl);
        put(leftBar, CH_X, 30, 432, 6);
        txtBar = make('i', 'cbar cbar--t', chartEl);
        put(txtBar, CH_X, 40, 432, 6);
        readA.textContent = fill('blocks[{a}] · MSG_LEN {b} · section.text ≤ {c} · section.fields ≤ {d}', f0(n), f0(MSG_LEN), f0(TEXT_MAX), f0(FIELDS_MAX));
        readB.textContent = i === 0 ? 'blocks assemble in order and the gauge fills toward 50' : (i === 1 ? 'fields and the accessory ride on each section' : 'two slots remain before the block limit');
        doneP.textContent = '';
        return 2000;
    }
    function frame(t: number): string {
        const n = rowEls.length;
        const k = clamp((t - T0) / stepMs, 0, n);
        const full = Math.floor(k);
        const frac = k - full;
        let fields = 0;
        let accs = 0;
        let textSum = 0;
        const over = Math.max(0, Math.min(full + 1, n) - VISIBLE);
        for (let b = 0; b < n; b += 1) {
            const r = rowEls[b];
            const born = clamp((t - T0 - b * stepMs) / 200, 0, 1);
            const ty = (b - over) * (ROW_H + ROW_GAP);
            r.el.style.transform = 'translateY(' + f1(ty) + 'px) scale(' + f2(0.84 + 0.16 * born) + ')';
            r.el.style.opacity = f2(born);
            if (b < full) {
                fields += r.plan.fields;
                accs += r.plan.accessory;
                textSum += r.plan.text * txtScale;
            }
            // 조립 중인 줄 — 필드가 왼쪽부터 하나씩 놓인다
            const kids = r.fields.children;
            for (let f = 0; f < kids.length; f += 1) {
                kids[f].style.opacity = (b < full || (b === full && frac * kids.length > f)) ? '1' : '0';
            }
            r.acc.style.opacity = r.plan.accessory && (b < full || frac > 0.8) ? '1' : '0';
        }
        const count = Math.min(full, n);
        const left = BLOCK_LIMIT - count;
        const ratio = count / BLOCK_LIMIT;
        const h = ratio * GAUGE_H;
        gaugeFill.style.transform = 'translateY(' + f2(-h) + 'px)';
        gaugeFill.style.height = f2(h) + 'px';
        gaugeLbl.textContent = fill('blocks {a}/{b}', f0(count), f0(BLOCK_LIMIT));
        gaugeSub.textContent = fill('left {a} · fields {b} · accessory {c}', f0(left), f0(fields), f0(accs));
        // chart — 필드 누적(민트, 최대 secMax)과 남은 블록 비율(파랑, left / BLOCK_LIMIT)
        const secMax = Math.max(1, secN) * FIELDS_MAX;
        fldBar.style.width = f1(fields / secMax * 432) + 'px';
        leftBar.style.transform = 'scaleX(' + f3(left / BLOCK_LIMIT) + ')';
        chartNote.textContent = fill('fields Σ {a}/{b} · left/50 = {c} · text {d}/{e}', f0(fields), f0(secMax), f3(left / BLOCK_LIMIT), f0(textSum), f0(TEXT_MAX));
        // 텍스트 예산 — 누적 textSum (자)과 section.text 한도 대비 비율. MSG_LEN 을 늘리면 막대가 한도를 넘는다
        txtBar.style.transform = 'scaleX(' + f3(Math.min(textSum / TEXT_MAX, 1)) + ')';
        txtBar.classList.toggle('cbar--over', textSum > TEXT_MAX);
        const nextOk = count + 1 <= BLOCK_LIMIT;
        return fill('조립 {a}/{b} · 남은 블록 {c}개 · fields {d} · accessory {e} · text {f}자/{g}',
            f0(count), f0(n), f0(left), f0(fields), f0(accs), f0(textSum), f0(TEXT_MAX));
    }
    return run({ count: 3, build: build, frame: frame });
}

export default function Slack01MessageBlockAssembly() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    return main(rootEl);
  }, []);

  return (
    <div className={cx("mb") + " is-demo"} ref={rootRef}>
      <div className={cx("mb__in")} data-role="inner">
        <div className={cx("mb__pad")} data-role="pad" tabIndex={0} role="application" aria-label={'시연 무대 — Space 또는 Enter 로 일시정지, R 로 처음부터, 왼쪽·오른쪽 방향키로 다른 값으로'}>
          <div className={cx("mb__scene")} data-role="scene" role="img" aria-label={'JSON 블록 배열이 순서대로 조립되고 각 섹션에 필드와 액세서리가 붙으며 오른쪽 블록 수 게이지가 50개 한도를 향해 차오르는 장면'}></div>
          <div className={cx("mb__probe")} data-role="probe" aria-hidden="true"></div>
          <div className={cx("mb__chart")} data-role="chart" aria-hidden="true"></div>
          <p className={cx("mb__status")} data-role="status" aria-live="off">{'장면 준비'}</p>
          <p className={cx("mb__reada")} data-role="reada" aria-hidden="true"></p>
          <p className={cx("mb__readb")} data-role="readb" aria-hidden="true"></p>
          <div className={cx("mb__ctrl")}>
            <button className={cx("mb__pause")} data-role="pause" type="button" aria-pressed="false">{'일시정지'}</button>
          </div>
          <p className={cx("mb__done")} data-role="done" role="status" aria-live="polite"></p>
        </div>
      </div>
    </div>
  );
}
