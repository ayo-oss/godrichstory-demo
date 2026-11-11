import { useEffect, useRef } from 'react';
import styles from './WireworldCircuit.module.scss';

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
const PAPER = '#fff7e6';
const WIRE_COLOR = '#17141a';
const HEAD_COLOR = '#c89a8f';
const TAIL_COLOR = '#d2c7a4';

let SEED = 80801;
let rnd = makeLcg(SEED);

const EMPTY = 0, WIRE = 1, HEAD = 2, TAIL = 3;
const HEAD_NEIGHBORS_MIN = 1;
const HEAD_NEIGHBORS_MAX = 2; // 변형 08 대상 — 전선이 신호머리로 바뀌는 이웃 신호머리 수 상한

let grid = new Uint8Array(COLS * ROWS);
let next = new Uint8Array(COLS * ROWS);

function idx(x: number, y: number): number { return y * COLS + x; }

// 고정 회로: 촘촘한 지그재그 전선 — 행 간격 2칸(빈 행 하나 사이)이라 인접 가닥끼리 대각으로 겹치지 않는다.
const path: [number, number][] = [];
(function buildPath(){
  let dir = 1;
  for (let r = 0; r < 13; r++){
    const y = 3 + r * 2;
    if (dir === 1){
      for (let x = 4; x <= 43; x++) path.push([x, y]);
    } else {
      for (let x = 43; x >= 4; x--) path.push([x, y]);
    }
    if (r < 12){
      const jointX = (dir === 1) ? 43 : 4;
      path.push([jointX, y + 1]);
      dir *= -1;
    }
  }
})();

function buildCircuit(gap: number, offset: number): void {
  grid.fill(EMPTY);
  for (let i = 0; i < path.length; i++){
    grid[idx(path[i][0], path[i][1])] = WIRE;
  }
  for (let i = offset; i + 1 < path.length; i += gap){
    grid[idx(path[i][0], path[i][1])] = TAIL;
    grid[idx(path[i + 1][0], path[i + 1][1])] = HEAD;
  }
}

function neighborHeadCount(x: number, y: number): number {
  let n = 0;
  for (let dy = -1; dy <= 1; dy++){
    for (let dx = -1; dx <= 1; dx++){
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      if (grid[idx(nx, ny)] === HEAD) n++;
    }
  }
  return n;
}

function step(): void {
  for (let y = 0; y < ROWS; y++){
    for (let x = 0; x < COLS; x++){
      const i = idx(x, y);
      const s = grid[i];
      let ns = s;
      if (s === WIRE){
        const hc = neighborHeadCount(x, y);
        if (hc >= HEAD_NEIGHBORS_MIN && hc <= HEAD_NEIGHBORS_MAX) ns = HEAD;
      } else if (s === HEAD){
        ns = TAIL;
      } else if (s === TAIL){
        ns = WIRE;
      }
      next[i] = ns;
    }
  }
  const tmp = grid; grid = next; next = tmp;
}

function render(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < ROWS; y++){
    for (let x = 0; x < COLS; x++){
      const s = grid[idx(x, y)];
      if (s === EMPTY) continue;
      ctx.fillStyle = s === WIRE ? WIRE_COLOR : (s === HEAD ? HEAD_COLOR : TAIL_COLOR);
      ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 1, CELL - 1);
    }
  }
}

const ARIA_PLAY = '신호 회로 진행 중 — 클릭하거나 스페이스바로 정지, R 로 재시드';
const ARIA_PAUSE = '신호 회로 정지됨 — 클릭하거나 스페이스바로 재생, R 로 재시드';

export default function WireworldCircuit(){

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
      const gap = 10 + Math.floor(rnd() * 6);
      const offset = Math.floor(rnd() * gap);
      buildCircuit(gap, offset);
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

    const GEN_INTERVAL_MS = 45;
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

    buildCircuit(12, 0);
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
      <div ref={rootRef} className={`${styles.rv} is-demo`} tabIndex={0} role="button" aria-label="신호 회로 진행 중 — 클릭하거나 스페이스바로 정지, R 로 재시드">
        <canvas ref={cvRef} className={styles.rv__cv} width={480} height={300} />
        <p className={styles.rv__hint}>클릭·스페이스바로 정지, R 로 재시드</p>
      </div>
    </main>
  );
}
