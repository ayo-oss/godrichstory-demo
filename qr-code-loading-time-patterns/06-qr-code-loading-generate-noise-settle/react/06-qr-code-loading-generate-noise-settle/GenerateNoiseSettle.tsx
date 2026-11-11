import { useEffect, useRef, useState } from "react";
import styles from "./GenerateNoiseSettle.module.scss";

export default function GenerateNoiseSettle() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctrlRef = useRef<HTMLButtonElement>(null);
  const [badge, setBadge] = useState("코드 생성 중");
  const [ctrlLabel, setCtrlLabel] = useState("일시정지");

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctrl = ctrlRef.current;
    if (!root || !canvas || !ctrl) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // QR_NOISE_SETTLE_AMPLITUDE_PX — 변형 1: 6 → 2 로 늘리면 초기 흔들림 폭이 더 커진다(전값이 초기값).
    const QR_NOISE_SETTLE_AMPLITUDE_PX = 6;
    const LOOP_MS = 2000;
    const SETTLE_MS = 1500;
    const SIZE = 13;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
      };
    }
    const rand = seedRand(407060);
    const modules: { x: number; y: number; phase: number; freq: number; dir: number }[] = [];
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        if (rand() < 0.45) {
          modules.push({
            x, y,
            phase: rand() * Math.PI * 2,
            freq: 6 + rand() * 4,
            dir: rand() * Math.PI * 2,
          });
        }
      }
    }

    function draw(elapsed: number) {
      const cw = canvas!.width, ch = canvas!.height;
      ctx!.clearRect(0, 0, cw, ch);
      const box = Math.min(cw, ch) - 40;
      const cell = box / SIZE;
      const ox = (cw - box) / 2, oy = (ch - box) / 2;

      // 계산 한 겹: 진폭이 시간에 따라 지수 감쇠 — 초기 QR_NOISE_SETTLE_AMPLITUDE_PX 에서
      // SETTLE_MS 동안 0으로 잦아들며, 모듈마다 다른 위상·방향으로 흔들려 자리를 잡는다.
      const settleP = Math.min(1, elapsed / SETTLE_MS);
      const amp = QR_NOISE_SETTLE_AMPLITUDE_PX * Math.exp(-4 * settleP);

      ctx!.fillStyle = "rgb(255,247,230)";
      modules.forEach((m) => {
        const wobble = Math.sin((elapsed / 1000) * m.freq + m.phase) * amp;
        const jx = Math.cos(m.dir) * wobble;
        const jy = Math.sin(m.dir) * wobble;
        const s = cell * 0.68;
        const cx = ox + m.x * cell + cell / 2 + jx;
        const cy = oy + m.y * cell + cell / 2 + jy;
        ctx!.globalAlpha = 0.55 + 0.45 * settleP;
        ctx!.fillRect(cx - s / 2, cy - s / 2, s, s);
      });
      ctx!.globalAlpha = 1;

      setBadge(settleP >= 1 ? "코드 생성 완료" : "코드 생성 중 " + Math.round(settleP * 100) + "%");
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let playing = true;
    let elapsed = reduce ? SETTLE_MS : 0;
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
      <div className={`${styles.gns} is-demo`} ref={rootRef}>
        <div className={styles.gns__badge}>{badge}</div>
        <button className={styles.gns__ctrl} type="button" ref={ctrlRef}>{ctrlLabel}</button>
        <div className={styles["gns__canvas-wrap"]}>
          <canvas className={styles.gns__canvas} ref={canvasRef} width={240} height={200} />
        </div>
      </div>
    </main>
  );
}
