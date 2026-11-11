import { useEffect, useRef } from 'react';
import styles from './XfIconGridArrange.module.scss';

const GRID_COLS = 3;
const CELL_W = 58;
const CELL_H = 46;
const ORIGIN_X = 10;
const ORIGIN_Y = 12;
const HOP_MS = 480;
const HOLD_MS = 900;
const SCATTER = [
  { x: 6, y: 6 }, { x: 138, y: 16 }, { x: 62, y: 66 },
  { x: 168, y: 58 }, { x: 24, y: 100 }, { x: 150, y: 104 }
];

export default function XfIconGridArrange() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene0 = sceneRef.current;
    if (!scene0) return undefined;
    const scene = scene0;
    const chips = Array.from(scene.querySelectorAll<HTMLDivElement>('.' + styles.chip));
    const btn0 = scene.querySelector<HTMLButtonElement>('.' + styles.arrangeBtn);
    const status0 = scene.querySelector<HTMLDivElement>('.' + styles.status);
    if (chips.length === 0 || !btn0 || !status0) return undefined;
    const btn = btn0;
    const status = status0;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let arranged = false;
    let current = SCATTER.map((p) => ({ x: p.x, y: p.y }));
    let rafId = 0;
    let timers: number[] = [];

    function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

    // 격자 인덱스 → 좌표: col = i % GRID_COLS, row = floor(i / GRID_COLS), 그 위치에
    // ORIGIN + col*CELL_W / row*CELL_H 를 더해 칩 하나하나의 목표 좌표를 산술로 얻는다.
    function gridTarget(i: number) {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      return { x: ORIGIN_X + col * CELL_W, y: ORIGIN_Y + row * CELL_H };
    }

    function paint() {
      chips.forEach((chip, i) => {
        chip.style.transform = 'matrix(1,0,0,1,' + current[i].x.toFixed(1) + ',' + current[i].y.toFixed(1) + ')';
      });
    }

    function animateTo(targets: Array<{ x: number; y: number }>, onDone?: () => void) {
      const from = current.map((p) => ({ x: p.x, y: p.y }));
      const start = performance.now();
      function step(now: number) {
        const p = Math.min(1, (now - start) / HOP_MS);
        const e = easeOutCubic(p);
        for (let i = 0; i < chips.length; i++) {
          current[i] = {
            x: from[i].x + (targets[i].x - from[i].x) * e,
            y: from[i].y + (targets[i].y - from[i].y) * e
          };
        }
        paint();
        if (p < 1) rafId = requestAnimationFrame(step);
        else if (onDone) onDone();
      }
      rafId = requestAnimationFrame(step);
    }

    function toggleArrange() {
      arranged = !arranged;
      const targets = arranged ? chips.map((_, i) => gridTarget(i)) : SCATTER;
      status.textContent = arranged ? '정렬됨' : '흩어짐';
      btn.setAttribute('aria-pressed', String(arranged));
      animateTo(targets);
    }

    function human() {
      if (scene.classList.contains(styles['is-demo'])) {
        scene.classList.remove(styles['is-demo']);
        timers.forEach((t) => window.clearTimeout(t));
        timers = [];
      }
    }

    function onClick() {
      human();
      toggleArrange();
    }

    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', onClick);

    paint();

    // reduce: 실사용 경로 적용 — 버튼 클릭은 위 toggleArrange() 가 트윈으로 즉시 목표 좌표까지 움직인다.
    // 아래 자동 루프는 시연 게이트만 — 흩어짐↔정렬을 스스로 반복하며 reduce 에서는 돌지 않는다.
    function loop() {
      if (!scene.classList.contains(styles['is-demo'])) return;
      toggleArrange();
      timers.push(window.setTimeout(loop, HOP_MS + HOLD_MS));
    }

    if (!reduce) {
      timers.push(window.setTimeout(loop, HOLD_MS));
    }

    return () => {
      btn.removeEventListener('click', onClick);
      timers.forEach((t) => window.clearTimeout(t));
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.scene + ' ' + styles['is-demo']} ref={sceneRef}>
        <div className={styles.frame}>
          <div className={styles.chip} data-i="0"><span className={styles.chipGlyph}></span></div>
          <div className={styles.chip} data-i="1"><span className={styles.chipGlyph}></span></div>
          <div className={styles.chip} data-i="2"><span className={styles.chipGlyph}></span></div>
          <div className={styles.chip} data-i="3"><span className={styles.chipGlyph}></span></div>
          <div className={styles.chip} data-i="4"><span className={styles.chipGlyph}></span></div>
          <div className={styles.chip} data-i="5"><span className={styles.chipGlyph}></span></div>
        </div>
        <button type="button" className={styles.arrangeBtn}>정렬</button>
        <div className={styles.status} aria-live="polite">흩어짐</div>
      </div>
    </main>
  );
}
