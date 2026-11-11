import { useEffect, useRef } from 'react';
import styles from './ElementaryRuleStrip.module.scss';

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
const CELL = 5, COLS = W / CELL, ROWS = H / CELL;
const YELLOW = '#d2c7a4';
const ALIVE_COLOR = '#93a4ca';
let SEED = 30071;
let rnd = makeLcg(SEED);

const RULE = 30; // 울프럼 초등 오토마타 규칙 번호(이진 8비트) — 왼쪽·자신·오른쪽 조합마다 생사 결정
const ruleBits = new Uint8Array(8);
for (let p = 0; p < 8; p++) ruleBits[p] = (RULE >> p) & 1;

const grid = new Uint8Array(COLS * ROWS);

function idx(x: number, y: number): number { return y * COLS + x; }

function clearGrid(): void {
  grid.fill(0);
}

function seedRow(seedX: number): void {
  grid[idx(seedX, ROWS - 1)] = 1;
}

function step(): void {
  grid.copyWithin(0, COLS, ROWS * COLS);
  const base = (ROWS - 2) * COLS;
  const outBase = (ROWS - 1) * COLS;
  for (let x = 0; x < COLS; x++){
    const l = grid[base + ((x - 1 + COLS) % COLS)];
    const m = grid[base + x];
    const r = grid[base + ((x + 1) % COLS)];
    const pattern = l * 4 + m * 2 + r;
    grid[outBase + x] = ruleBits[pattern];
  }
}

function render(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = YELLOW;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = ALIVE_COLOR;
  for (let y = 0; y < ROWS; y++){
    for (let x = 0; x < COLS; x++){
      if (grid[idx(x, y)] === 1){
        ctx.fillRect(x * CELL, y * CELL, CELL - 1, CELL - 1);
      }
    }
  }
}

const ARIA_PLAY = '규칙 스트립 진행 중 — 클릭하거나 스페이스바로 정지, R 로 재시드';
const ARIA_PAUSE = '규칙 스트립 정지됨 — 클릭하거나 스페이스바로 재생, R 로 재시드';

export default function ElementaryRuleStrip(){

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
      rootEl.setAttribute('aria-label', paused ? ARIA_PAUSE : ARIA_PLAY);
    }

    let paused = false;
    const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

    function human(): void { rootEl.classList.remove('is-demo'); }

    function reseed(): void {
      SEED = (SEED * 1103515245 + 12345) >>> 0;
      rnd = makeLcg(SEED || 1);
      clearGrid();
      const seedX = Math.floor(rnd() * COLS);
      seedRow(seedX);
    }

    function togglePause(): void {
      paused = !paused;
      updateAria();
    }

    function onActivate(e: Event): void {
      if (e.type === 'keydown'){
        const ke = e as KeyboardEvent;
        if (ke.key === 'r' || ke.key === 'R'){
          human();
          reseed();
          render(ctx);
          return;
        }
        if (ke.key !== 'Enter' && ke.key !== ' ') return;
        ke.preventDefault();
      }
      human();
      if (reduceMQ.matches){
        step();
        render(ctx);
      } else {
        togglePause();
      }
    }

    const GEN_INTERVAL_MS = 32;
    let acc = 0, last = 0, rafId = 0;

    function frame(now: number): void {
      if (!reduceMQ.matches){
        if (!last) last = now;
        const dt = now - last;
        last = now;
        if (!paused){
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

    rootEl.addEventListener('click', onActivate);
    rootEl.addEventListener('keydown', onActivate);
    window.addEventListener('resize', onResize);

    clearGrid();
    seedRow(Math.floor(COLS / 2));
    updateAria();
    render(ctx);
    if (!reduceMQ.matches){
      rafId = requestAnimationFrame(frame);
    }

    return () => {
      rootEl.removeEventListener('click', onActivate);
      rootEl.removeEventListener('keydown', onActivate);
      window.removeEventListener('resize', onResize);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div ref={rootRef} className={`${styles.rv} is-demo`} tabIndex={0} role="button" aria-label="규칙 스트립 진행 중 — 클릭하거나 스페이스바로 정지, R 로 재시드">
        <canvas ref={cvRef} className={styles.rv__cv} width={480} height={300} />
        <p className={styles.rv__hint}>클릭·스페이스바로 정지, R 로 재시드</p>
      </div>
    </main>
  );
}
