import { useEffect, useRef, useState } from "react";
import styles from "./MultiCodeCarousel.module.scss";

export default function MultiCodeCarousel() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctrlRef = useRef<HTMLButtonElement>(null);
  const [badge, setBadge] = useState("1 / 5");
  const [ctrlLabel, setCtrlLabel] = useState("일시정지");

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctrl = ctrlRef.current;
    if (!root || !canvas || !ctrl) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // MULTI_CODE_CAROUSEL_STEP_MS — 변형 1: 650 → 1000 으로 늘리면 코드가 더 느긋하게 넘어간다.
    const MULTI_CODE_CAROUSEL_STEP_MS = 650;
    const COUNT = 5;
    const LOOP_MS = MULTI_CODE_CAROUSEL_STEP_MS * COUNT;
    const wrap = canvas.parentElement as HTMLElement;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
      };
    }
    const grids: { x: number; y: number }[][] = [];
    for (let g = 0; g < COUNT; g += 1) {
      const rand = seedRand(407090 + g * 17);
      const dots: { x: number; y: number }[] = [];
      for (let y = 0; y < 7; y += 1) {
        for (let x = 0; x < 7; x += 1) {
          if (rand() < 0.44) dots.push({ x, y });
        }
      }
      grids.push(dots);
    }

    function easeInOut(t: number) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

    // 계산된 시각 레이어: 캔버스 크기가 바뀌면 카드 간격·크기를 다시 잰다 —
    // 카드 이동·원근 스케일이 스테이지를 채우도록(278px 캡 없이 반응형).
    let dpr = 1, cw = 240, ch = 200, cy = 100, stepX = 74, boxBase = 60;
    function fit() {
      const r = wrap.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      cw = r.width; ch = r.height;
      canvas!.width = Math.round(cw * dpr);
      canvas!.height = Math.round(ch * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      cy = ch / 2;
      stepX = cw * 0.31;
      boxBase = Math.min(cw * 0.24, ch * 0.5);
      draw(lastElapsed);
    }

    let lastElapsed = 0;
    function draw(elapsed: number) {
      lastElapsed = elapsed;
      ctx!.clearRect(0, 0, cw, ch);

      const raw = elapsed / MULTI_CODE_CAROUSEL_STEP_MS;
      const index = Math.floor(raw) % COUNT;
      const localT = raw - Math.floor(raw);
      const eased = easeInOut(localT);
      const pos = index + eased;

      for (let i = 0; i < COUNT; i += 1) {
        // 계산 한 겹: 현재 위치와의 거리 → 원근 스케일·투명도·좌우 이동량을 함께 구한다.
        let diff = i - pos;
        while (diff > COUNT / 2) diff -= COUNT;
        while (diff < -COUNT / 2) diff += COUNT;
        const dist = Math.abs(diff);
        if (dist > 1.8) continue;
        const scale = Math.max(0.35, 1 - dist * 0.42);
        const alpha = Math.max(0, 1 - dist * 0.55);
        const cx = cw / 2 + diff * stepX;

        const box = boxBase * scale;
        ctx!.globalAlpha = alpha;
        ctx!.fillStyle = "rgba(20,26,38,.92)";
        ctx!.fillRect(cx - box / 2, cy - box / 2, box, box);
        const cell = box / 7;
        ctx!.fillStyle = "rgb(255,247,230)";
        grids[i].forEach((d) => {
          const s = cell * 0.62;
          ctx!.fillRect(cx - box / 2 + d.x * cell + (cell - s) / 2, cy - box / 2 + d.y * cell + (cell - s) / 2, s, s);
        });
      }
      ctx!.globalAlpha = 1;

      setBadge((index + 1) + " / " + COUNT);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let playing = true;
    let elapsed = 0;
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
    fit();
    window.addEventListener("resize", fit);
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
      window.removeEventListener("resize", fit);
      ctrl.removeEventListener("click", onClick);
      ctrl.removeEventListener("keydown", onKeydown);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.mcc} is-demo`} ref={rootRef}>
        <div className={styles.mcc__badge}>{badge}</div>
        <button className={styles.mcc__ctrl} type="button" ref={ctrlRef}>{ctrlLabel}</button>
        <div className={styles["mcc__canvas-wrap"]}>
          <canvas className={styles.mcc__canvas} ref={canvasRef} width={240} height={200} />
        </div>
      </div>
    </main>
  );
}
