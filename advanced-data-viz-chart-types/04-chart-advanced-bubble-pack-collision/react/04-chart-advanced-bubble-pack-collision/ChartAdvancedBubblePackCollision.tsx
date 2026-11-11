import { useEffect, useRef } from "react";
import styles from "./ChartAdvancedBubblePackCollision.module.scss";

type Pos = { x: number; y: number };

export default function ChartAdvancedBubblePackCollision() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const wrap = canvas.parentElement as HTMLElement;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }

    const CALC_W = 480, CALC_H = 300;
    const LOOP_MS = 2000;
    const T0 = 200;

    const COUNT = 7;
    const K = 3.1;
    const BUBBLE_PACK_COLLISION_ITERATIONS = 30;

    function buildPack(seed: number) {
      const pr = seedRand(seed);
      const values: number[] = [];
      for (let vi = 0; vi < COUNT; vi += 1) values.push(30 + pr() * 220);
      const radii = values.map(function (v) { return Math.sqrt(v) * K; });
      const packCenterX = CALC_W * 0.5;
      const packCenterY = CALC_H * 0.5;
      const initialPositions: Pos[] = [];
      for (let pi = 0; pi < COUNT; pi += 1) {
        initialPositions.push({
          x: packCenterX + (pr() - 0.5) * 46,
          y: packCenterY + (pr() - 0.5) * 46
        });
      }
      const snapshots: Pos[][] = [initialPositions.map(function (p) { return { x: p.x, y: p.y }; })];
      const relaxed: Pos[] = initialPositions.map(function (p) { return { x: p.x, y: p.y }; });
      for (let iter = 0; iter < BUBBLE_PACK_COLLISION_ITERATIONS; iter += 1) {
        for (let a = 0; a < COUNT; a += 1) {
          for (let b = a + 1; b < COUNT; b += 1) {
            const pa = relaxed[a], pb = relaxed[b];
            let dx = pb.x - pa.x, dy = pb.y - pa.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = radii[a] + radii[b];
            if (dist < minDist) {
              if (dist < 0.001) {
                const ang = ((a * 37 + b * 53 + seed) % 360) * Math.PI / 180;
                dx = Math.cos(ang); dy = Math.sin(ang); dist = 0.001;
              }
              const overlap = minDist - dist;
              const nx = dx / dist, ny = dy / dist;
              const push = overlap * 0.5;
              pa.x -= nx * push; pa.y -= ny * push;
              pb.x += nx * push; pb.y += ny * push;
            }
          }
        }
        for (let c = 0; c < COUNT; c += 1) {
          const pc = relaxed[c], rc = radii[c];
          pc.x = Math.max(rc, Math.min(CALC_W - rc, pc.x));
          pc.y = Math.max(rc, Math.min(CALC_H - rc, pc.y));
        }
        snapshots.push(relaxed.map(function (p) { return { x: p.x, y: p.y }; }));
      }
      return { radii, snapshots };
    }

    // 값 리셔플 2회: 세 팩을 시연 구간에 나눠 배치해, 완화가 한 번에 끝나지 않고
    // 시연 내내 진행되다가 경계마다 다시 밀어내는 과정을 두 번 더 보여준다.
    const PACKS = [buildPack(425041), buildPack(425042), buildPack(425043)];

    const FILL_COLORS = ["47,109,246", "194,54,26", "43,157,116", "138,92,214"];
    const INK_STROKE = "23,20,26";

    function lerp(x0: number, x1: number, f: number) { return x0 + (x1 - x0) * f; }

    let cw = 480, ch = 300;
    function draw(t: number) {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      ctx!.clearRect(0, 0, cw, ch);

      const et = Math.max(0, t - T0);
      const seg = (LOOP_MS - T0) / PACKS.length;
      const segIdx = Math.min(PACKS.length - 1, Math.floor(et / seg));
      const localT = et - segIdx * seg;
      const unit = Math.max(0, Math.min(1, localT / seg));
      const tri = unit < 0.5 ? unit * 2 : 2 - unit * 2;
      // 완화 초반(적은 반복)이 위치 변화가 크고 후반은 변화가 작아, 시간을 선형으로 매핑하면
      // 뒤쪽 프레임이 정지해 보인다 — frac 을 볼록(위로 가속)하게 눌러 반복 인덱스가
      // 초반엔 느리게(그래도 위치는 크게 바뀜), 후반엔 빠르게 지나가 프레임마다 변화가 이어진다.
      const frac = Math.pow(tri, 3.6);
      const iterFrac = frac * BUBBLE_PACK_COLLISION_ITERATIONS;
      const lo = Math.floor(iterFrac);
      const hi = Math.min(lo + 1, BUBBLE_PACK_COLLISION_ITERATIONS);
      const f2 = iterFrac - lo;
      const pack = PACKS[segIdx];
      const snapLo = pack.snapshots[lo], snapHi = pack.snapshots[hi];
      const radii = pack.radii;

      for (let i = 0; i < COUNT; i += 1) {
        const px = lerp(snapLo[i].x, snapHi[i].x, f2);
        const py = lerp(snapLo[i].y, snapHi[i].y, f2);
        const dx = px * sx, dy = py * sy, dr = radii[i] * ((sx + sy) / 2);
        ctx!.beginPath();
        ctx!.fillStyle = "rgba(" + FILL_COLORS[i % 4] + ",0.8)";
        ctx!.strokeStyle = "rgba(" + INK_STROKE + ",1)";
        ctx!.lineWidth = 1;
        ctx!.arc(dx, dy, dr, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.stroke();
      }
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let elapsed = 0;
    if (reduce) root.classList.remove("is-demo");

    function phaseOf(ms: number) { return reduce ? LOOP_MS * 0.72 : (ms % LOOP_MS); }

    function fit() {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      draw(phaseOf(elapsed));
    }

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!reduce) elapsed += dt;
      draw(phaseOf(elapsed));
      raf = requestAnimationFrame(tick);
    }
    fit();
    window.addEventListener("resize", fit);
    draw(phaseOf(elapsed));
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.bpk} is-demo`} ref={rootRef}>
        <canvas className={styles.bpk__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.bpk__caption}>값이 큰 항목일수록 반지름을 크게 잡고 원끼리 겹치지 않을 때까지 위치를 반복 계산해, 크기만으로 값이 비교된다.</p>
      </div>
    </main>
  );
}
