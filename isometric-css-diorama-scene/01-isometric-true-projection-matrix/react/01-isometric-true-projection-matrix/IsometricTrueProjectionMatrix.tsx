// IsometricTrueProjectionMatrix — vanilla 판(run/333/demo/01-isometric-true-projection-matrix/index.html)
// 의 React 포트. 흔한 근사 rotateX(-30deg) 와 정확한 등각 각도 -arctan(1/sqrt(2))=-35.264deg 로
// 만든 두 회전 행렬을 JS 로 직접 곱해 matrix3d 에 넣고, 같은 턴테이블 spin 값을 매 프레임
// 다시 곱해 큐브를 돌린다. CSS @keyframes 는 없다 — 움직임은 전부 계산된 matrix3d 값이다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./IsometricTrueProjectionMatrix.module.scss";

export type IsometricTrueProjectionMatrixProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };

const HINT = "근사(rotateX -30°)와 matrix3d 정확 등각(35.264°)을 같은 속도로 돌려 세로 비율 차이를 봅니다";
const ARIA_SCENE = "근사 등각과 정확 등각 큐브를 같은 속도로 돌리는 비교 장면";
const TAG_APPROX = "rotateX(-30deg)";
const TAG_EXACT = "matrix3d(-35.264°)";
const UNIT = "° 턴테이블 회전 · 세로/가로 비";

const TILT_APPROX = -30;
const TILT_EXACT = -35.264;

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
function norm360(a: number): number {
  const m = a % 360;
  return m < 0 ? m + 360 : m;
}

export default function IsometricTrueProjectionMatrix({
  duration = "2s",
  easing = "ease-out",
  color = "#2f6df6"
}: IsometricTrueProjectionMatrixProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cubeApproxRef = useRef<HTMLDivElement | null>(null);
  const cubeExactRef = useRef<HTMLDivElement | null>(null);
  const degRef = useRef<HTMLElement | null>(null);
  const ratioApproxRef = useRef<HTMLElement | null>(null);
  const ratioExactRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef(0) as Box<number>;

  useEffect(() => {
    const cubeApprox = cubeApproxRef.current;
    const cubeExact = cubeExactRef.current;
    const root = rootRef.current;
    if (!cubeApprox || !cubeExact || !root) return;

    const mm = window.matchMedia("(max-width: 340px)").matches;
    const size = mm ? 52 : 76;

    function buildFaces(mount: HTMLDivElement, s: number): void {
      const defs = [
        { cls: styles.face + " " + styles.faceTop, t: "rotateX(90deg) translateZ(" + s / 2 + "px)" },
        { cls: styles.face + " " + styles.faceRight, t: "rotateY(90deg) translateZ(" + s / 2 + "px)" },
        { cls: styles.face + " " + styles.faceFront, t: "translateZ(" + s / 2 + "px)" }
      ];
      for (const d of defs) {
        const f = document.createElement("div");
        f.className = d.cls;
        f.style.width = s + "px";
        f.style.height = s + "px";
        f.style.transform = d.t;
        mount.appendChild(f);
      }
    }
    buildFaces(cubeApprox, size);
    buildFaces(cubeExact, size);

    if (ratioApproxRef.current) ratioApproxRef.current.textContent = Math.cos((TILT_APPROX * Math.PI) / 180).toFixed(3);
    if (ratioExactRef.current) ratioExactRef.current.textContent = Math.cos((TILT_EXACT * Math.PI) / 180).toFixed(3);

    function paint(spinDeg: number): void {
      const mA = mat4Mul(mat4RotateX(TILT_APPROX), mat4RotateZ(45 + spinDeg));
      const mE = mat4Mul(mat4RotateX(TILT_EXACT), mat4RotateZ(45 + spinDeg));
      if (cubeApprox) cubeApprox.style.transform = mat4ToCss(mA);
      if (cubeExact) cubeExact.style.transform = mat4ToCss(mE);
      if (degRef.current) degRef.current.textContent = String(Math.round(norm360(spinDeg)));
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      paint(20);
      root.classList.add(styles.isStill);
    } else {
      const start = performance.now();
      const step = (now: number): void => {
        const t = (now - start) / 1000;
        paint((t * 24) % 360);
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    }
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div
        className={styles.ip}
        ref={rootRef}
        style={{ "--duration": duration, "--easing": easing, "--color": color } as Vars}
      >
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.row} role="img" aria-label={ARIA_SCENE}>
          <div className={styles.col}>
            <div className={styles.field}>
              <div className={styles.cube3d} ref={cubeApproxRef}></div>
            </div>
            <div className={styles.statRow}>
              <b className={styles.tag}>{TAG_APPROX}</b>
              <span className={styles.ratio} ref={ratioApproxRef}>0.000</span>
            </div>
          </div>
          <div className={styles.col}>
            <div className={styles.field}>
              <div className={styles.cube3d} ref={cubeExactRef}></div>
            </div>
            <div className={styles.statRow}>
              <b className={styles.tag}>{TAG_EXACT}</b>
              <span className={styles.ratio} ref={ratioExactRef}>0.000</span>
            </div>
          </div>
        </div>
        <p className={styles.meta}>
          <b className={styles.deg} ref={degRef}>0</b>
          <span className={styles.metaUnit}>{UNIT}</span>
        </p>
      </div>
    </main>
  );
}
