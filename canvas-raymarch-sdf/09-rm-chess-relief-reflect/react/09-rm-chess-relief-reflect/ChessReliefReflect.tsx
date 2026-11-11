// ChessReliefReflect — vanilla 판(run/312/demo/09-rm-chess-relief-reflect/index.html) 의 React 포트.
// 완성형 종합 장면 — 체크 바닥 + 소프트 섀도우 + 지평선 지수 안개 + 젖은 바닥 반사(1 튕김).
// 오브제(가운데 구·양옆 둥근 박스)가 시간에 따라 살짝 떠오른다.
// WebGL 없이 ImageData 픽셀 계산만으로 나온다. 미리보기는 시드 고정 Lissajous 자동 재생.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ChessReliefReflect.module.scss";

export type ChessReliefReflectProps = {
  duration?: string;
  easing?: string;
  color?: string;
  renderWidth?: number;   // 렌더 타깃 폭(버퍼 픽셀) — 변형 "해상도" 축
  steps?: number;         // 최대 전진 스텝 수 — 변형 "스텝 수" 축(48 → 96)
  wetness?: number;       // 바닥 반사 비율 — 변형 "젖음" 축(0 · 0.38 · 0.7)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// React 의 이벤트 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type PointerEvt = { clientX: number; clientY: number };
type KeyEvt = { key: string; preventDefault(): void };
type RGB = [number, number, number];
type Size = { w: number; h: number };

const TAU = Math.PI * 2;
const FIELD_LABEL = "체스판 조명 레이 마칭 실험판";
const STILL_T = 0.6;      // reduce 에서 그리는 시각 — 그림자와 반사가 읽히는 한 장
const HIT_EPS = 0.005;    // 표면 도달 판정 거리(월드 단위)
const SHADOW_STEPS = 24;  // 그림자 레이 스텝 — 01 과 같은 값
const REFLECT_STEPS = 32; // 반사 레이 스텝 — 본 마칭의 절반(60fps 예산)
const FOG_K = 0.075;      // 지평선 안개 세기 — exp2 감쇠
let gReflectMix = 0.38;   // 바닥이 반사를 받아들이는 비율 — props 로 교체된다

// 구 하나의 부호 거리
function sdSphere(px: number, py: number, pz: number, cx: number, cy: number, cz: number, rad: number): number {
  const dx = px - cx, dy = py - cy, dz = pz - cz;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - rad;
}
// 축 정렬 둥근 박스 거리 — 클램프 방식 + 모서리 둥글기 r
function sdRoundBox(px: number, py: number, pz: number, cx: number, cy: number, cz: number, b: number, r: number): number {
  const qx = Math.abs(px - cx) - b, qy = Math.abs(py - cy) - b, qz = Math.abs(pz - cz) - b;
  const ox = qx > 0 ? qx : 0, oy = qy > 0 ? qy : 0, oz = qz > 0 ? qz : 0;
  return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.max(qx, qy, qz, 0) - r;
}

let orbY = 0.0;           // 이 프레임의 오브제 떠오름 높이 — 시간에 흐른다
let lastObj = 0;          // 직전 map 호출 히트 물체(0 바닥 · 1 구 · 2 박스) — 색 선택용
// 장면 거리 = 바닥 평면 + 구 + 둥근 박스의 합집합
function map(px: number, py: number, pz: number): number {
  const dF = py;                                                     // 바닥 y=0
  const dS = sdSphere(px, py, pz, 0, 0.86 + orbY, 0, 0.8);           // 가운데 구
  const dB = sdRoundBox(px, py, pz, -1.5, 0.34 + orbY * 0.7, 0.85, 0.32, 0.14);
  const dC = sdRoundBox(px, py, pz, 1.5, 0.34 + orbY * 0.7, -0.85, 0.32, 0.14);
  let dObj = dS < dB ? dS : dB;
  if (dC < dObj) dObj = dC;
  if (dObj < dF) { lastObj = dObj === dS ? 1 : 2; return dObj; }
  lastObj = 0;
  return dF;
}

// 거리장의 기울기(전방 차분) = 표면 법선
function normalAt(px: number, py: number, pz: number): RGB {
  const e = 0.002;
  const nx = map(px + e, py, pz) - map(px - e, py, pz);
  const ny = map(px, py + e, pz) - map(px, py - e, pz);
  const nz = map(px, py, pz + e) - map(px, py, pz - e);
  const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  return [nx / l, ny / l, nz / l];
}

// 부드러운 그림자 — 표면 점에서 광원 방향으로 다시 마칭한다(01 과 같은 구조).
// 스치듯 가까우면 클램프 완화로 반그림자가 된다
function softShadow(px: number, py: number, pz: number, lx: number, ly: number, lz: number): number {
  let t = 0.02, res = 1.0;
  for (let i = 0; i < SHADOW_STEPS; i++) {
    const d = map(px + lx * t, py + ly * t, pz + lz * t);
    if (d < -0.001) return 0.0;
    res = Math.min(res, 10.0 * d / t);   // 가장자리가 부드럽게 — 계수 10 이 완화 폭
    if (res < 0.005 || t > 7.0) break;
    t += Math.max(d, 0.02);
  }
  return res < 0 ? 0 : (res > 1 ? 1 : res);
}

function clamp255(v: number): number { return v > 255 ? 255 : (v < 0 ? 0 : v); }
function mod2(v: number): number { const m = v % 2.0; return m < 0 ? m + 2.0 : m; }

type Col9 = { sphere: RGB; box: RGB; hilite: RGB; tileA: RGB; tileB: RGB; shade: RGB; sky: RGB; sky2: RGB };

// 표면점 하나의 색 — 본 렌더와 반사 레이가 같은 함수를 쓴다(재귀 대신 1단계)
function shade(col: Col9, px: number, py: number, pz: number, dx: number, dy: number, dz: number, tSec: number, lx: number, ly: number, lz: number, allowReflect: boolean, skyR: number, skyG: number, skyB: number): RGB {
  const n = normalAt(px, py, pz);
  const lam = Math.max(0, n[0] * lx + n[1] * ly + n[2] * lz);
  let r: number, g: number, b: number;
  if (lastObj === 0) {
    // 체크 바닥 — mod(floor(x)+floor(z), 2) 로 두 타일 색을 나눈다
    const tile = mod2(Math.floor(px) + Math.floor(pz));
    const baseTile = tile < 1 ? col.tileA : col.tileB;
    const shd = softShadow(px, py, pz, lx, ly, lz);
    const lit = (0.42 + 0.58 * lam) * (0.3 + 0.7 * shd);
    r = baseTile[0] * lit + col.shade[0] * (1 - lit);
    g = baseTile[1] * lit + col.shade[1] * (1 - lit);
    b = baseTile[2] * lit + col.shade[2] * (1 - lit);
    // 젖은 바닥 반사 — 법선으로 되튕긴 레이를 한 번 더 짧게 마칭해 섞는다
    if (allowReflect && n[1] > 0.5) {
      const dot = dx * n[0] + dy * n[1] + dz * n[2];
      const rx2 = dx - 2 * dot * n[0], ry2 = dy - 2 * dot * n[1], rz2 = dz - 2 * dot * n[2];
      let rr = r, rg = g, rb = b;
      let t2 = 0.02, hit2 = 0, qx = px, qy = py, qz = pz;
      for (let s2 = 0; s2 < REFLECT_STEPS; s2++) {
        const d2 = map(qx, qy, qz);
        if (d2 < HIT_EPS) { hit2 = 1; break; }
        if (t2 > 7.0) break;
        t2 += d2;
        qx = px + rx2 * t2; qy = py + ry2 * t2; qz = pz + rz2 * t2;
      }
      if (hit2) {
        const rc = shade(col, qx, qy, qz, rx2, ry2, rz2, tSec, lx, ly, lz, false, skyR, skyG, skyB);
        rr = r + (rc[0] - r) * gReflectMix;
        rg = g + (rc[1] - g) * gReflectMix;
        rb = b + (rc[2] - b) * gReflectMix;
      } else {
        // 반사 레이가 하늘로 나가면 하늘색을 받아들인다
        rr = r + (skyR - r) * gReflectMix * 0.8;
        rg = g + (skyG - g) * gReflectMix * 0.8;
        rb = b + (skyB - b) * gReflectMix * 0.8;
      }
      r = rr; g = rg; b = rb;
    }
  } else {
    // 오브제 — 구는 핑크, 박스는 하늘색. rim 하이라이트가 가장자리에 앉는다
    const baseObj = lastObj === 1 ? col.sphere : col.box;
    const dif = 0.24 + 0.76 * lam;
    const rim = Math.max(0, n[0] * -dx + n[1] * -dy + n[2] * -dz);
    const spec = Math.pow(rim, 14) * 0.4;
    r = baseObj[0] * dif + col.hilite[0] * spec;
    g = baseObj[1] * dif + col.hilite[1] * spec;
    b = baseObj[2] * dif + col.hilite[2] * spec;
  }
  return [r, g, b];
}

export default function ChessReliefReflect({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#ff9ebb",
  renderWidth = 56,
  steps = 64,
  wetness = 0.38,
}: ChessReliefReflectProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const bufRef = useRef<HTMLCanvasElement | null>(null);
  const bctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const imgRef = useRef<ImageData | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<Size>;
  const colRef = useRef<Col9 | null>(null);
  const rtRef = useRef(renderWidth) as Box<number>;     // 렌더 타깃 폭
  const stepRef = useRef(steps) as Box<number>;         // 최대 전진 스텝 수
  const headingRef = useRef(0.55) as Box<number>;       // 편요(라디안)
  const pitchRef = useRef(0.27) as Box<number>;         // 상하각(라디안)
  const pxRef = useRef(0.5) as Box<number>;
  const pyRef = useRef(0.5) as Box<number>;
  const manualRef = useRef(false) as Box<boolean>;
  const rafRef = useRef(0) as Box<number>;
  const t0Ref = useRef(-1) as Box<number>;
  const [res, setRes] = useState("56×35");
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // 색은 CSS 커스텀 프로퍼티(--rm-*)에서 getComputedStyle 로 읽는다 — 파스텔 토큰이 scss 한 곳에
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
    // 캔버스는 dpr 을 곱하지 않는다 — 버퍼가 저해상이라 확대가 곧 표시 해상도다
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
    orbY = 0.12 + 0.12 * Math.sin(tSec * 1.1);   // 오브제가 천천히 떠오른다
    const data = img.data;
    const size = sizeRef.current;
    const bw = buf.width, bh = buf.height;
    const STEPS = stepRef.current;

    // 카메라 — 장면 중심(0,0.6,0) 을 도는 궤도. heading/pitch 를 눈 위치로
    const heading = headingRef.current, pitch = pitchRef.current;
    const ch = Math.cos(heading), sh = Math.sin(heading);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const D = 4.8;                                    // 눈-장면 거리
    const ex = sh * cp * D, ey = 0.9 + sp * D, ez = ch * cp * D;
    // 전방(눈→중심) · 오른쪽 · 위 — 오른손 기저
    let fx = -sh * cp, fy = -(sp * D - 0.6) / D, fz = -ch * cp;
    const fl = Math.sqrt(fx * fx + fy * fy + fz * fz);
    fx /= fl; fy /= fl; fz /= fl;
    let rx = -fz, rz = fx;                          // right = f × worldUp 방향
    const rl = Math.sqrt(rx * rx + rz * rz) || 1;
    rx /= rl; rz /= rl;
    const ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy;   // up = right × forward
    // 광원 궤도 — 왼쪽 위를 도는 파스텔 키 라이트. 그림자가 체크 위를 흘러간다
    const lph = tSec * 0.8 + 2.1;
    let lx = -0.5 + 0.3 * Math.cos(lph), ly = 0.76, lz = 0.4 + 0.3 * Math.sin(lph);
    const ll = Math.sqrt(lx * lx + ly * ly + lz * lz);
    lx /= ll; ly /= ll; lz /= ll;

    let i = 0;
    for (let y = 0; y < bh; y++) {
      const vy = (1 - 2 * (y + 0.5) / bh) * 0.5;      // -0.5..+0.5 (화면 위가 +)
      for (let x = 0; x < bw; x++) {
        const vx = (2 * (x + 0.5) / bw - 1) * 0.8;    // -0.8..+0.8
        // 레이 방향 = 전방 + 화면 오프셋, 정규화
        let dx = fx + rx * vx + ux * vy;
        let dy = fy + uy * vy;
        let dz = fz + rz * vx + uz * vy;
        const dl = Math.sqrt(dx * dx + dy * dy + dz * dz);
        dx /= dl; dy /= dl; dz /= dl;

        // ── march 루프 — 거리만큼 안전하게 전진 ──
        let t = 0.0, hit = 0, px = ex, py = ey, pz = ez;
        for (let s = 0; s < STEPS; s++) {
          const d = map(px, py, pz);
          if (d < HIT_EPS) { hit = 1; break; }        // 표면 도달
          if (t > 14.0) break;                        // 멀어지면 하늘로 놓아준다
          t += d;
          px = ex + dx * t; py = ey + dy * t; pz = ez + dz * t;
        }

        // 하늘 — 하늘색↔라일락 파동 그라데이션이 프레임마다 흐른다
        const sky = dy > 0 ? dy : 0;
        const wave = 0.5 + 0.5 * Math.sin(tSec * 1.4 + vx * 3.0);
        const gr = 0.35 * wave;
        const hr = col.sky[0] + (col.hilite[0] - col.sky[0]) * sky * 0.3 + (col.sky2[0] - col.sky[0]) * gr;
        const hg = col.sky[1] + (col.hilite[1] - col.sky[1]) * sky * 0.3 + (col.sky2[1] - col.sky[1]) * gr;
        const hb = col.sky[2] + (col.hilite[2] - col.sky[2]) * sky * 0.3 + (col.sky2[2] - col.sky[2]) * gr;

        let r: number, g: number, b: number;
        if (hit) {
          const c = shade(col, px, py, pz, dx, dy, dz, tSec, lx, ly, lz, true, hr, hg, hb);
          r = c[0]; g = c[1]; b = c[2];
          // 지수 안개 — 지평선으로 갈수록 하늘에 녹아든다 (exp2 감쇠)
          const fog = 1.0 - Math.exp(-FOG_K * t * t);
          r = r + (hr - r) * fog;
          g = g + (hg - g) * fog;
          b = b + (hb - b) * fog;
        } else {
          r = hr; g = hg; b = hb;
        }
        data[i] = clamp255(r);
        data[i + 1] = clamp255(g);
        data[i + 2] = clamp255(b);
        data[i + 3] = 255;
        i += 4;
      }
    }
    bctx.putImageData(img, 0, 0);
    // 저해상 버퍼를 캔버스 CSS 크기로 부드럽게 확대
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, size.w, size.h);
    ctx.drawImage(buf, 0, 0, size.w, size.h);
  }

  function aim(): [number, number] {
    // 포인터/키 입력 → 목표 각도. 바닥 반사가 보이는 heading ±1.8 · pitch 0.14..0.6
    return [(pxRef.current - 0.5) * 3.6, 0.36 + (pyRef.current - 0.5) * 0.46];
  }

  function frame(now: number): void {
    if (t0Ref.current < 0) t0Ref.current = now;
    const t = (now - t0Ref.current) / 1000;
    if (!manualRef.current) {
      // 미리보기 가상 포인터 — 시드 고정 Lissajous(표 밖 자연 경로). 진폭을 끝까지 쓴다
      const ph = (((now - t0Ref.current) % 2000) / 2000) * TAU;
      pxRef.current = 0.5 + 0.48 * Math.sin(ph);
      pyRef.current = 0.5 + 0.42 * Math.sin(2 * ph + 0.7);
    }
    const a = aim();
    headingRef.current += (a[0] - headingRef.current) * 0.14;
    pitchRef.current += (a[1] - pitchRef.current) * 0.14;
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
    stepRef.current = steps;
    gReflectMix = wetness;
    colRef.current = {
      sphere: tokRGB(root, "--rm-sphere"),
      box: tokRGB(root, "--rm-box"),
      hilite: tokRGB(root, "--rm-hilite"),
      tileA: tokRGB(root, "--rm-tile-a"),
      tileB: tokRGB(root, "--rm-tile-b"),
      shade: tokRGB(root, "--rm-shade"),
      sky: tokRGB(root, "--rm-sky"),
      sky2: tokRGB(root, "--rm-sky2"),
    };
    fit();
    function onResize(): void {
      fit();
      if (reduced()) draw(STILL_T);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — rAF 를 돌리지 않고 그림자와 반사가 읽히는 각도의 한 장만 그린다
      headingRef.current = 0.55; pitchRef.current = 0.36;
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
  }, [renderWidth, steps, wetness]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M128 24a16 16 0 0 1 16 16v8a80.06 80.06 0 0 1 63.94 63.94h8a16 16 0 0 1 0 32h-8A80.06 80.06 0 0 1 144 207.94v8a16 16 0 0 1-32 0v-8A80.06 80.06 0 0 1 48.06 144h-8a16 16 0 0 1 0-32h8A80.06 80.06 0 0 1 112 48.06v-8A16 16 0 0 1 128 24m-16 57.35V96a16 16 0 0 0 32 0V81.35A48.09 48.09 0 0 0 81.35 112H96a16 16 0 0 0 0-32h14.65M174.65 144H160a16 16 0 0 0 0 32h14.65A48.09 48.09 0 0 0 144 174.65V160a16 16 0 0 0-32 0v14.65A48.09 48.09 0 0 0 81.35 144" opacity=".2"/><path d="M232 128a104 104 0 1 1-104-104a104 104 0 0 1 104 104m-32 0a8 8 0 0 0-8-8h-9.34A56.1 56.1 0 0 0 136 77.34V68a8 8 0 0 0-16 0v9.34A56.1 56.1 0 0 0 77.34 120H68a8 8 0 0 0 0 16h9.34A56.1 56.1 0 0 0 120 179.66V188a8 8 0 0 0 16 0v-8.34A56.1 56.1 0 0 0 178.66 136H192a8 8 0 0 0 8-8m-40 0a32 32 0 1 1-32-32a32 32 0 0 1 32 32m-16 0a16 16 0 1 0-16 16a16 16 0 0 0 16-16"/></g></svg>
          <span>체크 바닥 위에 그림자·안개·반사를 한 장면에 얹습니다 — 포인터로 시점이 돕니다</span>
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
          <span className={styles.meta}><b className={styles.val}>{res}</b> 렌더 타깃 · 스텝 {steps}+24</span>
          <span className={styles.metaDim}>소프트 섀도우 · 반사 1 튕김</span>
        </div>
      </div>
    </main>
  );
}
