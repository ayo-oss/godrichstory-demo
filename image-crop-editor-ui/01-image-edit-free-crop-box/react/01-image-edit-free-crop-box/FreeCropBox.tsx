// FreeCropBox — vanilla 판(run/295/demo/01-image-edit-free-crop-box/index.html) 의 React 포트.
// 크롭 틀은 퍼센트로만 들고 있다가(x·y·w·h), 자를 때 원본 픽셀로 환산해 drawImage 아홉 인자에 넘긴다.
// 손잡이는 포인터(setPointerCapture)와 키보드(화살표 1px · Shift 10px) 둘 다로 끌 수 있다. 값·수치는 vanilla 와 같다.
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./FreeCropBox.module.scss";

export type FreeCropBoxProps = {
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
type Rect = { x: number; y: number; w: number; h: number };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// 끌기 한 번의 상태 — 방향(빈 문자열이면 틀 전체 이동)과 직전 포인터 자리, 픽셀→퍼센트 환산 비율
type Drag = { dir: string; px: number; py: number; ux: number; uy: number };
// ambient 타입에는 KeyboardEvent 가 없다 — 키 핸들러가 실제로 쓰는 것만 지역 타입으로 적는다
type KeyEvt = { key: string; shiftKey: boolean; preventDefault(): void };

const SIZE_LABEL = "%w × %h";
const OUT_LABEL = "잘라낸 범위 %w × %h 픽셀";
const PHOTO_W = 300;
const PHOTO_H = 200;

const HANDLES: { dir: string; cls: string; label: string }[] = [
  { dir: "nw", cls: "handleNw", label: "왼쪽 위 손잡이" },
  { dir: "n", cls: "handleN", label: "위쪽 손잡이" },
  { dir: "ne", cls: "handleNe", label: "오른쪽 위 손잡이" },
  { dir: "w", cls: "handleW", label: "왼쪽 손잡이" },
  { dir: "e", cls: "handleE", label: "오른쪽 손잡이" },
  { dir: "sw", cls: "handleSw", label: "왼쪽 아래 손잡이" },
  { dir: "s", cls: "handleS", label: "아래쪽 손잡이" },
  { dir: "se", cls: "handleSe", label: "오른쪽 아래 손잡이" },
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

function clampBox(box: Rect): void {
  box.w = Math.max(18, Math.min(100, box.w)); box.h = Math.max(18, Math.min(100, box.h));
  box.x = Math.max(0, Math.min(100 - box.w, box.x)); box.y = Math.max(0, Math.min(100 - box.h, box.y));
}

// 바깥을 어둡게 덮는 그늘. 겉 사각형을 한 바퀴 돌고 안쪽 구멍을 거꾸로 도는 열 점짜리 다각형이다
function shadeOf(box: Rect): string {
  const x = box.x, y = box.y, w = box.w, h = box.h;
  return "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, " +
    x + "% " + y + "%, " + x + "% " + (y + h) + "%, " + (x + w) + "% " + (y + h) + "%, " +
    (x + w) + "% " + y + "%, " + x + "% " + y + "%)";
}

export default function FreeCropBox({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: FreeCropBoxProps) {
  const workRef = useRef<HTMLDivElement | null>(null);
  const photoRef = useRef<HTMLCanvasElement | null>(null);
  const outRef = useRef<HTMLCanvasElement | null>(null);
  const rectRef = useRef<Rect>({ x: 18, y: 16, w: 54, h: 56 }) as Box<Rect>;
  const dragRef = useRef<Drag | null>(null);
  const [box, setBox] = useState<Rect>({ x: 18, y: 16, w: 54, h: 56 });
  const [demo, setDemo] = useState(true);
  const [photo, setPhoto] = useState("");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  if (photo) vars["--photo"] = `url(${photo})`;

  // 결과 칸은 잘린 크기 그대로 만든다 — 고정 정사각에 그리면 비율이 눌린다
  const pw = Math.round(PHOTO_W * box.w / 100);
  const ph = Math.round(PHOTO_H * box.h / 100);

  const commit = useCallback(() => {
    clampBox(rectRef.current);
    setBox({ x: rectRef.current.x, y: rectRef.current.y, w: rectRef.current.w, h: rectRef.current.h });
  }, []);

  useEffect(() => {
    const canvas = photoRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    paintPhoto(ctx, canvas.width, canvas.height);
    setPhoto(canvas.toDataURL());
  }, []);

  // 실제 자르기 — 원본에서 오려낼 사각형과 그려 넣을 사각형을 따로 주는 아홉 인자 drawImage
  useEffect(() => {
    const source = photoRef.current;
    const out = outRef.current;
    if (!source || !out) return;
    const octx = out.getContext("2d");
    if (!octx) return;
    const sx = source.width * box.x / 100, sy = source.height * box.y / 100;
    const sw = source.width * box.w / 100, sh = source.height * box.h / 100;
    out.width = Math.round(sw); out.height = Math.round(sh);
    octx.drawImage(source, sx, sy, sw, sh, 0, 0, out.width, out.height);
  }, [box, photo]);

  function unit(): { x: number; y: number } {
    const work = workRef.current;
    if (!work) return { x: 0, y: 0 };
    const r = work.getBoundingClientRect();
    return { x: 100 / r.width, y: 100 / r.height };
  }

  function nudge(dir: string, dx: number, dy: number): void {
    const rect = rectRef.current;
    if (dir.indexOf("w") > -1) { rect.x += dx; rect.w -= dx; }
    if (dir.indexOf("e") > -1) { rect.w += dx; }
    if (dir.indexOf("n") > -1) { rect.y += dy; rect.h -= dy; }
    if (dir.indexOf("s") > -1) { rect.h += dy; }
    commit();
  }

  function startDrag(event: ReactPointerEvent<HTMLElement>, dir: string): void {
    setDemo(false);
    const u = unit();
    dragRef.current = { dir: dir, px: event.clientX, py: event.clientY, ux: u.x, uy: u.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onMove(event: ReactPointerEvent<HTMLElement>): void {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (event.clientX - drag.px) * drag.ux, dy = (event.clientY - drag.py) * drag.uy;
    drag.px = event.clientX; drag.py = event.clientY;
    if (drag.dir) {
      nudge(drag.dir, dx, dy);
    } else {
      rectRef.current.x += dx; rectRef.current.y += dy; commit();
    }
  }

  function onStop(): void {
    dragRef.current = null;
  }

  function onBoxDown(event: ReactPointerEvent<HTMLDivElement>): void {
    if (event.target !== event.currentTarget) return;
    startDrag(event, "");
  }

  function onHandleDown(event: ReactPointerEvent<HTMLButtonElement>, dir: string): void {
    event.stopPropagation();
    startDrag(event, dir);
  }

  // 화살표 1px, Shift 와 함께면 10px — 손이 아니라 키보드로도 같은 조작이 된다
  function onHandleKey(event: KeyEvt, dir: string): void {
    const step = event.shiftKey ? 10 : 1, u = unit();
    let dx = 0, dy = 0;
    if (event.key === "ArrowLeft") { dx = -step * u.x; } else if (event.key === "ArrowRight") { dx = step * u.x; }
    else if (event.key === "ArrowUp") { dy = -step * u.y; } else if (event.key === "ArrowDown") { dy = step * u.y; }
    else { return; }
    event.preventDefault(); setDemo(false); nudge(dir, dx, dy);
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div className={styles.work} ref={workRef}>
          <canvas className={styles.photo} ref={photoRef} width={PHOTO_W} height={PHOTO_H} role="img" aria-label="샘플 사진"></canvas>
          <div className={styles.shade} style={{ clipPath: shadeOf(box) }} aria-hidden="true"></div>
          <div
            className={styles.box}
            style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }}
            onPointerDown={onBoxDown}
            onPointerMove={onMove}
            onPointerUp={onStop}
          >
            <span className={styles.grid} aria-hidden="true"></span>
            {HANDLES.map((handle) => (
              <button
                key={handle.dir}
                type="button"
                className={`${styles.handle} ${styles[handle.cls]}`}
                aria-label={handle.label}
                onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => onHandleDown(event, handle.dir)}
                onPointerMove={onMove}
                onPointerUp={onStop}
                onKeyDown={(event: KeyEvt) => onHandleKey(event, handle.dir)}
              ></button>
            ))}
          </div>
        </div>
        <div className={styles.side}>
          <p className={styles.cap}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className={styles.ico} aria-hidden="true"><g fill="currentColor"><path d="M192 64v128H64V64Z" opacity=".2"/><path d="M240 192a8 8 0 0 1-8 8h-32v32a8 8 0 0 1-16 0v-32H64a8 8 0 0 1-8-8V72H24a8 8 0 0 1 0-16h32V24a8 8 0 0 1 16 0v160h160a8 8 0 0 1 8 8M96 72h88v88a8 8 0 0 0 16 0V64a8 8 0 0 0-8-8H96a8 8 0 0 0 0 16"/></g></svg>
            <span>결과 칸</span>
          </p>
          <div className={styles.frame}>
            <canvas className={styles.out} ref={outRef} width={120} height={120} role="img" aria-label={OUT_LABEL.replace("%w", String(pw)).replace("%h", String(ph))}></canvas>
            <span className={styles.ghost} aria-hidden="true"></span>
          </div>
          <p className={styles.size}>{SIZE_LABEL.replace("%w", String(pw)).replace("%h", String(ph))}</p>
        </div>
      </div>
    </main>
  );
}
