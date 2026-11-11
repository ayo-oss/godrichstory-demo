import { useEffect, useRef, useState } from "react";
import styles from "./ModuleRevealGrid.module.scss";

export default function ModuleRevealGrid() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctrlRef = useRef<HTMLButtonElement>(null);
  const [badge, setBadge] = useState("생성 진행 0%");
  const [ctrlLabel, setCtrlLabel] = useState("일시정지");

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctrl = ctrlRef.current;
    if (!root || !canvas || !ctrl) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // QR_MODULE_REVEAL_STAGGER_MS — 변형 1: 18 → 36 으로 늘리면 모듈이 한 칸씩 눈에 보이게 천천히 채워진다.
    const QR_MODULE_REVEAL_STAGGER_MS = 18;
    const SIZE = 17;
    const LOOP_MS = 2000;
    const REVEAL_MS = 220;

    function qrRand(seed: number) {
      let s = seed >>> 0;
      return function () {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
      };
    }
    function inFinder(x: number, y: number, size: number) {
      return (x < 7 && y < 7) || (x < 7 && y >= size - 7) || (x >= size - 7 && y < 7);
    }
    function finderDark(x: number, y: number, size: number) {
      const fx = x < 7 ? x : x - (size - 7);
      const fy = y < 7 ? y : y - (size - 7);
      if (fx === 0 || fx === 6 || fy === 0 || fy === 6) return true;
      if (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4) return true;
      return false;
    }
    function buildModules(size: number, seed: number) {
      const rand = qrRand(seed);
      const grid: boolean[][] = [];
      for (let y = 0; y < size; y += 1) {
        const row: boolean[] = [];
        for (let x = 0; x < size; x += 1) {
          row.push(inFinder(x, y, size) ? finderDark(x, y, size) : rand() < 0.46);
        }
        grid.push(row);
      }
      return grid;
    }

    const modules = buildModules(SIZE, 407017);
    let darkTotal = 0;
    modules.forEach((row) => row.forEach((v) => { if (v) darkTotal += 1; }));

    // 계산 한 겹: 행(row) 값을 스태거 기준으로 삼고, 시드 난수로 모듈마다 지연을 살짝 어긋내
    // 파도가 위에서 아래로 자연스럽게 번지도록 순서·지연 값을 구한다 (실제 인코딩 아님).
    const jitterRand = qrRand(20260924);
    const order: { x: number; y: number; delay: number }[] = [];
    for (let y2 = 0; y2 < SIZE; y2 += 1) {
      for (let x2 = 0; x2 < SIZE; x2 += 1) {
        const jitter = (jitterRand() - 0.5) * QR_MODULE_REVEAL_STAGGER_MS;
        order.push({ x: x2, y: y2, delay: y2 * QR_MODULE_REVEAL_STAGGER_MS + jitter });
      }
    }
    let maxDelay = 0;
    order.forEach((o) => { if (o.delay > maxDelay) maxDelay = o.delay; });
    const SWEEP_END = maxDelay + REVEAL_MS;

    function draw(elapsed: number) {
      const cw = canvas!.width, ch = canvas!.height;
      ctx!.clearRect(0, 0, cw, ch);
      const cell = Math.min(cw, ch) / SIZE;
      const ox = (cw - cell * SIZE) / 2;
      const oy = (ch - cell * SIZE) / 2;
      let revealedCount = 0;
      for (let i = 0; i < order.length; i += 1) {
        const o = order[i];
        if (!modules[o.y][o.x]) continue;
        const local = elapsed - o.delay;
        const p = local <= 0 ? 0 : local >= REVEAL_MS ? 1 : local / REVEAL_MS;
        if (p <= 0) continue;
        revealedCount += 1;
        const scale = 0.4 + 0.6 * p;
        const size = cell * 0.86 * scale;
        const cx = ox + o.x * cell + cell / 2;
        const cy = oy + o.y * cell + cell / 2;
        ctx!.globalAlpha = p;
        ctx!.fillStyle = "rgb(255,247,230)";
        ctx!.fillRect(cx - size / 2, cy - size / 2, size, size);
      }
      ctx!.globalAlpha = 1;
      const pct = Math.round((revealedCount / darkTotal) * 100);
      setBadge("생성 진행 " + pct + "%");
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let playing = true;
    let elapsed = reduce ? SWEEP_END : 0;
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
        if (elapsed >= LOOP_MS) elapsed -= LOOP_MS;
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
      <div className={`${styles.mrg} is-demo`} ref={rootRef}>
        <div className={styles.mrg__badge}>{badge}</div>
        <button className={styles.mrg__ctrl} type="button" ref={ctrlRef}>{ctrlLabel}</button>
        <div className={styles["mrg__canvas-wrap"]}>
          <canvas className={styles.mrg__canvas} ref={canvasRef} width={240} height={200} />
        </div>
      </div>
    </main>
  );
}
