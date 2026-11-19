// CustomModelVerify - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./CustomModelVerify.module.scss";

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
// ── 534-07 custom-model-verify — 커스텀 모델 연결 핸드셰이크 3단 체크.
// ① endptCheck: URL 파싱 — https 스킴 + 호스트 + /v1 경로 형식 점수
// ② credHash: 자격 증명 길이 해시 마스킹 — cred="sk-…" 의 폴딩 체크섬 (h = (Σ code × 31^i) mod 97)
// ③ 모델 응답 정합: 에코 핑 응답 id 일치 — 실패 시 그 단계에서 멈추고 재시도 라벨.
const SCENES07: any[] = [
    { url: 'https://api.custom.llm/v1',  cred: 'sk-9f2a7c4e1d8b', echo: true  },
    { url: 'https://api.custom.llm/v9',  cred: 'sk-9f2a7c4e1d8b', echo: true  },  // path miss → step-one failure
    { url: 'https://api.custom.llm/v1',  cred: 'sk-xx',            echo: true  },  // short credential → step-two failure
    { url: 'https://api.custom.llm/v1',  cred: 'sk-9f2a7c4e1d8b', echo: false }   // response mismatch → step-three failure
];
const STEP_MS07 = 640;
let stepEls07: any = null;
let checkBars07: any = null;
let retryTag07: any = null;
let handPkt07: any = null;
let sumTxt07: any = null;
let urlTxt07: any = null;
function urlScore(u: any) {
    // 형식 점수 — 스킴 https(2점) + 호스트 있음(1점) + /v1 경로(2점) = 5점 만점
    let s = 0;
    if (u.indexOf('https://') === 0) { s += 2; }
    if (u.indexOf('https://') === 0 && u.slice(8).indexOf('.') >= 0) { s += 1; }
    if (u.slice(-3) === '/v1') { s += 2; }
    return s;
}
function credChecksum(c: any) {
    // 폴딩 체크섬 — Σ code × 31^i mod 97 (0~96 두 자리)
    let h = 0;
    for (let i = 0; i < c.length; i += 1) { h = (h * 31 + c.charCodeAt(i)) % 97; }
    return h;
}
function build(i: any) {
    stepEls07 = [];
    checkBars07 = [];
    const names = ['endptCheck', 'credHash', 'echoMatch'];
    const ys = [22, 58, 94];
    for (let k = 0; k < 3; k += 1) {
        const nd = make('div', 'nd nd--step', scWrap);
        put(nd, 40, ys[k], 108, 22);
        const t = make('i', 'nd__t', nd);
        t.textContent = names[k];
        // 체크막대 — 단계 통과마다 채워짐
        const bgb = make('i', 'qbar qbar--bg', scWrap);
        put(bgb, 162, ys[k] + 7, 120, 8);
        const fb = make('i', 'chkfill', scWrap);
        put(fb, 162, ys[k] + 7, 0, 8);
        stepEls07.push(nd);
        checkBars07.push(fb);
    }
    handPkt07 = make('div', 'nd nd--agent', scWrap);
    handPkt07.innerHTML = '<i class="' + cx('nd__t') + '">hs</i>';
    put(handPkt07, 10, 120, 30, 16);
    retryTag07 = make('b', 'retag', scWrap);
    put(retryTag07, 300, 120, 120, 0);
    retryTag07.textContent = '';
    // url·체크섬 리드아웃
    urlTxt07 = make('b', 'urltxt', scWrap);
    put(urlTxt07, 300, 22, 172, 0);
    sumTxt07 = make('b', 'urltxt', scWrap);
    put(sumTxt07, 300, 58, 172, 0);
    const ov = make('b', 'ov ovs', sceneEl);
    put(ov, 300, 6, 172, 0);
    ov.textContent = 'chk = Σ c·31^i mod 97';
    const segs = [];
    for (let k = 0; k < SCENES07.length; k += 1) { segs.push(spanOf(k * STEP_MS07, STEP_MS07 - 40)); }
    drawRows(segs, 2000);
    axis(2000);
    setReads('핸드셰이크 3단 — url {a}/5 · chk {b} (mod 97)', f0(urlScore(SCENES07[0].url)), f0(credChecksum(SCENES07[0].cred)));
    doneP.textContent = '';
    return 2000;
}
function frame(t: any) {
    const si = Math.min(SCENES07.length - 1, Math.floor(demoT(t) / STEP_MS07));
    const sc = SCENES07[si];
    const ph = clamp((demoT(t) - si * STEP_MS07) / (STEP_MS07 * 0.85), 0, 1);
    const us = urlScore(sc.url);
    const ck = credChecksum(sc.cred);
    const pass1 = us === 5;
    const pass2 = pass1 && sc.cred.length >= 8 && ck > 0;
    const pass3 = pass2 && sc.echo;
    const passes = [pass1, pass2, pass3];
    let failAt = -1;
    for (let k = 0; k < 3; k += 1) { if (!passes[k]) { failAt = k; break; } }
    const active = failAt === -1 ? 2 : failAt; // 진행 중 단계
    for (let k = 0; k < 3; k += 1) {
        const doneK = k < active || (failAt === -1 && ph > 0.85);
        stepEls07[k].className = cx('nd nd--step' + (k === active && !(failAt === k && ph > 0.7) && !(failAt === -1 && k === 2) ? ' nd--on' : '') + (failAt === k && ph > 0.7 ? ' nd--fail' : ''));
        // 체크막대 — 통과 단계만 채움(단계당 120px → 진행률 반영)
        const fill = (k < active ? 120 : (doneK ? clamp(ph * 3, 0, 1) * 120 : 0));
        checkBars07[k].style.width = f1(fill) + 'px';
        checkBars07[k].className = cx('chkfill' + (failAt === k && ph > 0.7 ? ' chkfill--bad' : ''));
    }
    // 핸드셰이크 패킷 — 단계를 따라 수직 진행
    const ty = clamp(ph, 0, 1) * (active * 36);
    handPkt07.style.transform = 'translateY(' + f1(ty) + 'px)';
    retryTag07.textContent = failAt >= 0 && ph > 0.7 ? 'retry step ' + f0(failAt + 1) : (failAt === -1 && ph > 0.85 ? 'verified — router candidate' : '');
    retryTag07.className = cx('retag' + (failAt >= 0 && ph > 0.7 ? ' retag--fail' : (failAt === -1 && ph > 0.85 ? ' retag--ok' : '')));
    // url 점수·체크섬 표시 (자격 증명은 마스킹 — 길이·체크섬만)
    urlTxt07.textContent = 'url ' + f0(us) + '/5 ' + sc.url;
    sumTxt07.textContent = 'cred ' + f0(sc.cred.length) + 'ch · chk ' + f0(ck);
    return failAt === -1 ? ('3단 통과 — 라우터 후보 등록') : ('step ' + f0(failAt + 1) + ' 실패 — 재시도 대기');
}

    return run({ count: 1, build: build, frame: frame, head: true });
}

export default function CustomModelVerify() {
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
