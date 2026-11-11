import { useEffect, useRef } from 'react';
import styles from './GliderGunScene.module.scss';

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
const CELL = 6, COLS = W / CELL, ROWS = H / CELL;
const ORANGE = '#c89a8f';
const ALIVE_COLOR = '#93a4ca';
let SEED = 30301;
let rnd = makeLcg(SEED);

const SURVIVE_MIN = 2, SURVIVE_MAX = 3, BIRTH_COUNT = 3;

// 고정 발사틀(발사기) 셀 좌표 — 36칸, 37x10 경계상자 안에서 스스로 회복하며 대각 이동체를 밀어낸다.
const GUN_CELLS: [number, number][] = [
  [1,5],[1,6],[2,5],[2,6],
  [11,5],[11,6],[11,7],[12,4],[12,8],[13,3],[13,9],[14,3],[14,9],
  [15,6],[16,4],[16,8],[17,5],[17,6],[17,7],[18,6],
  [21,3],[21,4],[21,5],[22,3],[22,4],[22,5],[23,2],[23,6],
  [25,1],[25,2],[25,6],[25,7],
  [35,3],[35,4],[36,3],[36,4]
];
const GUN_W = 37;

let grid = new Uint8Array(COLS * ROWS);
let next = new Uint8Array(COLS * ROWS);

function idx(x: number, y: number): number { return y * COLS + x; }

function placeGun(ox: number, oy: number, mirror: boolean): void {
  for (let i = 0; i < GUN_CELLS.length; i++){
    const dx = GUN_CELLS[i][0], dy = GUN_CELLS[i][1];
    const x = ox + (mirror ? (GUN_W - 1 - dx) : dx);
    const y = oy + dy;
    if (x >= 0 && x < COLS && y >= 0 && y < ROWS) grid[idx(x, y)] = 1;
  }
}

const GUN_ROWS = [4, 18, 32];

function seedGrid(offset: number): void {
  grid.fill(0);
  for (let i = 0; i < GUN_ROWS.length; i++){
    placeGun(2 + offset, GUN_ROWS[i], false);
    placeGun(COLS - 2 - (GUN_W - 1) - offset, GUN_ROWS[i], true);
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
  ctx.fillStyle = ORANGE;
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

const ARIA_PLAY = '발사틀 장면 진행 중 — 클릭하거나 스페이스바로 정지, R 로 재시드';
const ARIA_PAUSE = '발사틀 장면 정지됨 — 클릭하거나 스페이스바로 재생, R 로 재시드';

export default function GliderGunScene(){

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
      const offset = Math.floor(rnd() * 6);
      seedGrid(offset);
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

    const GEN_INTERVAL_MS = 20;
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

    seedGrid(0);
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
      <div ref={rootRef} className={`${styles.rv} is-demo`} tabIndex={0} role="button" aria-label="발사틀 장면 진행 중 — 클릭하거나 스페이스바로 정지, R 로 재시드">
        <canvas ref={cvRef} className={styles.rv__cv} width={480} height={300} />
        <p className={styles.rv__hint}>클릭·스페이스바로 정지, R 로 재시드</p>
      </div>
    </main>
  );
}
