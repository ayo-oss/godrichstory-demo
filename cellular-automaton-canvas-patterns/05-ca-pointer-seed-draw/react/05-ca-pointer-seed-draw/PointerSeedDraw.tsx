import { useEffect, useRef } from 'react';
import styles from './PointerSeedDraw.module.scss';

function ctx2d(cv: HTMLCanvasElement): CanvasRenderingContext2D {
  const c = cv.getContext('2d');
  if (!c) throw new Error('no 2d context');
  return c;
}

function makeLcg(seed: number): () => number {
  let s = seed >>> 0;
  return function(){
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const W = 480, H = 300;
const CELL = 10, COLS = W / CELL, ROWS = H / CELL;
const INK = '#17141a';
const ALIVE_COLOR = '#93a4ca';
let SEED = 50501;
let rnd = makeLcg(SEED);

const SURVIVE_MIN = 2, SURVIVE_MAX = 3, BIRTH_COUNT = 3;

let grid = new Uint8Array(COLS * ROWS);
let next = new Uint8Array(COLS * ROWS);

function idx(x: number, y: number): number { return y * COLS + x; }

function autoSeed(): void {
  grid.fill(0);
  for (let y = 8; y <= 21; y++){
    for (let x = 14; x <= 33; x++){
      if (rnd() < 0.34) grid[idx(x, y)] = 1;
    }
  }
}

function neighborCount(x: number, y: number): number {
  let n = 0;
  for (let dy = -1; dy <= 1; dy++){
    for (let dx = -1; dx <= 1; dx++){
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      n += grid[idx(nx, ny)];
    }
  }
  return n;
}

function step(): void {
  for (let y = 0; y < ROWS; y++){
    for (let x = 0; x < COLS; x++){
      const alive = grid[idx(x, y)] === 1;
      const n = neighborCount(x, y);
      let willLive = 0;
      if (alive){
        willLive = (n >= SURVIVE_MIN && n <= SURVIVE_MAX) ? 1 : 0;
      } else {
        willLive = (n === BIRTH_COUNT) ? 1 : 0;
      }
      next[idx(x, y)] = willLive;
    }
  }
  const tmp = grid; grid = next; next = tmp;
}

function render(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = ALIVE_COLOR;
  for (let y = 0; y < ROWS; y++){
    for (let x = 0; x < COLS; x++){
      if (grid[idx(x, y)] === 1){
        ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 1, CELL - 1);
      }
    }
  }
}

const ARIA_PLAY = '씨앗 그리기 진행 중 — 포인터로 칸을 그리거나 스페이스바로 정지, R 로 재시드';
const ARIA_DRAW = '씨앗 그리는 중 — 손을 떼면 규칙표로 자동 진행';
const ARIA_PAUSE = '씨앗 그리기 정지됨 — 포인터로 칸을 그리거나 스페이스바로 재생, R 로 재시드';

export default function PointerSeedDraw(){

  const rootRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!root || !cv) return;
    const rootEl: HTMLDivElement = root;
    const cvEl: HTMLCanvasElement = cv;
    const ctx = ctx2d(cvEl);

    function updateAria(): void {
      rootEl.setAttribute('aria-label', isDrawing ? ARIA_DRAW : (paused ? ARIA_PAUSE : ARIA_PLAY));
    }

    let paused = false;
    let isDrawing = false;
    const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

    function human(): void {
      if (rootEl.classList.contains('is-demo')){
        rootEl.classList.remove('is-demo');
        grid.fill(0);
      }
    }

    function reseed(): void {
      SEED = (SEED * 1103515245 + 12345) >>> 0;
      rnd = makeLcg(SEED || 1);
      autoSeed();
      paused = false;
    }

    function cellFromEvent(e: PointerEvent): [number, number] {
      const rect = cvEl.getBoundingClientRect();
      const px = (e.clientX - rect.left) * (W / rect.width);
      const py = (e.clientY - rect.top) * (H / rect.height);
      const cx = Math.max(0, Math.min(COLS - 1, Math.floor(px / CELL)));
      const cy = Math.max(0, Math.min(ROWS - 1, Math.floor(py / CELL)));
      return [cx, cy];
    }

    function paintAt(e: PointerEvent): void {
      const c = cellFromEvent(e);
      grid[idx(c[0], c[1])] = 1;
      render(ctx);
    }

    function onPointerDown(e: PointerEvent): void {
      human();
      isDrawing = true;
      paused = true;
      updateAria();
      paintAt(e);
    }

    function onPointerMove(e: PointerEvent): void {
      if (!isDrawing) return;
      paintAt(e);
    }

    function onPointerUp(): void {
      if (!isDrawing) return;
      isDrawing = false;
      paused = false;
      updateAria();
      render(ctx);
    }

    function onKey(e: KeyboardEvent): void {
      if (e.key === 'r' || e.key === 'R'){
        human();
        reseed();
        render(ctx);
        updateAria();
        return;
      }
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      human();
      if (reduceMQ.matches){
        step();
        render(ctx);
      } else {
        paused = !paused;
        updateAria();
      }
    }

    const GEN_INTERVAL_MS = 85;
    let acc = 0, last = 0, rafId = 0;

    function frame(now: number): void {
      if (!reduceMQ.matches){
        if (!last) last = now;
        const dt = now - last;
        last = now;
        if (!paused && !isDrawing){
          acc += dt;
          while (acc >= GEN_INTERVAL_MS){
            step();
            acc -= GEN_INTERVAL_MS;
          }
          render(ctx);
        }
        rafId = requestAnimationFrame(frame);
      }
    }

    function onResize(): void { render(ctx); }

    rootEl.addEventListener('pointerdown', onPointerDown);
    rootEl.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    rootEl.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);

    autoSeed();
    updateAria();
    render(ctx);
    if (!reduceMQ.matches){
      rafId = requestAnimationFrame(frame);
    }

    return () => {
      rootEl.removeEventListener('pointerdown', onPointerDown);
      rootEl.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      rootEl.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div ref={rootRef} className={`${styles.rv} is-demo`} tabIndex={0} role="button" aria-label="씨앗 그리기 진행 중 — 포인터로 칸을 그리거나 스페이스바로 정지, R 로 재시드">
        <canvas ref={cvRef} className={styles.rv__cv} width={480} height={300} />
        <p className={styles.rv__hint}>포인터로 그리기 · 스페이스바 정지 · R 재시드</p>
      </div>
    </main>
  );
}
