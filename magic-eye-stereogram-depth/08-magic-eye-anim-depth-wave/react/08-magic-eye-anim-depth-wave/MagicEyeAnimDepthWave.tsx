// MagicEyeAnimDepthWave — vanilla 판(run/325/demo/08-magic-eye-anim-depth-wave/index.html) 의 React 포트.
// 깊이 지도에 시간 사인 파동을 흘린다. 기저 부풀음(중앙 돔) 위로 파장 130px 사인 파동이
// 대각선으로 지나가면 산과 구멍이 서로 바뀌며 표면이 숨쉰다 — 정지 화면이 전부였던 매직아이의
// 애니메이션 국면. 파동의 봉우리가 최대 시프트(12px)를 만들고 골은 0으로 눌러
// 시프트가 없는 칸과 있는 칸이 행마다 번갈아 흐른다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MagicEyeAnimDepthWave.module.scss";

export type MagicEyeAnimDepthWaveProps = {
  duration?: string;
  easing?: string;
  color?: string;
  cycle?: number;     // 사인 주기(초)
  wavelen?: number;   // 파장(px) — 이만큼 이동할 때마다 한 주기
  amp?: number;       // 최대 시프트(px) — 파동 진폭이자 최대 깊이
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const CYCLE   = 2.0;   // 사인 주기(초) — 설정 초(2s)와 같아 한 파동이 한 루프
const WAVELEN = 130;   // 파장(px)
const AMP     = 12;    // 최대 시프트(px)

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const FIELD_LABEL = "깊이 파동 판";
const META_LEFT = "사인 주기 2초 · 파장 130px · 진폭 12px";
const META_RIGHT = "ImageData · Math.sin";
const HINT_TITLE = "살아있는 돌출";
const HINT_DESC = "깊이 지도에 시간 사인 파동을 흘리면 산과 구멍이 서로 바뀌며 표면이 숨쉽니다";

export default function MagicEyeAnimDepthWave({
  duration = "2s",
  easing = "ease-out",
  color = "#d8d2e8",
  cycle = CYCLE,
  wavelen = WAVELEN,
  amp = AMP
}: MagicEyeAnimDepthWaveProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const palRef = useRef<RGB[] | null>(null);
  const imgRef = useRef<ImageData | null>(null);
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
  }

  // 깊이 — 기저 돔 × 사인 파동. 파동이 대각선으로 흐르고 위상이 시간에 따라 진행한다.
  function depthAt(x: number, y: number, t: number): number {
    const W = wRef.current, H = hRef.current;
    const ph = t / cycle * Math.PI * 2;
    // 기저 — 중앙 돔(화면 가장자리는 0). 중심이 천천히 수직으로 bob 한다.
    const cx = W * 0.5, cy = H * 0.5 + Math.sin(ph) * H * 0.06;
    const rad = Math.min(W, H) * 0.74;
    const dx = (x - cx) / rad, dy = (y - cy) / rad;
    const d2 = dx * dx + dy * dy;
    if (d2 >= 1) return 0;
    const dome = Math.sqrt(1 - d2) * 0.60;
    // 파동 — 대각선 사인 + 직교 사인(파동면이 비틀린다), 파장 wavelen
    const wpos = (x + y * 0.6) / wavelen * Math.PI * 2;
    const wpos2 = (x * 0.4 - y) / (wavelen * 1.4) * Math.PI * 2;
    const wave = Math.sin(wpos - ph) * 0.5 + 0.5;
    const wave2 = Math.sin(wpos2 - ph * 0.7 + 2.1) * 0.5 + 0.5;
    const v = dome * (0.28 + 0.44 * wave + 0.28 * wave2);
    // 숨쉬기 — 전체 진폭이 주기의 절반 위상으로 느리게 부풀고 가라앉는다
    const breathe = 0.68 + 0.32 * Math.sin(ph * 0.5);
    return v * breathe;
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
        const s = Math.round(depthAt(x, y, t) * amp);
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
      if (reduced()) draw(0);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      draw(0);                                     // reduce — 파동 한 장만 고정
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
  }, [cycle, wavelen, amp]);

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
