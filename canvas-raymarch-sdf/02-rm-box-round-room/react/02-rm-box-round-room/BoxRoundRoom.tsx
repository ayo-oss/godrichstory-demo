// BoxRoundRoom — vanilla 판(run/312/demo/02-rm-box-round-room/index.html) 의 React 포트.
// 박스 SDF 에 모서리 둥글기를 더하고, 카메라를 박스 안쪽에 둔다. 안쪽에서는 경계까지의
// 거리를 전진하고, 닿은 벽의 법선으로 네 벽의 색을 나눈다. 천장 램프가 원운동하며 벽 밝기가 흐른다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./BoxRoundRoom.module.scss";

export type BoxRoundRoomProps = {
  duration?: string;
  easing?: string;
  color?: string;
  renderWidth?: number;   // 렌더 타깃 폭(버퍼 픽셀)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type PointerEvt = { clientX: number; clientY: number };
type KeyEvt = { key: string; preventDefault(): void };
type RGB = [number, number, number];
type Size = { w: number; h: number };

const TAU = Math.PI * 2;
const FIELD_LABEL = "박스 방 실내 렌더 실험판";
const STILL_T = 0.6;
const ROUND = 0.5;        // 모서리 둥글기(sdRoundBox 의 r)
const ROOM_HX = 3.0, ROOM_HY = 1.5, ROOM_HZ = 3.0;   // 방 반폭

// 실내 거리 — 카메라가 박스 안에 있을 때 둥근 벽까지의 거리.
// 코어(반폭 - 둥글기)의 면까지 여유 거리가 곧 안전 이동 거리다
function distToWall(px: number, py: number, pz: number): number {
  const hx = ROOM_HX - ROUND, hy = ROOM_HY - ROUND, hz = ROOM_HZ - ROUND;
  const dx = hx - Math.abs(px), dy = hy - Math.abs(py), dz = hz - Math.abs(pz);
  return Math.min(dx, Math.min(dy, dz));
}

// 법선(전방 차분) — 경계 함수의 기울기. 내부에서 바깥을 향한다
function normalAt(px: number, py: number, pz: number): RGB {
  const e = 0.002;
  const nx = distToWall(px + e, py, pz) - distToWall(px - e, py, pz);
  const ny = distToWall(px, py + e, pz) - distToWall(px, py - e, pz);
  const nz = distToWall(px, py, pz + e) - distToWall(px, py, pz - e);
  const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  return [nx / l, ny / l, nz / l];
}

function clamp255(v: number): number { return v > 255 ? 255 : (v < 0 ? 0 : v); }

export default function BoxRoundRoom({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#4cd4a6",
  renderWidth = 56,
}: BoxRoundRoomProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const bufRef = useRef<HTMLCanvasElement | null>(null);
  const bctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const imgRef = useRef<ImageData | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<Size>;
  const colRef = useRef<{ wallA: RGB; wallB: RGB; floor: RGB; ceil: RGB; shade: RGB } | null>(null);
  const rtRef = useRef(renderWidth) as Box<number>;
  const headingRef = useRef(0.4) as Box<number>;
  const pitchRef = useRef(0.08) as Box<number>;
  const pxRef = useRef(0.5) as Box<number>;
  const pyRef = useRef(0.5) as Box<number>;
  const manualRef = useRef(false) as Box<boolean>;
  const rafRef = useRef(0) as Box<number>;
  const t0Ref = useRef(-1) as Box<number>;
  const [res, setRes] = useState("56×24");
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function tokRGB(root: HTMLDivElement, name: string): RGB {
    const s = getComputedStyle(root).getPropertyValue(name).trim();
    if (s.charAt(0) === "#") {
      const hx = s.length === 4
        ? s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3)
        : s.slice(1);
      return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
    }
    const p = s.replace(/[^\d,.]/g, "").split(",");
    return [Number(p[0]) || 0, Number(p[1]) || 0, Number(p[2]) || 0];
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const size = sizeRef.current;
    const r = field.getBoundingClientRect();
    size.w = r.width; size.h = r.height;
    cv.width = Math.round(size.w); cv.height = Math.round(size.h);
    ctxRef.current = ctx;
    const bh = Math.max(12, Math.round(rtRef.current * size.h / size.w));
    const buf = document.createElement("canvas");
    buf.width = rtRef.current; buf.height = bh;
    const bctx = buf.getContext("2d");
    if (!bctx) return;
    bufRef.current = buf; bctxRef.current = bctx;
    imgRef.current = bctx.createImageData(rtRef.current, bh);
    setRes(rtRef.current + "×" + bh);
  }

  function draw(tSec: number): void {
    const img = imgRef.current, bctx = bctxRef.current, buf = bufRef.current, ctx = ctxRef.current;
    const col = colRef.current;
    if (!img || !bctx || !buf || !ctx || !col) return;
    const data = img.data;
    const size = sizeRef.current;
    const bw = buf.width, bh = buf.height;
    const STEPS = 56, HIT_EPS = 0.01;

    // 카메라 — 방 중심 (0, 0.88, 0) 근처에서 제자리 돌기.
    // 눈 높이는 코어 반높이(1.5-0.5=1.0) 안쪽이어야 첫 스텝부터 벽에 즉시 닿지 않는다
    const EYE_Y = 0.88;
    const heading = headingRef.current, pitch = pitchRef.current;
    const ch = Math.cos(heading), sh = Math.sin(heading);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const ex = -sh * 1.1, ey = EYE_Y, ez = -ch * 1.1;
    const fx = sh * cp, fy = sp, fz = ch * cp;
    let rx = -fz, rz = fx;
    const rl = Math.sqrt(rx * rx + rz * rz) || 1;
    rx /= rl; rz /= rl;
    const ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy;

    // 천장 램프 — 도는 빛 위치. 원운동 반경이 커야 벽 밝기 변화가 눈에 보인다
    const lampR = 0.85;
    const lampX = Math.cos(tSec * 0.9) * lampR;
    const lampZ = Math.sin(tSec * 0.9) * lampR;
    const lampY = 1.28;

    let i = 0;
    for (let y = 0; y < bh; y++) {
      const vy = (1 - 2 * (y + 0.5) / bh) * 0.52;
      for (let x = 0; x < bw; x++) {
        const vx = (2 * (x + 0.5) / bw - 1) * 0.82;
        let dx = fx + rx * vx + ux * vy;
        let dy = fy + uy * vy;
        let dz = fz + rz * vx + uz * vy;
        const dl = Math.sqrt(dx * dx + dy * dy + dz * dz);
        dx /= dl; dy /= dl; dz /= dl;

        // ── march 루프(실내판) — 경계까지의 거리만큼 안쪽에서 전진 ──
        let t = 0.06, hit = 0, px = ex, py = ey, pz = ez;
        for (let s = 0; s < STEPS; s++) {
          px = ex + dx * t; py = ey + dy * t; pz = ez + dz * t;
          const d = distToWall(px, py, pz);
          if (d < HIT_EPS) { hit = 1; break; }       // 벽에 도달
          t += d;
          if (t > 9.0) break;
        }

        let r: number, g: number, b: number;
        if (hit) {
          const n = normalAt(px, py, pz);
          // 벽 색 나눔 — 법선의 주축이 어느 벽인지 말해준다
          const ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2]);
          let base: RGB;
          if (ay >= ax && ay >= az) {
            base = n[1] > 0 ? col.ceil : col.floor;   // 위·아래
          } else if (ax >= az) {
            base = col.wallB;                         // 좌우 옆벽
          } else {
            base = col.wallA;                         // 앞뒤 벽
          }
          // 램프 거리 조명 — 램프에 가까운 벽이 밝다
          const ldx = px - lampX, ldy = py - lampY, ldz = pz - lampZ;
          const ld = Math.sqrt(ldx * ldx + ldy * ldy + ldz * ldz);
          const atten = 2.6 / (0.4 + ld * ld * 0.42);
          const toLx = -ldx / ld, toLy = -ldy / ld, toLz = -ldz / ld;
          const lam = Math.max(0, -(n[0] * toLx + n[1] * toLy + n[2] * toLz));
          const lit = 0.3 + Math.min(1.05, atten * (0.35 + 0.65 * lam));
          r = base[0] * lit + col.shade[0] * 0.14;
          g = base[1] * lit + col.shade[1] * 0.14;
          b = base[2] * lit + col.shade[2] * 0.14;
        } else {
          r = col.shade[0]; g = col.shade[1]; b = col.shade[2];
        }
        data[i] = clamp255(r);
        data[i + 1] = clamp255(g);
        data[i + 2] = clamp255(b);
        data[i + 3] = 255;
        i += 4;
      }
    }
    bctx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, size.w, size.h);
    ctx.drawImage(buf, 0, 0, size.w, size.h);
  }

  function aim(): [number, number] {
    return [(pxRef.current - 0.5) * 2.6, 0.08 + (pyRef.current - 0.5) * 0.5];
  }

  function frame(now: number): void {
    if (t0Ref.current < 0) t0Ref.current = now;
    const t = (now - t0Ref.current) / 1000;
    if (!manualRef.current) {
      const ph = (((now - t0Ref.current) % 2000) / 2000) * TAU;
      pxRef.current = 0.5 + 0.4 * Math.sin(ph);
      pyRef.current = 0.5 + 0.34 * Math.sin(2 * ph + 0.7);
    }
    const a = aim();
    headingRef.current += (a[0] - headingRef.current) * 0.1;
    pitchRef.current += (a[1] - pitchRef.current) * 0.1;
    draw(t);
    rafRef.current = requestAnimationFrame(frame);
  }

  function onPoint(e: PointerEvt): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    pxRef.current = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    pyRef.current = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    if (!manualRef.current) manualRef.current = true;
    if (reduced()) {
      const a = aim();
      headingRef.current = a[0]; pitchRef.current = a[1];
      draw(STILL_T);
    }
  }

  function onLeave(): void {
    if (manualRef.current) { pxRef.current = 0.5; pyRef.current = 0.5; }
  }

  function onKeyDown(e: KeyEvt): void {
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-0.07, 0], ArrowRight: [0.07, 0], ArrowUp: [0, -0.06], ArrowDown: [0, 0.06],
    };
    const d = deltas[e.key];
    if (!d) return;
    e.preventDefault();
    if (!manualRef.current) manualRef.current = true;
    pxRef.current = Math.max(0, Math.min(1, pxRef.current + d[0]));
    pyRef.current = Math.max(0, Math.min(1, pyRef.current + d[1]));
    if (reduced()) {
      const a = aim();
      headingRef.current = a[0]; pitchRef.current = a[1];
      draw(STILL_T);
    }
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    rtRef.current = renderWidth;
    colRef.current = {
      wallA: tokRGB(root, "--br-wallA"),
      wallB: tokRGB(root, "--br-wallB"),
      floor: tokRGB(root, "--br-floor"),
      ceil: tokRGB(root, "--br-ceil"),
      shade: tokRGB(root, "--br-shade"),
    };
    fit();
    function onResize(): void {
      fit();
      if (reduced()) draw(STILL_T);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 코너가 읽히는 각도의 한 장만
      headingRef.current = 0.78; pitchRef.current = 0.1;
      draw(STILL_T);
      setStill(true);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderWidth]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M228.92 49.69a8 8 0 0 0-6.86-3.69H136a8 8 0 0 0 0 16h67.89l-83.6 95.47l-45-39.06a8 8 0 0 0-11.19.77l-56 64a8 8 0 1 0 11.9 10.62l50.59-57.87l45.11 39.15a8 8 0 0 0 11-.42l96-109.63a8 8 0 0 0 1.19-8.37Z" opacity=".2"/><path d="M224 104a8 8 0 0 0-8 8v78H40V40h136a8 8 0 0 0 0-16H40a16 16 0 0 0-16 16v152a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16v-80a8 8 0 0 0-8-8m-24-72a24 24 0 1 0 24 24a24 24 0 0 0-24-24m0 32a8 8 0 1 1 8-8a8 8 0 0 1-8 8"/></g></svg>
          <span>카메라가 방 안에 들어가 있습니다 — 법선이 바라보는 방향으로 벽 색이 나뉩니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerMove={onPoint}
          onPointerLeave={onLeave}
          onKeyDown={onKeyDown}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}><b className={styles.val}>{res}</b> 렌더 타깃 · 스텝 56</span>
          <span className={styles.metaDim}>모서리 둥글기 r=0.5</span>
        </div>
      </div>
    </main>
  );
}
