// FreeQuotaRouter - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./FreeQuotaRouter.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => (styles as Record<string, string>)[n] ?? n).join(" ");

function main(root: HTMLElement): (() => void) | undefined {
// ── 534 공통 엔진 — 533 run() 시계 계승 (WAAPI 시계읽기·pause·rebuild·reduced 분기)
const W = 480;
const CX0 = 8;
const CW = 432;
function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
function fill(s: string, ...rest: any[]): string {
    const keys = ['{a}', '{b}', '{c}', '{d}', '{e}', '{f}', '{g}', '{h}'];
    const v = [];
    for (let i = 1; i < arguments.length; i += 1) { v.push(String(arguments[i])); }
    let o = s;
    for (let i = 0; i < keys.length; i += 1) {
        o = o.split(keys[i]).join(i < v.length ? v[i] : '');
    }
    return o;
}
function f0(v: number): string { return String(Math.round(v)); }
function f1(v: number): string { return (Math.round(v * 10) / 10).toFixed(1); }
function f2(v: number): string { return (Math.round(v * 100) / 100).toFixed(2); }
const rootEl: HTMLElement = root;
const innerEl = rootEl.querySelector('[data-role="inner"]') as HTMLElement;
const sceneEl = rootEl.querySelector('[data-role="scene"]') as HTMLElement;
const chartEl = rootEl.querySelector('[data-role="chart"]') as HTMLElement;
const probeEl = rootEl.querySelector('[data-role="probe"]') as HTMLElement;
const padEl = rootEl.querySelector('[data-role="pad"]') as HTMLElement;
const statusP = rootEl.querySelector('[data-role="status"]') as HTMLElement;
const readA = rootEl.querySelector('[data-role="reada"]') as HTMLElement;
const readB = rootEl.querySelector('[data-role="readb"]') as HTMLElement;
const doneP = rootEl.querySelector('[data-role="done"]') as HTMLElement;
const pauseBtn = rootEl.querySelector('[data-role="pause"]') as HTMLElement;
const reduced: boolean = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
const sweepEl = make('i', 'sweep', sceneEl);
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
function animsIn(host: HTMLElement): any[] { return host.getAnimations({ subtree: true }) as any[]; }
function spanOf(d: number, dur: number): { s: number; e: number; k: number } { return { s: d, e: d + dur, k: 0 }; }
function bar(cls: string, x: number, y: number, w: number, h: number): HTMLElement {
    const e = make('i', cls, chartEl);
    put(e, x, y, w, h);
    return e;
}
function drawRows(segs: any[], max: number): void {
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
let headEl: any = null;
function setReads(a: string, ...bs: (string | number)[]): void {
    readA.textContent = a;
    readB.textContent = bs.join(' ');
}
function demoT(t: number): number { return t % 2000; }
let piNow: any = 0;
function run(cfg: any): () => void {
    const off = new AbortController();
    let pi = 0;
    let cycle = 2000;
    let paused = false;
    let raf = 0;
    let clock: any = null;
    let lastStatus = '';
    function fit() {
        const k = rootEl.clientWidth / W;
        innerEl.style.transform = 'scale(' + k + ')';
    }
    function rebuild() {
        clearAll();
        piNow = pi;
        cycle = Math.max(2000, cfg.build(pi));
        headEl = cfg.head === false ? null : make('i', 'ph', chartEl);
        clkEl.style.animationDuration = f0(cycle) + 'ms';
        const all = animsIn(sceneEl);
        clock = null;
        for (let i = 0; i < all.length; i += 1) {
            const an = all[i];
            if (an.animationName && an.effect && an.effect.target === clkEl) {
                clock = an;
            }
        }
    }
    function restart() {
        const all = animsIn(sceneEl);
        for (let i = 0; i < all.length; i += 1) {
            all[i].currentTime = 0;
            if (paused) { all[i].pause(); }
            else { all[i].play(); }
        }
    }
    function tick() {
        const ct = clock ? Number(clock.currentTime) : 0;
        const t = isFinite(ct) ? ct : 0;
        if (headEl) {
            headEl.style.transform = 'translateX(' + (CX0 + clamp(t / cycle, 0, 1) * CW) + 'px)';
        }
        sweepEl.style.setProperty('--sw', String(Math.round(t / cycle * 100)));
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
            if (p) { all[i].pause(); }
            else { all[i].play(); }
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
        if (ev.target === pauseBtn) { return; }
        if (ev.key === ' ' || ev.key === 'Enter') {
            ev.preventDefault();
            setPaused(!paused);
        }
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
// ── 534-06 free-quota-router — 가벼운 요청은 무료 채널로 흘러 FREE_MONTHLY(200)가 닳는다.
// 남은 할당 < 15% 면 quotaBar 경고 톤 + 이후 요청은 paidSwitch 화살표로 유료 채널.
// 계산: used/total ×100 — 잔량 보간은 요청 1건당 예상 소모(평균 1.4 호출분)로 미리 깎는다.
const FREE_TOTAL = 200;
const WARN_PCT = 15;
const AVG_DRAIN = 1.4;
const SCENES06: any[] = [
    { used: 34,   req: 'light' },   // 초반 — 여유
    { used: 118,  req: 'light' },   // 중반 — 계속 무료
    { used: 174,  req: 'light' },   // 13% 남음 — 경고 전환 직전
    { used: 188,  req: 'heavy' }    // 6% — paidSwitch 로 유료
];
const REQ_MS06 = 500;
let freeCh06: any = null;
let paidCh06: any = null;
let quotaBg06: any = null;
let quotaFill06: any = null;
let qTxt06: any = null;
let pkt06: any = null;
let swArrow06: any = null;
let warnTag06: any = null;
function pctLeft(used: number): number { return (1 - used / FREE_TOTAL) * 100; }
function build(i: any) {
    freeCh06 = make('div', 'nd nd--step', scWrap);
    put(freeCh06, 300, 28, 120, 22);
    const ft = make('i', 'nd__t', freeCh06);
    ft.textContent = 'free channel';
    paidCh06 = make('div', 'nd nd--step nd--paid', scWrap);
    put(paidCh06, 300, 96, 120, 22);
    const pt = make('i', 'nd__t', paidCh06);
    pt.textContent = 'paid channel';
    // paidSwitch 화살표 — 무료→유료 하강 경로
    swArrow06 = make('i', 'swarrow', scWrap);
    put(swArrow06, 424, 50, 2, 46);
    // 요청 패킷
    pkt06 = make('div', 'nd nd--agent', scWrap);
    pkt06.innerHTML = '<i class="' + cx('nd__t') + '">req</i>';
    put(pkt06, 24, 62, 44, 18);
    // FREE_MONTHLY 할당 막대 — 좌상단
    quotaBg06 = make('i', 'qbar qbar--bg', scWrap);
    put(quotaBg06, 24, 34, 220, 12);
    quotaFill06 = make('i', 'qfill', scWrap);
    put(quotaFill06, 24, 34, 220, 12);
    qTxt06 = make('b', 'qlbl', scWrap);
    put(qTxt06, 24, 18, 240, 0);
    qTxt06.textContent = 'FREE_MONTHLY ' + f0(FREE_TOTAL);
    warnTag06 = make('b', 'warntag', scWrap);
    put(warnTag06, 250, 30, 90, 0);
    warnTag06.textContent = 'ok';
    // 하단 잔량 보간 리드아웃
    const intOv = make('b', 'ov ovs', sceneEl);
    put(intOv, 24, 128, 300, 0);
    intOv.textContent = 'drain/req ~ ' + f1(AVG_DRAIN) + ' calls · warn < ' + f0(WARN_PCT) + '%';
    const segs = [];
    for (let k = 0; k < SCENES06.length; k += 1) { segs.push(spanOf(k * REQ_MS06, REQ_MS06 - 40)); }
    drawRows(segs, 2000);
    axis(2000);
    setReads('FREE_MONTHLY {a} — 잔량 {b}% 에서 유료 전환', f0(FREE_TOTAL), f1(pctLeft(SCENES06[3].used)));
    doneP.textContent = '';
    return 2000;
}
function frame(t: any) {
    const si = Math.min(SCENES06.length - 1, Math.floor(demoT(t) / REQ_MS06));
    const sc = SCENES06[si];
    const ph = clamp((demoT(t) - si * REQ_MS06) / (REQ_MS06 * 0.7), 0, 1);
    const left = pctLeft(sc.used);
    const warning = left < WARN_PCT;
    const toPaid = warning; // 경고 밑으로 떨어지면 이후 요청은 유료
    // 할당 막대 — 남은 비율로 채움(잔량 막대). 요청 진행 중엔 AVG_DRAIN 만큼 미리 보간해 깎임
    const liveUsed = sc.used + (sc.req === 'light' ? clamp(ph, 0, 1) * AVG_DRAIN : 0);
    const liveLeft = pctLeft(liveUsed);
    const w = clamp(liveLeft, 0, 100) / 100 * 220;
    quotaFill06.style.width = f1(w) + 'px';
    quotaFill06.className = cx('qfill' + (liveLeft < WARN_PCT ? ' qfill--warn' : ''));
    qTxt06.textContent = 'FREE_MONTHLY ' + f0(FREE_TOTAL) + ' · used ' + f0(liveUsed);
    warnTag06.textContent = liveLeft < WARN_PCT ? 'WARN ' + f1(liveLeft) + '%' : 'ok';
    warnTag06.className = cx('warntag' + (liveLeft < WARN_PCT ? ' warntag--on' : ''));
    // 채널 활성 — 유료 전환이면 paidCh 강조, 아니면 freeCh
    freeCh06.className = cx('nd nd--step' + (!toPaid && ph > 0.3 ? ' nd--on' : ''));
    paidCh06.className = cx('nd nd--step nd--paid' + (toPaid && ph > 0.3 ? ' nd--on' : ''));
    // 패킷 이동 — x 전진 + 유료 전환 시 paidSwitch 화살표 경로로 하강
    const tx = clamp(ph, 0, 1) * 240;
    const ty = toPaid ? clamp((ph - 0.35) / 0.65, 0, 1) * 34 : 0;
    pkt06.style.transform = 'translate(' + f1(tx) + 'px,' + f1(ty) + 'px)';
    swArrow06.className = cx('swarrow' + (toPaid ? ' swarrow--on' : ''));
    return toPaid ? ('paidSwitch — free ' + f1(liveLeft) + '% < ' + f0(WARN_PCT) + '%') : ('free ride — left ' + f1(liveLeft) + '%');
}

    return run({ count: 1, build: build, frame: frame, head: true });
}

export default function FreeQuotaRouter() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!rootRef.current) return;
    return main(rootRef.current) as () => void;
  }, []);
  return (
    <div className={cx("ez is-demo")} ref={rootRef}>
      <div className={cx("ez__in")} data-role="inner">
        <div className={cx("ez__pad")} data-role="pad" tabIndex={0} role="application" aria-label={'시연 무대 — Space 또는 Enter 로 일시정지, R 로 처음부터, 왼쪽·오른쪽 방향키로 다음 시나리오로'}>
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={''}></div>
          <div className={cx("ez__probe")} data-role="probe" aria-hidden="true"></div>
          <div className={cx("ez__chart")} data-role="chart" aria-hidden="true"></div>
          <p className={cx("ez__status")} data-role="status" aria-live="off">{'장면 준비'}</p>
          <p className={cx("ez__reada")} data-role="reada" aria-hidden="true"></p>
          <p className={cx("ez__readb")} data-role="readb" aria-hidden="true"></p>
          <div className={cx("ez__ctrl")}>
            <button className={cx("ez__pause")} data-role="pause" type="button" aria-pressed={"false"}>{'일시정지'}</button>
          </div>
          <p className={cx("ez__done")} data-role="done" role="status" aria-live="polite"></p>
        </div>
      </div>
    </div>
  );
}
