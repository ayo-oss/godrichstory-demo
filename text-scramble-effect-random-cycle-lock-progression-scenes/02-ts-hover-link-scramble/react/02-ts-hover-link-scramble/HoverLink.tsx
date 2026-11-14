// HoverLink - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./HoverLink.module.scss";

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
    // ── 02 링크에 마우스를 올리면 섞였다 잠기는 hover
    // pointerenter 마다 재시작 카운터와 시드를 초기화해 짧은 잠금 간격으로 전체 칸을 한 번에 섞는다.
    // pointerleave 에서는 즉시 원문으로 복귀한다. 실패판은 leave 처리가 없어 놓아도 계속 섞인다.
    const HOVER_LOCK_MS = [35, 70, 35];
    const HOVER_CYCLE_MS = 40;
    const NAV = ['WORK', 'ABOUT', 'LOG', 'HOME'];
    const HOVER_MS = 420;    // 한 링크 위에 머무는 시연 길이 — 2초에 3~4 링크를 짚는다
    const EDGE_MS = 110;     // 링크 사이를 건너가는 길이
    let links: Txt[] = [];
    let linkF: Txt | null = null;
    let boxes: number[][] = [];   // 각 링크 [x, y, w, h] — 시연 커서의 히트 판정에 쓴다
    let cur: Cursor | null = null;
    let lab: HTMLElement | null = null;
    let labMix: HTMLElement | null = null;   // 지금 몇 칸이 섞여 있는지 — 큰 라벨 (면적 전파)
    let map2: CellMap | null = null;         // 4 링크 칸 지도 — 어떤 링크가 섞여 있는지 사각 줄로
    let resetN = 0;
    let pi519 = 0;
    const FX = 120; const FY = 150;   // 실패판 위치
    function boxOf(x: number, y: number, w: number): number[] { return [x, y, w, 26]; }
    // 한 링크를 그린다 — t1: 진입 후 ms, seed: 재시작 카운터, 실패판이면 leave 무시. 섞인 칸 수를 돌려준다
    function drawLink(t1: number, seed: number, fail: boolean): number {
        const tgt = fail ? [linkF as Txt] : links;
        const L = HOVER_LOCK_MS[pi519];
        const k = t1 < 0 ? -1 : Math.floor(t1 / HOVER_CYCLE_MS);
        const n = tgt[0].n;
        const lockedN = clamp(Math.floor(t1 / L), 0, n);
        let mixN = 0;
        for (let b = 0; b < tgt.length; b += 1) {
            const tx = tgt[b];
            for (let i = 0; i < tx.n; i += 1) {
                const ch = tx.chars[i];
                if (i < lockedN || k < 0) { setCell(tx, i, ch, true); }
                else if (ch === ' ') { setCell(tx, i, ch, false); }
                else { setCell(tx, i, pick(SET62, i, k + i + seed * 131 + b * 7), false); mixN += 1; }
            }
        }
        return mixN;
    }
    const cfg: Cfg = {
        count: 3,
        build(i: number): number {
            pi519 = i;
            links = []; boxes = [];
            let x = 28;
            for (let j = 0; j < NAV.length; j += 1) {
                const tx = mkTxt(scEl, 's2__nav', NAV[j]);
                tx.box.style.left = x + 'px';
                tx.box.style.top = '38px';
                links.push(tx);
                boxes.push(boxOf(x, 38, NAV[j].length * 31 + 16));
                x += NAV[j].length * 31 + 44;
            }
            linkF = mkTxt(scEl, 's2__nav s2__navf', 'CONTACT');
            linkF.box.style.left = FX + 'px';
            linkF.box.style.top = FY + 'px';
            label(scEl, 'tag', 336, 112, '').textContent = '실패판 — leave 처리 없음';
            cur = newCursor();
            lab = label(scEl, 'tag', 16, 156, '');
            labMix = label(scEl, 'tag tag--big', 300, 150, '');
            map2 = mkMap(scEl, 's2__map', 4, 84, 98, 38);
            resetN = 0;
            return 2000;
        },
        frame(t: number, overlay: boolean): string {
            if (!cur || !lab || !linkF || !labMix) { return ''; }
            if (t < 0) {   // 줄이기 모드 — 곧은 원문 한 장
                drawLink(-1, 0, false); drawLink(-1, 0, true);
                cur.show(false);
                labMix.textContent = fill('섞인 {a}칸', '0');
                return fill('지금 원문 · RESET {a}회', f0(resetN));
            }
            // 시연 커서 — 링크를 차례로 짚고 4개를 지나면 실패판도 짚는다. 2초에 앞 4링크 + 실패판 1회
            const per = HOVER_MS + EDGE_MS;
            const seg = Math.max(0, t - 200) / per;
            const slot = Math.floor(seg);
            const tin = (seg - slot) * per;
            let cx = 0; let cy = 0; let hit = -1;
            if (slot < 4) {
                const b = boxes[slot];
                // 링크 위에서 좌우로 흔들며 짚는다 — 진입·재진입이 반복되어 잠금이 자주 리셋된다
                cx = b[0] + b[2] * (0.5 + 0.42 * Math.sin(tin / 70));
                cy = b[1] + b[3] / 2 + Math.sin(tin / 90) * 3;
                hit = slot;
            } else {
                cx = 120 + 62 * clamp(tin / 160, 0, 1);
                cy = FY + 13 + Math.sin(tin / 90) * 2;
            }
            cur.show(true); cur.set(cx, cy);
            // 실제 포인터가 있으면 그 히트를 우선한다 (overlay)
            const hovIdx = hit;
            let mixN = 0;
            for (let j = 0; j < links.length; j += 1) {
                if (j === hovIdx) { mixN += drawLink(tin, slot + 1, false); }
                else { drawLink(-1, 0, false); }
            }
            // 실패판 — 짚힌 동안만 섞고 놓아도 진행도가 계속 오른다 (leave 없음)
            const fHit = hovIdx < 0 && slot === 4;
            mixN += drawLink(fHit ? tin : 400, slot + 5, true);
            if (fHit) { resetN = 0; }
            labMix.textContent = fill('섞인 {a}칸', f0(mixN));   // 섞임 칸 수 — 같은 계산의 큰 표현
            const states: boolean[] = [];
            for (let j = 0; j < links.length; j += 1) { states.push(j === hovIdx); }
            states.push(fHit);
            if (map2) { map2.set(states); }   // 칸 지도 — 지금 어느 링크가 섞여 있는지
            return fill('지금 {a}ms · HOVER_LOCK_MS {b} · RESET {c}회 · 대상 {d}',
                f0(t), f0(HOVER_LOCK_MS[pi519]), f0(hovIdx >= 0 ? slot + 1 : 0),
                hovIdx >= 0 ? NAV[hovIdx] : (slot === 4 ? 'CONTACT' : '없음'));
        },
        pointer(x: number, y: number, type: string, down: boolean): void {
            // 진짜 hover — 시연 커서를 끄고 히트 판정으로 같은 경로를 그린다
            if (cur) { cur.show(false); }
            for (let j = 0; j < links.length; j += 1) {
                const b = boxes[j];
                const on = x >= b[0] && x <= b[0] + b[2] && y >= b[1] && y <= b[1] + b[3];
                if (on) {
                    resetN += 1;
                    drawLink(0, resetN, false);
                } else {
                    drawLink(-1, 0, false);   // pointerleave — 즉시 원문
                }
            }
            const onF = linkF && x >= FX && x <= FX + 118 && y >= FY && y <= FY + 26;
            if (onF) { resetN += 1; drawLink(0, resetN, true); }
            else if (linkF) {
                // 실패판은 leave 가 없다 — 놓아도 마지막 진행도에서 계속 섞인다
                drawLink(4000, 99, true);
            }
        },
    };
    run(cfg);
    setReads(fill('HOVER_LOCK_MS {a} · SEED 방문마다 교체', f0(HOVER_LOCK_MS[0])),
        'pointerenter → RESET 0 · pointerleave → 즉시 원문 스냅');

    return undefined;
}

export default function HoverLink() {
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
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={'내비 링크 위에 커서가 오면 글자가 섞였다 잠기고, 아래 실패판은 놓아도 계속 섞이는 장면'}></div>
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
