// LorenzPointerParameterKnob — vanilla 판(run/324/demo/08-lorenz-pointer-parameter-knob/index.html) 의 React 포트.
// 포인터 가로 위치를 σ(4~24), 세로 위치를 ρ(10~45)로 읽고, 현재 계수는 τ 0.06(=60ms)마다
// 목표를 향해 다가간다. 계수가 바뀌면 12개 시드의 궤적을 매 프레임 다시 적분해 보여준다.
// (σ, ρ) 평면을 훑으면 카오스 영역과 고정점으로 빠지는 영역의 경계가 손에 잡힌다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LorenzPointerParameterKnob.module.scss";

export type LorenzPointerParameterKnobProps = {
  duration?: string;
  easing?: string;
  color?: string;
  orbits?: number;   // 동시 궤적 수 — 시드를 원주 12분할에 뿌린다
  steps?: number;    // 궤적당 걸음 수
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const ORBITS = 12;     // 동시 궤적 수
const STEPS  = 900;    // 궤적당 걸음 수
const DT     = 0.012;  // 오일러 걸음
const TAU    = 0.06;   // 계수 추종 시정수(초) — 설정 60ms 지연과 같다
const BETA = 8 / 3;

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Orbit = { x: number[]; z: number[] } | null;

const FIELD_LABEL = "파라미터 손잡이 실험판";
const META_LEFT = "포인터 x 로 σ · y 로 ρ · 12분할 궤적";
const META_RIGHT = "canvas · 계수 반영 · 60ms 지연";
const HINT = "세 계수를 포인터 위치에 묶으면 나비가 찌그러지고 뒤집히며 새로운 궤도로 태어납니다";
const GUIDE = "포인터를 올려 σ · ρ 를 움직여 보세요";

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function rgba(c: RGB, a: number): string {
  return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a + ")";
}

export default function LorenzPointerParameterKnob({
  duration = "2s",
  easing = "ease-out",
  color = "#cfe3ff",
  orbits = ORBITS,
  steps = STEPS
}: LorenzPointerParameterKnobProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const c0Ref = useRef<RGB | null>(null);    // 궤적 시작 — 얼음
  const c1Ref = useRef<RGB | null>(null);    // 궤적 중간 — 라일락
  const c2Ref = useRef<RGB | null>(null);    // 궤적 끝 — 복숭아
  const headRef = useRef<RGB | null>(null);  // 머리 — 크림(토큰)
  const panelRef = useRef<RGB | null>(null);
  const orbitsRef = useRef<Orbit[]>([]);
  const bufXRef = useRef<Float32Array | null>(null);
  const bufZRef = useRef<Float32Array | null>(null);
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  // 계수 상태 — 현재값이 목표를 τ 60ms 로 쫓는다
  const sigRef = useRef(10) as Box<number>;
  const rhoRef = useRef(28) as Box<number>;
  const sigTRef = useRef(10) as Box<number>;
  const rhoTRef = useRef(28) as Box<number>;
  const hasPtrRef = useRef(false) as Box<boolean>;
  const lastSigRef = useRef(-1) as Box<number>;
  const lastRhoRef = useRef(-1) as Box<number>;
  const lastTRef = useRef(0) as Box<number>;
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function tokRGB(root: HTMLDivElement, name: string): RGB {
    const s = getComputedStyle(root).getPropertyValue(name).trim();
    const hx = s.length === 4
      ? s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3)
      : s.slice(1);
    return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    const ctx = ctxRef.current;
    if (!field || !cv || !ctx) return;
    const r = field.getBoundingClientRect();
    wRef.current = Math.round(r.width);
    hRef.current = Math.round(r.height);
    cv.width = wRef.current;
    cv.height = hRef.current;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.font = '600 10px -apple-system, "Segoe UI", sans-serif';
  }

  // 시드 — 어트랙터 중심 두 날개 축을 원주 12분할로 감싼다
  function makeSeeds(n: number): [number, number, number][] {
    const seeds: [number, number, number][] = [];
    for (let k = 0; k < n; k++) {
      const ang = k / n * 6.2832;
      seeds.push([8.5 + Math.cos(ang) * 6.5, 8.5 + Math.sin(ang) * 6.5, 26 + Math.cos(ang * 2) * 3]);
    }
    return seeds;
  }

  // 계수에 맞춰 12궤적을 다시 적분 — 계수가 살아 있으므로 매 프레임 재계산한다
  function traceOrbit(sx: number, sy: number, sz: number, sigv: number, rhov: number, stepsN: number): number {
    const bufX = bufXRef.current;
    const bufZ = bufZRef.current;
    if (!bufX || !bufZ) return 0;
    let x = sx, y = sy, z = sz;
    for (let i = 0; i < 60; i++) {           // 과도기
      const dx0 = sigv * (y - x), dy0 = x * (rhov - z) - y, dz0 = x * y - BETA * z;
      x += dx0 * DT; y += dy0 * DT; z += dz0 * DT;
    }
    for (let i = 0; i < stepsN; i++) {
      bufX[i] = x; bufZ[i] = z;
      const dx = sigv * (y - x), dy = x * (rhov - z) - y, dz = x * y - BETA * z;
      x += dx * DT; y += dy * DT; z += dz * DT;
      if (x > 900 || x < -900 || z > 900 || z < -900) {  // 발산 가드
        for (let i2 = i + 1; i2 < stepsN; i2++) { bufX[i2] = x; bufZ[i2] = z; }
        return i;
      }
    }
    return stepsN;
  }

  function draw(dt: number, tSec: number): void {
    const ctx = ctxRef.current;
    const C0 = c0Ref.current;
    const C1 = c1Ref.current;
    const C2 = c2Ref.current;
    const HEAD = headRef.current;
    const PANEL = panelRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !C0 || !C1 || !C2 || !HEAD || !PANEL) return;

    // τ 추종 — 목표 계수에 60ms 시정수로 다가간다
    const f = 1 - Math.exp(-dt / TAU);
    sigRef.current += (sigTRef.current - sigRef.current) * f;
    rhoRef.current += (rhoTRef.current - rhoRef.current) * f;
    const sig = sigRef.current, rho = rhoRef.current;

    ctx.fillStyle = rgba(PANEL, 1);
    ctx.fillRect(0, 0, W, H);

    // σ·ρ 변화가 임계를 넘을 때만 재적분 — 매 프레임 재계산 낭비를 막는다
    const need = Math.abs(sig - lastSigRef.current) > 0.05 || Math.abs(rho - lastRhoRef.current) > 0.1;

    const s = Math.min(W / 48, H / 54);
    const ox = W / 2, oy = H * 0.52;
    const seeds = makeSeeds(orbits);
    const orbs = orbitsRef.current;
    if (!orbs) return;
    for (let k2 = 0; k2 < orbits; k2++) {
      if (need || orbs[k2] === null) {
        const n = traceOrbit(seeds[k2][0], seeds[k2][1], seeds[k2][2], sig, rho, steps);
        const bx = bufXRef.current, bz = bufZRef.current;
        if (!bx || !bz) return;
        orbs[k2] = {
          x: Array.prototype.slice.call(bx, 0, n) as number[],
          z: Array.prototype.slice.call(bz, 0, n) as number[]
        };
      }
      const orb = orbs[k2];
      if (!orb) continue;
      const orbx = orb.x, orbz = orb.z;
      const L = orbx.length;
      if (L < 8) continue;
      const t = k2 / (orbits - 1);
      const col: RGB = t < 0.5 ? mix(C0, C1, t * 2) : mix(C1, C2, (t - 0.5) * 2);
      // 혜성 꼬리 — 궤도 위를 순회하는 밝은 꼬리가 항상 움직임을 만든다
      const tip = Math.floor(((tSec * 0.45 + k2 / orbits) % 1) * (L - 1));
      const from = Math.max(0, tip - 150);
      // 뒤네루게 — 궤도 전체를 옅게 깔아 형태를 보여준다
      ctx.strokeStyle = rgba(col, 0.10);
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.moveTo(ox + orbx[0] * s, oy - (orbz[0] - 25) * s);
      for (let i3 = 1; i3 < L; i3++) ctx.lineTo(ox + orbx[i3] * s, oy - (orbz[i3] - 25) * s);
      ctx.stroke();
      // 알맹이 꼬리 — 진행 방향으로 갈수록 밝아진다
      ctx.lineWidth = 1.3;
      const seg = 6;
      for (let q = 0; q < seg; q++) {
        const q0 = from + Math.floor((tip - from) * q / seg);
        const q1 = from + Math.floor((tip - from) * (q + 1) / seg);
        if (q1 <= q0) continue;
        ctx.strokeStyle = rgba(col, 0.14 + 0.62 * (q + 1) / seg);
        ctx.beginPath();
        ctx.moveTo(ox + orbx[q0] * s, oy - (orbz[q0] - 25) * s);
        for (let i3 = q0 + 1; i3 <= q1; i3++) ctx.lineTo(ox + orbx[i3] * s, oy - (orbz[i3] - 25) * s);
        ctx.stroke();
      }
      // 머리
      const hx = ox + orbx[tip] * s, hy = oy - (orbz[tip] - 25) * s;
      ctx.fillStyle = rgba(HEAD, 0.20);
      ctx.beginPath(); ctx.arc(hx, hy, 4.5, 0, 6.2832); ctx.fill();
      ctx.fillStyle = rgba(HEAD, 0.9);
      ctx.beginPath(); ctx.arc(hx, hy, 1.8, 0, 6.2832); ctx.fill();
    }
    lastSigRef.current = sig;
    lastRhoRef.current = rho;

    // 계수 읽기 — 현재 σ·ρ 표시
    ctx.textAlign = "left";
    ctx.fillStyle = rgba(C0, 0.85);
    ctx.fillText("σ " + sig.toFixed(1), 8, H - 8);
    ctx.textAlign = "right";
    ctx.fillStyle = rgba(C2, 0.85);
    ctx.fillText("ρ " + rho.toFixed(1), W - 8, H - 8);
    if (!hasPtrRef.current) {
      ctx.textAlign = "center";
      ctx.fillStyle = rgba(HEAD, 0.5);
      ctx.fillText(GUIDE, W / 2, H - 8);
    }
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const dt = Math.min(0.05, (now - lastTRef.current) / 1000 || 0.016);
    lastTRef.current = now;
    draw(dt, (now - t0) / 1000);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    const cv = cvRef.current;
    const field = fieldRef.current;
    if (!root || !cv || !field) return;
    c0Ref.current = tokRGB(root, "--lz-c0");
    c1Ref.current = tokRGB(root, "--lz-c1");
    c2Ref.current = tokRGB(root, "--lz-c2");
    headRef.current = tokRGB(root, "--lz-head");
    panelRef.current = tokRGB(root, "--lz-panel");
    ctxRef.current = cv.getContext("2d");
    bufXRef.current = new Float32Array(steps);
    bufZRef.current = new Float32Array(steps);
    orbitsRef.current = new Array(orbits).fill(null);
    fit();

    // 포인터 입력 — field 좌표를 계수 목표로
    function setTarget(ev: PointerEvent): void {
      const fld = fieldRef.current;
      if (!fld) return;
      const r = fld.getBoundingClientRect();
      let px = (ev.clientX - r.left) / r.width;
      let py = (ev.clientY - r.top) / r.height;
      px = Math.max(0, Math.min(1, px));
      py = Math.max(0, Math.min(1, py));
      sigTRef.current = 4 + px * 20;         // σ 4~24
      rhoTRef.current = 45 - py * 35;        // ρ 10~45 (위가 높은 ρ)
      hasPtrRef.current = true;
    }
    function onLeave(): void {
      sigTRef.current = 10; rhoTRef.current = 28;   // 손을 떼면 고전 계수로 돌아간다
      hasPtrRef.current = false;
    }
    field.addEventListener("pointermove", setTarget);
    field.addEventListener("pointerdown", setTarget);
    field.addEventListener("pointerleave", onLeave);

    function onResize(): void {
      fit();
      if (reduced()) draw(0.016, 0.5);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 고전 계수 한 장. 재적분 1회 + 안내 문구.
      draw(0.016, 0.5);
      setStill(true);
    } else {
      t0 = -1;
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      field.removeEventListener("pointermove", setTarget);
      field.removeEventListener("pointerdown", setTarget);
      field.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orbits, steps]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>{HINT}</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>{META_LEFT}</span>
          <span className={styles.metaDim}>{META_RIGHT}</span>
        </div>
      </div>
    </main>
  );
}
