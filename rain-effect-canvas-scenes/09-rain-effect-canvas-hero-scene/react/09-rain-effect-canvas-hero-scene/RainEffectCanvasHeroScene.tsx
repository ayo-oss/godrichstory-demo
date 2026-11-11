import { useEffect, useRef } from "react";
import styles from "./RainEffectCanvasHeroScene.module.scss";

type Streak = { x: number; y: number; z: number; speed: number; thick: number };
type Droplet = { x: number; y: number; vy: number; r: number };
type Seg = { x0: number; y0: number; x1: number; y1: number; depth: number };

export default function RainEffectCanvasHeroScene() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const wrap = canvas.parentElement as HTMLElement;

    const CALC_W = 160, CALC_H = 100;
    const HERO_RAIN_LAYER_COUNT = 4;
    const HERO_RAIN_NEAR_SPEED_PX_S = 150;
    const HERO_RAIN_FAR_SPEED_PX_S = 40;
    const HERO_STREAKS_PER_LAYER = 26;
    const HERO_WIND_GUST_MAX_DEG = 10;
    const HERO_WIND_CYCLE_MS = 5200;
    const HERO_DROPLET_SPAWN_PER_S = 2.2;
    const HERO_DROPLET_GRAVITY_PX_S = 54;
    const HERO_DROPLET_DRAG_COEF = 3;
    const HERO_DROPLET_MERGE_DIST_PX = 2.2;
    const HERO_GLASS_TOP = CALC_H * 0.76;
    const HERO_GLASS_X0 = CALC_W * 0.06, HERO_GLASS_X1 = CALC_W * 0.94;
    const HERO_LIGHTNING_STRIKE_PERIOD_MS = 2600;
    const HERO_LIGHTNING_FLASH_DECAY_MS = 240;
    const HERO_LIGHTNING_BOLT_FADE_MS = 850;
    const HERO_LIGHTNING_BRANCH_DEPTH = 3;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rRand = seedRand(431092);

    function streakDepthZ(layerIndex: number) {
      return layerIndex / Math.max(1, HERO_RAIN_LAYER_COUNT - 1);
    }

    const streaks: Streak[] = [];
    for (let li = 0; li < HERO_RAIN_LAYER_COUNT; li += 1) {
      const z = streakDepthZ(li);
      for (let i = 0; i < HERO_STREAKS_PER_LAYER; i += 1) {
        streaks.push({
          x: rRand() * CALC_W,
          y: rRand() * CALC_H,
          z,
          speed: HERO_RAIN_FAR_SPEED_PX_S + (HERO_RAIN_NEAR_SPEED_PX_S - HERO_RAIN_FAR_SPEED_PX_S) * z,
          thick: 0.5 + z * 1.4,
        });
      }
    }

    function windGustAngle(nowMs: number) {
      const a = Math.sin((nowMs / HERO_WIND_CYCLE_MS) * Math.PI * 2) * 0.7;
      const b = Math.sin((nowMs / (HERO_WIND_CYCLE_MS * 0.37)) * Math.PI * 2) * 0.3;
      return (a + b) * HERO_WIND_GUST_MAX_DEG;
    }

    const droplets: Droplet[] = [];
    let dropletSpawnAcc = 0;
    function spawnDroplet() {
      droplets.push({
        x: HERO_GLASS_X0 + rRand() * (HERO_GLASS_X1 - HERO_GLASS_X0),
        y: HERO_GLASS_TOP + rRand() * 3,
        vy: 0,
        r: 0.9 + rRand() * 1.1,
      });
    }

    function dropletMassMerge(a: Droplet, b: Droplet) {
      const ar = a.r * a.r, br = b.r * b.r;
      a.r = Math.sqrt(ar + br) * 0.86;
      a.vy = (a.vy * ar + b.vy * br) / (ar + br);
    }

    function stepDroplets(dtS: number) {
      dropletSpawnAcc += dtS * HERO_DROPLET_SPAWN_PER_S;
      while (dropletSpawnAcc >= 1) { spawnDroplet(); dropletSpawnAcc -= 1; }
      for (let i = 0; i < droplets.length; i += 1) {
        const d = droplets[i];
        const drag = Math.max(0.15, 1 - (d.r / HERO_DROPLET_DRAG_COEF) * 0.12);
        d.vy += HERO_DROPLET_GRAVITY_PX_S * dtS * drag * 0.01 * d.r;
        d.y += d.vy * dtS;
      }
      for (let a = droplets.length - 1; a >= 0; a -= 1) {
        for (let b = a - 1; b >= 0; b -= 1) {
          const da = droplets[a], db = droplets[b];
          const dx = da.x - db.x, dy = da.y - db.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < (da.r + db.r) * 0.5 + HERO_DROPLET_MERGE_DIST_PX * 0.3) {
            dropletMassMerge(db, da);
            droplets.splice(a, 1);
            break;
          }
        }
      }
      for (let k = droplets.length - 1; k >= 0; k -= 1) {
        if (droplets[k].y > CALC_H + 2 || droplets[k].r > 5.5) droplets.splice(k, 1);
      }
    }

    function branchLightning(segs: Seg[], x: number, y: number, ang: number, len: number, depth: number) {
      if (depth <= 0 || len < 3) return;
      const steps = 3 + Math.floor(rRand() * 2);
      let cx = x, cy = y, cang = ang;
      for (let i = 0; i < steps; i += 1) {
        cang += (rRand() - 0.5) * 0.9;
        const stepLen = len / steps;
        const nx = cx + Math.sin(cang) * stepLen;
        const ny = cy + Math.cos(cang) * stepLen;
        segs.push({ x0: cx, y0: cy, x1: nx, y1: ny, depth });
        if (depth > 1 && rRand() < 0.3) {
          const side = rRand() < 0.5 ? -1 : 1;
          branchLightning(segs, nx, ny, cang + side * (0.6 + rRand() * 0.5), len * 0.5, depth - 1);
        }
        cx = nx; cy = ny;
      }
    }
    function makeBolt() {
      const segs: Seg[] = [];
      const startX = 20 + rRand() * 120;
      branchLightning(segs, startX, 0, 0, HERO_GLASS_TOP * 0.88, HERO_LIGHTNING_BRANCH_DEPTH);
      return segs;
    }
    let bolt: Seg[] = [];
    let strikeAtMs = -99999;
    let lastStrikeIndex = -1;
    function updateStrike(nowMs: number) {
      const idx = Math.floor(nowMs / HERO_LIGHTNING_STRIKE_PERIOD_MS);
      if (idx !== lastStrikeIndex) {
        lastStrikeIndex = idx;
        bolt = makeBolt();
        strikeAtMs = nowMs;
      }
    }

    function stepSim(dtS: number, nowMs: number) {
      const gust = windGustAngle(nowMs);
      const gustRad = (gust * Math.PI) / 180;
      for (let i = 0; i < streaks.length; i += 1) {
        const s = streaks[i];
        s.y += s.speed * dtS;
        s.x += Math.sin(gustRad) * s.speed * 0.5 * dtS;
        if (s.y > CALC_H + 4) { s.y = -4 - rRand() * 8; s.x = rRand() * CALC_W; }
        if (s.x < -6) s.x = CALC_W + 6;
        if (s.x > CALC_W + 6) s.x = -6;
      }
      stepDroplets(dtS);
      updateStrike(nowMs);
    }

    let cw = 480, ch = 300;
    function draw(nowMs: number) {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      const sinceStrike = nowMs - strikeAtMs;
      const flash = Math.exp(-Math.max(0, sinceStrike) / HERO_LIGHTNING_FLASH_DECAY_MS);
      const boltAlpha = Math.exp(-Math.max(0, sinceStrike) / HERO_LIGHTNING_BOLT_FADE_MS);

      ctx!.fillStyle = "#12111a";
      ctx!.fillRect(0, 0, cw, ch);
      if (flash > 0.02) {
        ctx!.fillStyle = "rgba(255,250,230," + (flash * 0.5).toFixed(3) + ")";
        ctx!.fillRect(0, 0, cw, ch);
      }

      for (let i = 0; i < streaks.length; i += 1) {
        const s = streaks[i];
        const alpha = 0.18 + s.z * 0.55;
        const x = s.x * sx, y0 = s.y * sy, y1 = (s.y - s.thick * 5) * sy;
        ctx!.strokeStyle = "rgba(214,228,255," + alpha + ")";
        ctx!.lineWidth = Math.max(0.5, s.thick * ((sx + sy) / 2));
        ctx!.beginPath();
        ctx!.moveTo(x, y0);
        ctx!.lineTo(x, y1);
        ctx!.stroke();
      }

      if (boltAlpha > 0.03 && bolt.length) {
        ctx!.save();
        ctx!.strokeStyle = "rgba(255,252,240," + boltAlpha.toFixed(3) + ")";
        ctx!.shadowColor = "rgba(255,246,200," + (boltAlpha * 0.75).toFixed(3) + ")";
        ctx!.shadowBlur = 7 * ((sx + sy) / 2);
        for (let b = 0; b < bolt.length; b += 1) {
          const seg = bolt[b];
          ctx!.lineWidth = Math.max(0.7, seg.depth * ((sx + sy) / 2) * 0.5);
          ctx!.beginPath();
          ctx!.moveTo(seg.x0 * sx, seg.y0 * sy);
          ctx!.lineTo(seg.x1 * sx, seg.y1 * sy);
          ctx!.stroke();
        }
        ctx!.restore();
      }

      ctx!.fillStyle = "rgba(255,255,255,0.05)";
      ctx!.fillRect(0, HERO_GLASS_TOP * sy, cw, ch - HERO_GLASS_TOP * sy);
      for (let d = 0; d < droplets.length; d += 1) {
        const dr = droplets[d];
        const dx = dr.x * sx, dy = dr.y * sy, rr = dr.r * ((sx + sy) / 2);
        const grad = ctx!.createRadialGradient(dx - rr * 0.3, dy - rr * 0.3, 0, dx, dy, rr);
        grad.addColorStop(0, "rgba(255,255,255,0.85)");
        grad.addColorStop(0.5, "rgba(214,228,255,0.35)");
        grad.addColorStop(1, "rgba(214,228,255,0.05)");
        ctx!.fillStyle = grad;
        ctx!.beginPath();
        ctx!.arc(dx, dy, rr, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function fit() {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      draw(elapsed);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let elapsed = 0;
    if (reduce) root.classList.remove("is-demo");
    const warmSteps = reduce ? 30 : 45;
    for (let w = 0; w < warmSteps; w += 1) { elapsed += 20; stepSim(0.02, elapsed); }

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!reduce) {
        elapsed += dt;
        stepSim(dt / 1000, elapsed);
        draw(elapsed);
      }
      raf = requestAnimationFrame(tick);
    }
    fit();
    window.addEventListener("resize", fit);
    draw(elapsed);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.rn} is-demo`} ref={rootRef}>
        <canvas className={styles.rn__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.rn__caption}>창밖 폭우 장면 하나에 깊이 시차·바람 돌풍·유리창 물방울·번개 갈라짐 네 기법을 겹쳐 한 화면으로 합친다</p>
      </div>
    </main>
  );
}
