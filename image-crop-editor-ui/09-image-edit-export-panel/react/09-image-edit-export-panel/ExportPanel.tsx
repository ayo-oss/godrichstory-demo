// ExportPanel — vanilla 판(run/295/demo/09-image-edit-export-panel/index.html) 의 React 포트.
// 용량은 짐작하지 않는다 — canvas 2D 의 toBlob 이 실제로 만든 파일 길이를 KB 로 읽는다(내려받지는 않는다).
// 격자 미리보기(.isDemo)는 형식 테두리를 밀고 용량 칸 넷을 steps(1, end) 로 갈아 끼운다.
// 값·수치는 vanilla 와 같다.
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./ExportPanel.module.scss";

export type ExportPanelProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Format = { mime: string; name: string };
// ambient 타입에 KeyboardEvent 가 없다 — 화살표 조작에 쓰는 것만 지역 타입으로 선언한다
type KeyEvt = { key: string; shiftKey: boolean; preventDefault(): void };

const FORMATS: Format[] = [
  { mime: "image/jpeg", name: "JPG" },
  { mime: "image/png", name: "PNG" },
  { mime: "image/webp", name: "WEBP" },
];
const EMPTY = "— KB";

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

export default function ExportPanel({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#17141a",
}: ExportPanelProps) {
  const viewRef = useRef<HTMLCanvasElement | null>(null);
  const trackRef = useRef<HTMLSpanElement | null>(null);
  const [demo, setDemo] = useState(true);
  const [picked, setPicked] = useState(0);
  const [quality, setQuality] = useState(0.8);
  const [sizeText, setSizeText] = useState(EMPTY);
  const [done, setDone] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const vctx = view.getContext("2d");
    if (vctx) paintPhoto(vctx, view.width, view.height);
  }, []);

  // 용량은 짐작하지 않는다 — 실제로 파일을 만들어 보고 그 길이를 읽는다.
  // PNG 는 무손실이라 quality 인자를 아예 무시한다. 이 사진 320x200 기준 실측:
  // JPG 0.8 은 5.8 KB, PNG 는 12.4 KB, WEBP 0.8 은 3.3 KB, WEBP 0.5 는 2.4 KB
  const estimate = useCallback((finish: boolean) => {
    const view = viewRef.current;
    if (!view) return;
    // 고른 형식을 브라우저가 모르면 규격상 조용히 PNG 가 나온다 — image/webp 는 Safari 에 아직 없다
    // (caniuse 81.11%). blob.type 을 견줘 다르면 실제로 나온 형식을 같이 적는다
    view.toBlob(
      (blob: Blob | null) => {
        const mime = FORMATS[picked].mime;
        setSizeText(blob
          ? (blob.size / 1024).toFixed(1) + " KB" + (blob.type === mime ? "" : " · " + blob.type)
          : EMPTY);
        if (finish) setDone(true);
      },
      FORMATS[picked].mime,
      quality
    );
  }, [picked, quality]);

  useEffect(() => {
    estimate(false);
  }, [estimate]);

  function onFormat(index: number): void {
    setPicked(index);
    setDemo(false);
    setDone(false);
  }

  const applyQuality = useCallback((next: number) => {
    setQuality(Math.max(0.3, Math.min(1, Math.round(next * 100) / 100)));
    setDemo(false);
    setDone(false);
  }, []);

  function fromPointer(event: ReactPointerEvent<HTMLSpanElement>): void {
    const track = trackRef.current;
    if (!track) return;
    const r = track.getBoundingClientRect();
    applyQuality(((event.clientX - r.left) / r.width) * 0.7 + 0.3);
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

  // 화살표 0.05, Shift 와 함께면 0.2
  function onTrackKey(event: KeyEvt): void {
    const step = event.shiftKey ? 0.2 : 0.05;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      applyQuality(quality - step);
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      applyQuality(quality + step);
    }
  }

  // 데모에서는 내려받기 대신 만들어진 파일의 길이만 보여준다
  function onExport(): void {
    setDemo(false);
    estimate(true);
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div className={styles.frame}>
          <canvas className={styles.view} ref={viewRef} width={320} height={200} role="img" aria-label="내보낼 사진"></canvas>
        </div>
        <div className={styles.panel}>
          <div className={styles.fmts}>
            <span className={styles.ring} aria-hidden="true" style={{ transform: `translateX(${picked * 100}%)` }}></span>
            {FORMATS.map((format, index) => (
              <button
                key={format.mime}
                type="button"
                className={styles.fmt}
                aria-pressed={index === picked}
                onClick={() => onFormat(index)}
              >
                {format.name}
              </button>
            ))}
          </div>
          <div className={styles.q}>
            <span className={styles.lab} id="qLab">품질</span>
            <span
              className={styles.track}
              ref={trackRef}
              role="slider"
              tabIndex={0}
              aria-labelledby="qLab"
              aria-valuemin={0.3}
              aria-valuemax={1}
              aria-valuenow={quality.toFixed(2)}
              aria-valuetext={quality.toFixed(2)}
              aria-disabled={FORMATS[picked].mime === "image/png"}
              onPointerDown={onTrackDown}
              onPointerMove={onTrackMove}
              onKeyDown={onTrackKey}
            >
              <span className={styles.thumb} style={{ left: `${((quality - 0.3) / 0.7) * 100}%` }}></span>
            </span>
          </div>
          <p className={styles.size}>
            <span className={styles.lab}>예상 용량</span>
            <span className={styles.num}>
              <span className={styles.real}>{sizeText}</span>
              <span className={`${styles.demo} ${styles.demoA}`} aria-hidden="true">5.8 KB</span>
              <span className={`${styles.demo} ${styles.demoB}`} aria-hidden="true">12.4 KB</span>
              <span className={`${styles.demo} ${styles.demoC}`} aria-hidden="true">3.3 KB</span>
              <span className={`${styles.demo} ${styles.demoD}`} aria-hidden="true">2.4 KB</span>
            </span>
          </p>
          <button type="button" className={styles.go} onClick={onExport}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className={styles.ico} aria-hidden="true"><g fill="currentColor"><path d="M216 48v160H40V48a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" opacity=".2"/><path d="M224 144v64a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8v-64a8 8 0 0 1 16 0v56h160v-56a8 8 0 0 1 16 0m-101.66 5.66a8 8 0 0 0 11.32 0l40-40a8 8 0 0 0-11.32-11.32L136 124.69V32a8 8 0 0 0-16 0v92.69L93.66 98.34a8 8 0 0 0-11.32 11.32Z"/></g></svg>
            <span>내보내기</span>
          </button>
          <p className={styles.done} hidden={!done}>파일 준비 완료</p>
        </div>
      </div>
    </main>
  );
}
