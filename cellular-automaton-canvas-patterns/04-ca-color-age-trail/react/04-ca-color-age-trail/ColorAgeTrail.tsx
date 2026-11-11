import { useEffect, useRef } from 'react';
import styles from './ColorAgeTrail.module.scss';

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
const TRAIL_LOW = [225, 219, 201];
const TRAIL_HIGH = [147, 164, 202];

let SEED = 40401;
let rnd = makeLcg(SEED);

const SURVIVE_MIN = 2, SURVIVE_MAX = 3, BIRTH_COUNT = 3;
const AGE_CAP = 10;
const TRAIL_DECAY = 1; // 변형 04 대상 — 죽은 뒤 나이 값이 세대마다 줄어드는 속도

let alive = new Uint8Array(COLS * ROWS);
let nextAlive = new Uint8Array(COLS * ROWS);
const age = new Uint8Array(COLS * ROWS);

function idx(x: number, y: number): number { return y * COLS + x; }

function seedGrid(): void {
  for (let i = 0; i < alive.length; i++){
    alive[i] = rnd() < 0.3 ? 1 : 0;
    age[i] = 0;
  }
}

function neighborCount(x: number, y: number): number {
  let n = 0;
  for (let dy = -1; dy <= 1; dy++){
    for (let dx = -1; dx <= 1; dx++){
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      n += alive[idx(nx, ny)];
    }
  }
  return n;
}

function step(): void {
  for (let y = 0; y < ROWS; y++){
    for (let x = 0; x < COLS; x++){
      const i = idx(x, y);
      const wasAlive = alive[i] === 1;
      const n = neighborCount(x, y);
      let willLive = 0;
      if (wasAlive){
        willLive = (n >= SURVIVE_MIN && n <= SURVIVE_MAX) ? 1 : 0;
      } else {
        willLive = (n === BIRTH_COUNT) ? 1 : 0;
      }
      nextAlive[i] = willLive;
    }
  }
  for (let i = 0; i < alive.length; i++){
    if (nextAlive[i]){
      age[i] = Math.min(AGE_CAP, age[i] + 1);
    } else {
      age[i] = Math.max(0, age[i] - TRAIL_DECAY);
    }
  }
  const tmp = alive; alive = nextAlive; nextAlive = tmp;
}

function render(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < ROWS; y++){
    for (let x = 0; x < COLS; x++){
      const i = idx(x, y);
      const a = age[i];
      if (a === 0) continue;
      const t = a / AGE_CAP;
      const r = Math.round(TRAIL_LOW[0] + (TRAIL_HIGH[0] - TRAIL_LOW[0]) * t);
      const g = Math.round(TRAIL_LOW[1] + (TRAIL_HIGH[1] - TRAIL_LOW[1]) * t);
      const b = Math.round(TRAIL_LOW[2] + (TRAIL_HIGH[2] - TRAIL_LOW[2]) * t);
      ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
      ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 1, CELL - 1);
    }
  }
}

const ARIA_PLAY = '나이 잔상 진행 중 — 클릭하거나 스페이스바로 정지, R 로 재시드';
const ARIA_PAUSE = '나이 잔상 정지됨 — 클릭하거나 스페이스바로 재생, R 로 재시드';

export default function ColorAgeTrail(){

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

    const GEN_INTERVAL_MS = 85;
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
      <div ref={rootRef} className={`${styles.rv} is-demo`} tabIndex={0} role="button" aria-label="나이 잔상 진행 중 — 클릭하거나 스페이스바로 정지, R 로 재시드">
        <canvas ref={cvRef} className={styles.rv__cv} width={480} height={300} />
        <p className={styles.rv__hint}>클릭·스페이스바로 정지, R 로 재시드</p>
      </div>
    </main>
  );
}
