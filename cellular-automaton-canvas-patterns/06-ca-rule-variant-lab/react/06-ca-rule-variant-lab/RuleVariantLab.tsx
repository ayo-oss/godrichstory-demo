import { useEffect, useRef } from 'react';
import styles from './RuleVariantLab.module.scss';

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
const YELLOW = '#d2c7a4';
const ALIVE_COLOR = '#93a4ca';
let SEED = 60601;
let rnd = makeLcg(SEED);

// 규칙표 값 4 세트 — 통째로 바꿔치기 대상(생존 이웃 수 집합 · 탄생 이웃 수 집합)
const RULESETS: { born: number[]; survive: number[] }[] = [
  { born: [3], survive: [2, 3] },        // Life
  { born: [3, 6], survive: [2, 3] },     // HighLife
  { born: [2], survive: [] },            // Seeds
  { born: [1, 3, 5, 7], survive: [1, 3, 5, 7] } // Replicator
];
let ruleIndex = 0;
const CYCLE_GENERATIONS = 26;
let genCount = 0;

let grid = new Uint8Array(COLS * ROWS);
let next = new Uint8Array(COLS * ROWS);
let baseSeedSnapshot: Uint8Array | null = null;

function idx(x: number, y: number): number { return y * COLS + x; }

function seedGrid(): void {
  for (let i = 0; i < grid.length; i++) grid[i] = rnd() < 0.24 ? 1 : 0;
  genCount = 0;
  ruleIndex = 0;
}

function seedSame(): void {
  if (!baseSeedSnapshot) return;
  grid.set(baseSeedSnapshot);
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
  const rule = RULESETS[ruleIndex];
  for (let y = 0; y < ROWS; y++){
    for (let x = 0; x < COLS; x++){
      const alive = grid[idx(x, y)] === 1;
      const n = neighborCount(x, y);
      const willLive = alive ? rule.survive.indexOf(n) !== -1 : rule.born.indexOf(n) !== -1;
      next[idx(x, y)] = willLive ? 1 : 0;
    }
  }
  const tmp = grid; grid = next; next = tmp;
  genCount++;
  if (genCount >= CYCLE_GENERATIONS){
    genCount = 0;
    ruleIndex = (ruleIndex + 1) % RULESETS.length;
    seedSame();
  }
}

function render(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = YELLOW;
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

const ARIA_PLAY = '규칙 실험 진행 중 — 클릭하거나 스페이스바로 정지, R 로 재시드';
const ARIA_PAUSE = '규칙 실험 정지됨 — 클릭하거나 스페이스바로 재생, R 로 재시드';

export default function RuleVariantLab(){

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
      seedGrid();
      baseSeedSnapshot = grid.slice();
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

    const GEN_INTERVAL_MS = 70;
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

    seedGrid();
    baseSeedSnapshot = grid.slice();
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
      <div ref={rootRef} className={`${styles.rv} is-demo`} tabIndex={0} role="button" aria-label="규칙 실험 진행 중 — 클릭하거나 스페이스바로 정지, R 로 재시드">
        <canvas ref={cvRef} className={styles.rv__cv} width={480} height={300} />
        <p className={styles.rv__hint}>클릭·스페이스바로 정지, R 로 재시드</p>
      </div>
    </main>
  );
}
