// ClockTick - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./ClockTick.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

function main(root: HTMLElement): (() => void) | undefined {
    // 무대 좌표 — 안쪽 상자는 늘 480x300 이고 화면 크기에 맞춰 통째로 줄인다 (왼쪽 위 모서리 기준)
    const W = 480;
    const SW = 464;   // 장면 폭 (480 - 좌우 8px)
    const SH = 190;   // 장면 높이
    function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
    function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
    // 고정 해시 — Math.random 대신 시드로 같은 값을 되돌려 받는다
    function hash(i: number, s: number): number {
        const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
        return x - Math.floor(x);
    }
    // 문구 틀의 {a} 자리에 값을 끼운다 — 화면 문구는 늘 틀 한 줄이고 로케일 사전이 통째로 바꾼다
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
    // ── 무대 요소
    const rootEl = root;
    const innerQ = rootEl.querySelector('[data-role="inner"]') as HTMLElement | null;
    const sceneQ = rootEl.querySelector('[data-role="scene"]') as HTMLElement | null;
    const padQ = rootEl.querySelector('[data-role="pad"]') as HTMLElement | null;
    const pauseQ = rootEl.querySelector('[data-role="pause"]') as HTMLButtonElement | null;
    const statusQ = rootEl.querySelector('[data-role="status"]') as HTMLElement | null;
    const readAQ = rootEl.querySelector('[data-role="reada"]') as HTMLElement | null;
    const readBQ = rootEl.querySelector('[data-role="readb"]') as HTMLElement | null;
    const doneQ = rootEl.querySelector('[data-role="done"]') as HTMLElement | null;
    if (!innerQ || !sceneQ || !padQ || !pauseQ || !statusQ || !readAQ || !readBQ || !doneQ) {
        return function (): void { /* 무대가 없으면 할 일이 없다 */ };
    }
    const innerEl: HTMLElement = innerQ;
    const sceneEl: HTMLElement = sceneQ;
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
    // 지시 텍스트 (레이블·칩 글자) — 화면 문구는 전부 문구 사전을 거친다
    function label(parent: HTMLElement, cls: string, x: number, y: number, text: string): HTMLElement {
        const e = make('b', cls, parent);
        e.textContent = text;
        put(e, x, y, 0, 0);
        return e;
    }
    const scEl = make('div', 'sc', sceneEl);
    const clkEl = make('i', 'clk', sceneEl);
    function clearAll(): void {
        scEl.textContent = '';
    }
    function animsIn(host: HTMLElement): Animation[] {
        return host.getAnimations({ subtree: true });
    }
    function setReads(a: string, b: string): void {
        readA.textContent = a;
        readB.textContent = b;
    }
    // ── 스크램블 공통 — 칸은 span 노드로 고정하고 textContent 만 갈아 끼운다 (리플로우 절감)
    // 원문은 화면 밖 스팬(srorg)에 그대로 두고 칸 상자는 aria-hidden — 스크린리더는 섞인 글자를 읽지 않는다
    interface Txt { box: HTMLElement; cells: HTMLElement[]; chars: string[]; n: number; }
    function mkTxt(parent: HTMLElement, cls: string, text: string): Txt {
        const box = make('div', 'txt ' + cls, parent);
        box.setAttribute('aria-hidden', 'true');
        const cells: HTMLElement[] = [];
        for (let i = 0; i < text.length; i += 1) {
            const c = make('span', 'cell', box);
            if (text.charAt(i) === ' ') { c.className = cx('cell cell--sp'); }
            c.textContent = text.charAt(i);
            cells.push(c);
        }
        const sr = make('span', 'srorg', parent);
        sr.textContent = text;
        return { box: box, cells: cells, chars: text.split(''), n: text.length };
    }
    // 칸 하나를 그린다 — on 이면 원문 글자로 잠긴 색, 아니면 문자셋에서 뽑은 글자
    function setCell(t: Txt, i: number, ch: string, on: boolean): void {
        const c = t.cells[i];
        if (c.textContent !== ch) { c.textContent = ch; }
        const want = on ? '1' : '0';
        if (c.getAttribute('data-on') !== want) { c.setAttribute('data-on', want); }
    }
    // 문자셋에서 칸 i 번째 한 글자 뽑기 — k 가 바뀔 때마다 다른 글자가 나온다 (인덱스 순환)
    function pick(set: string, i: number, k: number): string {
        return set.charAt(Math.floor(hash(i + 1, k * 0.1731 + 3.7) * set.length));
    }
    // 라틴 기본 셋 — 대소문자+숫자 62자 (01·02·06·07·09 공용)
    const SET62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    // 문장에 한글이 있으면 음절 셋, 아니면 라틴 셋 — 자모 분해 없이 문장의 문자 체계를 따간다
    function setFor(text: string, syl: string, lat: string): string {
        for (let i = 0; i < text.length; i += 1) {
            const c = text.charCodeAt(i);
            if (c >= 0xac00 && c <= 0xd7a3) { return syl; }
        }
        return lat;
    }
    // ── 커서 점 (hover 항목 시연용 가짜 커서 — 실제 포인터가 오면 숨는다)
    interface Cursor { set(x: number, y: number): void; show(b: boolean): void; el: HTMLElement; }
    function newCursor(): Cursor {
        const c = make('i', 'cur', scEl);
        return {
            el: c,
            set(x: number, y: number): void { c.style.transform = 'translate(' + (x - 4) + 'px,' + (y - 4) + 'px)'; },
            show(b: boolean): void { c.style.opacity = b ? '1' : '0'; },
        };
    }
    // 칸 지도 — 문장 칸 하나하나의 잠김·섞임 상태를 작은 사각 줄로 그린다.
    // 칸 상태라는 같은 계산의 다른 표현(518 의 필드 링·그림자와 같은 전파 레이어)
    interface CellMap { set(states: boolean[]): void; el: HTMLElement; }
    function mkMap(parent: HTMLElement, cls: string, n: number, x: number, y: number, size: number): CellMap {
        const el = make('div', 'cmap ' + cls, parent);
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        const cells: HTMLElement[] = [];
        for (let i = 0; i < n; i += 1) {
            const c = make('i', 'cmap__c', el);
            c.style.width = size + 'px';
            c.style.height = size + 'px';
            cells.push(c);
        }
        return {
            el: el,
            set(states: boolean[]): void {
                for (let i = 0; i < cells.length; i += 1) {
                    const want = states.length > i && states[i] ? '1' : '0';
                    if (cells[i].getAttribute('data-on') !== want) { cells[i].setAttribute('data-on', want); }
                }
            },
        };
    }
    // ── 실행 틀: 프리셋 하나가 한 주기. 시계 애니메이션(.clk)의 currentTime 이 시연 시각 t 다
    // 줄이기 모드에서는 frame(-1) — 모든 칸이 원문으로 잠긴 한 장을 그린다 (섞음 없음)
    interface Cfg {
        count: number;
        build(i: number): number;                       // 장면을 짓고 한 주기 ms 를 돌려준다
        frame(t: number, overlay: boolean): string;     // 매 프레임 장면을 그리고 상태 문장을 돌려준다 (t<0 이면 원문 한 장)
        pointer(x: number, y: number, type: string, down: boolean): void;  // 실제 포인터 입력
    }
    function run(cfg: Cfg): () => void {
        const off = new AbortController();
        let pi = 0;
        let cycle = 2000;
        let paused = false;
        let raf = 0;
        let clock: Animation | null = null;
        let lastStatus = '';
        let lastPtrT = -9999;   // 마지막 실제 포인터 입력 시각 (시연 시각 t 기준)
        function fit(): void {
            const k = rootEl.clientWidth / W;
            innerEl.style.transform = 'scale(' + k + ')';
        }
        function rebuild(): void {
            clearAll();
            cycle = Math.max(2000, cfg.build(pi));
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
        function nowT(): number {
            const ct = clock ? Number(clock.currentTime) : 0;
            return isFinite(ct) ? ct : 0;
        }
        function tick(): void {
            const t = nowT();
            const overlay = lastPtrT >= 0 && t - lastPtrT < 1500 && t >= lastPtrT;
            const s = cfg.frame(paused ? nowT() : t, overlay);
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
            if (reduced) {
                // 줄이기 모드에서도 프리셋 전환은 즉시 한 장 다시 그린다 (입력이 화면에 반영된다)
                statusP.textContent = cfg.frame(-1, false);
            }
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
        // 실제 포인터 — 장면 좌표로 바꿔 항목에 넘긴다. 터치는 pointerType 으로 갈린다
        function toScene(ev: PointerEvent): number[] {
            const r = sceneEl.getBoundingClientRect();
            const k = r.width / SW;
            return [(ev.clientX - r.left) / k, (ev.clientY - r.top) / k];
        }
        padEl.addEventListener('pointermove', function (ev: PointerEvent) {
            const p = toScene(ev);
            lastPtrT = nowT();
            cfg.pointer(p[0], p[1], ev.pointerType || 'mouse', (ev.buttons & 1) === 1);
            // 줄이기 모드에서도 입력이 화면에 반영된다 — 목표 갱신 뒤 한 장 다시 그린다
            if (reduced) { statusP.textContent = cfg.frame(-1, true); }
        }, { signal: off.signal });
        padEl.addEventListener('pointerdown', function (ev: PointerEvent) {
            const p = toScene(ev);
            lastPtrT = nowT();
            cfg.pointer(p[0], p[1], ev.pointerType || 'mouse', true);
            if (reduced) { statusP.textContent = cfg.frame(-1, true); }
        }, { signal: off.signal });
        document.addEventListener('visibilitychange', function () {
            // 탭이 숨으면 멈추고 돌아오면 이어 간다 — 시계 애니메이션이 상태를 기억한다
            if (document.hidden) { setPaused(true); } else if (!reduced) { setPaused(false); }
        }, { signal: off.signal });
        window.addEventListener('resize', fit, { signal: off.signal });
        fit();
        rebuild();
        if (reduced) {
            // 움직임 줄이기 — 섞음 없이 곧은 원문 한 장만 그린다. 입력·프리셋 전환은 frame 1회 재호출로 반영된다
            statusP.textContent = cfg.frame(-1, false);
        } else {
            restart();
            raf = requestAnimationFrame(tick);
        }
        return function (): void {
            cancelAnimationFrame(raf);
            off.abort();
        };
    }
    // ── 08 초 숫자만 매 초 굴러가는 시계 틱
    // 바뀌는 자리(초)만 숫자셋에서 몇 틱 굴렸다가 새 값으로 잠그고 안 바뀌는 자리(시·분)는 그대로 둔다.
    // 값이 바뀌는 순간만 움직이는 절제된 틱 — 틱 사이 정지는 의도다.
    const TICK_ROLL_N = [3, 6, 3];
    const ROLL_MS = 130;    // 한 자리 굴림 길이
    const T0 = (10 * 3600 + 28 * 60 + 41) * 1000;   // 기준 시각 10:28:41 — ms 단위로 잰다
    const WORDS8 = ['WORK', 'PORTFOLIO', 'LAB', 'ARCHIVE'];
    const HOLD8 = 520;      // 한 단어 머무름
    const TIME_SCALE = 8;   // 시연 배속 — 2초 창에 8초치 초 틱 (절제된 틱 8회 · 굴림 구간 절반)
    const SEC_SPLIT = 0.5;  // 초 자리 색 갈이 기준 — 십의 자리와 일의 자리를 다른 톤으로 (면적 전파)
    let face: Txt | null = null;
    let lab: HTMLElement | null = null;
    let labT: HTMLElement | null = null;
    let map8: CellMap | null = null;   // 8칸 지도 — HH:MM:SS 자릿수, 굴림 중인 초 자리가 깜박인다
    let pi519 = 0;
    function hms(ms: number): string {
        const s = Math.floor(ms / 1000);
        const h = Math.floor(s / 3600) % 24;
        const m = Math.floor(s / 60) % 60;
        const ss = s % 60;
        return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
    }
    function drawClock(t1: number): boolean[] {
        const states: boolean[] = [];
        if (!face) { return states; }
        const roll = TICK_ROLL_N[pi519];
        const k = Math.floor(t1 / (ROLL_MS / roll));   // 굴림 틱 카운터 — N틱 안에서 숫자가 N번 바뀐다
        const base = hms(T0 + Math.floor(t1 * TIME_SCALE / 1000) * 1000);
        const prev = hms(T0 + (Math.floor(t1 * TIME_SCALE / 1000) - 1) * 1000);
        for (let i = 0; i < face.n; i += 1) {
            const ch = base.charAt(i);
            const isDigit = ch >= '0' && ch <= '9';
            const secSlot = i >= 6 && isDigit;   // 초 자리 두 칸 (HH:MM:SS)
            const changed = secSlot && prev.charAt(i) !== ch;
            const tickT = t1 * TIME_SCALE % 1000;
            let rolling = false;
            if (!secSlot || t1 < 0) {
                setCell(face, i, ch, true);   // 시·분은 잠긴 채 그대로 (CHANGE_ONLY)
            } else if (tickT >= ROLL_MS || !changed) {
                setCell(face, i, ch, true);   // 굴림 끝 — 새 값으로 잠김
            } else {
                const spin = pick('0123456789', i, k + i * 5);
                setCell(face, i, spin, false);   // 굴림 중 — 숫자셋에서 몇 틱
                rolling = true;
            }
            states.push(!rolling);
        }
        return states;
    }
    const cfg: Cfg = {
        count: 3,
        build(i: number): number {
            pi519 = i;
            face = mkTxt(scEl, 's8__face', hms(T0));
            lab = label(scEl, 'tag tag--big', 16, 152, '');
            labT = label(scEl, 'tag', 16, 12, '');
            map8 = mkMap(scEl, 's8__map', 8, 60, 108, 46);
            return 2000;
        },
        frame(t: number, overlay: boolean): string {
            if (!face || !lab || !labT || !map8) { return ''; }
            labT.textContent = fill('TICK_ROLL_N {a} · ROLL_MS {b} · CHANGE_ONLY · tabular-nums',
                f0(TICK_ROLL_N[pi519]), f0(ROLL_MS));
            if (t < 0) {
                drawClock(-1);
                const st: boolean[] = [];
                for (let i = 0; i < 8; i += 1) { st.push(true); }
                map8.set(st);
                return fill('지금 원문 · {a}', hms(T0));
            }
            const t1 = Math.max(0, t - 200);
            const st = drawClock(t1);
            map8.set(st);   // 자릿수 지도 — 굴림 중인 초 자리가 깜박인다
            const secNow = Math.floor(t1 * TIME_SCALE / 1000);
            const inRoll = st.some(function (s) { return !s; });
            lab.textContent = inRoll ? '초 굴림' : '정지 틱';
            // 초 자릿수 지도의 켜짐 색도 초 값에서 — 지도가 시계와 같은 상태의 다른 표현
            map8.el.style.setProperty('--cmap-on', secNow % 2 === 0 ? '#badddd' : '#d5daea');
            return fill('지금 {a}ms · {b} · 초 {c} · {d}',
                f0(t), hms(T0 + secNow * 1000), f0(secNow % 60), inRoll ? '초 굴림' : '정지 틱');
        },
        pointer(x: number, y: number, type: string, down: boolean): void {
            // 이 장면은 포인터로 바꾸는 값이 없다 — 초 틱이 굴림을 정한다
        },
    };
    run(cfg);
    setReads('TICK_ROLL_N ' + f0(TICK_ROLL_N[0]) + ' · ROLL_MS ' + f0(ROLL_MS),
        '바뀌는 자리(초)만 굴림 — 시·분은 건드리지 않는다');

    return undefined;
}

export default function ClockTick() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return undefined;
    return main(rootEl);
  }, []);

  return (
    <div className={cx("ez") + " is-demo"} ref={rootRef}>
      <div className={cx("ez__in")} data-role="inner">
        <div className={cx("ez__pad")} data-role="pad" tabIndex={0} role="application" aria-label={'시연 무대 — Space 또는 Enter 로 일시정지, R 로 처음부터, 왼쪽·오른쪽 방향키로 다른 값으로'}>
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={'시계의 초 자리만 매 초 숫자셋에서 몇 틱 굴렀다 새 값으로 잠기는 절제된 틱 장면'}></div>
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
