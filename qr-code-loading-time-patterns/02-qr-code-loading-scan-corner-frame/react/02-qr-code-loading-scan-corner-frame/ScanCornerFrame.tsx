import { useEffect, useRef, useState } from "react";
import styles from "./ScanCornerFrame.module.scss";

export default function ScanCornerFrame() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctrlRef = useRef<HTMLButtonElement>(null);
  const [badge, setBadge] = useState("스캔 중 0%");
  const [ctrlLabel, setCtrlLabel] = useState("일시정지");

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctrl = ctrlRef.current;
    if (!root || !canvas || !ctrl) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // SCF_CORNER_GLOW_RANGE_PX — 변형 1: 26 → 46 으로 늘리면 코너가 더 일찍, 더 오래 밝아진다.
    const SCF_CORNER_GLOW_RANGE_PX = 26;
    const SWEEP_MS = 1400;
    const SIZE = 15;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
      };
    }
    const rand = seedRand(407025);
    const dots: { x: number; y: number }[] = [];
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        if (rand() < 0.4) dots.push({ x, y });
      }
    }

    function cornerGlow(dist: number) {
      // 계산 한 겹: 스캔선까지 거리 → 코너 발광 강도(0~1), 범위 밖이면 0
      const p = 1 - dist / SCF_CORNER_GLOW_RANGE_PX;
      return p < 0 ? 0 : p > 1 ? 1 : p;
    }

    function draw(elapsed: number) {
      const cw = canvas!.width, ch = canvas!.height;
      ctx!.clearRect(0, 0, cw, ch);

      const pad = 28;
      const boxX = pad, boxY = pad, boxW = cw - pad * 2, boxH = ch - pad * 2;
      const cell = boxW / SIZE;

      ctx!.fillStyle = "rgba(255,247,230,.65)";
      dots.forEach((d) => {
        const s = cell * 0.55;
        ctx!.fillRect(boxX + d.x * cell + (cell - s) / 2, boxY + d.y * cell + (cell - s) / 2, s, s);
      });

      const t = (elapsed % SWEEP_MS) / SWEEP_MS;
      const scanY = boxY + t * boxH;

      const grad = ctx!.createLinearGradient(0, scanY - 18, 0, scanY + 18);
      grad.addColorStop(0, "rgba(120,200,255,0)");
      grad.addColorStop(0.5, "rgba(120,200,255,.55)");
      grad.addColorStop(1, "rgba(120,200,255,0)");
      ctx!.fillStyle = grad;
      ctx!.fillRect(boxX, scanY - 18, boxW, 36);
      ctx!.strokeStyle = "rgba(180,225,255,.9)";
      ctx!.lineWidth = 2;
      ctx!.beginPath();
      ctx!.moveTo(boxX, scanY);
      ctx!.lineTo(boxX + boxW, scanY);
      ctx!.stroke();

      const corners = [
        { x: boxX, y: boxY, dx: 1, dy: 1 },
        { x: boxX + boxW, y: boxY, dx: -1, dy: 1 },
        { x: boxX, y: boxY + boxH, dx: 1, dy: -1 },
        { x: boxX + boxW, y: boxY + boxH, dx: -1, dy: -1 },
      ];
      const len = 18;
      corners.forEach((c) => {
        const g = cornerGlow(Math.abs(scanY - c.y));
        const lw = 3 + g * 2.5;
        ctx!.strokeStyle = "rgba(" + (180 + g * 75) + "," + 225 + ",255," + (0.55 + g * 0.45) + ")";
        ctx!.lineWidth = lw;
        ctx!.beginPath();
        ctx!.moveTo(c.x, c.y + c.dy * len);
        ctx!.lineTo(c.x, c.y);
        ctx!.lineTo(c.x + c.dx * len, c.y);
        ctx!.stroke();
      });

      setBadge("스캔 중 " + Math.round(t * 100) + "%");
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let playing = true;
    let elapsed = reduce ? SWEEP_MS : 0;
    if (reduce) {
      playing = false;
      root.classList.remove("is-demo");
    }

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = ts - lastTs;
      lastTs = ts;
      if (playing) {
        elapsed += dt;
        if (elapsed >= SWEEP_MS) elapsed -= SWEEP_MS;
      }
      draw(elapsed);
      raf = requestAnimationFrame(tick);
    }
    draw(elapsed);
    raf = requestAnimationFrame(tick);

    function onClick() {
      playing = !playing;
      setCtrlLabel(playing ? "일시정지" : "재생");
    }
    function onKeydown(e: KeyboardEvent) {
      if ((e.key === "r" || e.key === "R") && !reduce) {
        elapsed = 0;
        playing = true;
        setCtrlLabel("일시정지");
      }
    }
    ctrl.addEventListener("click", onClick);
    ctrl.addEventListener("keydown", onKeydown);

    return () => {
      cancelAnimationFrame(raf);
      ctrl.removeEventListener("click", onClick);
      ctrl.removeEventListener("keydown", onKeydown);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.scf} is-demo`} ref={rootRef}>
        <div className={styles.scf__badge}>{badge}</div>
        <button className={styles.scf__ctrl} type="button" ref={ctrlRef}>{ctrlLabel}</button>
        <div className={styles["scf__canvas-wrap"]}>
          <canvas className={styles.scf__canvas} ref={canvasRef} width={240} height={200} />
        </div>
      </div>
    </main>
  );
}
