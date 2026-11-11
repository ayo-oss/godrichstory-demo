// PrioritySort — vanilla 판(kbn-priority-sort-flip-stagger) 의 React 포트. 정렬 전후 좌표 차(FLIP)를 거꾸로 적용하고 순번마다 시작 시각을 어긋나게 둔다.
// 소스는 vanilla 와 같은 구조(공용 엔진 + 장면 코드)이고 정식 타입을 단다.
import { useEffect, useRef } from "react";
import styles from "./PrioritySort.module.scss";

export default function PrioritySort() {
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

    var FLIP_DURATION = 420;
    var STAGGER_STEP = 45;
    var PRIORITY_ORDER: number[] = [0, 1, 2];
    var EASE_POWER = 3;
    var PRIO: number[] = [2, 0, 1, 1, 2, 0, 2];
    var ROWS = 3;
    var FIXED_COL = 0;
    type Flip = { fx: number; fy: number; tx: number; ty: number; start: number; delay: number };
    var flips: Flip[] = [];
    var sorted = false;
    var btn = q('[data-role="sort"]');
    var demoStep = 0;
    var TOGGLES: number[] = [250, 1250];

    function initialCols(): number[][] {
      return [[0, 1, 2], [3, 4], [5, 6]];
    }
    function sortedCols(): number[][] {
      var order: number[] = [];
      PRIORITY_ORDER.forEach(function (p: number) {
        PRIO.forEach(function (v: number, i: number) { if (v === p) order.push(i); });
      });
      return [order.slice(0, 3), order.slice(3, 5), order.slice(5, 7)];
    }
    function targetOf(c: Card): Pt {
      var s = locate(c.i);
      return { x: slotX(s.c), y: slotY(s.r) };
    }
    // 핵심: 옮기기 전 좌표(First)와 옮긴 뒤 좌표(Last)의 차를 거꾸로 적용하고, 순번마다 늦게 시작해 0 으로 보낸다
    function toggleSort(): void {
      sorted = !sorted;
      cols = sorted ? sortedCols() : initialCols();
      var rank = 0;
      cols.forEach(function (list: number[]) {
        list.forEach(function (i: number) {
          var c = cards[i];
          var t = targetOf(c);
          flips[i] = { fx: c.x, fy: c.y, tx: t.x, ty: t.y, start: nowMs, delay: rank * STAGGER_STEP };
          rank++;
        });
      });
      btn.setAttribute('aria-pressed', sorted ? 'true' : 'false');
    }
    function stepCard(c: Card, dt: number): void {
      var f = flips[c.i];
      var p = clamp((nowMs - f.start - f.delay) / FLIP_DURATION, 0, 1);
      var e = 1 - Math.pow(1 - p, EASE_POWER);
      var invX = f.fx - f.tx;
      var invY = f.fy - f.ty;
      c.x = f.tx + invX * (1 - e);
      c.y = f.ty + invY * (1 - e);
      c.lift = p > 0 && p < 1 ? Math.sin(p * Math.PI) : 0;
      c.sc = 1 + 0.06 * c.lift;
      c.rot = clamp((invX * (1 - e)) / 24, -5, 5);
      c.el.style.setProperty('--lift-px', (c.lift * 12).toFixed(1) + 'px');
    }
    extraSettle = function () {
      cards.forEach(function (c: Card) {
        flips[c.i] = { fx: c.x, fy: c.y, tx: c.x, ty: c.y, start: -1000000, delay: 0 };
      });
    };
    on(btn, 'click', function () {
      stopDemo();
      toggleSort();
      sync();
    });
    function demoAt(t: number): void {
      if (demoStep < TOGGLES.length && t >= TOGGLES[demoStep]) {
        toggleSort();
        demoStep++;
      }
    }
    function demoReset(): void {
      demoStep = 0;
      if (sorted) toggleSort();
    }
    function metaText(): string {
      var n = 0;
      flips.forEach(function (f: Flip) {
        if (nowMs - f.start < FLIP_DURATION + f.delay) n++;
      });
      return 'FLIP_DURATION ' + FLIP_DURATION + ' · moving ' + n;
    }

    boot();

    return () => {
      cancelAnimationFrame(raf);
      off.forEach(function (fn: Off) { fn(); });
    };
  }, []);

  return (
    <main className={styles["stage"]}><div className={styles["kb"] + " " + styles["is-demo"]} ref={rootRef}><div className={styles["kb__board"]} data-role="board"><div className={styles["kb__track"]} data-role="track"><div className={styles["kb__col"]} data-role="col"><div className={styles["kb__head"]}><span className={styles["kb__name"]}>할 일</span></div></div><div className={styles["kb__col"]} data-role="col"><div className={styles["kb__head"]}><span className={styles["kb__name"]}>진행 중</span></div></div><div className={styles["kb__col"]} data-role="col"><div className={styles["kb__head"]}><span className={styles["kb__name"]}>완료</span></div></div><div className={styles["kb__card"]} role="button" tabIndex="0" data-role="card" data-tone="1" aria-pressed="false"><span className={styles["kb__label"]} data-role="label">로그인 화면</span><i className={styles["kb__prio"]}>P3</i></div><div className={styles["kb__card"]} role="button" tabIndex="0" data-role="card" data-tone="3" aria-pressed="false"><span className={styles["kb__label"]} data-role="label">결제 연동</span><i className={styles["kb__prio"]}>P1</i></div><div className={styles["kb__card"]} role="button" tabIndex="0" data-role="card" data-tone="0" aria-pressed="false"><span className={styles["kb__label"]} data-role="label">알림 설정</span><i className={styles["kb__prio"]}>P2</i></div><div className={styles["kb__card"]} role="button" tabIndex="0" data-role="card" data-tone="0" aria-pressed="false"><span className={styles["kb__label"]} data-role="label">검색 필터</span><i className={styles["kb__prio"]}>P2</i></div><div className={styles["kb__card"]} role="button" tabIndex="0" data-role="card" data-tone="1" aria-pressed="false"><span className={styles["kb__label"]} data-role="label">문서 정리</span><i className={styles["kb__prio"]}>P3</i></div><div className={styles["kb__card"]} role="button" tabIndex="0" data-role="card" data-tone="3" aria-pressed="false"><span className={styles["kb__label"]} data-role="label">오류 수정</span><i className={styles["kb__prio"]}>P1</i></div><div className={styles["kb__card"]} role="button" tabIndex="0" data-role="card" data-tone="1" aria-pressed="false"><span className={styles["kb__label"]} data-role="label">배포 점검</span><i className={styles["kb__prio"]}>P3</i></div></div><div className={styles["kb__cursor"]} data-role="cursor"></div></div><div className={styles["kb__bar"]}><button className={styles["kb__btn"]} type="button" data-role="sort" aria-pressed="false"><span className={styles["kb__lab"] + " " + styles["kb__lab--a"]}>우선순위 정렬</span><span className={styles["kb__lab"] + " " + styles["kb__lab--b"]}>원래 순서</span></button><p className={styles["kb__meta"]} data-role="meta"></p></div></div></main>
  );
}
