import { useEffect, useRef } from "react";
import styles from "./VisualizerCanvas.module.scss";

type Point = { f1: number; p1: number; f2: number; p2: number; w2: number; idle: number };

export default function VisualizerCanvas() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const playRef = useRef<HTMLButtonElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const colorRefEl = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const playBtn = playRef.current;
    const canvas = canvasRef.current;
    const colorRef = colorRefEl.current;
    if (!root || !playBtn || !canvas || !colorRef) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;

    // 결정론 난수 — Math.random 을 쓰지 않는다. LCG(선형합동생성기) 하나로 점마다 다른 위상·주파수를 만든다.
    function makeLcg(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }

    const POINT_COUNT = 40;
    const INNER_R = 36; // 앨범 아트 바깥 반지름 — 링이 시작되는 지점
    const RANGE_R = 36; // 반지름 값이 늘어날 수 있는 최대 폭 — 변형: 진폭 배율, 값만 키움(20 → 출렁임이 보이도록)
    const rng = makeLcg(4813);
    const points: Point[] = [];
    for (let i = 0; i < POINT_COUNT; i++) {
      points.push({
        // 사인 곡선 두 겹을 겹쳐 점마다 다른 위상·주파수로 반지름 값을 합성한다 — 실제 소리를 분석해 얻는 값이 아니라
        // 291 편의 AudioContext/AnalyserNode 분석과 달리 여기서는 사인 합성만으로 만든 장식용 값이다.
        f1: 0.5 + rng() * 0.4,
        p1: rng() * Math.PI * 2,
        f2: 1.3 + rng() * 0.7,
        p2: rng() * Math.PI * 2,
        w2: 0.2 + rng() * 0.25,
        idle: 0.08 + rng() * 0.06,
      });
    }

    function synth(pt: Point, tSec: number) {
      const s1 = Math.sin(tSec * pt.f1 * Math.PI * 2 + pt.p1);
      const s2 = Math.sin(tSec * pt.f2 * Math.PI * 2 + pt.p2) * pt.w2;
      const v = (s1 + s2) / (1 + pt.w2); // -1..1
      return 0.5 + v * 0.5; // 0..1
    }

    function human() { if (isDemo) { root!.classList.remove(styles["is-demo"]); isDemo = false; } }

    let playing = true, t0 = 0;
    let ringColor = "#3a3a3a";

    function draw(now: number, playingNow: boolean) {
      const w = canvas!.width, h = canvas!.height;
      const cx = w / 2, cy = h / 2;
      const tSec = (now - t0) / 1000;
      ctx!.clearRect(0, 0, w, h);

      // 점마다 반지름 값을 먼저 계산해 아래 면·틱이 같은 값을 공유한다
      const vals: number[] = [];
      for (let i = 0; i < POINT_COUNT; i++) {
        vals.push(playingNow ? synth(points[i], tSec) : points[i].idle);
      }

      // 출렁이는 반지름을 면으로 이어 진폭이 화면 면적으로 보이게 한다
      ctx!.beginPath();
      for (let j = 0; j <= POINT_COUNT; j++) {
        const k = j % POINT_COUNT;
        const rj = INNER_R + RANGE_R * Math.max(0.04, vals[k]);
        const aj = (k / POINT_COUNT) * Math.PI * 2 - Math.PI / 2;
        const px = cx + Math.cos(aj) * rj, py = cy + Math.sin(aj) * rj;
        if (j === 0) { ctx!.moveTo(px, py); } else { ctx!.lineTo(px, py); }
      }
      ctx!.closePath();
      ctx!.fillStyle = ringColor;
      ctx!.globalAlpha = 0.42;
      ctx!.fill();
      ctx!.lineWidth = 3;
      ctx!.globalAlpha = 1;
      ctx!.strokeStyle = ringColor;
      ctx!.stroke();

      ctx!.lineCap = "round";
      ctx!.strokeStyle = ringColor;
      for (let i2 = 0; i2 < POINT_COUNT; i2++) {
        const v = vals[i2];
        const r1 = INNER_R;
        const r2 = INNER_R + RANGE_R * Math.max(0.04, v);
        const angle = (i2 / POINT_COUNT) * Math.PI * 2 - Math.PI / 2;
        const cos = Math.cos(angle), sin = Math.sin(angle);
        ctx!.globalAlpha = 0.35 + v * 0.65;
        ctx!.lineWidth = 4.2;
        ctx!.beginPath();
        ctx!.moveTo(cx + cos * r1, cy + sin * r1);
        ctx!.lineTo(cx + cos * r2, cy + sin * r2);
        ctx!.stroke();
      }
      ctx!.globalAlpha = 1;
    }

    function setPlaying(next: boolean) {
      playing = next;
      root!.classList.toggle(styles["is-playing"], next);
    }

    function onPlayClick() { human(); setPlaying(!playing); }
    function onPlayKeydown(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); human(); setPlaying(!playing); }
    }

    let raf = 0;
    function frame(now: number) {
      if (!t0) t0 = now;
      draw(now, isDemo ? true : playing);
      raf = requestAnimationFrame(frame);
    }

    ringColor = getComputedStyle(colorRef).color || ringColor;

    function onReduceClick() { human(); setPlaying(!playing); draw(performance.now(), playing); }
    function onReduceKeydown(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault(); human(); setPlaying(!playing);
        draw(performance.now(), playing);
      }
    }

    if (reduce) {
      root.classList.add(styles["is-still"]);
      t0 = performance.now();
      draw(t0, false);
      playBtn.addEventListener("click", onReduceClick);
      playBtn.addEventListener("keydown", onReduceKeydown);
    } else {
      playBtn.addEventListener("click", onPlayClick);
      playBtn.addEventListener("keydown", onPlayKeydown);
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      if (reduce) {
        playBtn.removeEventListener("click", onReduceClick);
        playBtn.removeEventListener("keydown", onReduceKeydown);
      } else {
        playBtn.removeEventListener("click", onPlayClick);
        playBtn.removeEventListener("keydown", onPlayKeydown);
      }
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.viz + " " + styles["is-demo"] + " " + styles["is-playing"]} ref={rootRef}>
        <p className={styles.hint}><span>재생을 누르면 반지름 값이 계산되어 앨범 아트 둘레로 스펙트럼 링이 번집니다</span></p>
        <div className={styles.panel}>
          <div className={styles.ringWrap}>
            <canvas className={styles.ring} ref={canvasRef} width={140} height={140} aria-hidden="true" />
            <div className={styles.art} />
            <span className={styles.colorref} ref={colorRefEl} aria-hidden="true" />
          </div>
          <button className={styles.play} ref={playRef} type="button" aria-label="재생">
            <svg className={`${styles.ico} ${styles.icoPlay}`} aria-hidden="true"><use href="#ico-play" /></svg>
            <svg className={`${styles.ico} ${styles.icoPause}`} aria-hidden="true"><use href="#ico-pause" /></svg>
          </button>
        </div>
      </div>
    </main>
  );
}
