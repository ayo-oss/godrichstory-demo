// CbWindowFrameFilename - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./CbWindowFrameFilename.module.scss";

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
    // 01 기본 창틀 — 파일명 표시줄(filenameBar)과 트래픽 라이트(trafficLights)가 있는
    //    두 겹(twoLayers) 창. 바깥 테두리(1겹)와 표시줄(2겹)로 감싸고, 접힘 그림자가 깊어질수록
    //    창 전체가 위로 뜬다 — 깊이와 부상이 짝을 이루는 계산. 라이트 3점의 반지름은 불변
    const DEPTH_MS = 2000;        // 한 주기 전체에 걸친 부상·그림자 호흡
    const FNAMES = ['main.scss', 'tokens/_map.scss', 'build-20261117.js'];
    let w01: Win | null = null;
    let seg01: HTMLElement | null = null;
    let depth01 = 0;
    let lift01 = 0;
    function frame(t: number): string {
        if (!w01) { return ''; }
        // 창이 떠 오르는 부상(lift)과 그림자 깊이(depth) — 같은 사인파를 공유하는 짝
        const s = Math.sin(Math.PI * 2 * clamp(t / DEPTH_MS, 0, 1));
        lift01 = t < 200 ? 0 : (1 - Math.cos(Math.PI * 2 * clamp((t - 200) / (DEPTH_MS - 200), 0, 1))) * 2;
        depth01 = t < 200 ? 0 : 4 * (0.5 + 0.5 * s);
        w01.el.style.transform = 'translateY(-' + f1(lift01) + 'px)';
        w01.el.style.boxShadow = '0 ' + f1(4 + depth01) + 'px 0 rgba(23,20,26,0.22)';
        return fill('창틀 두 겹 · 부상 {a}px · 그림자 깊이 {b}px · 파일명 left {c}px',
            f1(lift01), f1(depth01), f0(w01.fname.offsetLeft));
    }
    function build(i: number): number {
        w01 = mkWin();
        put(w01.el, 24, 26, 400, 116);
        w01.fname.textContent = FNAMES[i % FNAMES.length];
        const src = [
            'const depth = 4; // crease shadow',
            "let fname = '" + FNAMES[i % FNAMES.length] + "';",
            'const bar = 18; // filename bar h',
            'const radius = 3;',
            'if (depth > 0) { draw(bar + depth); }',
            "return 'frame ok';"
        ];
        const ch = digitCount(src.length);
        for (let k = 0; k < src.length; k += 1) { addLine(w01, k + 1, ch, src[k]); }
        seg01 = make('b', 'ov ovs', sceneEl);
        put(seg01, 12, 128, 260, 12);
        seg01.textContent = i % 3 === 0 ? 'two layers: border + bar' : (i % 3 === 1 ? '3 lights, one radius 3px' : 'crease shadow: depth 4px');
        drawRows([spanOf(200, DEPTH_MS - 200)], 2000);
        axis(2000);
        setReads(
            fill('두 겹(twoLayers) — 바깥 테두리 + 표시줄 · 표시줄(filenameBar) 높이 18px · 라이트(trafficLights) 3점 반지름 3px · 파일명 left 44px'),
            i % 3 === 0 ? 'two layers: border + bar' : (i % 3 === 1 ? '3 lights, one radius 3px' : 'crease shadow: depth 4px')
        );
        doneP.textContent = '';
        return 2000;
    }
    return run({ count: 3, build: build, frame: frame });

}

export default function CbWindowFrameFilename() {
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
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={'테두리와 표시줄의 두 겹 창틀에서 라이트 세 점이 같은 반지름으로 놓이고 접힘 그림자가 창의 깊이를 계산하는 장면'}></div>
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
