// TextWatermark — vanilla 판(run/295/demo/07-image-edit-text-watermark/index.html) 의 React 포트.
// 실제 워터마크는 canvas 2D 의 fillText 가 굽는다(shadowBlur 로 밝은 하늘 위에서도 읽히게).
// 격자 미리보기(.isDemo) 동안에는 캔버스가 사진만 그리고 글자 몫을 유령 판이 맡는다 —
// 한 번 구운 캔버스 글자는 CSS 로 움직일 수 없어 끌어 옮기는 장면을 보여줄 수가 없기 때문이다.
// 값·수치는 vanilla 와 같다.
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./TextWatermark.module.scss";

export type TextWatermarkProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Spot = { x: number; y: number };
// ambient 타입에 KeyboardEvent 가 없다 — 화살표 조작에 쓰는 것만 지역 타입으로 선언한다
type KeyEvt = { key: string; shiftKey: boolean; preventDefault(): void };

const MARK = "© GODRICH";
const VOICE = "%s 픽셀";

// 가짜 사진 — 외부 파일 없이 그라디언트와 도형으로 합성한다. 필터·히스토그램이 보이도록 대비를 세게 준다
function paintPhoto(c: CanvasRenderingContext2D, w: number, h: number): void {
  const sky = c.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#2f6df6");
  sky.addColorStop(0.55, "#ff9ebb");
  sky.addColorStop(1, "#ffd23f");
  c.fillStyle = sky;
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#fff7e6";
  c.beginPath();
  c.arc(w * 0.74, h * 0.28, h * 0.13, 0, Math.PI * 2);
  c.fill();
  // 곧은 수평선 하나 — 기울기 보정이 눈에 보이려면 비교할 직선이 있어야 한다
  c.fillStyle = "rgba(23, 20, 26, 0.5)";
  c.fillRect(0, Math.round(h * 0.66), w, 2);
  c.fillStyle = "#17141a";
  c.beginPath();
  c.moveTo(0, h);
  c.lineTo(w * 0.34, h * 0.36);
  c.lineTo(w * 0.62, h);
  c.closePath();
  c.fill();
  c.fillStyle = "#c2361a";
  c.beginPath();
  c.moveTo(w * 0.46, h);
  c.lineTo(w * 0.78, h * 0.52);
  c.lineTo(w, h);
  c.closePath();
  c.fill();
  for (let i = 0; i < 6; i++) {
    c.fillStyle = i % 2 ? "#fff7e6" : "#17141a";
    c.fillRect(w * (0.08 + i * 0.07), h * (0.14 + (i % 3) * 0.06), 7, 7);
  }
}

export default function TextWatermark({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#fff7e6",
}: TextWatermarkProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<HTMLCanvasElement | null>(null);
  const trackRef = useRef<HTMLSpanElement | null>(null);
  const srcRef = useRef<HTMLCanvasElement | null>(null);
  const [demo, setDemo] = useState(true);
  const [size, setSize] = useState(24);
  const [shadowOn, setShadowOn] = useState(true);
  const [spot, setSpot] = useState<Spot>({ x: 0.5, y: 0.78 });
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 사진은 한 번만 굽는다 — 보이는 캔버스는 이 판을 그대로 옮겨 그린 위에 글자를 얹는다
  const ensureSrc = useCallback((): HTMLCanvasElement | null => {
    if (!srcRef.current) {
      const src = document.createElement("canvas");
      src.width = 320;
      src.height = 200;
      const sctx = src.getContext("2d");
      if (!sctx) return null;
      paintPhoto(sctx, src.width, src.height);
      srcRef.current = src;
    }
    return srcRef.current;
  }, []);

  const render = useCallback(() => {
    const view = viewRef.current;
    const src = ensureSrc();
    if (!view || !src) return;
    const vctx = view.getContext("2d");
    if (!vctx) return;
    const w = view.width;
    const h = view.height;
    vctx.setTransform(1, 0, 0, 1, 0, 0);
    vctx.clearRect(0, 0, w, h);
    vctx.drawImage(src, 0, 0, w, h);
    // 격자 미리보기 동안에는 글자를 유령 판이 맡는다 — 캔버스에 구운 글자는 CSS 로 못 움직인다
    if (demo) return;
    vctx.font = "800 " + size + "px system-ui, sans-serif";
    vctx.textAlign = "center";
    vctx.textBaseline = "middle";
    vctx.fillStyle = "rgba(255, 247, 230, 0.94)";
    vctx.shadowColor = "rgba(23, 20, 26, 0.62)";
    // 그림자는 글자 아래 번지는 정도만 — 0 이면 밝은 하늘 위에서 글자가 묻힌다
    vctx.shadowBlur = shadowOn ? 9 : 0;
    vctx.shadowOffsetY = shadowOn ? 2 : 0;
    vctx.fillText(MARK, spot.x * w, spot.y * h);
  }, [demo, ensureSrc, shadowOn, size, spot]);

  useEffect(() => {
    render();
  }, [render]);

  const setFont = useCallback((px: number) => {
    setSize(Math.max(14, Math.min(42, Math.round(px))));
    setDemo(false);
  }, []);

  function moveMark(event: ReactPointerEvent<HTMLDivElement>): void {
    const frame = frameRef.current;
    if (!frame) return;
    const r = frame.getBoundingClientRect();
    setSpot({
      x: Math.max(0.12, Math.min(0.88, (event.clientX - r.left) / r.width)),
      y: Math.max(0.12, Math.min(0.9, (event.clientY - r.top) / r.height)),
    });
  }

  function onFrameDown(event: ReactPointerEvent<HTMLDivElement>): void {
    const frame = frameRef.current;
    if (!frame) return;
    frame.setPointerCapture(event.pointerId);
    setDemo(false);
    moveMark(event);
  }

  function onFrameMove(event: ReactPointerEvent<HTMLDivElement>): void {
    if (event.buttons) moveMark(event);
  }

  function fromPointer(event: ReactPointerEvent<HTMLSpanElement>): void {
    const track = trackRef.current;
    if (!track) return;
    const r = track.getBoundingClientRect();
    setFont(((event.clientX - r.left) / r.width) * 28 + 14);
  }

  function onTrackDown(event: ReactPointerEvent<HTMLSpanElement>): void {
    const track = trackRef.current;
    if (!track) return;
    track.setPointerCapture(event.pointerId);
    fromPointer(event);
  }

  function onTrackMove(event: ReactPointerEvent<HTMLSpanElement>): void {
    if (event.buttons) fromPointer(event);
  }

  // 화살표 1픽셀, Shift 와 함께면 6픽셀
  function onTrackKey(event: KeyEvt): void {
    const step = event.shiftKey ? 6 : 1;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      setFont(size - step);
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      setFont(size + step);
    }
  }

  function onShadow(): void {
    setShadowOn(!shadowOn);
    setDemo(false);
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div className={styles.frame} ref={frameRef} onPointerDown={onFrameDown} onPointerMove={onFrameMove}>
          <canvas className={styles.view} ref={viewRef} width={320} height={200} role="img" aria-label="워터마크를 얹은 사진"></canvas>
          <span className={styles.ghost} aria-hidden="true"><span className={styles.mark}>{MARK}</span></span>
        </div>
        <div className={styles.foot}>
          <span className={styles.lab} id="sizeLab">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className={styles.ico} aria-hidden="true"><g fill="currentColor"><path d="M232 164c0 15.46-14.33 28-32 28s-32-12.54-32-28s14.33-28 32-28s32 12.54 32 28M34.82 152h90.36L80 56Z" opacity=".2"/><path d="M87.24 52.59a8 8 0 0 0-14.48 0l-64 136a8 8 0 1 0 14.48 6.81L39.9 160h80.2l16.66 35.4a8 8 0 1 0 14.48-6.81ZM47.43 144L80 74.79L112.57 144ZM200 96c-12.76 0-22.73 3.47-29.63 10.32a8 8 0 0 0 11.26 11.36c3.8-3.77 10-5.68 18.37-5.68c13.23 0 24 9 24 20v3.22a42.76 42.76 0 0 0-24-7.22c-22.06 0-40 16.15-40 36s17.94 36 40 36a42.73 42.73 0 0 0 24-7.25a8 8 0 0 0 16-.75v-60c0-19.85-17.94-36-40-36m0 88c-13.23 0-24-9-24-20s10.77-20 24-20s24 9 24 20s-10.77 20-24 20"/></g></svg>
            <span>글자 크기</span>
          </span>
          <span
            className={styles.track}
            ref={trackRef}
            role="slider"
            tabIndex={0}
            aria-labelledby="sizeLab"
            aria-valuemin={14}
            aria-valuemax={42}
            aria-valuenow={size}
            aria-valuetext={VOICE.replace("%s", String(size))}
            onPointerDown={onTrackDown}
            onPointerMove={onTrackMove}
            onKeyDown={onTrackKey}
          >
            <span className={styles.thumb} style={{ left: `${((size - 14) / 28) * 100}%` }}></span>
          </span>
          <button type="button" className={styles.btn} aria-pressed={shadowOn} onClick={onShadow}>그림자</button>
          <span className={styles.hint}>끌어서 옮기기</span>
        </div>
      </div>
    </main>
  );
}
