// ProgressRing — vanilla 판(kbn-progress-ring-from-columns) 의 React 포트. 완료 열 카드 수 ÷ 전체 카드 수로 호의 길이를 구하고 목표가 바뀌면 보간한다.
// 소스는 vanilla 와 같은 구조(공용 엔진 + 장면 코드)이고 정식 타입을 단다.
import { useEffect, useRef } from "react";
import styles from "./ProgressRing.module.scss";

export default function ProgressRing() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    type Off = () => void;
    type Step = (dt: number) => void;
    type Card = { el: HTMLElement; i: number; x: number; y: number; vx: number; vy: number; rot: number; sc: number; lift: number };
    type Pt = { x: number; y: number };
    type Slot = { c: number; r: number };

    var root: HTMLElement = rootEl;
    var CLS = { demo: styles["is-demo"], held: styles["is-held"] };
    var off: Off[] = [];
    var raf = 0;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function q(sel: string): HTMLElement {
      return root.querySelector(sel) as HTMLElement;
    }
    function qa(sel: string): HTMLElement[] {
      return Array.prototype.slice.call(root.querySelectorAll(sel)) as HTMLElement[];
    }
    function on(target: EventTarget, type: string, fn: EventListener): void {
      target.addEventListener(type, fn);
      off.push(function () { target.removeEventListener(type, fn); });
    }
    function clamp(v: number, lo: number, hi: number): number {
      return Math.max(lo, Math.min(hi, v));
    }

    // 칸 크기는 화면 높이에 맞춰 U(4 또는 6) 한 단위로 정한다
    var U = 4;
    var CARD_H = 24;
    var STEP = 28;
    var HEAD = 20;
    var PAD = 4;
    var GAP = 8;
    var onUnit: Off = function () { };
    function setUnit(): void {
      U = window.innerHeight >= 260 ? 6 : 4;
      CARD_H = 6 * U;
      STEP = 7 * U;
      HEAD = 5 * U;
      PAD = U;
      GAP = 2 * PAD;
      onUnit();
    }
    var CYCLE_MS = 2000;

    var board = q('[data-role="board"]');
    var cursorEl = q('[data-role="cursor"]');
    var metaEl = q('[data-role="meta"]');
    var colEls = qa('[data-role="col"]');
    var COLS = colEls.length;
    var boardW = 0;
    var boardH = 0;
    var colW = 0;
    var cols: number[][] = [];
    var cards: Card[] = qa('[data-role="card"]').map(function (el: HTMLElement, i: number): Card {
      return { el: el, i: i, x: 0, y: 0, vx: 0, vy: 0, rot: 0, sc: 1, lift: 0 };
    });
    var demo = !reduce;
    var nowMs = 0;
    var lastMeta = '';
    var onStop: Off = function () { };
    var afterStep: Step = function (dt: number) { };
    var extraSettle: Off = function () { };

    function slotX(c: number): number {
      return c * (colW + GAP) + PAD;
    }
    function slotY(r: number): number {
      return HEAD + 2 * PAD + r * STEP;
    }
    function measure(): void {
      setUnit();
      boardW = board.clientWidth;
      colW = FIXED_COL > 0 ? FIXED_COL : (boardW - GAP * (COLS - 1)) / COLS;
      boardH = slotY(ROWS - 1) + CARD_H + PAD;
      board.style.height = boardH + 'px';
      board.style.setProperty('--head', HEAD + 'px');
      colEls.forEach(function (el: HTMLElement, c: number) {
        el.style.left = c * (colW + GAP) + 'px';
        el.style.width = colW + 'px';
        el.style.height = boardH + 'px';
      });
      cards.forEach(function (c: Card) {
        c.el.style.width = (colW - 2 * PAD) + 'px';
        c.el.style.height = CARD_H + 'px';
      });
    }
    function locate(i: number): Slot {
      for (var c = 0; c < cols.length; c++) {
        var r = cols[c].indexOf(i);
        if (r >= 0) return { c: c, r: r };
      }
      return { c: 0, r: 0 };
    }
    function spring(c: Card, tx: number, ty: number, k: number, d: number, dt: number): void {
      c.vx += (k * (tx - c.x) - d * c.vx) * dt;
      c.x += c.vx * dt;
      c.vy += (k * (ty - c.y) - d * c.vy) * dt;
      c.y += c.vy * dt;
    }
    function draw(): void {
      cards.forEach(function (c: Card) {
        c.el.style.transform = 'translate3d(' + c.x.toFixed(2) + 'px,' + c.y.toFixed(2) + 'px,0) rotate(' + c.rot.toFixed(2) + 'deg) scale(' + c.sc.toFixed(3) + ')';
      });
    }
    function cardAt(t: EventTarget | null): Card | null {
      var n = t as HTMLElement | null;
      while (n && n !== board) {
        for (var k = 0; k < cards.length; k++) {
          if (cards[k].el === n) return cards[k];
        }
        n = n.parentElement;
      }
      return null;
    }
    function showCursor(p: Pt | null): void {
      if (!p) { cursorEl.style.opacity = '0'; return; }
      cursorEl.style.opacity = '1';
      cursorEl.style.transform = 'translate3d(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px,0)';
    }
    // keys: [시각 ms, x, y] 목록. 키 사이는 smoothstep 으로 잇는다
    function keyAt(t: number, keys: number[][]): Pt {
      var i = 0;
      while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
      var a = keys[i];
      var b = keys[i + 1];
      var u = clamp((t - a[0]) / (b[0] - a[0]), 0, 1);
      u = u * u * (3 - 2 * u);
      return { x: a[1] + (b[1] - a[1]) * u, y: a[2] + (b[2] - a[2]) * u };
    }
    // 열·행 소수 좌표를 보드 픽셀로 바꾼다 (행 r 의 카드 중심선이 소수 r)
    function pathPoint(t: number, keys: number[][]): Pt {
      var k = keyAt(t, keys);
      return { x: k.x * (colW + GAP) + colW / 2, y: slotY(0) + k.y * STEP + CARD_H / 2 };
    }
    function settleNow(): void {
      cards.forEach(function (c: Card) {
        var t = targetOf(c);
        c.x = t.x; c.y = t.y; c.vx = 0; c.vy = 0; c.rot = 0; c.sc = 1; c.lift = 0;
      });
      extraSettle();
    }
    // reduce: 보간 없이 입력 직후 목표 위치를 바로 그린다
    function sync(): void {
      if (!reduce) return;
      settleNow();
      draw();
      report();
    }
    function report(): void {
      var m = metaText();
      if (m !== lastMeta) { lastMeta = m; metaEl.textContent = m; }
    }
    function stopDemo(): void {
      if (!demo) return;
      demo = false;
      root.classList.remove(CLS.demo);
      showCursor(null);
      onStop();
    }
    function settleClass(c: Card, h: Pt): void {
      if (c.el.classList.contains(CLS.held) && Math.abs(c.x - h.x) + Math.abs(c.y - h.y) < 1.5 && Math.abs(c.vx) + Math.abs(c.vy) < 30) {
        c.el.classList.remove(CLS.held);
      }
    }
    var t0 = -1;
    var lastTs = 0;
    var prevT = 0;
    function frame(ts: number): void {
      if (t0 < 0) { t0 = ts; lastTs = ts; }
      var dt = clamp((ts - lastTs) / 1000, 0.001, 0.033);
      lastTs = ts;
      nowMs = ts;
      var t = (ts - t0) % CYCLE_MS;
      if (demo) {
        if (t < prevT) demoReset();
        demoAt(t);
      }
      prevT = t;
      cards.forEach(function (c: Card) { stepCard(c, dt); });
      afterStep(dt);
      draw();
      report();
      raf = requestAnimationFrame(frame);
    }
    function boot(): void {
      measure();
      cols = initialCols();
      settleNow();
      draw();
      report();
      on(window, 'resize', function () { measure(); settleNow(); draw(); });
      if (reduce) {
        root.classList.remove(CLS.demo);
      } else {
        raf = requestAnimationFrame(frame);
      }
    }

    var RING_RADIUS = 24;
    var RING_LERP = 0.12;
    var DONE_COLUMN = 1;
    var ARC_START = -90;
    var ROWS = 4;
    var FIXED_COL = 0;
    var CIRC = 2 * Math.PI * RING_RADIUS;
    var arcA = q('[data-role="arc-a"]');
    var arcB = q('[data-role="arc-b"]');
    var pctEl = q('[data-role="pct"]');
    var doneEl = q('[data-role="done"]');
    var ring = 0;
    var MOVES: number[][] = [[250, 0], [650, 1], [1050, 2], [1450, 3]];
    var demoN = 0;
    [arcA, arcB].forEach(function (a: HTMLElement) {
      a.setAttribute('r', String(RING_RADIUS));
      a.style.strokeDasharray = CIRC.toFixed(2);
      a.style.transform = 'rotate(' + ARC_START + 'deg)';
    });

    function initialCols(): number[][] {
      return [[0, 1, 2], [3]];
    }
    function targetOf(c: Card): Pt {
      var s = locate(c.i);
      return { x: slotX(s.c), y: slotY(s.r) };
    }
    function toggleCard(c: Card): void {
      var s = locate(c.i);
      cols[s.c].splice(s.r, 1);
      cols[1 - s.c].push(c.i);
    }
    function stepCard(c: Card, dt: number): void {
      var h = targetOf(c);
      spring(c, h.x, h.y, 170, 21, dt);
    }
    // 핵심: 호의 길이 = 완료 열 카드 수 ÷ 전체 카드 수. 목표가 바뀌면 RING_LERP 만큼씩 따라간다
    function goal(): number {
      return cols[DONE_COLUMN].length / cards.length;
    }
    function paintRing(): void {
      var rest = CIRC * (1 - ring);
      arcA.style.strokeDashoffset = rest.toFixed(2);
      arcB.style.strokeDashoffset = rest.toFixed(2);
      arcB.style.opacity = (ring * ring).toFixed(3);
      pctEl.textContent = Math.round(ring * 100) + '%';
      doneEl.textContent = cols[DONE_COLUMN].length + '/' + cards.length;
    }
    afterStep = function (dt: number) {
      ring += (goal() - ring) * (1 - Math.pow(1 - RING_LERP, dt * 60));
      paintRing();
    };
    extraSettle = function () {
      ring = goal();
      paintRing();
    };
    on(board, 'click', function (e: Event) {
      var c = cardAt(e.target);
      if (!c) return;
      stopDemo();
      toggleCard(c);
      sync();
    });
    function demoAt(t: number): void {
      while (demoN < MOVES.length && t >= MOVES[demoN][0]) {
        toggleCard(cards[MOVES[demoN][1]]);
        demoN++;
      }
    }
    function demoReset(): void {
      demoN = 0;
      cols = initialCols();
    }
    function metaText(): string {
      return 'RING_LERP ' + RING_LERP + ' · arc ' + (ring * 360).toFixed(0) + ' deg';
    }

    boot();

    return () => {
      cancelAnimationFrame(raf);
      off.forEach(function (fn: Off) { fn(); });
    };
  }, []);

  return (
    <main className={styles["stage"]}><div className={styles["kb"] + " " + styles["is-demo"]} ref={rootRef}><div className={styles["kb__row"]}><div className={styles["kb__board"]} data-role="board"><div className={styles["kb__track"]} data-role="track"><div className={styles["kb__col"]} data-role="col"><div className={styles["kb__head"]}><span className={styles["kb__name"]}>남은 일</span></div></div><div className={styles["kb__col"]} data-role="col"><div className={styles["kb__head"]}><span className={styles["kb__name"]}>완료</span></div></div><button className={styles["kb__card"]} type="button" data-role="card" data-tone="0"><span className={styles["kb__label"]} data-role="label">로그인 화면</span></button><button className={styles["kb__card"]} type="button" data-role="card" data-tone="1"><span className={styles["kb__label"]} data-role="label">결제 연동</span></button><button className={styles["kb__card"]} type="button" data-role="card" data-tone="2"><span className={styles["kb__label"]} data-role="label">알림 설정</span></button><button className={styles["kb__card"]} type="button" data-role="card" data-tone="3"><span className={styles["kb__label"]} data-role="label">검색 필터</span></button></div><div className={styles["kb__cursor"]} data-role="cursor"></div></div><div className={styles["kb__ringbox"]}><div className={styles["kb__dial"]}><svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true"><circle className={styles["kb__arc"] + " " + styles["kb__arc--bg"]} cx="32" cy="32" r="24"></circle><circle className={styles["kb__arc"] + " " + styles["kb__arc--a"]} data-role="arc-a" cx="32" cy="32" r="24"></circle><circle className={styles["kb__arc"] + " " + styles["kb__arc--b"]} data-role="arc-b" cx="32" cy="32" r="24"></circle></svg><span className={styles["kb__pct"]} data-role="pct"></span></div><span className={styles["kb__ringname"]}>진행률</span><span className={styles["kb__ringdone"]} data-role="done"></span></div></div><p className={styles["kb__meta"]} data-role="meta"></p></div></main>
  );
}
