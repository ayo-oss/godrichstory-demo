// ImageFlip — vanilla 판(run/295/demo/05-image-edit-flip-mirror/index.html) 의 React 포트.
// 실제 뒤집기는 canvas 2D 가 한다 — 축을 음수로 세우면 그림이 화면 밖으로 나가므로 translate 로
// 그만큼 먼저 밀어 놓고 scale 을 음수로 준다. 원본 그림은 화면에 없는 보조 canvas 에 한 번만 그려
// 두고(src), 뒤집을 때마다 그것을 다시 drawImage 한다. 값·수치·키프레임은 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ImageFlip.module.scss";

export type ImageFlipProps = {
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

const VIEW_LABEL = "미리보기, 가로 %x 세로 %y";
const ON = "뒤집음";
const OFF = "그대로";

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

export default function ImageFlip({
  duration = 2000,
  easing = "ease-out",
  color = "#fff7e6",
}: ImageFlipProps) {
  const viewRef = useRef<HTMLCanvasElement | null>(null);
  const srcRef = useRef<HTMLCanvasElement | null>(null);
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
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
    const view = viewRef.current;
    const src = srcRef.current;
    if (!view || !src) return;
    const ctx = view.getContext("2d");
    if (!ctx) return;
    const w = view.width, h = view.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    // 축을 음수로 뒤집으면 그림이 화면 밖으로 나가므로 그만큼 먼저 밀어 놓는다
    ctx.translate(flipX ? w : 0, flipY ? h : 0);
    ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    ctx.drawImage(src, 0, 0, w, h);
  }, [flipX, flipY, photo]);

  function onFlipX(): void {
    setFlipX(!flipX);
    setDemo(false);
  }

  function onFlipY(): void {
    setFlipY(!flipY);
    setDemo(false);
  }

  const code = `scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`;
  const label = VIEW_LABEL.replace("%x", flipX ? ON : OFF).replace("%y", flipY ? ON : OFF);
  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div className={styles.frame}>
          <canvas className={styles.view} ref={viewRef} width={320} height={200} role="img" aria-label={label}></canvas>
          <span className={styles.ghost} aria-hidden="true"></span>
          <span className={styles.axis} aria-hidden="true"></span>
          <span className={styles.sweep} aria-hidden="true"></span>
        </div>
        <div className={styles.foot}>
          <button type="button" className={`${styles.btn} ${styles.btnX}`} aria-pressed={flipX} onClick={onFlipX}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className={styles.ico} aria-hidden="true"><g fill="currentColor"><path d="M112 40v160a8 8 0 0 1-8 8H40a8 8 0 0 1-7.37-11.12l64-160C100 28.86 112 31.29 112 40" opacity=".2"/><path d="M107.18 24.33a15.86 15.86 0 0 0-17.92 9.45l-.06.14l-64 159.93A16 16 0 0 0 40 216h64a16 16 0 0 0 16-16V40a15.85 15.85 0 0 0-12.82-15.67M104 200H40l.06-.15L104 40Zm126.77-6.15l-64-159.93l-.06-.14A16 16 0 0 0 136 40v160a16 16 0 0 0 16 16h64a16 16 0 0 0 14.78-22.15ZM152 200V40l63.93 159.84l.06.15Z"/></g></svg><span>좌우 뒤집기</span></button>
          <button type="button" className={`${styles.btn} ${styles.btnY}`} aria-pressed={flipY} onClick={onFlipY}><span>상하 뒤집기</span></button>
          <span className={styles.codes}>
            <code className={styles.real}>{code}</code>
            <code className={`${styles.demoCode} ${styles.demoCodeA}`} aria-hidden="true">scale(1, 1)</code>
            <code className={`${styles.demoCode} ${styles.demoCodeB}`} aria-hidden="true">scale(-1, 1)</code>
            <code className={`${styles.demoCode} ${styles.demoCodeC}`} aria-hidden="true">scale(-1, -1)</code>
            <code className={`${styles.demoCode} ${styles.demoCodeD}`} aria-hidden="true">scale(1, -1)</code>
          </span>
        </div>
      </div>
    </main>
  );
}
