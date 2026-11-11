// SpringOvershootSettle - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./SpringOvershootSettle.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function SpringOvershootSettle() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const root: HTMLElement = rootEl;
    const cls = cx;
    function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
    function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
    function mod(a: number, n: number): number { return ((a % n) + n) % n; }
    // 감속 곡선 — 처음이 가장 빠르고 끝에서 0 으로 닿는다(3제곱)
    function easeOut3(x: number): number { const u = 1 - clamp(x, 0, 1); return 1 - u * u * u; }
    function easeInOut(x: number): number { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); }
    // 장면 시계(초) — 장면 계산이 고치고 화면 쪽이 읽는다
    let sceneT = 0;
    // 지금 몇 번째 값인가 — 한 바퀴(LOOP_S)가 돌 때마다 하나 올라 다음 목표 값을 고른다
    let cycle = 0;
    // 숫자띠 한 줄의 칸 수 — 0 부터 9 까지 열 칸에 0, 1 을 한 번 더 붙여 9 에서 0 으로 넘어가는 경계를 끊김 없이 잇는다
    const CELLS = 12;
    // 번짐 기준 속도(칸/초) — 이만큼 빠르면 번짐이 최대. 꼬리 한 장의 간격(칸)
    const BLUR_REF = 60;
    const BLUR_LAG = 0.55;
    interface Strip { win: HTMLElement; cols: HTMLElement[]; glow: HTMLElement; }
    function mk(tag: string, name: string, parent: HTMLElement | null): HTMLElement {
        const e = document.createElement(tag);
        e.className = cls(name);
        if (parent) { parent.appendChild(e); }
        return e;
    }
    // 자리 하나 — 창 하나에 0~9 띠(ghosts 장의 꼬리 띠 포함)와 속도 반짝임 층
    function makeStrip(parent: HTMLElement, extra: string, ghosts: number): Strip {
        const win = mk('span', 'dg ' + extra, parent);
        // 속도 반짝임 층은 띠 뒤에 깐다 — 숫자 글자는 항상 그 위에서 또렷하다
        const glow = mk('span', 'dg__glow', win);
        const cols: HTMLElement[] = [];
        for (let g = 0; g <= ghosts; g += 1) {
            const col = mk('span', g === 0 ? 'dg__col' : 'dg__col dg__ghost', win);
            for (let i = 0; i < CELLS; i += 1) {
                const c = mk('span', 'dg__cell', col);
                c.textContent = String(i % 10);
            }
            cols.push(col);
        }
        return { win: win, cols: cols, glow: glow };
    }
    function putCol(col: HTMLElement, pos: number): void {
        col.style.transform = 'translateY(' + (-mod(pos, 10) / CELLS * 100).toFixed(3) + '%)';
    }
    // pos = 지금 띠가 밀려 올라온 칸 수(소수), speed = 칸/초(방향 포함). 꼬리 띠가 있으면 속도에 비례해 번진다
    function moveStrip(s: Strip, pos: number, speed: number): void {
        putCol(s.cols[0], pos);
        if (s.cols.length < 2) { return; }
        const sp = clamp(Math.abs(speed) / BLUR_REF, 0, 1);
        const dir = speed < 0 ? -1 : 1;
        s.cols[0].style.opacity = (1 - 0.5 * sp).toFixed(3);
        for (let g = 1; g < s.cols.length; g += 1) {
            putCol(s.cols[g], pos - dir * sp * BLUR_LAG * g);
            s.cols[g].style.opacity = (0.5 * sp / g).toFixed(3);
        }
    }
    function glowStrip(s: Strip, v: number): void { s.glow.style.opacity = clamp(v, 0, 1).toFixed(3); }
    // 칸 패턴 — d 는 숫자띠 한 자리, 그 밖의 글자는 구분 기호(쉼표·점·콜론). 왼쪽부터 순서대로 돌려준다
    function buildRow(parent: HTMLElement, pattern: string, extra: string, ghosts: number): Strip[] {
        const row = mk('span', 'odo ' + extra, parent);
        const out: Strip[] = [];
        for (const ch of pattern) {
            if (ch === 'd') { out.push(makeStrip(row, extra, ghosts)); } else {
                const sep = mk('span', 'odo__sep', row);
                sep.textContent = ch;
            }
        }
        return out;
    }
    // 정수를 len 자리 숫자 배열로(왼쪽 자리부터)
    function digitsOf(n: number, len: number): number[] {
        const out: number[] = [];
        for (let i = 0; i < len; i += 1) { out.push(Math.floor(n / Math.pow(10, len - 1 - i)) % 10); }
        return out;
    }
    function fmtNum(n: number): string {
        const s = String(Math.round(n));
        let out = '';
        for (let i = 0; i < s.length; i += 1) {
            if (i > 0 && (s.length - i) % 3 === 0) { out += ','; }
            out += s.charAt(i);
        }
        return out;
    }
    function q(role: string): HTMLElement {
        const e = root.querySelector('[data-role="' + role + '"]');
        if (!(e instanceof HTMLElement)) { throw new Error('missing ' + role); }
        return e;
    }
    const scene: HTMLElement = q('scene');
    const pad: HTMLElement = q('pad');
    const pauseBtn: HTMLElement = q('pause');
    const statusEl: HTMLElement = q('status');
    const liveEl: HTMLElement = q('live');
    const LOOP_S = 3.6;
    const REST_T = 3.3;
    const START_S = 0.25;
    // 자리 사이 출발 간격(초)
    const PLACE_DELAY_S = 0.06;
    // 스프링 — 목표와 떨어진 칸 수에 SPRING_K 를 곱한 힘으로 당기고, 속도에 SPRING_C 를 곱한 만큼 브레이크를 건다
    const SPRING_K = 120;
    const SPRING_C = 12;
    const PLACES = 5;
    const VALUES = [31260, 12480, 86350, 47910];
    interface Spring { x: number; v: number; start: number; goal: number; }
    let springs: Spring[] = [];
    let strips: Strip[] = [];
    let bars: HTMLElement[] = [];
    let toV = VALUES[0];
    // 일의 자리가 목표를 지나친 가장 큰 폭(칸)
    let peakOver = 0;
    function build(): void {
        scene.textContent = '';
        const stack = mk('div', 'stack', scene);
        mk('span', 'cap', stack).textContent = '지나쳤다 돌아와 앉는 합계';
        strips = buildRow(stack, 'dd,ddd', 'xl', 0);
        bars = [];
        for (const s of strips) { bars.push(mk('span', 'dg__bar', s.win)); }
    }
    function reset(): void {
        toV = VALUES[cycle % VALUES.length];
        const prev = VALUES[(cycle + VALUES.length - 1) % VALUES.length];
        const a = digitsOf(prev, PLACES);
        const b = digitsOf(toV, PLACES);
        springs = [];
        peakOver = 0;
        for (let i = 0; i < PLACES; i += 1) {
            // 4 칸 이상은 반드시 굴러 간다 — 같은 숫자여도 눈에 보이게
            const dist = 4 + mod(b[i] - a[i] - 4, 10);
            springs.push({ x: a[i], v: 0, start: START_S + (PLACES - 1 - i) * PLACE_DELAY_S, goal: a[i] + dist });
        }
    }
    function update(dt: number): void {
        // 240Hz 로 잘게 나눠 쌓는다 — 프레임이 길어도 스프링이 터지지 않는다
        const n = Math.max(1, Math.ceil(dt * 240));
        const h = dt / n;
        for (let i = 0; i < springs.length; i += 1) {
            const sp = springs[i];
            if (sceneT < sp.start) { continue; }
            for (let j = 0; j < n; j += 1) {
                const acc = SPRING_K * (sp.goal - sp.x) - SPRING_C * sp.v;
                sp.v += acc * h;
                sp.x += sp.v * h;
            }
        }
        const one = springs[PLACES - 1];
        if (sceneT >= one.start) { peakOver = Math.max(peakOver, one.x - one.goal); }
    }
    function draw(): void {
        for (let i = 0; i < PLACES; i += 1) {
            const sp = springs[i];
            moveStrip(strips[i], sp.x, sp.v);
            glowStrip(strips[i], Math.abs(sp.v) / BLUR_REF * 2);
            // 남은 거리를 밑줄 길이로 — 지나쳤을 때는 분홍, 모자랄 때는 하늘색
            const gap = sp.goal - sp.x;
            bars[i].style.transform = 'scaleX(' + clamp(Math.abs(gap) / 4, 0, 1).toFixed(3) + ')';
            bars[i].classList.toggle(cls('is-over'), gap < 0);
        }
    }
    function isSettled(): boolean {
        if (sceneT < START_S + PLACES * PLACE_DELAY_S + 0.3) { return false; }
        for (const sp of springs) { if (Math.abs(sp.goal - sp.x) > 0.01 || Math.abs(sp.v) > 0.05) { return false; } }
        return true;
    }
    function statusText(): string {
        return '목표 {n} · 지나친 폭 {o}칸'.replace('{n}', fmtNum(toV)).replace('{o}', peakOver.toFixed(1));
    }
    function finalText(): string {
        return '합계가 {n} 으로 자리를 잡았습니다'.replace('{n}', fmtNum(toV));
    }
    let shownStatus = '';
    function pushStatus(s: string): void {
        if (s === shownStatus) { return; }
        shownStatus = s;
        statusEl.textContent = s;
    }
    // 바뀐 최종 값은 한 번만 알린다 — 굴러가는 중간 숫자는 읽는 쪽으로 보내지 않는다
    let wasSettled = false;
    function checkSettled(): void {
        const s = isSettled();
        if (s && !wasSettled) { liveEl.textContent = finalText(); }
        wasSettled = s;
    }
    let paused = false;
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    // 페이지를 연 채 움직임 줄이기 설정을 바꿔도 change 리스너가 다시 읽는다
    let still = reduceQuery.matches;
    // 자동 시연 표시 — 사람이 처음 손대면 떼고 알림 영역을 polite 로 켠다
    let demo = root.classList.contains('is-demo');
    const off = new AbortController();
    function wake(): void {
        if (!demo) { return; }
        demo = false;
        root.classList.remove('is-demo');
        liveEl.setAttribute('aria-live', 'polite');
    }
    // 한 프레임에 넘기는 시간 상한(초) — 오래 숨었다 돌아온 첫 프레임도 50ms 까지만 계산에 넣는다
    const DT_MAX = 0.05;
    function advance(dt: number): void {
        sceneT += dt;
        if (sceneT >= LOOP_S) {
            sceneT -= LOOP_S;
            cycle += 1;
            reset();
        }
        update(dt);
    }
    function paint(): void {
        draw();
        pushStatus(statusText());
        checkSettled();
    }
    let rafId = 0;
    let lastTs = -1;
    function frame(ts: number): void {
        if (still || paused) { rafId = 0; return; }
        if (lastTs < 0) { lastTs = ts; }
        const dt = Math.min((ts - lastTs) / 1000, DT_MAX);
        lastTs = ts;
        if (dt > 0) { advance(dt); }
        paint();
        rafId = window.requestAnimationFrame(frame);
    }
    function startLoop(): void {
        if (rafId) { return; }
        // 멈췄던 사이의 시간을 첫 프레임 dt 로 넘기지 않는다
        lastTs = -1;
        rafId = window.requestAnimationFrame(frame);
    }
    function stopLoop(): void {
        if (rafId) { window.cancelAnimationFrame(rafId); rafId = 0; }
    }
    // 움직임 줄이기 — 굴림 없이 이 값의 최종 숫자 한 장
    function showRest(): void {
        stopLoop();
        sceneT = 0;
        reset();
        for (let k = 0; k < Math.ceil(REST_T * 60); k += 1) { sceneT += 1 / 60; update(1 / 60); }
        paint();
    }
    function play(): void {
        sceneT = 0;
        reset();
        paint();
        if (!paused) { startLoop(); }
    }
    // 다음 값 — 눌렀을 때 바로 다음 목표로 넘어가 처음부터 굴린다(움직임 줄이기에서는 즉시 최종 숫자)
    function nextNow(): void {
        wake();
        cycle += 1;
        wasSettled = false;
        if (still) { showRest(); } else { play(); }
    }
    function togglePause(): void {
        paused = !paused;
        pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
        wake();
        if (paused) { stopLoop(); } else if (!still) { startLoop(); }
    }
    pauseBtn.addEventListener('click', togglePause, { signal: off.signal });
    // 무대 버튼 — 누르면(Enter·Space·클릭은 브라우저가 click 으로 준다) 다음 값. 오른쪽·위 화살표도 같다
    pad.addEventListener('click', nextNow, { signal: off.signal });
    pad.addEventListener('keydown', function (e: KeyboardEvent): void {
        if (e.altKey || e.ctrlKey || e.metaKey) { return; }
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault();
            nextNow();
        }
    }, { signal: off.signal });
    // 탭이 숨으면 멈추고, 돌아오면 시계를 다시 맞춰 시작 — 숨은 동안의 몇 초가 한 프레임에 몰리지 않게
    document.addEventListener('visibilitychange', function (): void {
        if (document.hidden) { stopLoop(); } else if (!paused && !still) { startLoop(); }
    }, { signal: off.signal });
    // 설정이 바뀌면 — 켜지면 최종 숫자 한 장, 꺼지면 다시 움직인다
    reduceQuery.addEventListener('change', function (): void {
        still = reduceQuery.matches;
        if (still) { showRest(); } else { play(); }
    }, { signal: off.signal });
    build();
    if (still) { showRest(); } else { play(); }
    return function (): void {
        stopLoop();
        off.abort();
    };
  }, []);

  return (
    <div className={cx("vj") + " is-demo"} ref={rootRef}>
        <div className={cx("vj__scene")} data-role="scene" role="img" aria-label={'숫자띠가 목표 숫자를 조금 지나쳤다가 스프링 힘으로 돌아와 몇 번 떨고 멈추며, 자리마다 밑줄이 남은 거리를 보여 주고 지나쳤을 때는 분홍색이 된다'} />
        <button className={cx("vj__pad")} data-role="pad" type="button" aria-label={'숫자 장면 무대 — 누르거나 Enter, 오른쪽·위 화살표로 다음 값 굴리기'} />
        <p className={cx("vj__status")} data-role="status" aria-hidden="true">{'숫자 롤링 장면'}</p>
        <p className={cx("vj__live")} data-role="live" role="status" aria-live="off" />
        <button className={cx("vj__pause")} data-role="pause" type="button" aria-pressed="false">{'일시정지'}</button>
    </div>
  );
}
