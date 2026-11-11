import { useEffect, useRef } from "react";
import styles from "./PaperDollJointSwingChain.module.scss";

type JointDef = { seg: [number, number]; base: number; delay: number };

export default function PaperDollJointSwingChain() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const wrap = canvas.parentElement as HTMLElement;

    const LW = 320, LH = 200;
    const SCENE_BG = "#17141a";
    const PAPER = "#fff7e6";
    const ANCHOR = { x: 160, y: 26 };
    const FK_DELAY_RAD = 0.7;
    const SWING_PERIOD_MS = 900;
    const SWING_AMP_DEG = 34;
    const FLOOR_Y = 184;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rand = seedRand(41308);
    function clamp(v: number, a: number, b: number): number { return v < a ? a : v > b ? b : v; }
    function rad(d: number): number { return (d * Math.PI) / 180; }

    const ARM_L: JointDef[] = [
      { seg: [22, 20], base: rad(150), delay: FK_DELAY_RAD * 0 },
      { seg: [22, 20], base: rad(150), delay: FK_DELAY_RAD * 1 },
    ];
    const ARM_R: JointDef[] = [
      { seg: [22, 20], base: rad(30), delay: FK_DELAY_RAD * 0.6 },
      { seg: [22, 20], base: rad(30), delay: FK_DELAY_RAD * 1.6 },
    ];
    const LEG_L: JointDef[] = [{ seg: [24, 22], base: rad(100), delay: FK_DELAY_RAD * 0.4 }];
    const LEG_R: JointDef[] = [{ seg: [24, 22], base: rad(80), delay: FK_DELAY_RAD * 1.2 }];

    function jointAngle(t: number, def: JointDef, chainIndex: number): number {
      const w = Math.PI * 2 * t;
      const sway = Math.sin(w - chainIndex * FK_DELAY_RAD) * rad(SWING_AMP_DEG) * Math.pow(0.82, chainIndex);
      return def.base + sway;
    }

    function swayFactor(t: number): number { return Math.sin(Math.PI * 2 * t); }

    function fkChain(originX: number, originY: number, segs: JointDef[], t: number): { x: number; y: number }[] {
      let x = originX, y = originY, cum = 0;
      const pts = [{ x, y }];
      for (let i = 0; i < segs.length; i += 1) {
        cum += jointAngle(t, segs[i], i);
        x += Math.cos(cum) * segs[i].seg[0];
        y += Math.sin(cum) * segs[i].seg[0];
        pts.push({ x, y });
      }
      return pts;
    }

    function strokeChain(pts: { x: number; y: number }[], w: number): void {
      ctx!.lineCap = "round";
      ctx!.lineJoin = "round";
      ctx!.strokeStyle = PAPER;
      for (let i = 0; i < pts.length - 1; i += 1) {
        ctx!.lineWidth = w - i * 2;
        ctx!.beginPath();
        ctx!.moveTo(pts[i].x, pts[i].y);
        ctx!.lineTo(pts[i + 1].x, pts[i + 1].y);
        ctx!.stroke();
      }
      for (let j = 1; j < pts.length; j += 1) {
        ctx!.fillStyle = "rgba(23,20,26,.35)";
        ctx!.beginPath(); ctx!.arc(pts[j].x, pts[j].y, 15, 0, Math.PI * 2); ctx!.fill();
      }
    }

    function drawLimbShadow(pts: { x: number; y: number }[]): void {
      const tip = pts[pts.length - 1];
      const diff = Math.abs(tip.x - ANCHOR.x);
      const rx = clamp(18 + diff * 0.26, 18, 40);
      const alpha = clamp(0.2 + diff * 0.006, 0.18, 0.45);
      ctx!.fillStyle = "rgba(10,8,12," + alpha + ")";
      ctx!.beginPath();
      ctx!.ellipse(tip.x, FLOOR_Y, rx, rx * 0.32, 0, 0, Math.PI * 2);
      ctx!.fill();
    }

    let tNow = 0;

    function draw(): void {
      ctx!.fillStyle = SCENE_BG;
      ctx!.fillRect(0, 0, LW, LH);

      const sway = swayFactor(tNow);
      const glowAlpha = clamp(0.1 + Math.abs(sway) * 0.1, 0.1, 0.22);
      const glow = ctx!.createRadialGradient(ANCHOR.x, ANCHOR.y + 74, 10, ANCHOR.x, ANCHOR.y + 74, 170);
      glow.addColorStop(0, "rgba(255,247,230," + glowAlpha + ")");
      glow.addColorStop(1, "rgba(255,247,230,0)");
      ctx!.fillStyle = glow;
      ctx!.fillRect(0, 0, LW, LH);

      ctx!.strokeStyle = "rgba(255,247,230,.4)";
      ctx!.lineWidth = 1;
      ctx!.beginPath(); ctx!.moveTo(ANCHOR.x, 4); ctx!.lineTo(ANCHOR.x, ANCHOR.y); ctx!.stroke();

      const shoulderY = ANCHOR.y + 44;
      const hipY = ANCHOR.y + 92;

      ctx!.fillStyle = "rgba(0,0,0,.28)";
      ctx!.beginPath(); ctx!.ellipse(ANCHOR.x + sway * 10, FLOOR_Y, 82 + Math.abs(sway) * 16, 17, 0, 0, Math.PI * 2); ctx!.fill();

      ctx!.fillStyle = PAPER;
      ctx!.beginPath(); ctx!.arc(ANCHOR.x, ANCHOR.y + 18, 26, 0, Math.PI * 2); ctx!.fill();
      ctx!.fillRect(ANCHOR.x - 31, shoulderY - 6, 62, hipY - shoulderY + 6);

      const armL = fkChain(ANCHOR.x - 24, shoulderY, ARM_L, tNow);
      const armR = fkChain(ANCHOR.x + 24, shoulderY, ARM_R, tNow);
      const legL = fkChain(ANCHOR.x - 12, hipY, LEG_L, tNow);
      const legR = fkChain(ANCHOR.x + 12, hipY, LEG_R, tNow);
      drawLimbShadow(armL); drawLimbShadow(armR); drawLimbShadow(legL); drawLimbShadow(legR);
      strokeChain(armL, 34);
      strokeChain(armR, 34);
      strokeChain(legL, 40);
      strokeChain(legR, 40);
    }

    function update(dt: number, tMs: number): void {
      if (reduce) return;
      tNow = (tMs % SWING_PERIOD_MS) / SWING_PERIOD_MS;
    }

    let cw = 480, ch = 300, sx = 1, sy = 1;
    function fit(): void {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      sx = cw / LW; sy = ch / LH;
      render();
    }
    function render(): void {
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.clearRect(0, 0, cw, ch);
      ctx!.save();
      ctx!.scale(sx, sy);
      draw();
      ctx!.restore();
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const playing = !reduce;
    if (reduce) { root.classList.remove("is-demo"); tNow = 0.25; }

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number): void {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;
      if (playing) update(dt, ts);
      render();
      raf = requestAnimationFrame(tick);
    }
    fit();
    window.addEventListener("resize", fit);
    render();
    if (playing) raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.vd} is-demo`} ref={rootRef}>
        <canvas className={styles.vd__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.vd__caption}>관절 값이 이어져 흔들리는 종이 인형</p>
      </div>
    </main>
  );
}
