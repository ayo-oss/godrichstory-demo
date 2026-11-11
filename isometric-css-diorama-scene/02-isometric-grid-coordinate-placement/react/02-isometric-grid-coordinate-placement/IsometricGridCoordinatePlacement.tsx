// IsometricGridCoordinatePlacement — vanilla 판(run/333/demo/02-isometric-grid-coordinate-placement/index.html)
// 의 React 포트. 바둑판 (col,row) 를 등각 화면 좌표 (x,y) 로 바꾸는 공식
// x=(col-row)*tileWidth/2, y=(col+row)*tileHeight/2 을 한 번만 계산해 고정하고,
// 세로로 들어 올리는 파도(--tz)만 매 프레임 다시 계산해 갱신한다.
import { useEffect, useRef } from "react";
import styles from "./IsometricGridCoordinatePlacement.module.scss";

export type IsometricGridCoordinatePlacementProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Box<T> = { current: T };
type Tile = { el: HTMLDivElement; col: number; row: number };

const HINT = "타일마다 x=(col-row)×타일폭/2, y=(col+row)×타일높이/2 를 계산해 마름모 격자로 배치하고 파도처럼 들어 올립니다";
const ARIA_FIELD = "바둑판 좌표를 마름모 격자로 바꾸고 파도처럼 들어 올리는 장면";
const UNIT = "칸 · 2:1 등각 격자";

function mat4RotateX(deg: number): number[] {
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
}
function mat4RotateZ(deg: number): number[] {
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}
function mat4Mul(a: number[], b: number[]): number[] {
  const out = new Array<number>(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[col * 4 + k];
      out[col * 4 + row] = sum;
    }
  }
  return out;
}
function mat4ToCss(m: number[]): string {
  return "matrix3d(" + m.map((v) => v.toFixed(6)).join(",") + ")";
}

const TILT = -35.264;
const N = 6;
const TILE_W = 34, TILE_H = 17;
const AMP = 13;

export default function IsometricGridCoordinatePlacement({
  duration = "2s",
  easing = "ease-out",
  color = "#17141a"
}: IsometricGridCoordinatePlacementProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<HTMLDivElement | null>(null);
  const countRef = useRef<HTMLElement | null>(null);
  const tilesRef = useRef<Tile[]>([]) as Box<Tile[]>;
  const rafRef = useRef(0) as Box<number>;

  useEffect(() => {
    const world = worldRef.current;
    const root = rootRef.current;
    if (!world || !root) return;

    world.style.transform = mat4ToCss(mat4Mul(mat4RotateX(TILT), mat4RotateZ(45)));
    if (countRef.current) countRef.current.textContent = String(N * N);

    const raw: { col: number; row: number; x: number; y: number }[] = [];
    let minX = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let row = 0; row < N; row++) {
      for (let col = 0; col < N; col++) {
        const x = ((col - row) * TILE_W) / 2;
        const y = ((col + row) * TILE_H) / 2;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        raw.push({ col, row, x, y });
      }
    }
    const shiftX = -(minX + maxX) / 2;
    const shiftY = -maxY / 2;

    const tiles: Tile[] = [];
    for (const t of raw) {
      const el = document.createElement("div");
      el.className = styles.tile;
      el.style.setProperty("--tw", String(TILE_W));
      el.style.setProperty("--th", String(TILE_H));
      el.style.setProperty("--tx", (t.x + shiftX).toFixed(2) + "px");
      el.style.setProperty("--ty", (t.y + shiftY).toFixed(2) + "px");
      el.style.setProperty("--tz", "0px");
      world.appendChild(el);
      tiles.push({ el, col: t.col, row: t.row });
    }
    tilesRef.current = tiles;

    function paint(t: number): void {
      for (const it of tilesRef.current) {
        const phase = (it.col + it.row) * 0.9 - t * 3.1;
        const z = Math.max(0, Math.sin(phase)) * AMP;
        it.el.style.setProperty("--tz", z.toFixed(2) + "px");
      }
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      paint(0.6);
      root.classList.add(styles.isStill);
    } else {
      const start = performance.now();
      const step = (now: number): void => {
        paint((now - start) / 1000);
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    }
    return () => {
      cancelAnimationFrame(rafRef.current);
      while (world.firstChild) world.removeChild(world.firstChild);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.gp} ref={rootRef} data-duration={duration} data-easing={easing} data-color={color}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.field} role="img" aria-label={ARIA_FIELD}>
          <div className={styles.world} ref={worldRef}></div>
        </div>
        <p className={styles.meta}>
          <b className={styles.count} ref={countRef}>36</b>
          <span className={styles.metaUnit}>{UNIT}</span>
        </p>
      </div>
    </main>
  );
}
