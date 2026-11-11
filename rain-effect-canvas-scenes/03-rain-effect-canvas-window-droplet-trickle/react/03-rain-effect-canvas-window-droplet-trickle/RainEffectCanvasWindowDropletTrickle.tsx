import { useEffect, useRef } from "react";
import styles from "./RainEffectCanvasWindowDropletTrickle.module.scss";

type Droplet = { x: number; y: number; r: number; mass: number; vy: number; seed: number };

export default function RainEffectCanvasWindowDropletTrickle() {
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
    const DROPLET_DRAG_COEF = 3.2;
    const DROPLET_GRAVITY_PX_S = 58;
    const DROPLET_MERGE_DIST_PX = 2.4;
    const DROPLET_SPAWN_PER_S = 2.6;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const dRand = seedRand(431032);

    let drops: Droplet[] = [];
    let spawnAcc = 0;

    function spawnDroplet() {
      const r = 1.6 + dRand() * 1.6;
      drops.push({ x: dRand() * CALC_W, y: -3, r, mass: r * r, vy: 4, seed: dRand() * 1000 });
    }

    function dropletMassMerge(a: Droplet, b: Droplet): Droplet {
      const mass = a.mass + b.mass;
      const r = Math.sqrt(mass) * 0.92;
      return {
        x: (a.x * a.mass + b.x * b.mass) / mass,
        y: Math.max(a.y, b.y),
        r, mass, vy: Math.max(a.vy, b.vy), seed: a.seed
      };
    }

    function stepSim(dtMs: number, nowMs: number) {
      const dtS = dtMs / 1000;
      spawnAcc += (dtMs * DROPLET_SPAWN_PER_S) / 1000;
      while (spawnAcc >= 1 && drops.length < 46) { spawnDroplet(); spawnAcc -= 1; }
      for (let i = 0; i < drops.length; i += 1) {
        const d = drops[i];
        const targetVy = (DROPLET_GRAVITY_PX_S * Math.sqrt(d.mass)) / DROPLET_DRAG_COEF;
        d.vy += (targetVy - d.vy) * Math.min(1, 5 * dtS);
        d.y += d.vy * dtS;
        d.x += Math.sin(nowMs * 0.0012 + d.seed) * 1.6 * dtS;
      }
      for (let a = 0; a < drops.length; a += 1) {
        for (let b = a + 1; b < drops.length; b += 1) {
          const p1 = drops[a], p2 = drops[b];
          if (!p1 || !p2) continue;
          const dx = p1.x - p2.x, dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < DROPLET_MERGE_DIST_PX + (p1.r + p2.r) * 0.55) {
            drops[a] = dropletMassMerge(p1, p2);
            drops.splice(b, 1);
            b -= 1;
          }
        }
      }
      drops = drops.filter((d) => d.y - d.r < CALC_H + 6);
    }

    let cw = 480, ch = 300;
    function draw() {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      const s = (sx + sy) / 2;
      ctx!.clearRect(0, 0, cw, ch);
      for (let i = 0; i < drops.length; i += 1) {
        const d = drops[i];
        const dx = d.x * sx, dy = d.y * sy, dr = d.r * s;
        ctx!.fillStyle = "rgba(15,24,52,.42)";
        ctx!.beginPath();
        ctx!.arc(dx, dy, dr, 0, Math.PI * 2);
        ctx!.fill();
        const g = ctx!.createRadialGradient(dx - dr * 0.35, dy - dr * 0.4, 0, dx - dr * 0.35, dy - dr * 0.4, dr * 0.7);
        g.addColorStop(0, "rgba(255,255,255,.85)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.arc(dx - dr * 0.35, dy - dr * 0.4, dr * 0.55, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function fit() {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      draw();
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let elapsed = 0;
    if (reduce) root.classList.remove("is-demo");
    const warmSteps = reduce ? 180 : 90;
    for (let w = 0; w < warmSteps; w += 1) { elapsed += 20; stepSim(20, elapsed); }

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!reduce) {
        elapsed += dt;
        stepSim(dt, elapsed);
        draw();
      }
      raf = requestAnimationFrame(tick);
    }
    fit();
    window.addEventListener("resize", fit);
    draw();
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
        <p className={styles.rn__caption}>물방울마다 무게와 저항을 계산해 흘러내리는 속도를 다시 정하고, 지나가는 길에 다른 물방울과 겹치면 둘을 하나로 합쳐 크기를 키운다</p>
      </div>
    </main>
  );
}
