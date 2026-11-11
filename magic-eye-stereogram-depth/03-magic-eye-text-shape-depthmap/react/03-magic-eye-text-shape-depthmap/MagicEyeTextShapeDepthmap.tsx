// MagicEyeTextShapeDepthmap — vanilla 판(run/325/demo/03-magic-eye-text-shape-depthmap/index.html) 의 React 포트.
// fillText 로 찍은 글자를 깊이 지도로 쓴다. 오프스크린 캔버스에 글자를 흰색/검은 배경으로 그린 뒤
// getImageData 로 밝기를 읽어 0(검은 배경) .. 1(글자 살) 깊이로 넘긴다. 이후는 01 과 같은 행별 복사 시프트.
// 글자 깊이가 주기 안에 0 → 1 → 0 으로 움직이므로 문구가 노이즈 속에서 떠올랐다 가라앉는다.
// 깊이 소스가 "그림 한 장"이면 뭐든 된다는 문을 여는 항목 — 사진(04)·로고(09)가 같은 길을 잇는다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MagicEyeTextShapeDepthmap.module.scss";

export type MagicEyeTextShapeDepthmapProps = {
  duration?: string;
  easing?: string;
  color?: string;
  word?: string;      // 숨길 단어 — 몸통이 굵은 짧은 단어가 잘 뜬다
  fsize?: number;     // fillText 크기(px)
  maxshift?: number;  // 글자 깊이(px)
  cycle?: number;     // 표출 주기(초)
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const WORD     = "SOLID";   // 숨길 단어
const FSIZE    = 220;       // fillText 크기(px)
const MAXSHIFT = 14;        // 글자 깊이(px)
const CYCLE    = 2.0;       // 표출 주기(초) — 설정 초(2s)와 같아 한 표출이 한 루프

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const FIELD_LABEL = "글자 은닉 판";
const META_LEFT = "fillText 220px · 깊이 14px · 표출 주기 2초";
const META_RIGHT = "밝기 → 깊이 변환";
const HINT_TITLE = "글자 숨기기";
const HINT_DESC = "오프스크린에 흑백 글자를 찍어 밝기를 깊이로 넘기면 문구가 노이즈 속에 잠깁니다";

export default function MagicEyeTextShapeDepthmap({
  duration = "2s",
  easing = "ease-out",
  color = "#c8d8e8",
  word = WORD,
  fsize = FSIZE,
  maxshift = MAXSHIFT,
  cycle = CYCLE
}: MagicEyeTextShapeDepthmapProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const palRef = useRef<RGB[] | null>(null);
  const imgRef = useRef<ImageData | null>(null);
  const depthRef = useRef<Float32Array | null>(null);
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
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

  function baseIdx(x: number, y: number): number {
    const pal = palRef.current;
    if (!pal) return 0;
    let h = (Math.imul(x + 11, 374761393) + Math.imul(y + 7, 668265263)) >>> 0;
    h ^= h >>> 13;
    h = Math.imul(h, 1274126177) >>> 0;
    h ^= h >>> 16;
    return ((h % pal.length) + pal.length) % pal.length;   // ^ 는 ToInt32 로 음수가 될 수 있어 접는다
  }

  // ── 오프스크린 깊이 원본 — 글자 래스터 ──
  function rasterizeDepth(): void {
    const W = wRef.current, H = hRef.current;
    if (W <= 0 || H <= 0) return;
    const srcCv = document.createElement("canvas");
    srcCv.width = W; srcCv.height = H;
    const srcCtx = srcCv.getContext("2d");
    if (!srcCtx) return;
    srcCtx.fillStyle = "#000";
    srcCtx.fillRect(0, 0, W, H);
    srcCtx.fillStyle = "#fff";
    srcCtx.textAlign = "center";
    srcCtx.textBaseline = "middle";
    const fs = Math.min(fsize, W * 0.46);
    srcCtx.font = "900 " + fs + 'px "Arial Black", "Segoe UI", sans-serif';
    srcCtx.fillText(word, W * 0.5, H * 0.58);
    const sd = srcCtx.getImageData(0, 0, W, H).data;

    // 밝기 → 깊이. 좌우 1px 평균으로 가장자리 낙차를 무디게 한다(꺾여 보이지 않게)
    const depthBuf = new Float32Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const v = sd[(y * W + x) * 4] / 255;
        let sum = v, n = 1;
        if (x > 0)     { sum += sd[(y * W + x - 1) * 4] / 255; n++; }
        if (x < W - 1) { sum += sd[(y * W + x + 1) * 4] / 255; n++; }
        depthBuf[y * W + x] = sum / n;
      }
    }
    depthRef.current = depthBuf;
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
    imgRef.current = ctx.createImageData(wRef.current, hRef.current);
    rasterizeDepth();
  }

  function draw(t: number): void {
    const ctx = ctxRef.current;
    const img = imgRef.current;
    const pal = palRef.current;
    const depthBuf = depthRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !img || !pal || !depthBuf) return;
    const d = img.data;
    const ph = t / cycle * Math.PI * 2;
    const appear = Math.sin(ph - Math.PI / 2) * .5 + .5;
    const amp = 0.12 + 0.88 * appear;   // 최저 12% 유지 — 루프가 이어진다
    const bob = Math.round(Math.sin(ph) * H * 0.09);   // 글자가 위아래로 흐른다 — 행마다 깊이가 흐른다
    const col = new Int32Array(W);
    for (let y = 0; y < H; y++) {
      const sy = y - bob;
      const rowOff = (sy >= 0 && sy < H ? sy : y) * W;
      for (let x = 0; x < W; x++) {
        const s = Math.round(depthBuf[rowOff + x] * amp * maxshift);
        if (s <= 0) {
          col[x] = baseIdx(x, y);
        } else {
          const from = x - s;
          col[x] = from >= 0 ? col[from] : baseIdx(from + W, y);
        }
      }
      for (let x = 0; x < W; x++) {
        const c = pal[col[x]];
        const di = (y * W + x) * 4;
        d[di] = c[0]; d[di + 1] = c[1]; d[di + 2] = c[2]; d[di + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    draw((now - t0) / 1000);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!root || !cv) return;
    const pal: RGB[] = [];
    for (let i = 0; i < 5; i++) pal.push(tokRGB(root, "--me-p" + i));
    palRef.current = pal;
    ctxRef.current = cv.getContext("2d");
    fit();
    function onResize(): void {
      fit();
      if (reduced()) draw(0.5);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      draw(0.5);                                  // reduce — 떠오른 글자 한 장만 고정
      setStill(true);
    } else {
      t0 = -1;
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word, fsize, maxshift, cycle]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>{HINT_TITLE}</span>
          <span className={styles.desc}>{HINT_DESC}</span>
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
