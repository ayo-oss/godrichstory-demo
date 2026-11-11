// MagicEyePhotoDepthmapLift — vanilla 판(run/325/demo/04-magic-eye-photo-depthmap-lift/index.html) 의 React 포트.
// 사진 한 장의 밝기를 지형 높이로 읽어 올린다. 외부 이미지 없이 캔버스로 "사진"을 합성한다
// (구름 하늘 그라디언트 + 언덕 두 개 + 얼굴 실루엣 언덕). 광원 방향이 주기마다 돌면 언덕의 음영이
// 바뀌고, 음영이 곧 높이(깊이)라서 부조 전체가 살아 움직인다.
// 실 서비스에서는 드래그앤드롭된 임의 사진의 getImageData 를 같은 파이프라인에 넣으면 된다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MagicEyePhotoDepthmapLift.module.scss";

export type MagicEyePhotoDepthmapLiftProps = {
  duration?: string;
  easing?: string;
  color?: string;
  maxshift?: number;  // 부조 깊이(px)
  cycle?: number;     // 광원 회전 주기(초)
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const MAXSHIFT = 12;   // 부조 깊이(px)
const CYCLE    = 2.0;  // 광원 회전 주기(초) — 설정 초(2s)와 같아 한 바퀴가 한 루프

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const FIELD_LABEL = "사진 부조 변환기";
const META_LEFT = "합성 사진 1장 · 광원 회전 주기 2초 · 깊이 12px";
const META_RIGHT = "밝기 → 높이 변환";
const HINT_TITLE = "사진 부조";
const HINT_DESC = "밝기를 지형의 높이로 읽으면 사진 전체가 노이즈 언덕 위로 부조처럼 떠오릅니다";

export default function MagicEyePhotoDepthmapLift({
  duration = "2s",
  easing = "ease-out",
  color = "#d8d2e8",
  maxshift = MAXSHIFT,
  cycle = CYCLE
}: MagicEyePhotoDepthmapLiftProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const palRef = useRef<RGB[] | null>(null);
  const imgRef = useRef<ImageData | null>(null);
  const phRef = useRef<HTMLCanvasElement | null>(null);
  const phCtxRef = useRef<CanvasRenderingContext2D | null>(null);
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
    const phCv = phRef.current;
    if (!field || !cv || !ctx || !phCv) return;
    const r = field.getBoundingClientRect();
    wRef.current = Math.round(r.width);
    hRef.current = Math.round(r.height);
    cv.width = wRef.current;
    cv.height = hRef.current;
    phCv.width = wRef.current;
    phCv.height = hRef.current;
    imgRef.current = ctx.createImageData(wRef.current, hRef.current);
  }

  // 합성 사진 — 회전 광원 아래 언덕 지형. 라스터를 읽어 밝기 → 깊이로 쓴다.
  function paintPhoto(t: number): void {
    const phCtx: CanvasRenderingContext2D | null = phCtxRef.current;
    const W = wRef.current, H = hRef.current;
    if (!phCtx || W <= 0) return;
    const ang = t / cycle * Math.PI * 2;
    const lx = W * 0.5 + Math.cos(ang) * W * 0.4;   // 광원이 좌우로 돈다
    const ly = H * 0.28 + Math.sin(ang) * H * 0.1;
    const P: CanvasRenderingContext2D = phCtx;

    // 하늘 — 세로 그라디언트(밝기가 위에서 아래로 낮아진다 = 뒤로 낮아지는 지형)
    const sky = P.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#e8e2d4");
    sky.addColorStop(0.7, "#c9c0ae");
    sky.addColorStop(1, "#b3a894");
    P.fillStyle = sky;
    P.fillRect(0, 0, W, H);

    // 광원 패치 — 하늘의 가장 밝은 점(가장 앞으로 나온 봉우리로 읽힌다)
    const glow = P.createRadialGradient(lx, ly, 2, lx, ly, W * 0.16);
    glow.addColorStop(0, "#ffffff");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    P.fillStyle = glow;
    P.fillRect(0, 0, W, H);

    // 언덕 세 개 — 포물선 낙차. 광원 쪽이 밝다(높이 음영)
    function hill(cx2: number, baseY: number, halfW: number, lift: number, hue: RGB): void {
      const g2 = P.createLinearGradient(cx2 - halfW, 0, cx2 + halfW, 0);
      const lit = Math.max(0, Math.min(1, 0.5 + (lx - cx2) / W));
      const r = Math.round(hue[0] + (255 - hue[0]) * lit * lift);
      const g3 = Math.round(hue[1] + (255 - hue[1]) * lit * lift);
      const b2 = Math.round(hue[2] + (255 - hue[2]) * lit * lift);
      const dk = 0.82;
      g2.addColorStop(0, "rgb(" + Math.round(r * dk) + "," + Math.round(g3 * dk) + "," + Math.round(b2 * dk) + ")");
      g2.addColorStop(0.5, "rgb(" + r + "," + g3 + "," + b2 + ")");
      g2.addColorStop(1, "rgb(" + Math.round(r * dk) + "," + Math.round(g3 * dk) + "," + Math.round(b2 * dk) + ")");
      P.fillStyle = g2;
      P.beginPath();
      P.moveTo(cx2 - halfW, H);
      for (let sx = -halfW; sx <= halfW; sx += 4) {
        P.lineTo(cx2 + sx, baseY - Math.cos(sx / halfW * Math.PI / 2) * lift * H * 0.3);
      }
      P.lineTo(cx2 + halfW, H);
      P.closePath();
      P.fill();
    }
    hill(W * 0.24, H * 0.66, W * 0.30, 0.55, [96, 104, 88]);
    hill(W * 0.62, H * 0.78, W * 0.34, 0.40, [80, 90, 78]);
    hill(W * 0.88, H * 0.60, W * 0.22, 0.66, [110, 112, 92]);

    // 실루엣 초상 — 오른쪽 언덕 위 이마·코·턱 곡선(부조의 주인공)
    P.fillStyle = "#8d8474";
    P.beginPath();
    P.moveTo(W * 0.30, H);
    P.lineTo(W * 0.30, H * 0.52);
    P.quadraticCurveTo(W * 0.33, H * 0.30, W * 0.44, H * 0.34);   // 이마
    P.quadraticCurveTo(W * 0.50, H * 0.36, W * 0.50, H * 0.44);   // 콧등
    P.quadraticCurveTo(W * 0.53, H * 0.56, W * 0.47, H * 0.66);   // 입·턱
    P.quadraticCurveTo(W * 0.44, H * 0.78, W * 0.52, H);
    P.closePath();
    P.fill();
  }

  function draw(t: number): void {
    const ctx = ctxRef.current;
    const phCtx = phCtxRef.current;
    const img = imgRef.current;
    const pal = palRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !phCtx || !img || !pal) return;
    paintPhoto(t);
    const ph = phCtx.getImageData(0, 0, W, H).data;
    const d = img.data;
    const col = new Int32Array(W);
    for (let y = 0; y < H; y++) {
      const rowOff = y * W;
      for (let x = 0; x < W; x++) {
        const lum = ph[(rowOff + x) * 4];   // 밝기 0..255
        const s = Math.round(lum / 255 * maxshift);
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
    // 합성 사진용 오프스크린 캔버스 — ref 로 만들어 재사용한다
    const phCv = document.createElement("canvas");
    phRef.current = phCv;
    phCtxRef.current = phCv.getContext("2d");
    ctxRef.current = cv.getContext("2d");
    fit();
    function onResize(): void {
      fit();
      if (reduced()) draw(0.3);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      draw(0.3);                                  // reduce — 광원이 오른쪽에 있는 부조 한 장만 고정
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
  }, [maxshift, cycle]);

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
