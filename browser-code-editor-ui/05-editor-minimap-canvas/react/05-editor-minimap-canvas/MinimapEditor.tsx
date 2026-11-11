// MinimapEditor — vanilla 판(run/299/demo/05-editor-minimap-canvas/index.html) 의 React 포트.
// 오른쪽 좁은 canvas 가 줄 길이를 픽셀 띠(fillRect)로 그려 문서 전체 모양을 보여 준다.
// 캔버스는 마운트 때 한 번만 그린다 (매 프레임 다시 그리는 연출은 CSS 시계로 뽑는 측정에 안 잡힌다).
// 상자 드래그와 본문 스크롤은 Pointer Events + scroll 로 양방향으로 이어진다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MinimapEditor.module.scss";

export type MinimapEditorProps = {
  duration?: number;
  easing?: string;
  color?: string;
  lines?: string[];
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef<T> 는 T | null 을 돌려준다 — ambient 타입에 맞춰 상자 타입을 따로 둔다
type Box<T> = { current: T | null };
// ambient 에 React 이벤트 제네릭이 없다 — 쓰는 속성만 적은 로컬 타입을 파일 안에 둔다
type PtrEvt = { clientY: number; pointerId: number; preventDefault(): void };

const FILE_NAME = "main.scss";
const MAP_LABEL = "미니맵 — 끌어서 문서 위치를 바꿉니다";
const NOTE = "상자를 끌면 본문이 그 자리로 스크롤됩니다";
// 문구 템플릿은 화면 글자와 같은 근원에서 읽는다 — 언어팩이 값을 바꿔도 조립 규칙이 함께 바뀐다
const TPL_VIEW = "{p}번째 줄 보는 중";
const TPL_LINES = "{n}줄";
// 미리보기에 겹쳐 두는 두 문장. 아래 문장에는 줄 번호를 쓰지 않는다 —
// 트랙은 이징으로 연속 이동하는데 문장은 컷이라 어느 시점을 골라도 숫자와 화면이 어긋난다
const PREVIEW_TOP = "1번째 줄 보는 중";
const PREVIEW_MID = "상자와 본문이 같이 움직입니다";

// 문서 30줄 — 미니맵 띠와 본문이 같은 배열에서 나온다
const LINES = [
  "// layout tokens",
  "$grid: 4px;",
  "$radius: 12px;",
  "",
  ".panel {",
  "  display: grid;",
  "  grid-template-columns:",
  "      1fr 1fr 1fr;",
  "  gap: $grid * 2;",
  "  padding: $grid * 3;",
  "  border-radius: $radius;",
  "}",
  "",
  ".panel__title {",
  "  font-weight: 700;",
  "  font-size: 15px;",
  "  line-height: 20px;",
  "}",
  "",
  "// motion",
  ".panel__item {",
  "  transition: transform",
  "      220ms ease;",
  "  transform: translateY(0);",
  "}",
  ".panel__item:hover {",
  "  transform: translateY(-4px);",
  "}",
  "",
  "// end of file",
];

export default function MinimapEditor(props: MinimapEditorProps) {
  const duration = props.duration ?? 220;
  const easing = props.easing ?? "cubic-bezier(.2, .8, .2, 1)";
  const color = props.color ?? "#ffd23f";
  const lines = props.lines ?? LINES;
  const [preview, setPreview] = useState<boolean>(true);
  const [viewLine, setViewLine] = useState<number>(1);
  const rootRef = useRef<HTMLDivElement>(null) as Box<HTMLDivElement>;
  const viewRef = useRef<HTMLDivElement>(null) as Box<HTMLDivElement>;
  const trackRef = useRef<HTMLPreElement>(null) as Box<HTMLPreElement>;
  const mapRef = useRef<HTMLDivElement>(null) as Box<HTMLDivElement>;
  const boxRef = useRef<HTMLSpanElement>(null) as Box<HTMLSpanElement>;
  const cvRef = useRef<HTMLCanvasElement>(null) as Box<HTMLCanvasElement>;
  const dragging = useRef<boolean>(false) as Box<boolean>;
  // 미리보기 여부를 이벤트 안에서도 읽어야 한다 — resize·scroll 리스너가 낡은 값을 보지 않게 상자로 둔다
  const previewRef = useRef<boolean>(true) as Box<boolean>;

  const stopPreview = () => {
    previewRef.current = false;
    setPreview(false);
  };

  // devicePixelRatio 를 곱해 물리 픽셀에 맞춰 그려야 흐려지지 않는다
  const drawMap = () => {
    const cv = cvRef.current;
    const map = mapRef.current;
    if (!cv || !map) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = map.clientWidth;
    const h = map.clientHeight;
    cv.width = Math.max(1, Math.round(w * dpr));
    cv.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    let maxLen = 1;
    lines.forEach((ln) => {
      maxLen = Math.max(maxLen, ln.trim().length);
    });
    const pitch = h / lines.length;
    const barH = Math.max(1.5, pitch - 1.5);
    lines.forEach((ln, i) => {
      const bw = Math.max(2, (ln.trim().length / maxLen) * (w - 6));
      ctx.fillStyle = ln.indexOf("//") === 0 ? "rgba(190,183,173,.40)" : "rgba(255,247,230,.78)";
      ctx.fillRect(3, i * pitch, bw, barH);
    });
  };

  const lineHeightPx = () => {
    const track = trackRef.current;
    if (!track) return 20;
    return parseFloat(getComputedStyle(track).lineHeight) || 20;
  };

  // 본문을 스크롤하면 상자가 따라온다 — 상자 위치는 scrollHeight 대비 비율로 계산한다
  const placeBox = () => {
    // 미리보기 루프 중에는 상태 칸을 건드리지 않는다 — 겹쳐 둔 두 문장을 덮어쓰지 않게
    if (previewRef.current) return;
    const view = viewRef.current;
    const map = mapRef.current;
    const box = boxRef.current;
    if (!view || !map || !box) return;
    const total = view.scrollHeight;
    const shown = view.clientHeight;
    const ratio = total > shown ? view.scrollTop / (total - shown) : 0;
    box.style.height = Math.max(16, (shown / total) * map.clientHeight) + "px";
    const travel = Math.max(0, map.clientHeight - box.offsetHeight);
    box.style.transform = "translateY(" + (ratio * travel).toFixed(1) + "px)";
    setViewLine(Math.min(lines.length, Math.round(view.scrollTop / lineHeightPx()) + 1));
  };

  // 미리보기 루프의 이동거리도 실제 스크롤 범위에서 계산해 상자와 본문이 같은 비율로 움직이게 한다
  const tuneLoop = () => {
    const root = rootRef.current;
    const view = viewRef.current;
    const map = mapRef.current;
    const box = boxRef.current;
    if (!root || !view || !map || !box) return;
    const span = (view.scrollHeight - view.clientHeight) * 0.45;
    const travel = Math.max(0, map.clientHeight - box.offsetHeight);
    root.style.setProperty("--mm-track-y", (-span).toFixed(0) + "px");
    root.style.setProperty(
      "--mm-thumb-y",
      ((Math.abs(span) / Math.max(1, view.scrollHeight - view.clientHeight)) * travel).toFixed(0) + "px",
    );
  };

  useEffect(() => {
    drawMap();
    placeBox();
    tuneLoop();
    const onResize = () => {
      drawMap();
      placeBox();
      tuneLoop();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // 상자를 끌면 본문이 그 자리로 스크롤된다
  const jumpTo = (ev: PtrEvt) => {
    const map = mapRef.current;
    const view = viewRef.current;
    const box = boxRef.current;
    if (!map || !view || !box) return;
    const r = map.getBoundingClientRect();
    const bh = box.offsetHeight;
    const y = ev.clientY - r.top - bh / 2;
    const k = Math.max(0, Math.min(1, y / Math.max(1, r.height - bh)));
    view.scrollTop = k * (view.scrollHeight - view.clientHeight); // scroll 이벤트가 placeBox 를 부른다
  };

  const onMapDown = (ev: PtrEvt) => {
    stopPreview();
    dragging.current = true;
    const map = mapRef.current;
    if (map) map.setPointerCapture(ev.pointerId);
    jumpTo(ev);
    ev.preventDefault();
  };

  const endDrag = (ev: PtrEvt) => {
    dragging.current = false;
    const map = mapRef.current;
    if (!map) return;
    try {
      map.releasePointerCapture(ev.pointerId);
    } catch (err) {
      /* 이미 풀린 포인터 */
    }
  };

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };

  return (
    <main className={styles.stage}>
      <div className={styles.root + (preview ? " " + styles.isDemo : "")} style={vars} ref={rootRef}>
        <div className={styles.bar}>
          <span className={styles.ico} aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256">
              <g fill="currentColor">
                <path d="m240 128l-48 40H64l-48-40l48-40h128Z" opacity=".2" />
                <path d="M69.12 94.15L28.5 128l40.62 33.85a8 8 0 1 1-10.24 12.29l-48-40a8 8 0 0 1 0-12.29l48-40a8 8 0 0 1 10.24 12.3m176 27.7l-48-40a8 8 0 1 0-10.24 12.3L227.5 128l-40.62 33.85a8 8 0 1 0 10.24 12.29l48-40a8 8 0 0 0 0-12.29m-82.39-89.37a8 8 0 0 0-10.25 4.79l-64 176a8 8 0 0 0 4.79 10.26A8.1 8.1 0 0 0 96 224a8 8 0 0 0 7.52-5.27l64-176a8 8 0 0 0-4.79-10.25" />
              </g>
            </svg>
          </span>
          <span className={styles.name}>{FILE_NAME}</span>
          <span className={styles.status}>
            {preview ? (
              <>
                <span className={styles.stTop}>{PREVIEW_TOP}</span>
                <span className={styles.stMid}>{PREVIEW_MID}</span>
              </>
            ) : (
              TPL_VIEW.replace("{p}", String(viewLine))
            )}
          </span>
          <span className={styles.count}>{TPL_LINES.replace("{n}", String(lines.length))}</span>
        </div>
        <div className={styles.body}>
          <div
            className={styles.view}
            ref={viewRef}
            tabIndex={0}
            onScroll={() => {
              stopPreview();
              placeBox();
            }}
            onWheel={stopPreview}
            onFocus={stopPreview}
          >
            <pre className={styles.track} ref={trackRef}>
              {lines.map((ln, i) => (
                <span
                  key={i}
                  className={
                    styles.ln +
                    (ln.indexOf("//") === 0
                      ? " " + styles.lnDim
                      : ln.trim().charAt(0) === "$"
                        ? " " + styles.lnTok
                        : "")
                  }
                >
                  {ln}
                </span>
              ))}
            </pre>
          </div>
          <div
            className={styles.map}
            ref={mapRef}
            aria-label={MAP_LABEL}
            onPointerDown={onMapDown}
            onPointerMove={(ev: PtrEvt) => {
              if (dragging.current) jumpTo(ev);
            }}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <canvas className={styles.cv} ref={cvRef} />
            <span className={styles.box} ref={boxRef} />
          </div>
        </div>
        <p className={styles.note}>{NOTE}</p>
      </div>
    </main>
  );
}
