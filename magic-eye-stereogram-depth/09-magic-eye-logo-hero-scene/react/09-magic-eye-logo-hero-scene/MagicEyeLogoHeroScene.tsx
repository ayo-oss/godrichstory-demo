// MagicEyeLogoHeroScene — vanilla 판(run/325/demo/09-magic-eye-logo-hero-scene/index.html) 의 React 포트.
// 브랜드 워드마크를 깊이로 숨긴 대문 장면. 오프스크린 캔버스에 워드마크(GODRICH, 96px 굵은 글자)를
// 찍고 밝기를 깊이로 넘긴 뒤 그 위로 느린 사인 파동(주기 2초)을 흘린다 — 글자가 부풀었다 가라앉으며 숨쉰다.
// 비네팅 18%: 노이즈 판 위에 createLinearGradient 어두운 가장자리를 얹어 씬으로 완성한다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MagicEyeLogoHeroScene.module.scss";

export type MagicEyeLogoHeroSceneProps = {
  duration?: string;
  easing?: string;
  color?: string;
  mark?: string;      // 워드마크
  fs?: number;        // 워드마크 크기(px)
  cycle?: number;     // 파동 주기(초)
  wavelen?: number;   // 파동 파장(px)
  vig?: number;       // 비네팅 강도(0..1)
  maxshift?: number;  // 글자 최대 시프트(px)
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const MARK     = "GODRICH";   // 워드마크
const FS       = 96;          // 워드마크 크기(px)
const CYCLE    = 2.0;         // 파동 주기(초) — 설정 초(2s)와 같다
const WAVELEN  = 150;         // 파동 파장(px)
const VIG      = 0.18;        // 비네팅 강도(0..1)
const MAXSHIFT = 12;          // 글자 최대 시프트(px)

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const FIELD_LABEL = "브랜드 대문 판";
const META_LEFT = "워드마크 96px · 파동 주기 2초 · 비네팅 18%";
const META_RIGHT = "createLinearGradient · ImageData";
const HINT_TITLE = "로고 히어로 씬";
const HINT_DESC = "느린 파동 위에 워드마크를 깊이로 숨기면 눈을 늦춘 사람에게만 로고가 떠오릅니다";
const SUB_WORD = "S T O R Y";   // 서브 워드 — 자간을 벌린 브랜드 락업

export default function MagicEyeLogoHeroScene({
  duration = "2s",
  easing = "ease-out",
  color = "#cfd8f2",
  mark = MARK,
  fs = FS,
  cycle = CYCLE,
  wavelen = WAVELEN,
  vig = VIG,
  maxshift = MAXSHIFT
}: MagicEyeLogoHeroSceneProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const palRef = useRef<RGB[] | null>(null);
  const imgRef = useRef<ImageData | null>(null);
  const markRef = useRef<Float32Array | null>(null);
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
    return ((h % pal.length) + pal.length) % pal.length;
  }

  // 워드마크를 오프스크린에 찍는다 — 2단 락업(대 워드마크 + 서브 워드)으로 판을 채운다
  function renderMark(): void {
    const W = wRef.current, H = hRef.current;
    if (W <= 0 || H <= 0) return;
    const off = document.createElement("canvas");   // 워드마크 오프스크린
    off.width = W; off.height = H;
    const offCtx = off.getContext("2d");
    if (!offCtx) return;
    offCtx.clearRect(0, 0, W, H);
    const fsz = Math.min(fs, W * 0.21);
    offCtx.textAlign = "center"; offCtx.textBaseline = "middle";
    offCtx.fillStyle = "#fff";
    // 판폭에 맞출 수 없으면 가로 축소 — 마크는 항상 화면을 꽉 채운다
    offCtx.font = '900 ' + fsz + 'px "Segoe UI", "Arial Black", sans-serif';
    const tw = offCtx.measureText(mark).width;
    const line1y = H * 0.42, line2y = H * 0.66;
    if (tw > W * 0.94) {
      offCtx.save();
      offCtx.translate(W / 2, line1y);
      offCtx.scale(W * 0.94 / tw, 1);
      offCtx.fillText(mark, 0, 0);
      offCtx.restore();
    } else {
      offCtx.fillText(mark, W / 2, line1y);
    }
    // 서브 워드 — 자간을 벌려 브랜드 락업을 만든다
    offCtx.font = '700 ' + Math.round(fsz * 0.34) + 'px "Segoe UI", sans-serif';
    const tw2 = offCtx.measureText(SUB_WORD).width;
    if (tw2 > W * 0.94) {
      offCtx.save();
      offCtx.translate(W / 2, line2y);
      offCtx.scale(W * 0.94 / tw2, 1);
      offCtx.fillText(SUB_WORD, 0, 0);
      offCtx.restore();
    } else {
      offCtx.fillText(SUB_WORD, W / 2, line2y);
    }
    const id = offCtx.getImageData(0, 0, W, H);
    const lum = new Float32Array(W * H);
    for (let yy = 0; yy < H; yy++) {
      for (let xx = 0; xx < W; xx++) {
        const v = id.data[(yy * W + xx) * 4] / 255;   // 흰 글자 → 1
        if (v > 0.25) lum[yy * W + xx] = v;
      }
    }
    // 두께 확장 — 깊이 맵만 3px 부풀려 스트로크 사이도 조각되게(화면 픽셀이 아니라 깊이만)
    const markMap = new Float32Array(W * H);
    for (let yy = 0; yy < H; yy++) {
      for (let xx = 0; xx < W; xx++) {
        const base = lum[yy * W + xx];
        if (base > 0) { markMap[yy * W + xx] = base; continue; }
        let m = 0;
        for (let oy = -3; oy <= 3 && !m; oy++) {
          const sy2 = yy + oy; if (sy2 < 0 || sy2 >= H) continue;
          for (let ox = -3; ox <= 3; ox++) {
            const sx2 = xx + ox; if (sx2 < 0 || sx2 >= W) continue;
            if (lum[sy2 * W + sx2] > 0) { m = 0.55; break; }
          }
        }
        markMap[yy * W + xx] = m;
      }
    }
    markRef.current = markMap;
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
    renderMark();
  }

  function depthAt(x: number, y: number, t: number): number {
    const markMap = markRef.current;
    const W = wRef.current, H = hRef.current;
    if (!markMap) return 0;
    const ph = t / cycle * Math.PI * 2;
    const breathe = 0.55 + 0.45 * Math.sin(ph + 0.8);
    // 바닥 지면 — 판 전체에 아주 얕은 원거리 지형(1~2px)을 깐다. 마크 뒤 안개처럼
    // 숨쉬며, 노이즈 배경 전체가 느리게 재엮인다(마크만으로는 면적이 좁다).
    const fx = (x / W) * Math.PI * 2;
    const fw = 0.5 + 0.5 * Math.sin(fx * 1.5 - ph * 0.5);
    const fw2 = 0.5 + 0.5 * Math.sin(fx * 0.8 + y * 0.012 - ph * 0.34 + 2.0);
    const floorD = (0.085 * fw + 0.075 * fw2) * breathe;
    // 수직 bob — 마크를 천천히 떠오르게 한다(행마다 샘플이 흐른다)
    const bob = Math.round(Math.sin(ph) * H * 0.08);
    let sy = y - bob;
    if (sy < 0 || sy >= H) sy = y;
    const m = markMap[sy * W + x];
    if (!m || m <= 0) return floorD;
    // 느린 파동 — 마크를 대각선으로 가로지르는 사인이 글자를 부풀렸다 가라앉힌다
    const wpos = ((x + y * 0.5) / wavelen) * Math.PI * 2;
    const wave = Math.sin(wpos - ph) * 0.5 + 0.5;
    const wave2 = Math.sin(((x * 0.4 - y) / (wavelen * 1.3)) * Math.PI * 2 - ph * 0.6 + 1.4) * 0.5 + 0.5;
    const markD = m * (0.22 + 0.42 * wave + 0.36 * wave2) * breathe;
    return markD > floorD ? markD : floorD;
  }

  function draw(t: number): void {
    const ctx = ctxRef.current;
    const img = imgRef.current;
    const pal = palRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !img || !pal) return;
    const d = img.data;
    const col = new Int32Array(W);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const s = Math.round(depthAt(x, y, t) * maxshift);
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

    // 비네팅 18% — 노이즈 판 위에 어두운 가장자리를 얹는다(씬 완성)
    const vg = ctx.createLinearGradient(0, 0, 0, H);
    vg.addColorStop(0, "rgba(12, 10, 18, " + (vig * 0.9).toFixed(3) + ")");
    vg.addColorStop(0.28, "rgba(12, 10, 18, 0)");
    vg.addColorStop(0.72, "rgba(12, 10, 18, 0)");
    vg.addColorStop(1, "rgba(12, 10, 18, " + (vig * 0.9).toFixed(3) + ")");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
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
      if (reduced()) draw(0);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      draw(0);                                     // reduce — 대문 한 장만 고정
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
  }, [mark, fs, cycle, wavelen, vig, maxshift]);

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
