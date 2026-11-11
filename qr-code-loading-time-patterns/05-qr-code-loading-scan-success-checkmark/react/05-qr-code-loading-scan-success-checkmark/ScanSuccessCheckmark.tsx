import { useEffect, useRef, useState } from "react";
import styles from "./ScanSuccessCheckmark.module.scss";

export default function ScanSuccessCheckmark() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctrlRef = useRef<HTMLButtonElement>(null);
  const [badge, setBadge] = useState("스캔 대기");
  const [ctrlLabel, setCtrlLabel] = useState("일시정지");

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctrl = ctrlRef.current;
    if (!root || !canvas || !ctrl) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // SUCCESS_CHECK_SPRING_OVERSHOOT — 변형 1: 0.18 → 0.32 로 늘리면 체크 배지가 더 크게 튕긴다.
    const SUCCESS_CHECK_SPRING_OVERSHOOT = 0.18;
    const LOOP_MS = 2000;
    const DRAW_START = 200, DRAW_END = 620;
    const POP_START = 560, POP_END = 980;

    // 계산 한 겹: 감쇠 스프링 근사 — overshoot 비율만큼 목표를 넘었다가 되돌아오는
    // 단일 코사인 감쇠식으로 배지 스케일을 만든다 (linear tween 아님).
    function springScale(p: number, overshoot: number) {
      if (p <= 0) return 0;
      if (p >= 1) return 1;
      const decay = Math.exp(-4.5 * p);
      return 1 + overshoot * decay * Math.cos(p * Math.PI * 2.2);
    }

    function clamp01(v: number) { return v < 0 ? 0 : v > 1 ? 1 : v; }

    function draw(elapsed: number) {
      const cw = canvas!.width, ch = canvas!.height;
      ctx!.clearRect(0, 0, cw, ch);
      const cx = cw / 2, cy = ch / 2;

      const drawP = clamp01((elapsed - DRAW_START) / (DRAW_END - DRAW_START));
      const popP = clamp01((elapsed - POP_START) / (POP_END - POP_START));

      const box = 70;
      ctx!.strokeStyle = "rgba(255,255,255,.14)";
      ctx!.lineWidth = 2;
      ctx!.strokeRect(cx - box / 2, cy - box / 2, box, box);

      if (drawP > 0 && popP < 1) {
        ctx!.save();
        ctx!.strokeStyle = "rgba(120,200,255,.9)";
        ctx!.lineWidth = 3;
        ctx!.beginPath();
        ctx!.moveTo(cx - box / 2 + 6, cy - box / 2 + drawP * (box - 12) + 6);
        ctx!.stroke();
        ctx!.restore();
      }

      if (popP > 0) {
        const scale = springScale(popP, SUCCESS_CHECK_SPRING_OVERSHOOT);
        const r = 40 * scale;
        ctx!.fillStyle = "rgba(120,220,170,.92)";
        ctx!.beginPath();
        ctx!.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2);
        ctx!.fill();

        if (r > 8) {
          ctx!.strokeStyle = "rgb(20,26,38)";
          ctx!.lineWidth = 4;
          ctx!.lineCap = "round";
          ctx!.lineJoin = "round";
          ctx!.beginPath();
          ctx!.moveTo(cx - 14, cy + 1);
          ctx!.lineTo(cx - 4, cy + 12);
          ctx!.lineTo(cx + 16, cy - 12);
          ctx!.stroke();
        }
      }

      if (popP >= 1) {
        setBadge("스캔 완료");
      } else if (drawP > 0) {
        setBadge("확인 중 " + Math.round(drawP * 100) + "%");
      } else {
        setBadge("스캔 대기");
      }
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let playing = true;
    let elapsed = reduce ? POP_END : 0;
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
      <div className={`${styles.ssc} is-demo`} ref={rootRef}>
        <div className={styles.ssc__badge}>{badge}</div>
        <button className={styles.ssc__ctrl} type="button" ref={ctrlRef}>{ctrlLabel}</button>
        <div className={styles["ssc__canvas-wrap"]}>
          <canvas className={styles.ssc__canvas} ref={canvasRef} width={240} height={200} />
        </div>
      </div>
    </main>
  );
}
