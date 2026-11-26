// SlackTrigger03DirectMessageTrigger - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
// (원본 제목: 다이렉트 메시지 트리거 — 멘션과 봇 대화 — demo)
import { useEffect, useRef } from "react";
import styles from "./SlackTrigger03DirectMessageTrigger.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

function main(root: HTMLElement): () => void {

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
    function spanOf(d: number, dur: number, k?: number): { s: number; e: number; k: number } { return { s: d, e: d + dur, k: k === undefined ? 0 : k }; }
    function bar(cls: string, x: number, y: number, w: number, h: number): HTMLElement {
        const e = make('i', cls, chartEl);
        put(e, x, y, w, h);
        return e;
    }
    function drawRows(segs: { s: number; e: number; k: number }[], max: number): void {
        const n = segs.length;
        const h = clamp(Math.floor((34 - (n - 1)) / n), 2, 7);
        for (let i = 0; i < segs.length; i += 1) {
            const sg = segs[i];
            const x = CX0 + clamp(sg.s, 0, max) / max * CW;
            const w = Math.max(2, (clamp(sg.e, 0, max) - clamp(sg.s, 0, max)) / max * CW);
            bar(sg.k === 2 ? 'bar k2' : (sg.k === 1 ? 'bar k1' : 'bar'), x, 4 + i * (h + 1), w, h);
        }
    }
    function axis(max: number): void {
        const a = make('b', 'ax', chartEl);
        put(a, CX0, 40, 0, 0);
        a.textContent = '0ms';
        const b = make('b', 'ax ax--r', chartEl);
        put(b, CX0, 40, CW, 0);
        b.textContent = f0(max) + 'ms';
    }
    function setReads(a: string, b: string): void {
        readA.textContent = a;
        readB.textContent = b;
    }
    function run(cfg: { count: number; build: (i: number) => number; frame: (t: number) => string; head?: boolean; bind?: (off: AbortController) => void }): () => void {
        const off = new AbortController();
        if (cfg.bind) { cfg.bind(off); }
        let pi = 0;
        let cycle = 2000;
        let paused = false;
        let raf = 0;
        let clock: Animation | null = null;
        let lastStatus = '';
        let headEl: HTMLElement | null = null;
        function fit(): void {
            const k = rootEl.clientWidth / W;
            innerEl.style.transform = 'scale(' + k + ')';
        }
        function rebuild(): void {
            clearAll();
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
        padEl.addEventListener('keydown', function (ev: KeyboardEvent) {
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


    // ── 537-03 다이렉트 메시지 트리거 — 들어온 메시지가 채널 멘션인지 다이렉트 메시지인지로
    //    갈라지고, 다이렉트만 통과시키는 값 dmOnly 를 켜면 채널 쪽이 전부 걸려 발동 비율이 떨어진다.
    //    계산 두 줄이 핵심이다.
    //      발동 비율 passRatio = 통과 / 전체
    //      감소량 dropRatio = (dmOnly 전 passRatio - dmOnly 후 passRatio) / dmOnly 전 passRatio
    //    갈래 흐름의 굵기·비율 막대·상태 글은 모두 이 값에서 나온다 — 속성 트윈이 아니라 계산 한 겹.
    //    dmOnly 는 n8n Slack Trigger 노드의 옵션 이름이 아니다. 노드 문서의 이벤트 목록은
    //    Bot / App Mention(채널 멘션) 과 New Message Posted to Channel 로 나뉘고 "DM 만" 이라는
    //    토글은 없다 — 이 데모는 그 값이 있다면 비율이 어떻게 되는지를 보여주는 설계용 시야다.
    const DM_ONLY = 0;         // 변형 s03: 0 → 1 (1 이면 다이렉트 메시지만 통과)
    const MSG_N = 12;          // 들어온 메시지 건수
    const MENTION_SHARE = 0.5; // 시드가 멘션으로 정해질 비율
    const SEED = 11.3;
    const CYCLE = 2000;
    const FIRST_MS = 200;      // 첫 시각 변화는 150ms 뒤
    const IN_X = 8;            // 입구 x
    const NODE_X = 150;        // 분기점 x
    const OUT_X = 432;         // 갈래 길·흐름의 끝 x (카드는 그 위 슬롯에 앉는다)
    const Y_TOP = 44;          // 채널 멘션 갈래 y
    const Y_BOT = 88;          // 다이렉트 메시지 갈래 y
    const Y_IN = 66;           // 입구 y — 두 갈래(Y_TOP 44 · Y_BOT 88) 의 정가운데
    const CARD_STEP = 24;      // 갈래 위 카드 슬롯 간격 (px) — 태그(14px)가 다 보이게 포개져 쌓인다
    // 자동 시연 스케줄 — 카드가 모두 자리 잡은 뒤(1,320ms) 스위치가 켜지고, 바퀴가 돌아 다시 기본값으로
    const DEMO_ON_MS = 1320;
    const DEMO_OFF_MS = 1900;
    type Msg = { isDm: boolean; el: HTMLElement; kindEl: HTMLElement };
    let dmOnly = DM_ONLY !== 0;   // 지금 화면에 적용된 값
    let manual = false;           // 사람이 스위치를 직접 건드렸나 — true 면 자동 시연을 멈춘다
    let msgs: Msg[] = [];
    let flowTop: HTMLElement | null = null;
    let flowBot: HTMLElement | null = null;
    let swEl: HTMLButtonElement | null = null;
    let barFillTop: HTMLElement | null = null;
    let barFillBot: HTMLElement | null = null;
    let ratioEl: HTMLElement | null = null;
    let dropEl: HTMLElement | null = null;
    let ttlEl: HTMLElement | null = null;
    let lastT = 0;
    // 통과 건수 — dmOnly 면 멘션은 전부 걸린다
    function counts(list: Msg[], only: boolean): { pass: number; total: number; blocked: number } {
        let pass = 0;
        for (let i = 0; i < list.length; i += 1) {
            if (list[i].isDm || !only) { pass += 1; }
        }
        return { pass: pass, total: list.length, blocked: list.length - pass };
    }
    // 발동 비율 = 통과 / 전체
    function passRatio(list: Msg[], only: boolean): number {
        const c = counts(list, only);
        return c.total ? c.pass / c.total : 0;
    }
    // 한 갈래가 통과시키는 비율 = 그 갈래의 통과 / 그 갈래의 전체. 흐름 굵기에 쓴다
    function laneRatio(list: Msg[], laneDm: boolean, only: boolean): number {
        let total = 0;
        let pass = 0;
        for (let i = 0; i < list.length; i += 1) {
            if (list[i].isDm !== laneDm) { continue; }
            total += 1;
            if (list[i].isDm || !only) { pass += 1; }
        }
        return total ? pass / total : 0;
    }
    function render(ms: number): string {
        // build() 가 요소를 전부 만든 뒤에만 그린다 — build 전 호출은 건너뛴다 (null 안전)
        if (!flowTop || !flowBot || !barFillTop || !barFillBot || !ratioEl || !dropEl || !swEl) {
            return '';
        }
        // 자동 시연 — manual 이 아니면 시간으로 스위치를 돌린다. DM_ONLY(변형 s03) 가 꺼진 기본값이다
        if (!manual) {
            const auto = ms >= DEMO_ON_MS && ms < DEMO_OFF_MS ? true : (DM_ONLY !== 0);
            if (auto !== dmOnly) {
                dmOnly = auto;
                if (swEl) {
                    swEl.setAttribute('aria-checked', auto ? 'true' : 'false');
                }
            }
        }
        const c = counts(msgs, dmOnly);
        const before = passRatio(msgs, false);
        const after = passRatio(msgs, dmOnly);
        const drop = before > 0 ? (before - after) / before : 0;
        // 갈래별 통과 비율 — 위(채널 멘션)·아래(다이렉트). 흐름의 굵기와 막대가 이 값에서 나온다
        const topRatio = laneRatio(msgs, false, dmOnly);
        const botRatio = laneRatio(msgs, true, dmOnly);
        const k = clamp((ms - FIRST_MS) / 1500, 0, 1);          // 카드 흐름 진행
        let seenTop = 0;
        let seenBot = 0;
        for (let i = 0; i < msgs.length; i += 1) {
            const m: Msg = msgs[i];
            const order = i / msgs.length;
            const p = clamp((k - order * 0.6) / 0.4, 0, 1);     // 카드 하나가 입구에서 제자리로 가는 진행
            const blocked = !m.isDm && dmOnly;
            // 같은 갈래의 몇 번째 카드인가 — 슬롯 번호. 갈라지는 시점(p=0.5) 에 하나씩 센다
            if (p >= 0.5) {
                if (m.isDm) { seenBot += 1; } else { seenTop += 1; }
            }
            const slot = m.isDm ? seenBot - 1 : seenTop - 1;
            // 제자리 — 통과한 카드와 걸러진 카드 모두 자기 갈래의 슬롯에 앉는다. 걸러진 쪽은 흐려지고 작아져
            // '자리는 있지만 밖으로 못 나갔다' 가 보인다 (겹쳐 한 장처럼 보이지 않게 간격은 같다)
            const startX = NODE_X + 12 + slot * CARD_STEP;
            const y = m.isDm ? Y_BOT : Y_TOP;
            let x;
            let op;
            let scale;
            if (p < 0.5) {
                x = lerp(IN_X, NODE_X, p / 0.5);
                op = 1;
                scale = 1;
            }
            else {
                x = lerp(NODE_X, startX, (p - 0.5) / 0.5);
                op = blocked ? 0.18 : 1;
                scale = blocked ? 0.7 : 1;
            }
            // 갈라지는 시점 — 카드는 분기점(x = NODE_X, p 0.5) 까지 한 줄로 오고, 그 뒤 p 0.5~0.75 사이에 제 갈래 y 로 벌어진다.
            // 분기점 앞에서 벌어지면 입구 쪽에서 대각선으로 새어 나와 포스터가 어긋난 중간 장면이 된다 (실측)
            const splitK = clamp((p - 0.5) / 0.25, 0, 1);
            const yy = lerp(Y_IN, y, splitK);
            m.el.style.transform = 'translate(' + f1(x) + 'px,' + f1(yy) + 'px) scale(' + f2(scale) + ')';
            m.el.style.opacity = f2(op);
        }
        // 갈래 흐름 — 그 갈래가 통과시키는 비율을 그대로 굵기에 넣는다 (채널 쪽은 dmOnly 면 0)
        flowTop.style.transform = 'scaleX(' + f2(topRatio) + ')';
        flowBot.style.transform = 'scaleX(' + f2(botRatio) + ')';
        barFillTop.style.transform = 'scaleX(' + f2(topRatio) + ')';
        barFillBot.style.transform = 'scaleX(' + f2(botRatio) + ')';
        ratioEl.textContent = fill('passRatio {a} · 통과 {b}/{c}', f2(after), f0(c.pass), f0(c.total));
        dropEl.textContent = fill('dropRatio {a} · 차단 {b}', f2(drop), f0(c.blocked));
        return fill('dmOnly {a} · passRatio {b} · 통과 {c}/{d}',
            dmOnly ? '1' : '0', f2(after), f0(c.pass), f0(c.total));
    }
    function setOnly(v: boolean): void {
        if (!swEl) {
            return;
        }
        manual = true;                    // 사람이 건드렸다 — 자동 시연을 멈춘다
        dmOnly = v;
        swEl.setAttribute('aria-checked', v ? 'true' : 'false');
        // 입력은 즉시 화면에 반영된다 — reduce 여부와 무관하게 render() 를 1회 부른다
        render(lastT);
        // 낭독용 문장 — 모드가 바뀔 때만 role=status 에 쓴다 (프레임마다 바뀌는 숫자는 aria-live off)
        doneP.textContent = v ? '다이렉트 메시지만 통과' : '채널 멘션과 다이렉트 메시지 모두 통과';
    }
    function build(i: number): number {
        msgs = [];
        manual = false;                   // 새 바퀴 — 자동 시연으로 복귀
        dmOnly = DM_ONLY !== 0;
        ttlEl = make('p', 'dm__lbl', scWrap);
        ttlEl.textContent = 'dmOnly · mention · channel';
        put(ttlEl, 8, 4, 0, 0);
        // 두 갈래 길 — 면 없이 얇은 선
        const rIn = make('i', 'dm-road', scWrap);
        put(rIn, IN_X + 8, Y_IN, NODE_X - IN_X - 8, 0);
        const rTop = make('i', 'dm-road', scWrap);
        put(rTop, NODE_X, Y_TOP + 8, OUT_X - NODE_X, 0);
        const rBot = make('i', 'dm-road', scWrap);
        put(rBot, NODE_X, Y_BOT + 8, OUT_X - NODE_X, 0);
        // 흐름 — 카드(높이 24) 의 아래 가장자리를 따라 간다. 카드가 길 위를 지나가는 층으로 보인다
        flowTop = make('i', 'dm-flow', scWrap);
        put(flowTop, NODE_X, Y_TOP + 22, OUT_X - NODE_X, 0);
        flowBot = make('i', 'dm-flow', scWrap);
        put(flowBot, NODE_X, Y_BOT + 22, OUT_X - NODE_X, 0);
        const node = make('i', 'dm-node', scWrap);
        put(node, NODE_X - 6, Y_IN - 6, 0, 0);
        // 길 라벨 — 색만으로 구분하지 않는다 (사각 태그 = 멘션, 원 태그 = DM, 글자도 함께)
        // 갈래 라벨 — 채널은 갈래 위, DM 은 갈래 아래(흐름 선 밑). 비율 막대 라벨(y 128~) 과 2px 떨어지게 112 에 둔다
        const lt = make('p', 'dm__lbl', scWrap);
        lt.textContent = 'channel · mention';
        put(lt, NODE_X + 24, Y_TOP - 16, 0, 0);
        const lb = make('p', 'dm__lbl', scWrap);
        lb.textContent = 'direct message';
        put(lb, NODE_X + 24, Y_BOT + 24, 0, 0);
        // 메시지 카드 — 멘션과 DM 을 시드로 정한다
        for (let i = 0; i < MSG_N; i += 1) {
            const isDm = seedHash(i, SEED) >= MENTION_SHARE;
            const e = make('div', 'dm-card', scWrap);
            const tag = make('i', isDm ? 'dm-tag dm-tag--dm' : 'dm-tag', e);
            const txt = make('span', 'dm__lbl dm__lbl--dim', e);
            txt.textContent = isDm ? 'DM' : '@bot';
            txt.style.left = '22px';
            txt.style.top = '4px';
            put(e, 0, 0, 0, 0);
            msgs.push({ isDm: isDm, el: e, kindEl: tag });
        }
        // 스위치 — 다이렉트만 통과 (role=switch, Enter·Space 로도 동작)
        swEl = make('button', 'dm-switch', scWrap) as HTMLButtonElement;
        swEl.type = 'button';
        swEl.setAttribute('role', 'switch');
        swEl.setAttribute('aria-checked', dmOnly ? 'true' : 'false');
        swEl.setAttribute('aria-label', '다이렉트 메시지만 통과');
        put(swEl, 392, 4, 0, 0);
        const knob = make('i', 'dm-knob', swEl);
        const sl = make('p', 'dm__lbl', scWrap);
        sl.textContent = 'dmOnly';
        put(sl, 340, 6, 0, 0);
        // 리스너는 bind(off) 에서 건다 — AbortController 는 run() 안에서 만들어진다
        // 비율 막대 — 위(채널)·아래(DM)
        // 비율 막대 — 갈래별 통과 비율. 위(채널)·아래(DM). 길 끝에 맞춰 오른쪽 정렬, 라벨을 왼쪽에 둔다
        const bt = make('i', 'dm__bar', scWrap);
        put(bt, 268, 128, 164, 8);
        barFillTop = make('i', 'dm__fill', bt);
        const bb = make('i', 'dm__bar', scWrap);
        put(bb, 268, 142, 164, 8);
        barFillBot = make('i', 'dm__fill', bb);
        // 막대 라벨 — 각 막대 왼쪽 (채널·DM). 색만으로 구분하지 않는다
        const bl = make('p', 'dm__lbl dm__lbl--dim', scWrap);
        bl.textContent = 'channel';
        put(bl, 236, 128, 0, 0);
        const br = make('p', 'dm__lbl dm__lbl--dim', scWrap);
        br.textContent = 'DM';
        put(br, 236, 142, 0, 0);
        // 비율 값 라벨 — 비율 막대 왼쪽 두 줄. 위 status 알약과 같은 값이라 칩 따로 두지 않는다 (캘름 인터페이스)
        ratioEl = make('p', 'dm__lbl', scWrap);
        put(ratioEl, 8, 128, 0, 0);
        dropEl = make('p', 'dm__lbl dm__lbl--dim', scWrap);
        put(dropEl, 8, 142, 0, 0);
        drawRows([spanOf(0, 1000, 0), spanOf(1000, 1000, 1)], CYCLE);
        axis(CYCLE);
        setReads(fill('dmOnly {a} · mention {b}/{c} · passRatio = 통과 / 전체',
            dmOnly ? '1' : '0', f0(counts(msgs, false).total - counts(msgs, false).pass), f0(MSG_N)),
            i === 0 ? 'cards split into mention and direct message' : 'turning dmOnly filters every channel card');
        doneP.textContent = '';
        render(0);
        return CYCLE;
    }
    function frame(t: number): string {
        if (!ttlEl) {
            return '';
        }
        lastT = t;
        return render(t);
    }
    // 스위치 입력 — 클릭·Enter·Space. 리스너는 run() 이 넘겨주는 AbortController 로 정리된다
    function bind(off: AbortController): void {
        scWrap.addEventListener('click', function (ev: MouseEvent) {
            if (ev.target instanceof Element && ev.target.closest('.dm-switch')) {
                setOnly(!dmOnly);
            }
        }, { signal: off.signal });
        scWrap.addEventListener('keydown', function (ev: KeyboardEvent) {
            if (ev.target instanceof Element && ev.target.closest('.dm-switch')) {
                if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    setOnly(!dmOnly);
                }
            }
        }, { signal: off.signal });
    }

    return run({ count: 3, build: build, frame: frame, bind: bind });
}

export default function SlackTrigger03DirectMessageTrigger() {
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
          <div className={cx("ez__scene")} data-role="scene" role="img" aria-label={'들어온 메시지 카드가 채널 멘션과 다이렉트 메시지 두 갈래로 나뉘고, 다이렉트만 통과시키는 스위치를 켜면 채널 쪽이 전부 걸러져 발동 비율이 떨어지는 장면'}></div>
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
