// CarryCascade - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./CarryCascade.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function CarryCascade() {
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
    const PLACES = 5;
    // 첫 한 칸은 0.3초 뒤, 이후 TICK_S 초마다 값이 하나씩 오른다 — 모두 TICKS 번
    const FIRST_S = 0.3;
    const TICK_S = 0.26;
    const TICKS = 7;
    // 한 칸 굴러 오르는 시간
    const ROLL_S = 0.3;
    // 자리가 한 칸 위로 올라갈 때마다 출발이 이만큼(초) 더 늦다 — 올림 연쇄는 CARRY_LAG_S, 잘못된 쪽은 윗자리마다 LATE_S
    const CARRY_LAG_S = 0.07;
    const LATE_S = 0.3;
    const STARTS = [996, 9995, 1997];
    let carry: Strip[] = [];
    let late: Strip[] = [];
    let v0 = STARTS[0];
    function build(): void {
        scene.textContent = '';
        const stack = mk('div', 'stack', scene);
        mk('span', 'cap', stack).textContent = '올림이 윗자리로 이어지는 계수기';
        carry = buildRow(stack, 'ddddd', 'lg', 0);
        mk('span', 'cap cap--bad', stack).textContent = '올림이 따로 늦게 도착하는 계수기';
        late = buildRow(stack, 'ddddd', 'sm', 0);
    }
    function reset(): void {
        v0 = STARTS[cycle % STARTS.length];
    }
    function update(dt: number): void {
        void dt;
    }
    function tenPow(k: number): number { return Math.pow(10, k); }
    // 자리 k 의 굴러 오른 칸 수 — 시작 값의 그 자리 몫에, 값이 올라 그 자리가 바뀐 틱마다 한 칸(올림 순서대로 지연)을 더한다
    function placePos(k: number, lag: number): number {
        let pos = Math.floor(v0 / tenPow(k));
        for (let j = 1; j <= TICKS; j += 1) {
            if (Math.floor((v0 + j) / tenPow(k)) !== Math.floor((v0 + j - 1) / tenPow(k))) {
                const s = FIRST_S + (j - 1) * TICK_S + k * lag;
                pos += easeOut3((sceneT - s) / ROLL_S);
            }
        }
        return pos;
    }
    function placeSpeed(k: number, lag: number): number {
        let sp = 0;
        for (let j = 1; j <= TICKS; j += 1) {
            if (Math.floor((v0 + j) / tenPow(k)) !== Math.floor((v0 + j - 1) / tenPow(k))) {
                const u = (sceneT - (FIRST_S + (j - 1) * TICK_S + k * lag)) / ROLL_S;
                if (u > 0 && u < 1) { sp += 3 * (1 - u) * (1 - u) / ROLL_S; }
            }
        }
        return sp;
    }
    function ticksDone(): number {
        return clamp(Math.floor((sceneT - FIRST_S) / TICK_S) + 1, 0, TICKS);
    }
    function draw(): void {
        for (let i = 0; i < PLACES; i += 1) {
            const k = PLACES - 1 - i;
            moveStrip(carry[i], placePos(k, CARRY_LAG_S), 0);
            glowStrip(carry[i], placeSpeed(k, CARRY_LAG_S) * 0.5);
            moveStrip(late[i], placePos(k, LATE_S), 0);
            glowStrip(late[i], placeSpeed(k, LATE_S) * 0.5);
        }
    }
    function isSettled(): boolean { return sceneT >= 3.0; }
    // 방금 오른 값에서 같이 넘어간 자리 수(일의 자리 포함)
    function chainOf(n: number): number {
        let c = 0;
        for (let k = 0; k < PLACES; k += 1) {
            if (Math.floor(n / tenPow(k)) !== Math.floor((n - 1) / tenPow(k))) { c += 1; }
        }
        return c;
    }
    function statusText(): string {
        const d = ticksDone();
        const n = v0 + d;
        return '지금 {n} · 이번 올림 {c}자리'.replace('{n}', fmtNum(n)).replace('{c}', String(d > 0 ? chainOf(n) : 0));
    }
    function finalText(): string {
        return '{a} 에서 {b} 까지 올라갔습니다'.replace('{a}', fmtNum(v0)).replace('{b}', fmtNum(v0 + TICKS));
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
        <div className={cx("vj__scene")} data-role="scene" role="img" aria-label={'위 계수기는 9에서 0으로 넘어갈 때 윗자리가 시간차로 한 칸씩 이어 올라가고, 아래 계수기는 윗자리 올림이 따로 늦게 도착해 한동안 값이 틀리게 보인다'} />
        <button className={cx("vj__pad")} data-role="pad" type="button" aria-label={'숫자 장면 무대 — 누르거나 Enter, 오른쪽·위 화살표로 다음 값 굴리기'} />
        <p className={cx("vj__status")} data-role="status" aria-hidden="true">{'숫자 롤링 장면'}</p>
        <p className={cx("vj__live")} data-role="live" role="status" aria-live="off" />
        <button className={cx("vj__pause")} data-role="pause" type="button" aria-pressed="false">{'일시정지'}</button>
    </div>
  );
}
