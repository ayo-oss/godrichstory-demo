// SquarePad — vanilla 판(run/295/demo/06-image-edit-bg-pad-square/index.html) 의 React 포트.
// 정사각 캔버스를 고른 색으로 먼저 fillRect 한 뒤, 여백을 뺀 안쪽에 맞춰 줄인 사진을 drawImage 로
// 가운데 앉힌다 — 가로세로 어느 쪽도 넘지 않도록 배율은 두 비율 중 작은 쪽을 쓴다.
// 원본 그림은 화면에 없는 보조 canvas(src)에 한 번만 그려 두고 다시 쓴다. 값·수치·키프레임은 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./SquarePad.module.scss";

export type SquarePadProps = {
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
// react 앰비언트에 KeyboardEvent 가 없다 — 키 핸들러가 실제로 쓰는 것만 지역 타입으로 선언한다
type KeyEvt = { key: string; shiftKey: boolean; preventDefault(): void };

const VOICE = "%p 퍼센트";
const SWATCHES: { bg: string; label: string; cls: string }[] = [
  { bg: "#ffffff", label: "배경 흰색", cls: styles.swatchPaper },
  { bg: "#17141a", label: "배경 먹색", cls: styles.swatchInk },
  { bg: "#fff7e6", label: "배경 크림", cls: styles.swatchCream },
  { bg: "#2f6df6", label: "배경 파랑", cls: styles.swatchBlue },
];

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

export default function SquarePad({
  duration = 2000,
  easing = "ease-out",
  color = "#17141a",
}: SquarePadProps) {
  const outRef = useRef<HTMLCanvasElement | null>(null);
  const srcRef = useRef<HTMLCanvasElement | null>(null);
  const [bg, setBg] = useState("#ffffff");
  const [pad, setPad] = useState(0.08);
  const [demo, setDemo] = useState(true);
  const [photo, setPhoto] = useState("");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  if (photo) vars["--photo"] = `url(${photo})`;

  useEffect(() => {
    const src = document.createElement("canvas");
    src.width = 320; src.height = 200;
    const ctx = src.getContext("2d");
    if (!ctx) return;
    paintPhoto(ctx, src.width, src.height);
    srcRef.current = src;
    setPhoto(src.toDataURL());
  }, []);

  useEffect(() => {
    const out = outRef.current;
    const src = srcRef.current;
    if (!out || !src) return;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    const s = out.width;
    // 먼저 정사각 전체를 고른 색으로 칠하고, 그 위에 사진을 가운데로 앉힌다
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, s, s);
    const inner = s * (1 - pad * 2);
    const k = Math.min(inner / src.width, inner / src.height);
    const dw = src.width * k, dh = src.height * k;
    ctx.drawImage(src, (s - dw) / 2, (s - dh) / 2, dw, dh);
  }, [bg, pad, photo]);

  function applyPad(next: number): void {
    setPad(Math.max(0, Math.min(0.2, next)));
    setDemo(false);
  }

  function onPick(next: string): void {
    setBg(next);
    setDemo(false);
  }

  function fromPointer(event: ReactPointerEvent<HTMLSpanElement>): void {
    const r = event.currentTarget.getBoundingClientRect();
    applyPad(Math.round((event.clientX - r.left) / r.width * 20) / 100);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLSpanElement>): void {
    event.currentTarget.setPointerCapture(event.pointerId);
    fromPointer(event);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLSpanElement>): void {
    if (event.buttons) { fromPointer(event); }
  }

  // 화살표 1퍼센트, Shift 와 함께면 5퍼센트
  function onKeyDown(event: KeyEvt): void {
    const step = event.shiftKey ? 0.05 : 0.01;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") { event.preventDefault(); applyPad(pad - step); }
    else if (event.key === "ArrowRight" || event.key === "ArrowUp") { event.preventDefault(); applyPad(pad + step); }
  }

  const percent = Math.round(pad * 100);
  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <p className={styles.cap}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className={styles.ico} aria-hidden="true"><g fill="currentColor"><path d="M224 56v144a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8V56a8 8 0 0 1 8-8h176a8 8 0 0 1 8 8" opacity=".2"/><path d="M200 80v32a8 8 0 0 1-16 0V88h-24a8 8 0 0 1 0-16h32a8 8 0 0 1 8 8M96 168H72v-24a8 8 0 0 0-16 0v32a8 8 0 0 0 8 8h32a8 8 0 0 0 0-16M232 56v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16m-16 144V56H40v144z"/></g></svg><span>정사각 맞춤</span></p>
        <div className={styles.frame}>
          <canvas className={styles.out} ref={outRef} width={240} height={240} role="img" aria-label="정사각 결과"></canvas>
          <span className={styles.ghost} aria-hidden="true"><span className={styles.ghostImg}></span></span>
        </div>
        <div className={styles.row}>
          {SWATCHES.map((s) => (
            <button
              type="button"
              key={s.bg}
              className={`${styles.swatch} ${s.cls}`}
              aria-label={s.label}
              aria-pressed={bg === s.bg}
              onClick={() => onPick(s.bg)}
            ></button>
          ))}
          <span className={styles.pad}>
            <span className={styles.lab} id="padLab">여백</span>
            <span
              className={styles.track}
              role="slider"
              tabIndex={0}
              aria-labelledby="padLab"
              aria-valuemin={0}
              aria-valuemax={20}
              aria-valuenow={percent}
              aria-valuetext={VOICE.replace("%p", String(percent))}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onKeyDown={onKeyDown}
            >
              <span className={styles.thumb} style={{ left: `${pad / 0.2 * 100}%` }}></span>
            </span>
          </span>
        </div>
      </div>
    </main>
  );
}
