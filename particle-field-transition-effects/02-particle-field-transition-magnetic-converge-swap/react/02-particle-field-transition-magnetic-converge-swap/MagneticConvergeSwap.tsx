import { useEffect, useRef } from 'react';
import styles from './MagneticConvergeSwap.module.scss';

interface Particle {
  gx: number; gy: number; cx: number; cy: number;
  cellW: number; cellH: number;
  ca: number[]; cb: number[];
  r0: number; ang0: number;
  seed: number; seed2: number;
}

  function makeLcg(seed: number): () => number {
    let s = seed >>> 0;
    return function(){
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  const W = 480, H = 300;
  const CENTER_X = W / 2, CENTER_Y = H / 2;
  const COLS = 56, ROWS = 35;
  const SEED = 39602;
  const rnd = makeLcg(SEED);
  const PANEL_BG = '#fff7e6';
  const INK = '#17141a';
  const ACCENT = '#90c8b5';

  function clampN(v: number, a: number, b: number): number { return v < a ? a : (v > b ? b : v); }
  function easeInOut(t: number): number { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function roundRectPath(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    const rr = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + rr, y);
    g.arcTo(x + w, y, x + w, y + h, rr);
    g.arcTo(x + w, y + h, x, y + h, rr);
    g.arcTo(x, y + h, x, y, rr);
    g.arcTo(x, y, x + w, y, rr);
    g.closePath();
  }

  function paintList(g: CanvasRenderingContext2D): void {
    g.fillStyle = PANEL_BG;
    g.fillRect(0, 0, W, H);
    const rows = 6, padX = 22, padY = 18;
    const rowH = (H - padY * 2) / rows;
    for (let i = 0; i < rows; i++){
      const y = padY + i * rowH + rowH * 0.12;
      const h = rowH * 0.76;
      g.fillStyle = ACCENT;
      roundRectPath(g, padX, y, W - padX * 2, h, 10);
      g.fill();
      g.fillStyle = INK;
      g.globalAlpha = 0.85;
      g.beginPath();
      g.arc(padX + h / 2, y + h / 2, h * 0.32, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
      const barX = padX + h + 14;
      const barW = W - padX * 2 - h - 14;
      g.fillStyle = PANEL_BG;
      g.globalAlpha = 0.9;
      roundRectPath(g, barX, y + h * 0.22, barW * 0.78, h * 0.2, 4);
      g.fill();
      roundRectPath(g, barX, y + h * 0.56, barW * 0.5, h * 0.16, 4);
      g.fill();
      g.globalAlpha = 1;
    }
  }

  function paintGrid(g: CanvasRenderingContext2D): void {
    g.fillStyle = PANEL_BG;
    g.fillRect(0, 0, W, H);
    const cols = 3, rows = 2, pad = 20, gap = 14;
    const tileW = (W - pad * 2 - gap * (cols - 1)) / cols;
    const tileH = (H - pad * 2 - gap * (rows - 1)) / rows;
    for (let r = 0; r < rows; r++){
      for (let c = 0; c < cols; c++){
        const x = pad + c * (tileW + gap), y = pad + r * (tileH + gap);
        g.fillStyle = ACCENT;
        roundRectPath(g, x, y, tileW, tileH, 12);
        g.fill();
        g.fillStyle = INK;
        g.globalAlpha = 0.85;
        g.beginPath();
        g.arc(x + tileW - 14, y + 14, 7, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 1;
        g.fillStyle = PANEL_BG;
        g.globalAlpha = 0.9;
        roundRectPath(g, x + 10, y + tileH - 20, tileW - 20, 10, 4);
        g.fill();
        g.globalAlpha = 1;
      }
    }
  }

  function drawParticleRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rgb: number[], alpha: number): void {
    if (alpha <= 0.01) return;
    g.globalAlpha = alpha;
    g.fillStyle = 'rgb(' + (rgb[0] | 0) + ',' + (rgb[1] | 0) + ',' + (rgb[2] | 0) + ')';
    g.fillRect(x, y, w, h);
    g.globalAlpha = 1;
  }

  const MAGNETIC_STRENGTH = 2.2; // 수렴(복귀) 구간의 스냅 지수 — 클수록 절반 이후 제자리로 더 빠르게 당겨진다(수렴 속도)


  let particles: Particle[] = [];
  let sceneBCanvas!: HTMLCanvasElement;
  let MAX_R = 0;
  let ctx!: CanvasRenderingContext2D;

  function ctx2d(cv: HTMLCanvasElement): CanvasRenderingContext2D {
    const c = cv.getContext('2d');
    if (!c) throw new Error('no 2d context');
    return c;
  }

  function sampleCanvas(cv: HTMLCanvasElement): Uint8ClampedArray {
    return ctx2d(cv).getImageData(0, 0, W, H).data;
  }

  function PRECOMPUTE(): void {
    const a = document.createElement('canvas'); a.width = W; a.height = H;
    const b = document.createElement('canvas'); b.width = W; b.height = H;
    paintList(ctx2d(a));
    paintGrid(ctx2d(b));
    const da = sampleCanvas(a);
    const db = sampleCanvas(b);
    sceneBCanvas = b;
    const cellW = W / COLS, cellH = H / ROWS;
    const pts: Particle[] = [];
    MAX_R = 0;
    for (let j = 0; j < ROWS; j++){
      for (let i = 0; i < COLS; i++){
        const cx = (i + 0.5) * cellW, cy = (j + 0.5) * cellH;
        const px = clampN(Math.round(cx), 0, W - 1);
        const py = clampN(Math.round(cy), 0, H - 1);
        const idx = (py * W + px) * 4;
        const ca = [da[idx], da[idx + 1], da[idx + 2]];
        const cb = [db[idx], db[idx + 1], db[idx + 2]];
        const dx = cx - CENTER_X, dy = cy - CENTER_Y;
        const r0 = Math.sqrt(dx * dx + dy * dy);
        const ang0 = Math.atan2(dy, dx);
        if (r0 > MAX_R) MAX_R = r0;
        pts.push({ gx: i, gy: j, cx, cy, cellW, cellH, ca, cb, r0, ang0, seed: rnd(), seed2: rnd() });
      }
    }
    particles = pts;
  }

  function RENDER(p: number): void {
    ctx.fillStyle = PANEL_BG;
    ctx.fillRect(0, 0, W, H);
    const gap = 1;
    for (let k = 0; k < particles.length; k++){
      const q = particles[k];
      let env;
      if (p < 0.5){
        const u = p * 2;
        env = u * (2 - u);
      } else {
        const v = (p - 0.5) * 2;
        env = 1 - (1 - Math.pow(1 - v, MAGNETIC_STRENGTH));
      }
      const dirAng = q.seed2 * Math.PI * 2;
      const mag = 26 + q.seed * 46;
      const x = q.cx + Math.cos(dirAng) * mag * env;
      const y = q.cy + Math.sin(dirAng) * mag * env;
      const col = p < 0.5 ? q.ca : q.cb;
      const w = q.cellW + gap, h = q.cellH + gap;
      drawParticleRect(ctx, x - w / 2, y - h / 2, w, h, col, 1);
    }
  }

export default function MagneticConvergeSwap(){

  const rootRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!root || !cv) return;
    const rootEl: HTMLDivElement = root;
    const cvEl: HTMLCanvasElement = cv;
    ctx = ctx2d(cvEl);

    const ARIA_LIST = '리스트 화면 — 클릭하거나 스페이스바로 그리드 화면으로 전환';
    const ARIA_GRID = '그리드 화면 — 클릭하거나 스페이스바로 리스트 화면으로 전환';

    function updateAria(prog: number): void {
      rootEl.setAttribute('aria-label', prog < 0.5 ? ARIA_LIST : ARIA_GRID);
    }

    let progress = 0;
    let playing = false, playStart = 0, playFrom = 0, playTo = 0;
    const PLAY_MS = 600;

    function human(): void { rootEl.classList.remove('is-demo'); }

    function play(target: number): void {
      playing = true; playFrom = progress; playTo = target; playStart = performance.now();
    }

    function stepPlay(now: number): void {
      const t = clampN((now - playStart) / PLAY_MS, 0, 1);
      progress = playFrom + (playTo - playFrom) * easeInOut(t);
      RENDER(progress);
      updateAria(progress);
      if (t >= 1){ playing = false; progress = playTo; }
    }

    const DRIVE_PERIOD_MS = 2000;
    const driveStart = performance.now();
    function triangle(t: number): number {
      const u = (t % DRIVE_PERIOD_MS) / DRIVE_PERIOD_MS;
      return u < 0.5 ? u * 2 : 2 - u * 2;
    }

    const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
    let rafId = 0;

    function onActivate(e: Event): void {
      if (e.type === 'keydown'){
        const ke = e as KeyboardEvent;
        if (ke.key !== 'Enter' && ke.key !== ' ') return;
        ke.preventDefault();
      }
      human();
      const target = progress < 0.5 ? 1 : 0;
      if (reduceMQ.matches){
        progress = target;
        RENDER(progress);
        updateAria(progress);
      } else {
        play(target);
      }
    }

    function frame(now: number): void {
      if (!reduceMQ.matches){
        if (playing){
          stepPlay(now);
        } else if (rootEl.classList.contains('is-demo')){
          progress = triangle(now - driveStart);
          RENDER(progress);
          updateAria(progress);
        }
        rafId = requestAnimationFrame(frame);
      }
    }

    function onResize(): void { RENDER(progress); }

    rootEl.addEventListener('click', onActivate);
    rootEl.addEventListener('keydown', onActivate);
    window.addEventListener('resize', onResize);

    PRECOMPUTE();
    updateAria(progress);
    if (reduceMQ.matches){
      RENDER(progress);
    } else {
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
      <div ref={rootRef} className={`${styles.rv} is-demo`} tabIndex={0} role="button" aria-label="리스트 화면 — 클릭하거나 스페이스바로 그리드 화면으로 전환">
        <canvas ref={cvRef} className={styles.rv__cv} width={480} height={300} />
        <p className={styles.rv__hint}>클릭하거나 스페이스바로 전환해 보세요</p>
      </div>
    </main>
  );
}
