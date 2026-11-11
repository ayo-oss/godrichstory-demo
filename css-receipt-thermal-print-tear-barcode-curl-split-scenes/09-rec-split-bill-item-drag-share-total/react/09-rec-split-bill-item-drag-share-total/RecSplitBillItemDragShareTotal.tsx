// RecSplitBillItemDragShareTotal - vanilla 판(09-rec-split-bill-item-drag-share-total) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./RecSplitBillItemDragShareTotal.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function RecSplitBillItemDragShareTotal() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const root: HTMLElement = rootEl;
    function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
    function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
    function smooth(x: number): number { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); }
    const BW = 480;
    const BH = 300;
    const FIXED_DT = 16;
    const SPRING_K = 240;
    const DAMP = 19;
    const EASE_RATE = 9;
    const TAX_RATE = 0.1;
    const SLOT_N = 3;
    const CHIP_W = 92;
    const CHIP_H = 28;
    const SLOT_X = 178;
    const SLOT_W = 290;
    const SLOT_H = 80;
    const SLOT_GAP = 8;
    const SLOT_Y0 = 8;
    const HOME_X = 18;
    const HOME_Y0 = 14;
    const HOME_DY = 52;
    const MOVE_MS = 460;
    const TXT_MISS = '칸 밖이라 돌아왔다';
    const TXT_SUM = '합계';
    const TXT_RESET = '처음으로 돌렸다';
    const TXT_READY = '품목을 끌어 칸에 놓는다';
    const SLOT_NAMES: string[] = ['A', 'B', 'C'];
    const boardEl = root.querySelector('[data-role="board"]') as HTMLElement | null;
    const statusEl = root.querySelector('[data-role="status"]') as HTMLElement | null;
    const ghostEl = root.querySelector('[data-role="ghost"]') as HTMLElement | null;
    const resetBtn = root.querySelector('[data-role="btn"]') as HTMLButtonElement | null;
    if (!boardEl || !statusEl || !ghostEl) { return; }
    const board: HTMLElement = boardEl;
    const status: HTMLElement = statusEl;
    const ghost: HTMLElement = ghostEl;
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const chips: HTMLElement[] = [];
    const sums: HTMLElement[] = [];
    const slotEls: HTMLElement[] = [];
    const chipNodes = root.querySelectorAll('[data-item]');
    for (let i = 0; i < chipNodes.length; i += 1) { chips.push(chipNodes[i] as HTMLElement); }
    const sumNodes = root.querySelectorAll('[data-sum]');
    for (let i = 0; i < sumNodes.length; i += 1) { sums.push(sumNodes[i] as HTMLElement); }
    const slotNodes = root.querySelectorAll('[data-slot]');
    for (let i = 0; i < slotNodes.length; i += 1) { slotEls.push(slotNodes[i] as HTMLElement); }
    const N = chips.length;
    const price: number[] = [];
    for (let i = 0; i < N; i += 1) { price.push(Number(chips[i].getAttribute('data-price'))); }
    const px: number[] = [];
    const py: number[] = [];
    const vx: number[] = [];
    const vy: number[] = [];
    const owner: number[] = [];
    const shown: number[] = [];
    for (let i = 0; i < N; i += 1) {
        px.push(HOME_X);
        py.push(HOME_Y0 + i * HOME_DY);
        vx.push(0);
        vy.push(0);
        owner.push(-1);
    }
    for (let s = 0; s < SLOT_N; s += 1) { shown.push(0); }
    let scale = 1;
    let drag = -1;
    let grabDx = 0;
    let grabDy = 0;
    let moved = false;
    let clock = 0;
    let userTouched = false;
    let autoIdx = 0;
    let autoAt = 200;
    let fakeI = -1;
    let fakeT = 0;
    let fakeFrom: number[] = [0, 0];
    let fakeTo: number[] = [0, 0];
    let fakeSlot = -1;
    let raf = 0;
    let lastTs = -1;
    let acc = 0;
    // 자동 시연 대본 — 항목, 놓을 칸(-1 은 칸 밖), 시작 시각 간격
    const SCRIPT: number[][] = [[1, 1], [3, -1], [0, 0], [2, 1], [4, 2]];
    function homeOf(i: number): number[] { return [HOME_X, HOME_Y0 + i * HOME_DY]; }
    function slotRect(s: number): number[] { return [SLOT_X, SLOT_Y0 + s * (SLOT_H + SLOT_GAP), SLOT_W, SLOT_H]; }
    function slotIndexOf(i: number): number {
        let k = 0;
        for (let j = 0; j < i; j += 1) { if (owner[j] === owner[i]) { k += 1; } }
        return k;
    }
    // 칸 안에서 몇 번째 자리인지 — 한 줄에 셋, 두 줄까지
    function targetOf(i: number): number[] {
        if (owner[i] < 0) { return homeOf(i); }
        const r = slotRect(owner[i]);
        const k = Math.min(5, slotIndexOf(i));
        return [r[0] + 6 + (k % 3) * (CHIP_W + 4), r[1] + 28 + Math.floor(k / 3) * (CHIP_H + 2)];
    }
    function subOf(s: number): number {
        let sum = 0;
        for (let i = 0; i < N; i += 1) { if (owner[i] === s) { sum += price[i]; } }
        return sum;
    }
    function targetSum(s: number): number { return Math.round(subOf(s) * (1 + TAX_RATE)); }
    function fmt(n: number): string {
        const v = String(Math.round(n));
        let out = '';
        for (let i = 0; i < v.length; i += 1) {
            if (i > 0 && (v.length - i) % 3 === 0) { out += ','; }
            out += v.charAt(i);
        }
        return out;
    }
    function labelOf(i: number): string {
        const sp = chips[i].querySelector('span');
        return sp && sp.textContent ? sp.textContent : '';
    }
    function assign(i: number, s: number): void {
        owner[i] = s;
        if (s >= 0) {
            status.textContent = labelOf(i) + ' → ' + SLOT_NAMES[s] + ', ' + TXT_SUM + ' ' + fmt(targetSum(s));
        } else {
            status.textContent = labelOf(i) + ' → ' + TXT_RESET;
        }
        if (reduceQuery.matches) { snap(); }
    }
    // 놓을 때의 판정 — 칩 중심이 어느 칸 안에 있는가
    function judge(cx: number, cy: number): number {
        for (let s = 0; s < SLOT_N; s += 1) {
            const r = slotRect(s);
            if (cx >= r[0] && cx <= r[0] + r[2] && cy >= r[1] && cy <= r[1] + r[3]) { return s; }
        }
        return -1;
    }
    function drop(i: number): void {
        const s = judge(px[i] + CHIP_W / 2, py[i] + CHIP_H / 2);
        if (s < 0) {
            status.textContent = labelOf(i) + ' — ' + TXT_MISS;
            if (reduceQuery.matches) { snap(); }
            return;
        }
        assign(i, s);
    }
    function snap(): void {
        for (let i = 0; i < N; i += 1) {
            const t = targetOf(i);
            px[i] = t[0];
            py[i] = t[1];
            vx[i] = 0;
            vy[i] = 0;
        }
        for (let s = 0; s < SLOT_N; s += 1) { shown[s] = targetSum(s); }
        render();
    }
    function render(): void {
        for (let i = 0; i < N; i += 1) {
            const lift = drag === i || fakeI === i;
            chips[i].style.transform = 'translate(' + px[i].toFixed(1) + 'px,' + py[i].toFixed(1) + 'px)' + (lift ? ' scale(1.06)' : '');
            chips[i].setAttribute('data-lift', lift ? '1' : '0');
        }
        for (let s = 0; s < SLOT_N; s += 1) {
            sums[s].textContent = fmt(shown[s]);
            slotEls[s].setAttribute('data-hot', ((drag >= 0 || fakeI >= 0) && judgeLive() === s) ? '1' : '0');
        }
    }
    function judgeLive(): number {
        const i = drag >= 0 ? drag : fakeI;
        if (i < 0) { return -1; }
        return judge(px[i] + CHIP_W / 2, py[i] + CHIP_H / 2);
    }
    function resetAll(): void {
        for (let i = 0; i < N; i += 1) { owner[i] = -1; }
        status.textContent = TXT_RESET;
        if (reduceQuery.matches) { snap(); }
    }
    function step(): void {
        const dt = FIXED_DT / 1000;
        clock += FIXED_DT;
        // 자동 시연 — 가짜 포인터가 스스로 끌어다 놓는다
        if (!userTouched && fakeI < 0 && drag < 0 && clock >= autoAt) {
            if (autoIdx >= SCRIPT.length) {
                resetAll();
                autoIdx = 0;
                autoAt = clock + 500;
            } else {
                const it = SCRIPT[autoIdx];
                fakeI = it[0];
                fakeSlot = it[1];
                fakeT = 0;
                fakeFrom = [px[fakeI], py[fakeI]];
                if (fakeSlot >= 0) {
                    const r = slotRect(fakeSlot);
                    fakeTo = [r[0] + 40 + (countIn(fakeSlot) % 3) * 40, r[1] + 36];
                } else {
                    fakeTo = [112, 150];
                }
                autoIdx += 1;
            }
        }
        if (fakeI >= 0) {
            fakeT += FIXED_DT;
            const k = smooth(fakeT / MOVE_MS);
            px[fakeI] = lerp(fakeFrom[0], fakeTo[0], k);
            py[fakeI] = lerp(fakeFrom[1], fakeTo[1], k);
            vx[fakeI] = 0;
            vy[fakeI] = 0;
            ghost.style.transform = 'translate(' + (px[fakeI] + CHIP_W - 14).toFixed(1) + 'px,' + (py[fakeI] + CHIP_H - 6).toFixed(1) + 'px)';
            ghost.setAttribute('data-on', '1');
            if (fakeT >= MOVE_MS + 120) {
                const done = fakeI;
                ghost.setAttribute('data-on', '0');
                fakeI = -1;
                drop(done);
                autoAt = clock + 140;
            }
        }
        for (let i = 0; i < N; i += 1) {
            if (i === drag || i === fakeI) { continue; }
            const t = targetOf(i);
            vx[i] += (SPRING_K * (t[0] - px[i]) - DAMP * vx[i]) * dt;
            vy[i] += (SPRING_K * (t[1] - py[i]) - DAMP * vy[i]) * dt;
            px[i] += vx[i] * dt;
            py[i] += vy[i] * dt;
        }
        // 칸 합계는 값을 바로 바꾸지 않고 감쇠하며 따라간다
        for (let s = 0; s < SLOT_N; s += 1) { shown[s] += (targetSum(s) - shown[s]) * (1 - Math.exp(-EASE_RATE * dt)); }
        render();
    }
    function countIn(s: number): number {
        let k = 0;
        for (let j = 0; j < N; j += 1) { if (owner[j] === s) { k += 1; } }
        return k;
    }
    function frame(ts: number): void {
        if (lastTs < 0) { lastTs = ts; }
        acc += Math.min(ts - lastTs, 100);
        lastTs = ts;
        let n = 0;
        while (acc >= FIXED_DT && n < 6) {
            step();
            acc -= FIXED_DT;
            n += 1;
        }
        raf = window.requestAnimationFrame(frame);
    }
    function fit(): void {
        scale = board.parentElement ? board.parentElement.clientWidth / BW : 1;
        board.style.transform = 'scale(' + scale.toFixed(4) + ')';
    }
    function pointOf(ev: PointerEvent): number[] {
        const r = board.getBoundingClientRect();
        return [(ev.clientX - r.left) / scale, (ev.clientY - r.top) / scale];
    }
    chips.forEach(function (chip: HTMLElement, i: number): void {
        chip.addEventListener('pointerdown', function (ev: PointerEvent): void {
            userTouched = true;
            if (fakeI >= 0) { ghost.setAttribute('data-on', '0'); fakeI = -1; }
            const p = pointOf(ev);
            drag = i;
            moved = false;
            grabDx = p[0] - px[i];
            grabDy = p[1] - py[i];
            chip.setPointerCapture(ev.pointerId);
        });
        chip.addEventListener('pointermove', function (ev: PointerEvent): void {
            if (drag !== i) { return; }
            const p = pointOf(ev);
            px[i] = clamp(p[0] - grabDx, 0, BW - CHIP_W);
            py[i] = clamp(p[1] - grabDy, 0, BH - CHIP_H);
            moved = true;
            if (reduceQuery.matches) { render(); }
        });
        function end(): void {
            if (drag !== i) { return; }
            drag = -1;
            if (moved) { drop(i); }
            if (reduceQuery.matches) { snap(); }
        }
        chip.addEventListener('pointerup', end);
        chip.addEventListener('pointercancel', end);
        chip.addEventListener('click', function (ev: MouseEvent): void {
            // 포인터 클릭은 위에서 처리했다 — 키보드(Enter·Space)로 누른 클릭만 칸을 돌려 가며 옮긴다
            if (ev.detail !== 0) { return; }
            userTouched = true;
            assign(i, owner[i] >= SLOT_N - 1 ? -1 : owner[i] + 1);
        });
        chip.addEventListener('keydown', function (ev: KeyboardEvent): void {
            const n = Number(ev.key);
            if (n >= 1 && n <= SLOT_N) {
                ev.preventDefault();
                userTouched = true;
                assign(i, n - 1);
            } else if (ev.key === '0' || ev.key === 'Backspace') {
                ev.preventDefault();
                userTouched = true;
                assign(i, -1);
            }
        });
    });
    if (resetBtn) {
        resetBtn.addEventListener('click', function (): void {
            userTouched = true;
            resetAll();
        });
    }
    status.textContent = TXT_READY;
    fit();
    window.addEventListener('resize', fit);
    if (reduceQuery.matches) {
        owner[1] = 1;
        owner[3] = 0;
        owner[0] = 1;
        snap();
    } else {
        render();
        raf = window.requestAnimationFrame(frame);
    }
    return function (): void {
        window.cancelAnimationFrame(raf);
        window.removeEventListener('resize', fit);
    };


  }, []);

  return (
    <div className={cx("rc") + " is-demo"} ref={rootRef}>
        <div className={cx("rc__fit")}>
          <div className={cx("rc__board")} data-role="board">
            <div className={cx("rc__slot")} data-slot="0"><span className={cx("rc__slot-name")}>A</span><b className={cx("rc__slot-sum")} data-sum="0">0</b></div>
            <div className={cx("rc__slot")} data-slot="1"><span className={cx("rc__slot-name")}>B</span><b className={cx("rc__slot-sum")} data-sum="1">0</b></div>
            <div className={cx("rc__slot")} data-slot="2"><span className={cx("rc__slot-name")}>C</span><b className={cx("rc__slot-sum")} data-sum="2">0</b></div>
            <button className={cx("rc__chip")} data-item="0" data-price="1200" type="button"><span>우유</span><b>1,200</b></button>
            <button className={cx("rc__chip")} data-item="1" data-price="2800" type="button"><span>식빵</span><b>2,800</b></button>
            <button className={cx("rc__chip")} data-item="2" data-price="3500" type="button"><span>사과</span><b>3,500</b></button>
            <button className={cx("rc__chip")} data-item="3" data-price="4100" type="button"><span>달걀</span><b>4,100</b></button>
            <button className={cx("rc__chip")} data-item="4" data-price="1900" type="button"><span>귤</span><b>1,900</b></button>
            <i className={cx("rc__ghost")} data-role="ghost" data-on="0" aria-hidden="true" />
          </div>
        </div>
        <p className={cx("rc__status")} data-role="status" aria-live="polite">품목을 끌어 칸에 놓는다</p>
        <div className={cx("rc__tools")}>
          <button className={cx("rc__btn")} data-role="btn" type="button">처음으로</button>
        </div>
    </div>
  );
}
