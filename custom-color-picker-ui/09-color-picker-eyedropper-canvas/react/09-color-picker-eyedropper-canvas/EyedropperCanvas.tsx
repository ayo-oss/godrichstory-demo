// EyedropperCanvas — vanilla 판(run/286/demo/09-color-picker-eyedropper-canvas) 의 React 포트.
// 변수 3개(duration·easing·color)는 props 로 받아 CSS 변수(var(--duration) 등)로 들어온다.
// 상태는 집은 점의 좌표와 RGB 세 값뿐이다. HEX 글자는 JS 가 쓰지 않는다 —
// --r --g --b 만 넘기면 module.scss 의 counter-set 과 @counter-style hx 가 16진으로 찍는다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./EyedropperCanvas.module.scss";

type KeyEvt = { key: string; shiftKey: boolean; preventDefault(): void };

/** 화면 전체에서 집는 브라우저 API. 없는 브라우저에서는 캔버스 위 집기로 내려간다 */
type EyeDropperResult = { sRGBHex: string };
type EyeDropperLike = { open(): Promise<EyeDropperResult> };
type EyeDropperCtor = new () => EyeDropperLike;

export type EyedropperCanvasProps = {
  boxLabel?: string;
  canvasLabel?: string;
  pickLabel?: string;
  /** "가로 %x픽셀 지점, %c" 처럼 자리표시자 둘을 가진 틀 */
  spotFormat?: string;
  /** "집은 색 %c" 처럼 자리표시자 하나를 가진 틀 */
  liveFormat?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--r"?: number;
  "--g"?: number;
  "--b"?: number;
};

const WIDTH = 264;
const HEIGHT = 88;

function toHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("").toUpperCase();
}

export default function EyedropperCanvas({
  boxLabel = "그림 위에서 색 집기",
  canvasLabel = "주황에서 노랑을 지나 파랑으로 가는 색 띠",
  pickLabel = "화면에서 집기",
  spotFormat = "가로 %x픽셀 지점, %c",
  liveFormat = "집은 색 %c",
  demo = true,
  duration = 2000,
  easing = "linear",
  color = "#2f6df6",
}: EyedropperCanvasProps) {
  const [live, setLive] = useState(demo);
  const [spot, setSpot] = useState({ x: 40, y: 28 });
  const [rgb, setRgb] = useState({ r: 255, g: 117, b: 40 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 위쪽 56px 은 가로 3색 띠 — 채널마다 1차 보간이라 x 좌표와 색이 정확히 대응한다.
  // 아래 32px 은 장식이라 미리보기 루프의 스포이드 경로가 지나가지 않는다
  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    const ctx = node.getContext("2d");
    if (!ctx) return;
    const band = ctx.createLinearGradient(0, 0, WIDTH, 0);
    band.addColorStop(0, "#ff4d1f");
    band.addColorStop(0.5, "#ffd23f");
    band.addColorStop(1, "#2f6df6");
    ctx.fillStyle = band;
    ctx.fillRect(0, 0, WIDTH, 56);
    ctx.fillStyle = "#17141a";
    ctx.fillRect(0, 56, WIDTH, 32);
    const dots: [number, number, number, string][] = [
      [34, 72, 10, "#ff9ebb"],
      [86, 72, 13, "#4cd4a6"],
      [146, 72, 9, "#b9a0ff"],
      [206, 72, 12, "#6ec8ff"],
    ];
    dots.forEach(([cx, cy, radius, fill]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
    });
  }, []);

  function sample(x: number, y: number) {
    const node = canvasRef.current;
    if (!node) return;
    const ctx = node.getContext("2d");
    if (!ctx) return;
    const px = ctx.getImageData(x, y, 1, 1).data; // 그 한 점의 RGBA
    setSpot({ x, y });
    setRgb({ r: px[0], g: px[1], b: px[2] });
  }

  function moveTo(e: ReactPointerEvent<HTMLCanvasElement>) {
    const node = canvasRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = Math.round(Math.min(WIDTH - 1, Math.max(0, ((e.clientX - rect.left) / rect.width) * WIDTH)));
    const y = Math.round(Math.min(HEIGHT - 1, Math.max(0, ((e.clientY - rect.top) / rect.height) * HEIGHT)));
    setLive(false);
    sample(x, y);
  }

  function keyBox(e: KeyEvt) {
    const step = e.shiftKey ? 16 : 4;
    let { x, y } = spot;
    if (e.key === "ArrowRight") x = Math.min(WIDTH - 1, x + step);
    else if (e.key === "ArrowLeft") x = Math.max(0, x - step);
    else if (e.key === "ArrowDown") y = Math.min(HEIGHT - 1, y + step);
    else if (e.key === "ArrowUp") y = Math.max(0, y - step);
    else return;
    e.preventDefault();
    setLive(false);
    sample(x, y);
  }

  function pickFromScreen() {
    setLive(false);
    // 크롬 계열은 화면 어디서나 집는다. 없는 브라우저는 캔버스 위 집기로 조용히 내려간다
    const ctor = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper;
    if (ctor) {
      new ctor()
        .open()
        .then((res) => {
          const n = parseInt(res.sRGBHex.slice(1), 16);
          setRgb({ r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 });
        })
        .catch(() => sample(spot.x, spot.y));
    } else {
      sample(spot.x, spot.y);
    }
  }

  const hex = toHex(rgb.r, rgb.g, rgb.b);
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--r": rgb.r,
    "--g": rgb.g,
    "--b": rgb.b,
  };
  // 확대경은 자기 중심이 집은 점 위에 놓인다 — 좌표 이동 뒤 자기 크기의 절반만큼 되민다
  const loupeStyle: CSSProperties = {
    transform: `translate(${spot.x}px, ${spot.y}px) translate(-50%, -50%)`,
  };

  return (
    <div className={[styles.ed, live ? styles.isDemo : ""].filter(Boolean).join(" ")} style={vars}>
      <div
        className={styles.box}
        role="slider"
        tabIndex={0}
        aria-label={boxLabel}
        aria-valuemin={0}
        aria-valuemax={WIDTH}
        aria-valuenow={spot.x}
        aria-valuetext={spotFormat.replace("%x", String(spot.x)).replace("%c", hex)}
        onKeyDown={keyBox}
      >
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          width={WIDTH}
          height={HEIGHT}
          role="img"
          aria-label={canvasLabel}
          onPointerDown={moveTo}
          onPointerMove={moveTo}
        />
        <span className={styles.loupe} style={loupeStyle} aria-hidden="true" />
      </div>
      <div className={styles.foot}>
        <span className={styles.chip} aria-hidden="true" />
        <span className={styles.hex} aria-hidden="true" />
        <button type="button" className={styles.pick} onClick={pickFromScreen}>
          <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path
              d="M207.8,87.6l-25.37,25.53,4.89,4.88a16,16,0,0,1,0,22.64l-9,9a8,8,0,0,1-11.32,0l-60.68-60.7a8,8,0,0,1,0-11.32l9-9a16,16,0,0,1,22.63,0l4.88,4.89,25-25.11c10.79-10.79,28.37-11.45,39.45-1A28,28,0,0,1,207.8,87.6Z"
              opacity="0.2"
            />
            <path d="M224,67.3a35.79,35.79,0,0,0-11.26-25.66c-14-13.28-36.72-12.78-50.62,1.13L142.8,62.2a24,24,0,0,0-33.14.77l-9,9a16,16,0,0,0,0,22.64l2,2.06-51,51a39.75,39.75,0,0,0-10.53,38l-8,18.41A13.68,13.68,0,0,0,36,219.3a15.92,15.92,0,0,0,17.71,3.35L71.23,215a39.89,39.89,0,0,0,37.06-10.75l51-51,2.06,2.06a16,16,0,0,0,22.62,0l9-9a24,24,0,0,0,.74-33.18l19.75-19.87A35.75,35.75,0,0,0,224,67.3ZM97,193a24,24,0,0,1-24,6,8,8,0,0,0-5.55.31l-18.1,7.91L57,189.41a8,8,0,0,0,.25-5.75A23.88,23.88,0,0,1,63,159l51-51,33.94,34ZM202.13,82l-25.37,25.52a8,8,0,0,0,0,11.3l4.89,4.89a8,8,0,0,1,0,11.32l-9,9L112,83.26l9-9a8,8,0,0,1,11.31,0l4.89,4.89a8,8,0,0,0,5.65,2.34h0a8,8,0,0,0,5.66-2.36l24.94-25.09c7.81-7.82,20.5-8.18,28.29-.81a20,20,0,0,1,.39,28.7Z" />
          </svg>
          <span>{pickLabel}</span>
        </button>
      </div>
      <span className={styles.liveRegion} aria-live="polite">
        {liveFormat.replace("%c", hex)}
      </span>
    </div>
  );
}
