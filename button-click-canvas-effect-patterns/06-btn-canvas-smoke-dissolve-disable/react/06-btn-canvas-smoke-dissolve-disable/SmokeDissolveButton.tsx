// SmokeDissolveButton — vanilla 판(run/404/demo/06-btn-canvas-smoke-dissolve-disable/index.html) 의 React 포트.
// 버튼을 오프스크린에 한 번 그려 실제 픽셀을 격자로 표본하고, 비활성(품절) 토글이 켜지는 순간
// 칸마다 정해진 방향 값·속도 값을 따라 위로 흩어지며 옅어진다. 다시 누르면 역순으로 모인다.
import { useEffect, useRef } from "react";
import styles from "./SmokeDissolveButton.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type Shard = {
  ox: number; oy: number; w: number; h: number;
  r: number; g: number; b: number;
  dirX: number; dirY: number; spin: number; delay: number;
};

const W = 480, H = 300;
const SEED = 60611;
const BW = 224, BH = 68;
const BX = (W - BW) / 2, BY = (H - BH) / 2;
const CELL = 7;
const COLS = Math.ceil(BW / CELL), ROWS = Math.ceil(BH / CELL);
const ASSEMBLE_SPEED = 2.6;

function makeLcg(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function buildShards(rnd: () => number): Shard[] {
  const off = document.createElement("canvas");
  off.width = BW; off.height = BH;
  const octx = off.getContext("2d");
  if (!octx) return [];
  octx.fillStyle = "#17141a";
  roundRect(octx, 0, 0, BW, BH, 12);
  octx.fill();
  octx.fillStyle = "#fff7e6";
  octx.font = "700 18px system-ui, sans-serif";
  octx.textAlign = "center";
  octx.textBaseline = "middle";
  octx.fillText("구매하기", BW / 2, BH / 2 + 1);

  const offData = octx.getImageData(0, 0, BW, BH).data;
  const list: Shard[] = [];
  for (let gy = 0; gy < ROWS; gy++) {
    for (let gx = 0; gx < COLS; gx++) {
      const sx = gx * CELL, sy = gy * CELL;
      const sw = Math.min(CELL, BW - sx), sh = Math.min(CELL, BH - sy);
      if (sw <= 0 || sh <= 0) continue;
      const cxp = Math.min(BW - 1, sx + (sw / 2 | 0));
      const cyp = Math.min(BH - 1, sy + (sh / 2 | 0));
      const pi = (cyp * BW + cxp) * 4;
      const a = offData[pi + 3];
      if (a < 10) continue;
      const ang = rnd() * Math.PI * 2;
      const driftMag = 26 + rnd() * 54;
      list.push({
        ox: BX + sx, oy: BY + sy, w: sw, h: sh,
        r: offData[pi], g: offData[pi + 1], b: offData[pi + 2],
        dirX: Math.cos(ang) * driftMag,
        dirY: Math.sin(ang) * driftMag - 40 - rnd() * 46,
        spin: (rnd() - 0.5) * 2.4,
        delay: rnd() * 0.28,
      });
    }
  }
  return list;
}

export default function SmokeDissolveButton() {
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const rndRef = useRef(makeLcg(SEED)) as Box<() => number>;
  const shardsRef = useRef<Shard[]>([]) as Box<Shard[]>;
  const assemblyRef = useRef<number>(1) as Box<number>;
  const targetRef = useRef<number>(1) as Box<number>;
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const reduceRef = useRef<boolean>(false) as Box<boolean>;
  const lastTRef = useRef<number | null>(null) as Box<number | null>;
  const frameRef = useRef<number>(0) as Box<number>;

  function render(dt: number): void {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    assemblyRef.current += (targetRef.current - assemblyRef.current) * Math.min(1, dt * ASSEMBLE_SPEED);
    const assembly = assemblyRef.current;
    ctx.clearRect(0, 0, W, H);
    const shards = shardsRef.current;
    for (let i = 0; i < shards.length; i++) {
      const s = shards[i];
      const local = Math.max(0, Math.min(1, (assembly - s.delay) / (1 - s.delay)));
      const scatter = 1 - local;
      const px = s.ox + s.dirX * scatter * scatter;
      const py = s.oy + s.dirY * scatter * scatter - scatter * 18;
      const alpha = local;
      if (alpha <= 0.01) continue;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(px + s.w / 2, py + s.h / 2);
      ctx.rotate(s.spin * scatter);
      ctx.fillStyle = "rgb(" + s.r + "," + s.g + "," + s.b + ")";
      ctx.fillRect(-s.w / 2, -s.h / 2, s.w, s.h);
      ctx.restore();
    }
  }

  function toggle(): void {
    demoRef.current = false;
    targetRef.current = targetRef.current === 1 ? 0 : 1;
    if (reduceRef.current) render(0.05);
  }

  function onKeyDown(e: KeyEvt): void {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    toggle();
  }

  useEffect(() => {
    shardsRef.current = buildShards(rndRef.current);
    reduceRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceRef.current) {
      targetRef.current = 0.4;
      assemblyRef.current = 0.4;
      render(0.05);
      return;
    }
    targetRef.current = 0;

    function frame(now: number): void {
      const last = lastTRef.current;
      const dt = last === null ? 0.016 : Math.min(0.05, (now - last) / 1000);
      lastTRef.current = now;
      if (demoRef.current) {
        const t = now % 2200;
        targetRef.current = t < 1100 ? 0 : 1;
      }
      render(dt);
      frameRef.current = requestAnimationFrame(frame);
    }
    frameRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.sd}>
        <canvas className={styles.cv} ref={cvRef} width={W} height={H} onPointerDown={toggle} />
        <button className={styles.btn} ref={btnRef} type="button" onClick={toggle} onKeyDown={onKeyDown}>
          구매하기
        </button>
        <p className={styles.hint}>버튼을 누르면 품절 처리되며 연기처럼 흩어집니다</p>
      </div>
    </main>
  );
}
