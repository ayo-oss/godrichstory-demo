// FollowCard — vanilla 판(kbn-drag-pointer-lerp-tilt) 의 React 포트. 집은 카드는 목표와의 거리 일부만 따라가고, 그 이동량이 기울기가 된다.
// 소스는 vanilla 와 같은 구조(공용 엔진 + 장면 코드)이고 정식 타입을 단다.
import { useEffect, useRef } from "react";
import styles from "./FollowCard.module.scss";

export default function FollowCard() {
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

    var held: Card | null = null;
    var ptr: Pt = { x: 0, y: 0 };
    var grabDX = 0;
    var grabDY = 0;
    onStop = function () { if (held) release(); };

    function local(e: PointerEvent): Pt {
      var r = board.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    function kbd(e: KeyboardEvent): void {
      var c = cardAt(e.target);
      if (!c) return;
      var k = e.key;
      if (k === ' ' || k === 'Enter') {
        e.preventDefault();
        stopDemo();
        if (held === c) {
          release();
        } else if (!held) {
          grab(c, c.x + (colW - 2 * PAD) / 2, c.y + CARD_H / 2);
        }
        sync();
        return;
      }
      if (held !== c) return;
      if (k === 'Escape') { e.preventDefault(); cancel(); sync(); return; }
      var dx = k === 'ArrowRight' ? colW + GAP : k === 'ArrowLeft' ? -(colW + GAP) : 0;
      var dy = k === 'ArrowDown' ? STEP : k === 'ArrowUp' ? -STEP : 0;
      if (dx !== 0 || dy !== 0) { e.preventDefault(); moveTo(ptr.x + dx, ptr.y + dy); sync(); }
    }
    on(board, 'pointerdown', function (e: Event) {
      var pe = e as PointerEvent;
      var c = cardAt(pe.target);
      if (!c) return;
      stopDemo();
      if (held) release();
      var p = local(pe);
      board.setPointerCapture(pe.pointerId);
      grab(c, p.x, p.y);
      sync();
    });
    on(board, 'pointermove', function (e: Event) {
      if (!held || demo) return;
      var p = local(e as PointerEvent);
      moveTo(p.x, p.y);
      sync();
    });
    function pointerEnd(): void {
      if (held && !demo) { release(); sync(); }
    }
    on(board, 'pointerup', pointerEnd);
    on(board, 'pointercancel', pointerEnd);
    on(root, 'keydown', function (e: Event) { kbd(e as KeyboardEvent); });

    var FOLLOW_LERP = 0.25;
    var TILT_MAX = 12;
    var TILT_PER_MOVE = 1.2;
    var LIFT_SHADOW = 18;
    var ROWS = 4;
    var FIXED_COL = 0;
    var tgt: Pt = { x: 0, y: 0 };
    var demoGrabbed = false;
    var grabAt: Pt = { x: 0, y: 0 };

    function initialCols(): number[][] {
      return [[0, 1, 2], [3, 4], [5, 6]];
    }
    function targetOf(c: Card): Pt {
      if (c === held) return tgt;
      var s = locate(c.i);
      return { x: slotX(s.c), y: slotY(s.r) };
    }
    function grab(c: Card, px: number, py: number): void {
      held = c;
      grabDX = px - c.x;
      grabDY = py - c.y;
      ptr = { x: px, y: py };
      tgt = { x: c.x, y: c.y };
      c.el.classList.add(CLS.held);
      c.el.setAttribute('aria-pressed', 'true');
    }
    function moveTo(px: number, py: number): void {
      ptr = { x: clamp(px, 0, boardW), y: clamp(py, 0, boardH) };
      tgt = { x: ptr.x - grabDX, y: ptr.y - grabDY };
    }
    function release(): void {
      if (held) {
        held.el.setAttribute('aria-pressed', 'false');
        held = null;
      }
    }
    function cancel(): void {
      release();
    }
    // 핵심: 집은 카드는 목표와의 거리 FOLLOW_LERP 만큼만 따라가고, 그 이동량으로 기울기가 정해진다
    function stepCard(c: Card, dt: number): void {
      var f = dt * 60;
      if (c === held) {
        var k = reduce ? 1 : 1 - Math.pow(1 - FOLLOW_LERP, f);
        var nx = c.x + (tgt.x - c.x) * k;
        var ny = c.y + (tgt.y - c.y) * k;
        var move = (nx - c.x) / f;
        c.vx = (nx - c.x) / dt;
        c.vy = (ny - c.y) / dt;
        c.x = nx;
        c.y = ny;
        var want = clamp(move * TILT_PER_MOVE, -TILT_MAX, TILT_MAX);
        c.rot += (want - c.rot) * (1 - Math.pow(0.7, f));
        c.lift += (1 - c.lift) * (1 - Math.pow(0.75, f));
      } else {
        var h = targetOf(c);
        spring(c, h.x, h.y, 180, 22, dt);
        c.rot += (0 - c.rot) * (1 - Math.pow(0.8, f));
        c.lift += (0 - c.lift) * (1 - Math.pow(0.75, f));
        settleClass(c, h);
      }
      c.sc = 1 + 0.05 * c.lift;
      c.el.style.setProperty('--lift-px', (c.lift * LIFT_SHADOW).toFixed(1) + 'px');
    }
    function demoAt(t: number): void {
      var c = cards[0];
      if (t >= 200 && t < 1700) {
        if (!demoGrabbed) {
          demoGrabbed = true;
          grab(c, c.x + (colW - 2 * PAD) / 2, c.y + CARD_H / 2);
          grabAt = { x: ptr.x, y: ptr.y };
        }
        var u = (t - 200) / 1500;
        var sweep = 0.5 - 0.5 * Math.cos(u * Math.PI * 2);
        moveTo(grabAt.x + boardW * 0.6 * sweep, grabAt.y + boardH * 0.22 * Math.sin(u * Math.PI * 4));
        showCursor(ptr);
      } else {
        if (held) release();
        showCursor(null);
      }
    }
    function demoReset(): void {
      demoGrabbed = false;
    }
    function metaText(): string {
      var tilt = 0;
      cards.forEach(function (c: Card) { if (Math.abs(c.rot) > Math.abs(tilt)) tilt = c.rot; });
      return 'FOLLOW_LERP ' + FOLLOW_LERP + ' · tilt ' + tilt.toFixed(1) + '°';
    }

    boot();

    return () => {
      cancelAnimationFrame(raf);
      off.forEach(function (fn: Off) { fn(); });
    };
  }, []);

  return (
    <main className={styles["stage"]}><div className={styles["kb"] + " " + styles["is-demo"]} ref={rootRef}><div className={styles["kb__board"]} data-role="board"><div className={styles["kb__track"]} data-role="track"><div className={styles["kb__col"]} data-role="col"><div className={styles["kb__head"]}><span className={styles["kb__name"]}>할 일</span></div></div><div className={styles["kb__col"]} data-role="col"><div className={styles["kb__head"]}><span className={styles["kb__name"]}>진행 중</span></div></div><div className={styles["kb__col"]} data-role="col"><div className={styles["kb__head"]}><span className={styles["kb__name"]}>완료</span></div></div><div className={styles["kb__card"]} role="button" tabIndex="0" data-role="card" data-tone="0" aria-pressed="false"><span className={styles["kb__label"]} data-role="label">로그인 화면</span></div><div className={styles["kb__card"]} role="button" tabIndex="0" data-role="card" data-tone="1" aria-pressed="false"><span className={styles["kb__label"]} data-role="label">결제 연동</span></div><div className={styles["kb__card"]} role="button" tabIndex="0" data-role="card" data-tone="2" aria-pressed="false"><span className={styles["kb__label"]} data-role="label">알림 설정</span></div><div className={styles["kb__card"]} role="button" tabIndex="0" data-role="card" data-tone="3" aria-pressed="false"><span className={styles["kb__label"]} data-role="label">검색 필터</span></div><div className={styles["kb__card"]} role="button" tabIndex="0" data-role="card" data-tone="0" aria-pressed="false"><span className={styles["kb__label"]} data-role="label">문서 정리</span></div><div className={styles["kb__card"]} role="button" tabIndex="0" data-role="card" data-tone="1" aria-pressed="false"><span className={styles["kb__label"]} data-role="label">오류 수정</span></div><div className={styles["kb__card"]} role="button" tabIndex="0" data-role="card" data-tone="2" aria-pressed="false"><span className={styles["kb__label"]} data-role="label">배포 점검</span></div></div><div className={styles["kb__cursor"]} data-role="cursor"></div></div><p className={styles["kb__meta"]} data-role="meta"></p></div></main>
  );
}
