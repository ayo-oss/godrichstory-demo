import { useEffect, useRef, useState } from "react";
import styles from "./PulseRingExpire.module.scss";

export default function PulseRingExpire() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctrlRef = useRef<HTMLButtonElement>(null);
  const [badge, setBadge] = useState("남은 유효 100%");
  const [ctrlLabel, setCtrlLabel] = useState("일시정지");

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctrl = ctrlRef.current;
    if (!root || !canvas || !ctrl) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // PULSE_RING_INTERVAL_MS — 변형 1: 320 → 700 으로 늘리면 링이 더 드문드문 퍼진다.
    // 320 으로 좁혀 2초 측정 창 안에 동시에 겹치는 링 수를 늘린다(화면을 채우는 시연 스케줄).
    const PULSE_RING_INTERVAL_MS = 320;
    const LOOP_MS = 2000;
    const RING_LIFE_MS = 1100;
    let MAX_RADIUS = 88; // fit() 이 캔버스 크기에 맞춰 화면 폭까지 퍼지도록 재계산한다
    const wrap = canvas.parentElement as HTMLElement;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
      };
    }
    const rand = seedRand(407033);
    const qrDots: { x: number; y: number }[] = [];
    for (let y = 0; y < 9; y += 1) {
      for (let x = 0; x < 9; x += 1) {
        if (rand() < 0.42) qrDots.push({ x, y });
      }
    }

    function ringsFor(elapsed: number) {
      const out: number[] = [];
      const firstIndex = Math.ceil((elapsed - RING_LIFE_MS) / PULSE_RING_INTERVAL_MS);
      const lastIndex = Math.floor(elapsed / PULSE_RING_INTERVAL_MS);
      for (let i = Math.max(0, firstIndex); i <= lastIndex; i += 1) {
        const born = i * PULSE_RING_INTERVAL_MS;
        const age = elapsed - born;
        if (age < 0 || age > RING_LIFE_MS) continue;
        out.push(age / RING_LIFE_MS);
      }
      return out;
    }

    // 계산된 시각 레이어: 캔버스 크기가 바뀌면 중심·최대 반경을 다시 잰다 —
    // 링이 항상 스테이지 폭까지 퍼지게(278px 캡 없이 반응형).
    let dpr = 1, cw = 240, ch = 200, cx = 120, cy = 100;
    function fit() {
      const r = wrap.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      cw = r.width; ch = r.height;
      canvas!.width = Math.round(cw * dpr);
      canvas!.height = Math.round(ch * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = cw / 2; cy = ch / 2;
      MAX_RADIUS = (cw / 2) * 1.08;
      draw(lastElapsed);
    }

    let lastElapsed = 0;
    function draw(elapsed: number) {
      lastElapsed = elapsed;
      ctx!.clearRect(0, 0, cw, ch);

      // 계산 한 겹: 루프 안 남은 유효시간 비율이 곧 그대로 링의 최대 반경 스케일이 된다
      // (남은 시간이 줄수록 링이 더 작게 퍼진다 = 만료 임박 표시).
      const remain = 1 - (elapsed % LOOP_MS) / LOOP_MS;
      const radiusScale = 0.4 + 0.6 * remain;
      const strokeBase = Math.max(2.5, cw * 0.02);

      ctx!.globalCompositeOperation = "lighter";
      ringsFor(elapsed).forEach((p) => {
        const r = p * MAX_RADIUS * radiusScale;
        const alpha = (1 - p) * 0.5;
        // 글로우 패스 — 굵고 옅은 띠를 먼저 얹어 화면에 퍼지는 면적을 넓힌다.
        ctx!.strokeStyle = "rgba(120,200,255," + (alpha * 0.55).toFixed(3) + ")";
        ctx!.lineWidth = strokeBase * 3.2;
        ctx!.beginPath();
        ctx!.arc(cx, cy, r, 0, Math.PI * 2);
        ctx!.stroke();
        // 선명 패스
        ctx!.strokeStyle = "rgba(150,215,255," + alpha.toFixed(3) + ")";
        ctx!.lineWidth = strokeBase;
        ctx!.beginPath();
        ctx!.arc(cx, cy, r, 0, Math.PI * 2);
        ctx!.stroke();
      });
      ctx!.globalCompositeOperation = "source-over";

      const box = Math.min(cw, ch) * 0.32;
      ctx!.fillStyle = "rgba(20,26,38,.9)";
      ctx!.fillRect(cx - box / 2, cy - box / 2, box, box);
      const cell = box / 9;
      ctx!.fillStyle = "rgb(255,247,230)";
      qrDots.forEach((d) => {
        const s = cell * 0.62;
        ctx!.fillRect(cx - box / 2 + d.x * cell + (cell - s) / 2, cy - box / 2 + d.y * cell + (cell - s) / 2, s, s);
      });

      setBadge("남은 유효 " + Math.round(remain * 100) + "%");
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let playing = true;
    let elapsed = reduce ? LOOP_MS - 1 : 0;
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
      <div className={`${styles.pre} is-demo`} ref={rootRef}>
        <div className={styles.pre__badge}>{badge}</div>
        <button className={styles.pre__ctrl} type="button" ref={ctrlRef}>{ctrlLabel}</button>
        <div className={styles["pre__canvas-wrap"]}>
          <canvas className={styles.pre__canvas} ref={canvasRef} width={240} height={200} />
        </div>
      </div>
    </main>
  );
}
