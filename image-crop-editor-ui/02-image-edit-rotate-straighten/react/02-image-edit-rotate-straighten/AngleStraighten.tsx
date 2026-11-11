// AngleStraighten — vanilla 판(run/295/demo/02-image-edit-rotate-straighten/index.html) 의 React 포트.
// 보정은 canvas 2D 한 번에 한다 — 가운데로 옮기고(translate) 돌리고(rotate) 빈 귀퉁이가 안 생길 만큼 키운다(scale).
// 얼마나 키워야 하는지는 zoomFor 가 삼각함수로 계산한다. 값·수치는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./AngleStraighten.module.scss";

export type AngleStraightenProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--photo"?: string;
};
// ambient 타입에는 KeyboardEvent 가 없다 — 키 핸들러가 실제로 쓰는 것만 지역 타입으로 적는다
type KeyEvt = { key: string; shiftKey: boolean; preventDefault(): void };

const VOICE = "기운 각도 %a도, 배율 %k배";
const VIEW_W = 320;
const VIEW_H = 200;

// 가짜 사진 — 외부 파일 없이 그라디언트와 도형으로 합성한다. 필터·히스토그램이 보이도록 대비를 세게 준다
function paintPhoto(c: CanvasRenderingContext2D, w: number, h: number): void {
  const sky = c.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#2f6df6"); sky.addColorStop(0.55, "#ff9ebb"); sky.addColorStop(1, "#ffd23f");
  c.fillStyle = sky; c.fillRect(0, 0, w, h);
  c.fillStyle = "#fff7e6";
  c.beginPath(); c.arc(w * 0.74, h * 0.28, h * 0.13, 0, Math.PI * 2); c.fill();
  // 곧은 수평선 하나 — 기울기 보정이 눈에 보이려면 비교할 직선이 있어야 한다
  c.fillStyle = "rgba(23, 20, 26, 0.5)"; c.fillRect(0, Math.round(h * 0.66), w, 2);
  c.fillStyle = "#17141a";
  c.beginPath(); c.moveTo(0, h); c.lineTo(w * 0.34, h * 0.36); c.lineTo(w * 0.62, h); c.closePath(); c.fill();
  c.fillStyle = "#c2361a";
  c.beginPath(); c.moveTo(w * 0.46, h); c.lineTo(w * 0.78, h * 0.52); c.lineTo(w, h); c.closePath(); c.fill();
  for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? "#fff7e6" : "#17141a"; c.fillRect(w * (0.08 + i * 0.07), h * (0.14 + (i % 3) * 0.06), 7, 7); }
}

// 기운 사각형이 원래 칸을 끝까지 덮으려면 얼마나 키워야 하는가.
// 가로변은 w·|cos| + h·|sin| 로 늘어나고 세로변은 w·|sin| + h·|cos| 로 늘어난다 — 둘 중 큰 쪽이 배율이다
function zoomFor(rad: number, w: number, h: number): number {
  const c = Math.abs(Math.cos(rad)), s = Math.abs(Math.sin(rad));
  return Math.max((w * c + h * s) / w, (w * s + h * c) / h);
}

export default function AngleStraighten({
  duration = 2000,
  easing = "ease-in-out",
  color = "#fff7e6",
}: AngleStraightenProps) {
  const viewRef = useRef<HTMLCanvasElement | null>(null);
  const srcRef = useRef<HTMLCanvasElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<boolean | null>(false);
  const [angle, setAngle] = useState(0);
  const [demo, setDemo] = useState(true);
  const [photo, setPhoto] = useState("");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  if (photo) vars["--photo"] = `url(${photo})`;

  const rad = angle * Math.PI / 180;
  const zoom = zoomFor(rad, VIEW_W, VIEW_H);
  const shown = `${angle.toFixed(1)}° · ${zoom.toFixed(2)}×`;

  // 원본은 화면에 없는 캔버스에 한 번만 그려 두고, 보정할 때마다 거기서 가져다 쓴다
  useEffect(() => {
    const src = document.createElement("canvas");
    src.width = VIEW_W; src.height = VIEW_H;
    const sctx = src.getContext("2d");
    if (!sctx) return;
    paintPhoto(sctx, src.width, src.height);
    srcRef.current = src;
    setPhoto(src.toDataURL());
  }, []);

  useEffect(() => {
    const view = viewRef.current, src = srcRef.current;
    if (!view || !src) return;
    const vctx = view.getContext("2d");
    if (!vctx) return;
    const w = view.width, h = view.height, k = zoomFor(angle * Math.PI / 180, w, h);
    vctx.setTransform(1, 0, 0, 1, 0, 0);
    vctx.clearRect(0, 0, w, h);
    vctx.translate(w / 2, h / 2);
    vctx.rotate(angle * Math.PI / 180);
    vctx.scale(k, k);
    vctx.drawImage(src, -w / 2, -h / 2, w, h);
  }, [angle, photo]);

  function applyAngle(next: number): void {
    setAngle(Math.max(-15, Math.min(15, next)));
    setDemo(false);
  }

  function fromPointer(event: ReactPointerEvent<HTMLDivElement>): void {
    const track = trackRef.current;
    if (!track) return;
    const r = track.getBoundingClientRect();
    applyAngle(Math.round(((event.clientX - r.left) / r.width * 30 - 15) * 10) / 10);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = true;
    fromPointer(event);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    if (!dragRef.current || !event.buttons) return;
    fromPointer(event);
  }

  function onPointerUp(): void {
    dragRef.current = false;
  }

  // 화살표 0.5도, Shift 와 함께면 5도 — 미세 보정은 손보다 키보드가 정확하다
  function onKeyDown(event: KeyEvt): void {
    const step = event.shiftKey ? 5 : 0.5;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") { event.preventDefault(); applyAngle(angle - step); }
    else if (event.key === "ArrowRight" || event.key === "ArrowUp") { event.preventDefault(); applyAngle(angle + step); }
    else if (event.key === "Home") { event.preventDefault(); applyAngle(0); }
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div className={styles.frame}>
          <canvas className={styles.view} ref={viewRef} width={VIEW_W} height={VIEW_H} role="img" aria-label="샘플 사진"></canvas>
          <span className={styles.ghost} aria-hidden="true"></span>
          <span className={styles.grid} aria-hidden="true"></span>
        </div>
        <div className={styles.ctl}>
          <span className={styles.lab}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className={styles.ico} aria-hidden="true"><g fill="currentColor"><path d="M216 128a88 88 0 1 1-88-88a88 88 0 0 1 88 88" opacity=".2"/><path d="M224 48v48a8 8 0 0 1-8 8h-48a8 8 0 0 1 0-16h28.69l-14.63-14.63a79.56 79.56 0 0 0-56.13-23.43h-.45a79.52 79.52 0 0 0-55.89 22.77a8 8 0 0 1-11.18-11.44a96 96 0 0 1 135 .79L208 76.69V48a8 8 0 0 1 16 0m-37.59 135.29a80 80 0 0 1-112.47-.66L59.31 168H88a8 8 0 0 0 0-16H40a8 8 0 0 0-8 8v48a8 8 0 0 0 16 0v-28.69l14.63 14.63A95.43 95.43 0 0 0 130 222.06h.53a95.36 95.36 0 0 0 67.07-27.33a8 8 0 0 0-11.18-11.44Z"/></g></svg>
            <span>수평 보정</span>
          </span>
          <div
            className={styles.track}
            ref={trackRef}
            role="slider"
            tabIndex={0}
            aria-label="기운 각도 조절"
            aria-valuemin={-15}
            aria-valuemax={15}
            aria-valuenow={angle.toFixed(1)}
            aria-valuetext={VOICE.replace("%a", angle.toFixed(1)).replace("%k", zoom.toFixed(2))}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onKeyDown={onKeyDown}
          >
            <span className={styles.thumb} style={{ left: `${(angle + 15) / 30 * 100}%` }}></span>
          </div>
          <span className={styles.vals}>
            <span className={styles.real}>{shown}</span>
            <span className={`${styles.valDemo} ${styles.valA}`} aria-hidden="true">-12.0° · 1.31×</span>
            <span className={`${styles.valDemo} ${styles.valB}`} aria-hidden="true">0.0° · 1.00×</span>
          </span>
        </div>
      </div>
    </main>
  );
}
