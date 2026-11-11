// OrbDepthField — vanilla 판(run/077/demo/02-fx-orb-depth-field/index.html) 의 React 포트.
// 구슬마다 x·y·z 를 두고 s = focal / (focal + z) 한 번으로 원근을 만든다.
// 먼 것부터 그리는 화가 알고리즘(정렬)과 z 를 따라 변하는 반경·흐림·투명도가 입체를 만든다.
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 가 없다 — props 는 CSS 변수로 내려간다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./OrbDepthField.module.scss";

export type OrbDepthFieldProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
// React 이벤트 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type KeyEvt = { key: string; preventDefault(): void };
type PtrEvt = { clientX: number; clientY: number };
type InputEvt = { target: { value: string } };
type Orb = { x: number; y: number; z: number; r: number; tone: number };

const COUNT = 40;
const Z_NEAR = 40, Z_FAR = 980;      // 구슬이 사는 깊이 구간
const RISE = 52;                     // 월드 좌표에서의 상승 속도 — 모든 구슬이 같다(등속)
const DRIFT = 26;                    // 같은 속도로 천천히 다가온다
const TAU = Math.PI * 2;
const MAX_BLUR = 7;
const FIELD_LABEL = "원근 실험판";

function makeOrbs(): Orb[] {
  const orbs: Orb[] = [];
  for (let i = 0; i < COUNT; i++) {
    orbs.push({
      x: Math.random() * 2 - 1,        // 월드 폭 대비 비율 — fit() 에서 실제 좌표로 편다
      y: Math.random() * 2 - 1,
      z: Z_NEAR + Math.random() * (Z_FAR - Z_NEAR),
      r: 16 + Math.random() * 30,
      tone: i % 5,
    });
  }
  return orbs;
}

export default function OrbDepthField({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "cubic-bezier(.2, .8, .2, 1)",     // vanilla $easing: $ease-spring
  color = "#2f6df6",                          // vanilla $color: $subject-blue
}: OrbDepthFieldProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const focalOutRef = useRef<HTMLSpanElement | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, spanX: 0, spanY: 0 }) as Box<{ w: number; h: number; spanX: number; spanY: number }>;
  const orbsRef = useRef<Orb[]>([]) as Box<Orb[]>;
  const camRef = useRef({ x: 0, y: 0, ax: 0, ay: 0 }) as Box<{ x: number; y: number; ax: number; ay: number }>;
  const focalRef = useRef(280) as Box<number>;
  const lastRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [focal, setFocal] = useState(280);
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function tones(): string[][] {
    const root = rootRef.current;
    if (!root) return [];
    const one = (n: string) => [
      getComputedStyle(root).getPropertyValue("--orb-" + n + "-hi").trim(),
      getComputedStyle(root).getPropertyValue("--orb-" + n + "-mid").trim(),
      getComputedStyle(root).getPropertyValue("--orb-" + n + "-lo").trim(),
    ];
    const a = one("a");
    return [a, a, a, one("b"), one("c")];
  }

  // 고DPI 대응 — 배킹 스토어는 devicePixelRatio 배, 그리기 좌표계는 CSS 픽셀 그대로
  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const r = field.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    sizeRef.current.w = r.width;
    sizeRef.current.h = r.height;
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    const ctx = ctxRef.current;
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sizeRef.current.spanX = r.width * 0.92;    // 화면 밖까지 조금 넉넉히 — 가장자리에서 구슬이 툭 사라지지 않게
    sizeRef.current.spanY = r.height * 1.15;
  }

  // 월드 좌표는 -1..1 비율로 들고 있다가 그릴 때만 화면 크기를 곱한다
  function step(dt: number): void {
    const { spanY } = sizeRef.current;
    const ry = RISE * dt / spanY;
    const rz = DRIFT * dt;
    for (const o of orbsRef.current) {
      o.y -= ry;
      if (o.y < -1.1) o.y += 2.2;      // 위를 벗어나면 아래에서 다시 들어온다
      o.z -= rz;
      if (o.z < Z_NEAR) o.z += (Z_FAR - Z_NEAR);
    }
    const cam = camRef.current;
    cam.x += (cam.ax - cam.x) * 0.12;
    cam.y += (cam.ay - cam.y) * 0.12;
  }

  function draw(): void {
    const ctx = ctxRef.current;
    const root = rootRef.current;
    if (!ctx || !root) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const bg0 = getComputedStyle(root).getPropertyValue("--bg-0").trim();
    const bg1 = getComputedStyle(root).getPropertyValue("--bg-1").trim();
    const bg = ctx.createRadialGradient(W * 0.5, H * 0.42, 8, W * 0.5, H * 0.5, Math.max(W, H) * 0.72);
    bg.addColorStop(0, bg0);
    bg.addColorStop(1, bg1);
    ctx.filter = "none";
    ctx.globalAlpha = 1;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const T = tones();
    const order = orbsRef.current.slice();
    // 화가 알고리즘 — z 내림차순으로 먼 것부터. 깊이 버퍼가 없는 2D 에서 겹침 순서를 만드는 유일한 방법이다
    order.sort((a, b) => b.z - a.z);
    const cam = camRef.current;
    let blurNow = -1;
    for (const o of order) {
      const s = focalRef.current / (focalRef.current + o.z);       // 원근 투영 — 이 한 줄이 전부다
      const sx = W * 0.5 + (o.x * sizeRef.current.spanX * 0.5 - cam.x) * s;
      const sy = H * 0.5 + (o.y * sizeRef.current.spanY * 0.5 - cam.y) * s;
      const r = o.r * s;
      if (r < 0.8) continue;
      // 흐림은 정수 단계로 끊는다 — z 로 정렬돼 있어 ctx.filter 를 몇 번만 갈아 끼우면 된다
      let blur = Math.round((o.z - Z_NEAR) / (Z_FAR - Z_NEAR) * MAX_BLUR * 1.2);
      if (blur > MAX_BLUR) blur = MAX_BLUR;
      if (blur !== blurNow) {
        ctx.filter = blur > 0 ? "blur(" + blur + "px)" : "none";
        blurNow = blur;
      }
      ctx.globalAlpha = 0.28 + 0.72 * Math.min(1, s * 1.6);
      const t = T[o.tone] || T[0];
      const g = ctx.createRadialGradient(sx - r * 0.36, sy - r * 0.42, r * 0.06, sx, sy, r);
      g.addColorStop(0, t[0]);
      g.addColorStop(0.52, t[1]);
      g.addColorStop(1, t[2]);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, TAU);
      ctx.fill();
    }
    ctx.filter = "none";
    ctx.globalAlpha = 1;
  }

  function frame(now: number): void {
    const dt = lastRef.current ? Math.min((now - lastRef.current) / 1000, 0.05) : 0.016;
    lastRef.current = now;
    step(dt);
    draw();
    rafRef.current = requestAnimationFrame(frame);
  }

  function setFocalValue(v: number): void {
    focalRef.current = v;
    setFocal(v);
    if (focalOutRef.current) focalOutRef.current.textContent = v + "px";
    if (reduced()) draw();
  }

  function onInput(e: InputEvt): void {
    setFocalValue(Number(e.target.value));
  }

  function onMove(e: PtrEvt): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    const cam = camRef.current;
    cam.ax = ((e.clientX - r.left) / r.width - 0.5) * 150;
    cam.ay = ((e.clientY - r.top) / r.height - 0.5) * 90;
    if (reduced()) { cam.x = cam.ax; cam.y = cam.ay; draw(); }
  }

  function onLeave(): void {
    camRef.current.ax = 0;
    camRef.current.ay = 0;
  }

  function onKey(e: KeyEvt): void {
    const cam = camRef.current;
    const map: Record<string, number[]> = {
      ArrowLeft: [-30, 0], ArrowRight: [30, 0], ArrowUp: [0, -22], ArrowDown: [0, 22],
    };
    const d = map[e.key];
    if (!d) return;
    e.preventDefault();
    cam.ax = Math.max(-150, Math.min(150, cam.ax + d[0]));
    cam.ay = Math.max(-90, Math.min(90, cam.ay + d[1]));
    if (reduced()) { cam.x = cam.ax; cam.y = cam.ay; draw(); }
  }

  function onResize(): void {
    fit();
    if (reduced()) draw();
  }

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    ctxRef.current = cv.getContext("2d");
    if (!ctxRef.current) return;
    orbsRef.current = makeOrbs();
    fit();
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 루프를 시작하지 않고 구슬이 깊이별로 흩어진 한 장만 그린다
      setStill(true);
      draw();
    } else {
      lastRef.current = 0;
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const cls = [styles.root, still ? styles.isStill : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2"/><path d="M128 24a104 104 0 1 0 104 104A104.12 104.12 0 0 0 128 24m88 104a87.6 87.6 0 0 1-3.33 24h-38.51a157.4 157.4 0 0 0 0-48h38.51a87.6 87.6 0 0 1 3.33 24m-114 40h52a115.1 115.1 0 0 1-26 45a115.3 115.3 0 0 1-26-45m-3.9-16a140.8 140.8 0 0 1 0-48h59.88a140.8 140.8 0 0 1 0 48ZM40 128a87.6 87.6 0 0 1 3.33-24h38.51a157.4 157.4 0 0 0 0 48H43.33A87.6 87.6 0 0 1 40 128m114-40h-52a115.1 115.1 0 0 1 26-45a115.3 115.3 0 0 1 26 45m52.33 0h-35.62a135.3 135.3 0 0 0-22.3-45.6A88.29 88.29 0 0 1 206.37 88Zm-98.74-45.6A135.3 135.3 0 0 0 85.29 88H49.63a88.29 88.29 0 0 1 57.96-45.6M49.63 168h35.66a135.3 135.3 0 0 0 22.3 45.6A88.29 88.29 0 0 1 49.63 168m98.78 45.6a135.3 135.3 0 0 0 22.3-45.6h35.66a88.29 88.29 0 0 1-57.96 45.6"/></g></svg>
          <span>초점거리를 줄이면 원근이 세져 앞쪽 구슬이 크게 옵니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          onKeyDown={onKey}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>초점거리
            <input type="range" min={120} max={640} step={20} value={focal} aria-label="초점거리" onChange={onInput} />
            <b className={styles.val} ref={focalOutRef}>{focal}px</b>
          </label>
        </div>
      </div>
    </main>
  );
}
