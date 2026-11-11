import { useEffect, useRef } from "react";
import styles from "./Depth3dGridFloorPerspective.module.scss";

export default function Depth3dGridFloorPerspective() {
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
    const HORIZON_Y = CALC_H * 0.4;
    let camHeight = 46;
    const GRID_PERSPECTIVE_PX = 800;
    const ROW_SPACING = 16;
    const ROW_COUNT = 9;
    const COL_SPACING = 14;
    const COL_COUNT = 11;
    const SCROLL_SPEED = 18;

    let viewOffsetX = 0;

    function projectGridPoint(xWorld: number, zWorld: number) {
      const z = Math.max(4, zWorld);
      const scale = GRID_PERSPECTIVE_PX / (z * 40);
      return {
        x: CALC_W * 0.5 + (xWorld - viewOffsetX) * scale,
        y: HORIZON_Y + camHeight * scale
      };
    }

    let elapsed = 0;
    let scrollZ = 0;
    let cw = 480, ch = 300;

    function drawScene() {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      ctx!.clearRect(0, 0, cw, ch);

      ctx!.fillStyle = "rgba(255,140,40,.16)";
      const sunR = 30 + Math.sin(elapsed * 0.0009) * 4;
      ctx!.beginPath();
      ctx!.arc(CALC_W * 0.5 * sx, HORIZON_Y * sy, sunR * sx, 0, Math.PI * 2);
      ctx!.fill();

      ctx!.strokeStyle = "rgba(120,90,200,.7)";
      ctx!.lineWidth = 1.2;
      for (let r = 1; r <= ROW_COUNT; r += 1) {
        const z = r * ROW_SPACING - scrollZ;
        if (z <= 2) continue;
        const pL = projectGridPoint(-COL_COUNT * COL_SPACING * 0.5, z);
        const pR = projectGridPoint(COL_COUNT * COL_SPACING * 0.5, z);
        ctx!.beginPath();
        ctx!.moveTo(pL.x * sx, pL.y * sy);
        ctx!.lineTo(pR.x * sx, pR.y * sy);
        ctx!.stroke();
      }
      const zNear = ROW_SPACING - (scrollZ % ROW_SPACING) + 2;
      const zFar = ROW_COUNT * ROW_SPACING;
      for (let c = 0; c <= COL_COUNT; c += 1) {
        const xw = -COL_COUNT * COL_SPACING * 0.5 + c * COL_SPACING;
        const pn = projectGridPoint(xw, zNear);
        const pf = projectGridPoint(xw, zFar);
        ctx!.beginPath();
        ctx!.moveTo(pn.x * sx, pn.y * sy);
        ctx!.lineTo(pf.x * sx, pf.y * sy);
        ctx!.stroke();
      }
    }

    function fit() {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      drawScene();
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) root.classList.remove("is-demo");

    let pointerActive = false;
    let camHeightBoost = 0;
    function nudgeCamHeight(d: number) {
      camHeightBoost = Math.max(-18, Math.min(18, camHeightBoost + d));
      camHeight = 46 + camHeightBoost;
    }
    function onPointerMove(e: PointerEvent) {
      pointerActive = true;
      const r = wrap.getBoundingClientRect();
      const norm = ((e.clientX - r.left) / r.width - 0.5) * 2;
      viewOffsetX = norm * 46;
      if (reduce) drawScene();
    }
    function onPointerLeave() { pointerActive = false; }
    function onKeydown(e: KeyboardEvent) {
      let moved = true;
      if (e.key === "ArrowLeft") viewOffsetX = Math.max(-46, viewOffsetX - 6);
      else if (e.key === "ArrowRight") viewOffsetX = Math.min(46, viewOffsetX + 6);
      else if (e.key === "ArrowUp") nudgeCamHeight(6);
      else if (e.key === "ArrowDown") nudgeCamHeight(-6);
      else moved = false;
      if (moved) {
        e.preventDefault();
        pointerActive = true;
        if (reduce) drawScene();
      }
    }
    wrap.addEventListener("pointermove", onPointerMove);
    wrap.addEventListener("pointerleave", onPointerLeave);
    wrap.addEventListener("keydown", onKeydown);

    function virtualViewOffsetAt(t: number) {
      return Math.sin(t * 0.00048) * 40;
    }

    const warmSteps = reduce ? 40 : 100;
    for (let w = 0; w < warmSteps; w += 1) {
      elapsed += 20;
      scrollZ = (scrollZ + SCROLL_SPEED * 0.02) % ROW_SPACING;
      if (!pointerActive) viewOffsetX = virtualViewOffsetAt(elapsed);
    }

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!reduce) {
        elapsed += dt;
        scrollZ = (scrollZ + SCROLL_SPEED * (dt / 1000)) % ROW_SPACING;
        if (!pointerActive) viewOffsetX = virtualViewOffsetAt(elapsed);
        drawScene();
      }
      raf = requestAnimationFrame(tick);
    }
    fit();
    window.addEventListener("resize", fit);
    drawScene();
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("pointerleave", onPointerLeave);
      wrap.removeEventListener("keydown", onKeydown);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.d3} is-demo`} ref={rootRef} tabIndex={0}>
        <canvas className={styles.d3__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.d3__caption}>격자선 좌표를 원근 투영 공식으로 계산해 지평선에 가까울수록 선 사이 간격을 좁히고, 포인터가 움직이면 시점 위치도 같이 다시 계산한다</p>
      </div>
    </main>
  );
}
