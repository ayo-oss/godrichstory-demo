// IsometricFaceShadingLambert — vanilla 판(run/333/demo/03-isometric-face-shading-lambert/index.html)
// 의 React 포트. 면 법선(top/right/front)과 광원 벡터의 내적(Lambert)으로 밝기를 구해
// filter: brightness() 에 대입한다. 광원이 궤도를 돌며 매 프레임 세 면을 다시 계산한다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./IsometricFaceShadingLambert.module.scss";

export type IsometricFaceShadingLambertProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--sx"?: string; "--sy"?: string };
type Box<T> = { current: T };
type Faces = { top: HTMLDivElement; right: HTMLDivElement; front: HTMLDivElement };

const HINT = "면 법선과 광원 벡터의 내적으로 밝기를 구해 filter: brightness() 에 대입합니다 — 광원이 돌면 세 면이 차례로 밝아집니다";
const ARIA_SCENE = "광원이 큐브 둘레를 돌며 세 면의 밝기가 계산으로 바뀌는 장면";
const LABEL_TOP = "윗면 ";
const LABEL_RIGHT = "오른면 ";
const LABEL_FRONT = "왼면 ";

const N_TOP = [0, 0, 1];
const N_RIGHT = [1, 0, 0];
const N_FRONT = [0, 1, 0];

function dot3(a: number[], b: number[]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function normalize(v: number[]): number[] {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}
function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function brightnessOf(n: number[], l: number[]): number {
  return 0.32 + 0.92 * clamp01(dot3(n, l));
}

export default function IsometricFaceShadingLambert({
  duration = "9s",
  easing = "linear",
  color = "#6ec8ff"
}: IsometricFaceShadingLambertProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cubeRef = useRef<HTMLDivElement | null>(null);
  const sunRef = useRef<HTMLDivElement | null>(null);
  const pTopRef = useRef<HTMLElement | null>(null);
  const pRightRef = useRef<HTMLElement | null>(null);
  const pFrontRef = useRef<HTMLElement | null>(null);
  const facesRef = useRef<Faces | null>(null) as Box<Faces | null>;
  const rafRef = useRef(0) as Box<number>;

  useEffect(() => {
    const cube = cubeRef.current;
    const root = rootRef.current;
    if (!cube || !root) return;

    const mm = window.matchMedia("(max-width: 340px)").matches;
    const size = mm ? 52 : 76;

    function buildCube(mount: HTMLDivElement, s: number): Faces {
      const top = document.createElement("div");
      top.className = styles.face + " " + styles.faceTop;
      top.style.width = s + "px";
      top.style.height = s + "px";
      top.style.transform = "rotateX(90deg) translateZ(" + s / 2 + "px)";

      const right = document.createElement("div");
      right.className = styles.face + " " + styles.faceRight;
      right.style.width = s + "px";
      right.style.height = s + "px";
      right.style.transform = "rotateY(90deg) translateZ(" + s / 2 + "px)";

      const front = document.createElement("div");
      front.className = styles.face + " " + styles.faceFront;
      front.style.width = s + "px";
      front.style.height = s + "px";
      front.style.transform = "translateZ(" + s / 2 + "px)";

      mount.appendChild(top);
      mount.appendChild(right);
      mount.appendChild(front);
      return { top, right, front };
    }

    const faces = buildCube(cube, size);
    facesRef.current = faces;
    cube.style.transform = "rotateX(-35.264deg) rotateZ(45deg)";

    function shade(theta: number): void {
      const r = (theta * Math.PI) / 180;
      const L = normalize([Math.cos(r), Math.sin(r), 0.55]);
      const bTop = brightnessOf(N_TOP, L);
      const bRight = brightnessOf(N_RIGHT, L);
      const bFront = brightnessOf(N_FRONT, L);
      const f = facesRef.current;
      if (!f) return;
      f.top.style.filter = "brightness(" + bTop.toFixed(3) + ")";
      f.right.style.filter = "brightness(" + bRight.toFixed(3) + ")";
      f.front.style.filter = "brightness(" + bFront.toFixed(3) + ")";
      if (pTopRef.current) pTopRef.current.textContent = String(Math.round(bTop * 100));
      if (pRightRef.current) pRightRef.current.textContent = String(Math.round(bRight * 100));
      if (pFrontRef.current) pFrontRef.current.textContent = String(Math.round(bFront * 100));
      if (sunRef.current) {
        sunRef.current.style.setProperty("--sx", (Math.cos(r) * 40).toFixed(2) + "px");
        sunRef.current.style.setProperty("--sy", (Math.sin(r) * 40).toFixed(2) + "px");
      }
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      shade(35);
      root.classList.add(styles.isStill);
    } else {
      const start = performance.now();
      const step = (now: number): void => {
        const t = (now - start) / 1000;
        shade((t * 40) % 360);
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    }
    return () => {
      cancelAnimationFrame(rafRef.current);
      while (cube.firstChild) cube.removeChild(cube.firstChild);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.fs} ref={rootRef} data-duration={duration} data-easing={easing} data-color={color}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.field} role="img" aria-label={ARIA_SCENE}>
          <div className={styles.ground}></div>
          <div className={styles.sun} ref={sunRef} style={{} as Vars}></div>
          <div className={styles.cube3d} ref={cubeRef}></div>
        </div>
        <p className={styles.readout}>
          <span className={styles.stat}><b>{LABEL_TOP}</b><em ref={pTopRef}>32</em>%</span>
          <span className={styles.stat}><b>{LABEL_RIGHT}</b><em ref={pRightRef}>32</em>%</span>
          <span className={styles.stat}><b>{LABEL_FRONT}</b><em ref={pFrontRef}>32</em>%</span>
        </p>
      </div>
    </main>
  );
}
