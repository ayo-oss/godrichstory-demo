import { useEffect, useRef } from "react";
import styles from "./QrCanvasDraw.module.scss";

type Grid = { gridSize: number; cells: boolean[]; total: number };

export default function QrCanvasDraw() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const readoutRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const input = inputRef.current;
    const canvas = canvasRef.current;
    const readout = readoutRef.current;
    if (!root || !input || !canvas || !readout) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;

    function human() {
      if (isDemo) {
        root!.classList.remove("is-demo");
        isDemo = false;
      }
    }

    function hashStr(s: string) {
      let h = 2166136261;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = (h * 16777619) >>> 0;
      }
      return h >>> 0;
    }
    function cellOn(hash: number, i: number) {
      let x = (hash ^ Math.imul(i + 1, 2654435761)) >>> 0;
      x = (x ^ (x >>> 15)) >>> 0;
      return (x & 1) === 1;
    }
    const GRID_MAX = 12; // 변형 07: 키우면 글자 수가 많을 때 격자 칸 수(=캔버스를 채우는 칸 크기)가 더 커진다
    function computeGrid(text: string): Grid {
      const hash = hashStr(text);
      const gridSize = Math.min(GRID_MAX, Math.max(4, 4 + Math.floor(text.length / 3)));
      const total = gridSize * gridSize;
      const finderSize = Math.min(3, gridSize - 1);
      const cells: boolean[] = new Array(total);
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const i = r * gridSize + c;
          const inFinder =
            (r < finderSize && c < finderSize) ||
            (r < finderSize && c >= gridSize - finderSize) ||
            (r >= gridSize - finderSize && c < finderSize);
          cells[i] = inFinder ? true : cellOn(hash, i);
        }
      }
      return { gridSize, cells, total };
    }

    const SENT_PREFIX = "텍스트 ";
    const SENT_MID1 = "자는 ";
    const SENT_MID2 = "×";
    const SENT_SUFFIX = " 격자 값으로 계산됩니다";

    let grid = computeGrid(input.value);
    const CELLS_PER_SEC = 90;
    let revealStartNow = performance.now();

    function recompute(text: string) {
      grid = computeGrid(text);
      revealStartNow = performance.now();
      readout!.textContent =
        SENT_PREFIX + text.length + SENT_MID1 + grid.gridSize + SENT_MID2 + grid.gridSize + SENT_SUFFIX;
      if (reduce) draw(grid.total);
    }

    function draw(revealedCount: number) {
      const size = canvas!.width;
      const cell = size / grid.gridSize;
      ctx!.clearRect(0, 0, size, size);
      ctx!.fillStyle = "#fff7e6";
      ctx!.fillRect(0, 0, size, size);
      ctx!.fillStyle = "#17141a";
      for (let i = 0; i < grid.total && i < revealedCount; i++) {
        if (!grid.cells[i]) continue;
        const r = Math.floor(i / grid.gridSize);
        const c = i % grid.gridSize;
        ctx!.fillRect(c * cell, r * cell, Math.ceil(cell), Math.ceil(cell));
      }
    }

    function onInput() {
      human();
      recompute(input!.value);
    }
    input.addEventListener("input", onInput);
    input.addEventListener("change", onInput);

    const DEMO_VALUES = ["hello world", "abcdef123456", "sample-input-07", "pattern-grid-x9", "hash-seed-42", "demo-text-string"];
    const DRIVE_PERIOD_MS = 2000;
    let driveStart = 0;
    let lastIdx = -1;
    let rafDrive = 0;
    function driveTick(now: number) {
      if (!driveStart) driveStart = now;
      if (isDemo) {
        const frac = ((now - driveStart) % DRIVE_PERIOD_MS) / DRIVE_PERIOD_MS;
        const idx = Math.floor(frac * DEMO_VALUES.length);
        if (idx !== lastIdx) {
          lastIdx = idx;
          input!.value = DEMO_VALUES[idx];
          recompute(DEMO_VALUES[idx]);
        }
      }
      rafDrive = requestAnimationFrame(driveTick);
    }

    let rafFrame = 0;
    function frame(now: number) {
      if (!reduce) {
        const elapsedSec = Math.max(0, (now - revealStartNow) / 1000);
        const revealedCount = Math.min(grid.total, Math.floor(elapsedSec * CELLS_PER_SEC));
        draw(revealedCount);
      }
      rafFrame = requestAnimationFrame(frame);
    }

    readout.textContent =
      SENT_PREFIX + input.value.length + SENT_MID1 + grid.gridSize + SENT_MID2 + grid.gridSize + SENT_SUFFIX;
    if (reduce) draw(grid.total);

    if (!reduce) {
      rafDrive = requestAnimationFrame(driveTick);
      rafFrame = requestAnimationFrame(frame);
    }

    return () => {
      input.removeEventListener("input", onInput);
      input.removeEventListener("change", onInput);
      if (rafDrive) cancelAnimationFrame(rafDrive);
      if (rafFrame) cancelAnimationFrame(rafFrame);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.root} is-demo`}>
      <label className={styles.cap} htmlFor="tqTextReact">
        텍스트 값
      </label>
      <input
        ref={inputRef}
        className={styles.input}
        id="tqTextReact"
        type="text"
        maxLength={18}
        defaultValue="hello world"
        aria-label="텍스트 값을 입력하면 해시로 계산한 QR풍 격자를 캔버스에 그립니다"
        aria-describedby="tqReadoutReact"
      />
      <canvas ref={canvasRef} className={styles.canvas} width={120} height={120} aria-hidden="true" />
      <p ref={readoutRef} className={styles.readout} id="tqReadoutReact" role="status" aria-live="polite" />
    </div>
  );
}
