// KeyboardMove — vanilla 판(kbn-keyboard-move-announce) 의 React 포트. 키로 카드를 고르고 옮긴 뒤 결과를 aria-live 영역에 문장으로 알린다.
// 소스는 vanilla 와 같은 구조(공용 엔진 + 장면 코드)이고 정식 타입을 단다.
import { useEffect, useRef } from "react";
import styles from "./KeyboardMove.module.scss";

export default function KeyboardMove() {
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
    var CLS = { demo: styles["is-demo"], held: styles["is-held"], picked: styles["is-picked"], focus: styles["is-focus"], on: styles["is-on"] };
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

    var LIVE_REGION = q('[data-role="live"]');
    var MOVE_STEP = 1;
    var FOCUS_RING = 3;
    type Dict = { [k: string]: string };
    function tpl(name: string): string {
      return q('[data-msg="' + name + '"]').textContent as string;
    }
    var ANNOUNCE_TEXT: Dict = { pick: tpl('pick'), move: tpl('move'), drop: tpl('drop'), cancel: tpl('cancel') };
    var ROWS = 4;
    var FIXED_COL = 0;
    var picked: Card | null = null;
    var origin: Slot = { c: 0, r: 0 };
    var keyEls = qa('[data-key]');
    var pulses: number[] = keyEls.map(function () { return 0; });
    var SCRIPT: string[][] = [['250', ' '], ['520', 'ArrowRight'], ['800', 'ArrowRight'], ['1080', 'ArrowDown'], ['1380', 'Enter']];
    var demoN = 0;
    board.style.setProperty('--focus-ring', FOCUS_RING + 'px');

    function initialCols(): number[][] {
      return [[0, 1, 2], [3, 4], [5, 6]];
    }
    function targetOf(c: Card): Pt {
      var s = locate(c.i);
      return { x: slotX(s.c), y: slotY(s.r) };
    }
    function stepCard(c: Card, dt: number): void {
      var h = targetOf(c);
      spring(c, h.x, h.y, 170, 21, dt);
      c.lift += ((c === picked ? 1 : 0) - c.lift) * (1 - Math.pow(0.75, dt * 60));
      c.sc = 1 + 0.05 * c.lift;
      c.el.style.setProperty('--lift-px', (c.lift * 14).toFixed(1) + 'px');
    }
    // 옮긴 결과를 문장으로 만들어 보조 기술용 영역(aria-live)에 쓴다
    function say(kind: string, c: Card): void {
      var s = locate(c.i);
      var label = (c.el.querySelector('[data-role="label"]') as HTMLElement).textContent as string;
      LIVE_REGION.textContent = ANNOUNCE_TEXT[kind]
        .replace('%card%', label)
        .replace('%col%', String(s.c + 1))
        .replace('%row%', String(s.r + 1));
    }
    function moveCard(c: Card, nc: number, nr: number): void {
      var s = locate(c.i);
      cols[s.c].splice(s.r, 1);
      cols[nc].splice(nr, 0, c.i);
    }
    function setPicked(c: Card | null): void {
      if (picked) {
        picked.el.setAttribute('aria-pressed', 'false');
        picked.el.classList.remove(CLS.picked);
      }
      picked = c;
      if (c) {
        c.el.setAttribute('aria-pressed', 'true');
        c.el.classList.add(CLS.picked);
      }
    }
    function press(k: string, c: Card): void {
      var s = locate(c.i);
      if (k === ' ' || k === 'Enter') {
        if (picked === c) {
          setPicked(null);
          say('drop', c);
        } else if (!picked) {
          origin = { c: s.c, r: s.r };
          setPicked(c);
          say('pick', c);
        }
        return;
      }
      if (picked !== c) return;
      if (k === 'Escape') {
        moveCard(c, origin.c, Math.min(origin.r, cols[origin.c].length));
        setPicked(null);
        say('cancel', c);
        return;
      }
      var nc = s.c;
      var nr = s.r;
      if (k === 'ArrowRight') nc = Math.min(COLS - 1, s.c + MOVE_STEP);
      if (k === 'ArrowLeft') nc = Math.max(0, s.c - MOVE_STEP);
      if (k === 'ArrowDown') nr = s.r + MOVE_STEP;
      if (k === 'ArrowUp') nr = s.r - MOVE_STEP;
      nr = nc === s.c ? clamp(nr, 0, cols[nc].length - 1) : Math.min(nr, cols[nc].length);
      if (nc === s.c && nr === s.r) return;
      moveCard(c, nc, nr);
      say('move', c);
    }
    function pulseKey(k: string): void {
      keyEls.forEach(function (el: HTMLElement, i: number) {
        if (el.getAttribute('data-key') === k) pulses[i] = 1;
      });
    }
    afterStep = function (dt: number) {
      keyEls.forEach(function (el: HTMLElement, i: number) {
        pulses[i] *= Math.pow(0.9, dt * 60);
        el.classList.toggle(CLS.on, pulses[i] > 0.25);
      });
    };
    on(root, 'keydown', function (e: Event) {
      var ke = e as KeyboardEvent;
      var c = cardAt(ke.target);
      if (!c) return;
      if (ke.key.indexOf('Arrow') !== 0 && ke.key !== ' ' && ke.key !== 'Enter' && ke.key !== 'Escape') return;
      ke.preventDefault();
      stopDemo();
      pulseKey(ke.key);
      press(ke.key, c);
      sync();
    });
    function demoAt(t: number): void {
      var c = cards[0];
      c.el.classList.add(CLS.focus);
      while (demoN < SCRIPT.length && t >= Number(SCRIPT[demoN][0])) {
        pulseKey(SCRIPT[demoN][1]);
        press(SCRIPT[demoN][1], c);
        demoN++;
      }
    }
    function demoReset(): void {
      demoN = 0;
      setPicked(null);
      cols = initialCols();
      LIVE_REGION.textContent = tpl('hint');
    }
    extraSettle = function () {
      cards.forEach(function (c: Card) { c.el.classList.remove(CLS.focus); });
    };
    function metaText(): string {
      return '';
    }

    boot();

    return () => {
      cancelAnimationFrame(raf);
      off.forEach(function (fn: Off) { fn(); });
    };
  }, []);

  return (
    <main className={styles["stage"]}><div className={styles["kb"] + " " + styles["is-demo"]} ref={rootRef}><div className={styles["kb__board"]} data-role="board"><div className={styles["kb__track"]} data-role="track"><div className={styles["kb__col"]} data-role="col"><div className={styles["kb__head"]}><span className={styles["kb__name"]}>할 일</span></div></div><div className={styles["kb__col"]} data-role="col"><div className={styles["kb__head"]}><span className={styles["kb__name"]}>진행 중</span></div></div><div className={styles["kb__col"]} data-role="col"><div className={styles["kb__head"]}><span className={styles["kb__name"]}>완료</span></div></div><button className={styles["kb__card"]} type="button" data-role="card" data-tone="0" aria-pressed="false"><span className={styles["kb__label"]} data-role="label">로그인 화면</span></button><button className={styles["kb__card"]} type="button" data-role="card" data-tone="1" aria-pressed="false"><span className={styles["kb__label"]} data-role="label">결제 연동</span></button><button className={styles["kb__card"]} type="button" data-role="card" data-tone="2" aria-pressed="false"><span className={styles["kb__label"]} data-role="label">알림 설정</span></button><button className={styles["kb__card"]} type="button" data-role="card" data-tone="3" aria-pressed="false"><span className={styles["kb__label"]} data-role="label">검색 필터</span></button><button className={styles["kb__card"]} type="button" data-role="card" data-tone="0" aria-pressed="false"><span className={styles["kb__label"]} data-role="label">문서 정리</span></button><button className={styles["kb__card"]} type="button" data-role="card" data-tone="1" aria-pressed="false"><span className={styles["kb__label"]} data-role="label">오류 수정</span></button><button className={styles["kb__card"]} type="button" data-role="card" data-tone="2" aria-pressed="false"><span className={styles["kb__label"]} data-role="label">배포 점검</span></button></div><div className={styles["kb__cursor"]} data-role="cursor"></div></div><div className={styles["kb__bar"]}><p className={styles["kb__live"]} data-role="live" aria-live="polite">Space 로 집고 방향키로 옮기세요</p><div className={styles["kb__keys"]}><kbd className={styles["kb__key"]} data-key="ArrowLeft">←</kbd><kbd className={styles["kb__key"]} data-key="ArrowRight">→</kbd><kbd className={styles["kb__key"]} data-key="ArrowUp">↑</kbd><kbd className={styles["kb__key"]} data-key="ArrowDown">↓</kbd><kbd className={styles["kb__key"]} data-key=" ">Space</kbd><kbd className={styles["kb__key"]} data-key="Escape">Esc</kbd></div></div><span hidden data-msg="pick">%card% 집음 — 열 %col%, 순서 %row%</span><span hidden data-msg="move">열 %col%, 순서 %row% 로 이동</span><span hidden data-msg="drop">%card% 놓음 — 열 %col%, 순서 %row%</span><span hidden data-msg="cancel">%card% 취소 — 원래 자리로</span><span hidden data-msg="hint">Space 로 집고 방향키로 옮기세요</span><p hidden data-role="meta"></p></div></main>
  );
}
