// CbLanguageTabCrossfade - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./CbLanguageTabCrossfade.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

function main(root: HTMLElement): () => void {
// ── 528 코드 블록 공통 — 무대 좌표·문구 틀·요소 조립·토크나이저 엔진 (527 core.ts 계승)
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
function f2(v: number): string { return (Math.round(v * 100) / 100).toFixed(2); }
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
// ── 엔진이 푼 시간 읽기 — getAnimations() 값
function animsIn(host: HTMLElement): Animation[] {
    return host.getAnimations({ subtree: true });
}
interface Seg { s: number; e: number; k: number; }
function spanOf(d: number, dur: number): Seg { return { s: d, e: d + dur, k: 0 }; }
// ── 아래 차트 상자 그리기 — 시연 구간을 막대로
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
        out.push(bar('bar k' + sg.k, x, 5 + i * (h + 1), w, h));
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
// ── 코드 블록 엔진 — 이 편의 주역 계산을 9종이 공유한다
// digitCount — 줄 번호 거터의 폭을 정하는 자릿수 산술. 98줄 → 2자리, 100줄 → 3자리.
//   9줄에서 99줄로 넘어가도 코드 시작 열이 한 픽셀 안 움직이려면 폭을 '최대 자릿수'로 미리 고정한다
function digitCount(n: number): number {
    let d = 1;
    let v = n;
    while (v >= 10) { v = Math.floor(v / 10); d += 1; }
    return d;
}
// fmt2 — 줄 번호를 오른쪽 정렬(rightAlign)로 채운다(2 → ' 2'). 거터 안에서 모든 번호의 끝열이 같아진다.
//   실코드 식별자 fmt2 가 곧 rightAlign 동작이다 — 별도 플래그 없이 fmt2(n, ch) 사용
function fmt2(n: number, ch: number): string {
    let s = String(n);
    while (s.length < ch) { s = ' ' + s; }
    return s;
}
const rightAlign = fmt2; // rightAlign 별명 — 줄 번호 정렬 계산의 이름 (BK9 칩)
// ── 토크나이저 — 데모 안 문자열 상수만 하이라이트한다(외부 fetch·CDN 하이라이터 금지)
// TOKEN_KIND 4종: 0 keyword · 1 string · 2 number · 3 comment. 정규식 순서가 곧 우선순위다 —
//   주석 안의 '문자열' 이 문자열 색으로 칠해지지 않으려면 comment 규칙이 먼저 범위를 잡아야 한다
const TOKEN_KIND = 4; // 토큰 종류 수(변형: 7 — 함수·속성·연산자까지 각각 색을 준다)
// spanMap — 토큰 범위(span)에 종류(k)를 대응시키는 맵. tokenize 결과의 각 Tok 이 곧 spanMap
//   의 한 항목이고 TOKEN_KIND 색이 이 대읩을 따라 칠해진다
interface Tok { s: number; e: number; k: number; }
function spanMap(tok: Tok): { span: [number, number]; kind: number; } {
    return { span: [tok.s, tok.e], kind: tok.k };
}
const RE_COMMENT = /(^|\s)\/\/[^\n]*/y;
const RE_STR = /'[^'\n]*'|"[^"\n]*"/y;
const RE_NUM = /\b\d+(\.\d+)?\b/y;
const RE_KW = /\b(const|let|function|return|if|else|for|while|import|from|export|var|new|class)\b/y;
// tokenize — 소스 한 줄을 토큰 범위(Tok[])로 쪼갠다. 문장 부호 하나가 어느 토큰에 속하는지
//   경계(boundary)를 정하는 이 계산이 하이라이트의 정확함을 결정한다
function tokenize(line: string): Tok[] {
    const out: Tok[] = [];
    const rules: Array<[RegExp, number]> = [[RE_COMMENT, 3], [RE_STR, 1], [RE_KW, 0], [RE_NUM, 2]];
    let i = 0;
    while (i < line.length) {
        let hit = false;
        for (const r of rules) {
            r[0].lastIndex = i;
            const m = r[0].exec(line);
            if (m && m.index === i && m[0].length > 0) {
                out.push({ s: i, e: i + m[0].length, k: r[1] });
                i += m[0].length;
                hit = true;
                break;
            }
        }
        if (!hit) { i += 1; }
    }
    return out;
}
// ── 코드 창 조립 — .win(.bar(.lights 3점 + .fname) + .code(.gutter + .lines))
interface Win { el: HTMLElement; bar: HTMLElement; fname: HTMLElement; lights: HTMLElement; code: HTMLElement; gutter: HTMLElement; lines: HTMLElement; }
function mkWin(): Win {
    const el = make('div', 'win', scWrap);
    const b = make('div', 'cb-bar', el);
    const lights = make('i', 'cb-lights', b);
    for (let k = 0; k < 3; k += 1) { make('i', 'cb-dot', lights); }
    const fname = make('b', 'cb-fname', b);
    fname.textContent = 'main.scss';
    const code = make('div', 'cb-code', el);
    const gutter = make('div', 'cb-gutter', code);
    const lines = make('div', 'cb-lines', code);
    return { el: el, bar: b, fname: fname, lights: lights, code: code, gutter: gutter, lines: lines };
}
// addLine — 줄 하나를 code(토큰 하이라이트 포함)와 gutter(번호)에 같이 넣는다.
//   gEl 을 돌려주는 이유는 07(행 호버)이 번호까지 같이 밝히기 때문(gutterSync)
function addLine(win: Win, no: number, ch: number, text: string): { line: HTMLElement; gEl: HTMLElement; } {
    const gEl = make('b', 'cb-no', win.gutter);
    gEl.textContent = rightAlign(no, ch);
    const line = make('div', 'cb-ln', win.lines);
    const toks = tokenize(text);
    let pos = 0;
    for (let i = 0; i < toks.length; i += 1) {
        const tk = spanMap(toks[i]);
        if (tk.span[0] > pos) { line.appendChild(document.createTextNode(text.slice(pos, tk.span[0]))); }
        const sp = make('span', 'tk tk' + tk.kind, line);
        sp.textContent = text.slice(tk.span[0], tk.span[1]);
        pos = tk.span[1];
    }
    if (pos < text.length) { line.appendChild(document.createTextNode(text.slice(pos))); }
    return { line: line, gEl: gEl };
}
// ── 실행 퀄: 프리셋 하나가 한 주기. 시계 애니메이션이 끝나면 다음 프리셋으로 다시 시작한다
let piNow = 0; // 현재 프리셋 번호 — frame 안에서도 읽는다(run 의 pi 를 노출)
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
        piNow = pi;
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
        // 움직임 줄이기 — 루프를 돌리지 않고 완료 상태 한 장(frame(1e9) 1회) + 문구(393 규칙)
        cfg.frame(1e9);
        statusP.textContent = readB.textContent;
        doneP.textContent = readB.textContent;
    } else {
        restart();
        raf = requestAnimationFrame(tick);
    }
    return function (): void {
        cancelAnimationFrame(raf);
        off.abort();
    };
}
    // 08 언어 탭 전환 — 탭을 바꾸면 이전 코드는 위로 빠져 나가고 새 코드가 아래에서 올라오는
    //    교차 운동(crossfade)이 서로 반대 방향으로 겹친다. 화면 높이는 두 코드의 scrollHeight
    //    중 큰 쪽(maxScrollHeight)으로 미리 맞춰 놓아 전환 중에 창이 뛰지 않는다(noJump)
    const X_MS = 460;     // 교차 운동 시간
    const LANGS = ['html', 'css', 'js'];
    const CODE08: string[][] = [
        ['<div class="win">', '  <pre><code>…</code></pre>', '</div>'],
        ['.win { border-radius: 12px; }', '.win pre { margin: 0; }', '.win code { font: 9px/1.3 mono; }'],
        ['const win = document.querySelector(".win");', 'win.addEventListener("click", copy);']
    ];
    let w08: Win | null = null;
    let tabs08: HTMLElement[] = [];
    let panels08: HTMLElement[] = [];
    let h08 = 0;
    function frame(t: number): string {
        if (!w08) { return ''; }
        const per = 620;   // 탭 하나 머무는 시간
        const ph = (t - 200) / per;
        const li = Math.floor(clamp(ph, 0, 2.999)) % 3;
        const k = clamp((ph - Math.floor(ph)) * per / X_MS, 0, 1);
        // 진행 중 패널 표시 — 이전 패널은 -k·h, 새 패널은 (1-k)·h
        for (let j = 0; j < 3; j += 1) {
            tabs08[j].setAttribute('aria-selected', j === li ? 'true' : 'false');
        }
        // crossfade — 위로 빠짐과 아래 올라옴의 겹침(부드러운 k)
        const e = 1 - Math.pow(1 - k, 3);
        for (let j = 0; j < 3; j += 1) {
            if (j === li) {
                panels08[j].style.opacity = '1';
                panels08[j].style.transform = 'translateY(' + f0((1 - e) * h08) + 'px)';
            } else {
                panels08[j].style.opacity = k < 0.5 ? f2(1 - e) : '0';
                panels08[j].style.transform = 'translateY(' + f0(-e * h08) + 'px)';
            }
        }
        return fill('탭 {a} · 교차 {b}% · 창 높이 {c}px 고정',
            LANGS[li], f0(e * 100), f0(h08));
    }
    function build(i: number): number {
        w08 = mkWin();
        // 창 높이 = maxScrollHeight — 세 코드의 scrollHeight 중 큰 쪽으로 미리 고정(noJump)
        const counts = CODE08.map(function (c) { return c.length; });
        const maxLines = Math.max(counts[0], counts[1], counts[2]);
        h08 = maxLines * 12;
        put(w08.el, 24, 14, 400, 18 + h08 + 8);
        w08.fname.textContent = 'tabs.' + LANGS[i];
        tabs08 = [];
        panels08 = [];
        for (let j = 0; j < 3; j += 1) {
            const tb = make('button', 'ltab', scWrap);
            tb.setAttribute('type', 'button');
            tb.setAttribute('role', 'tab');
            tb.setAttribute('aria-selected', j === i ? 'true' : 'false');
            put(tb, 24 + j * 58, 0, 50, 15);
            tb.textContent = LANGS[j];
            tabs08.push(tb);
            const pn = make('div', 'xslide', w08.lines);
            const ch = digitCount(CODE08[j].length);
            for (let k = 0; k < CODE08[j].length; k += 1) {
                const r = addLine({ el: w08.el, bar: w08.bar, fname: w08.fname, lights: w08.lights, code: w08.code, gutter: w08.gutter, lines: pn } as Win, k + 1, ch, CODE08[j][k]);
                void r;
            }
            if (j !== i) { pn.style.opacity = '0'; }
            panels08.push(pn);
        }
        drawRows([{ s: 200 + 620, e: 200 + 620 + X_MS, k: 1 }, { s: 200 + 1240, e: 200 + 1240 + X_MS, k: 1 }], 2000);
        axis(2000);
        setReads(
            fill('crossfade {a}ms · 창 높이 = maxScrollHeight({b}·{c}·{d} 줄의 최대) — 전환 중 창이 뛰지 않는다(noJump)', f0(X_MS), f0(counts[0]), f0(counts[1]), f0(counts[2])),
            '위로 빠지는 판과 아래 오르는 판 — 두 방향이 한 창 안에서 교차한다'
        );
        doneP.textContent = '';
        return 2000;
    }
    // 실제 탭 경로 — 사람이 탭을 눌러도 같은 교차 운동을 탄다
    scWrap.addEventListener('click', function (ev: Event) {
        const t = ev.target as HTMLElement;
        if (!t.closest || !t.closest('.ltab')) { return; }
        for (let j = 0; j < 3; j += 1) {
            if (t === tabs08[j]) { tabs08[j].setAttribute('aria-selected', 'true'); panels08[j].style.opacity = '1'; panels08[j].style.transform = 'translateY(0)'; }
            else { tabs08[j].setAttribute('aria-selected', 'false'); panels08[j].style.opacity = '0'; panels08[j].style.transform = 'translateY(-' + f0(h08) + 'px)'; }
        }
    });
    return run({ count: 3, build: build, frame: frame });

}

export default function CbLanguageTabCrossfade() {
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
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={'언어 탭이 바뀌면 이전 코드는 위로 빠지고 새 코드가 아래에서 올라와 교차하고 창 높이는 미리 큰 쪽에 맞아 뛰지 않는 장면'}></div>
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
