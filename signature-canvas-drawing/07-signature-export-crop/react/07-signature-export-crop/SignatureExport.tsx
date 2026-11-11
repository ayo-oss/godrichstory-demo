// SignatureExport — vanilla 판(run/287/demo/07-signature-export-crop/index.html) 의 React 포트.
// getImageData 로 알파 채널을 훑어 잉크의 바운딩 박스를 구하고, 그 크기의 보조 canvas 에 drawImage 로
// 잘라 담은 뒤 toDataURL('image/png') 을 미리보기 <img> 에 넣는다. 배경을 칠하지 않으니 알파가
// 그대로 남아 투명 배경 PNG 가 된다. 값·수치·키프레임은 vanilla 와 같다.
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./SignatureExport.module.scss";

export type SignatureExportProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Point = [number, number];
// useRef 는 T | null 을 돌려주므로, 초기값이 있는 상자는 이 타입으로 좁혀 쓴다
type Box<T> = { current: T };

const TRIM_LABEL = "여백 가로 %wpx · 세로 %hpx 를 잘라낸 미리보기입니다";
const EMPTY_LABEL = "서명이 비어 있어 잘라낼 것이 없습니다";
const READY_LABEL = "내보내기를 누르면 바깥 여백을 잘라냅니다";
// 마운트 때 깔아 두는 예시 서명 — 200×100 칸 기준 좌표. 판 크기에 맞춰 늘려 그린다
const SAMPLE: Point[][] = [
  [[30, 56], [36, 36], [46, 26], [54, 36], [50, 52], [44, 60], [52, 58], [66, 46], [78, 32], [86, 28], [90, 40], [96, 52], [104, 54]],
  [[112, 50], [122, 34], [132, 26], [140, 32], [136, 46], [144, 48], [156, 38], [164, 28]],
  [[36, 70], [70, 74], [110, 76], [150, 72], [172, 64]],
];

function drawPoints(ctx: CanvasRenderingContext2D, pts: Point[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    // 두 점의 중점을 제어점으로 삼아 꺾임을 둥글게 잇는다
    ctx.quadraticCurveTo(pts[i - 1][0], pts[i - 1][1], (pts[i][0] + pts[i - 1][0]) / 2, (pts[i][1] + pts[i - 1][1]) / 2);
  }
  ctx.stroke();
}

export default function SignatureExport({
  duration = 2000,
  easing = "ease-out",
  color = "#17141a",
}: SignatureExportProps) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const inkRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Point[][]>([]) as Box<Point[][]>;
  const currentRef = useRef<Point[] | null>(null);
  const [demo, setDemo] = useState(true);
  const [src, setSrc] = useState("");
  const [cropInset, setCropInset] = useState("");
  const [message, setMessage] = useState(READY_LABEL);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const repaint = useCallback(() => {
    const pad = padRef.current;
    const canvas = inkRef.current;
    if (!pad || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const r = pad.getBoundingClientRect();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 4;
    ctx.strokeStyle = color;
    for (const pts of SAMPLE) {
      const scaled: Point[] = pts.map((p) => [p[0] * r.width / 200, p[1] * r.height / 100]);
      drawPoints(ctx, scaled);
    }
    for (const pts of strokesRef.current) drawPoints(ctx, pts);
  }, [color]);

  // 고DPI 대응 — 배킹 스토어를 devicePixelRatio 배로 키우고 좌표계는 CSS 픽셀 그대로 쓴다
  const resize = useCallback(() => {
    const pad = padRef.current;
    const canvas = inkRef.current;
    if (!pad || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const r = pad.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    repaint();
  }, [repaint]);

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  useEffect(() => {
    function onUp(): void {
      currentRef.current = null;
    }
    window.addEventListener("pointerup", onUp);
    return () => window.removeEventListener("pointerup", onUp);
  }, []);

  function exportCrop(): void {
    setDemo(false);
    const canvas = inkRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = pixels.data;
    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        // 배경을 칠하지 않았으므로 잉크가 없는 자리는 알파가 0 이다 — 알파 채널만 훑으면 바운딩 박스가 나온다
        if (data[(y * canvas.width + x) * 4 + 3] > 8) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) {
      setMessage(EMPTY_LABEL);
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    const edge = Math.round(6 * dpr);
    minX = Math.max(0, minX - edge);
    minY = Math.max(0, minY - edge);
    maxX = Math.min(canvas.width - 1, maxX + edge);
    maxY = Math.min(canvas.height - 1, maxY + edge);
    const sw = maxX - minX + 1;
    const sh = maxY - minY + 1;
    // 잰 바운딩 박스를 퍼센트로 바꿔 크롭 테두리를 그 자리로 조인다 — 무엇이 잘렸는지 눈에 보인다
    setCropInset(
      `${(minY / canvas.height * 100).toFixed(1)}% ${((canvas.width - maxX - 1) / canvas.width * 100).toFixed(1)}% ` +
      `${((canvas.height - maxY - 1) / canvas.height * 100).toFixed(1)}% ${(minX / canvas.width * 100).toFixed(1)}%`
    );
    const cropped = document.createElement("canvas");
    cropped.width = sw;
    cropped.height = sh;
    const cropCtx = cropped.getContext("2d");
    if (!cropCtx) return;
    // 배경을 칠하지 않고 잘린 자리만 옮기므로 알파가 그대로 남는다 — 투명 배경 PNG 가 된다
    cropCtx.drawImage(canvas, minX, minY, sw, sh, 0, 0, sw, sh);
    // 데모는 iframe 안에서 도니 <a download> 는 동작하지 않는다. 결과는 미리보기 <img> 까지만 보여 준다
    setSrc(cropped.toDataURL("image/png"));
    setMessage(
      TRIM_LABEL
        .replace("%w", String(Math.round((canvas.width - sw) / dpr)))
        .replace("%h", String(Math.round((canvas.height - sh) / dpr)))
    );
  }

  function toLocal(event: ReactPointerEvent<HTMLDivElement>): Point | null {
    const canvas = inkRef.current;
    if (!canvas) return null;
    const r = canvas.getBoundingClientRect();
    return [event.clientX - r.left, event.clientY - r.top];
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    setDemo(false);
    setCropInset("");
    const point = toLocal(event);
    const pad = padRef.current;
    if (!point || !pad) return;
    currentRef.current = [point];
    strokesRef.current.push(currentRef.current);
    pad.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    const current = currentRef.current;
    if (!current) return;
    const point = toLocal(event);
    if (!point) return;
    current.push(point);
    repaint();
  }

  const cls = [styles.root, demo ? styles.isDemo : "", src ? styles.hasOut : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div className={styles.card}>
          <div className={styles.bar}>
            <p className={styles.label}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M67.41,142.56C35.71,129.52,45.41,32.07,78,32,111.82,32.05,92,90.26,67.41,142.56Z" opacity="0.2"/><path d="M232,168H63.86c2.66-5.24,5.33-10.63,8-16.11,14.94,1.65,32.58-8.78,52.66-31.14,5,13.46,14.45,30.93,30.58,31.25,9.09.18,18.11-5.2,27.42-16.37C189.31,143.75,203.3,152,232,152a8,8,0,0,0,0-16c-30.43,0-39.43-10.45-40-16.11a7.67,7.67,0,0,0-5.46-7.75,8.14,8.14,0,0,0-9.25,3.49C165.23,134.17,158,136.06,155.38,136c-8.26-.16-16.66-19.52-19.54-33.42a8,8,0,0,0-14.09-3.37C101.54,124.55,88,133.08,79.57,135.29,88.06,116.42,94.4,99.85,98.46,85.9c6.82-23.44,7.32-39.83,1.51-50.1-3-5.38-9.34-11.8-22.06-11.8C61.85,24,49.18,39.18,43.14,65.65c-3.59,15.71-4.18,33.21-1.62,48s7.87,25.55,15.59,31.94c-3.73,7.72-7.53,15.26-11.23,22.41H24a8,8,0,0,0,0,16H37.41c-11.32,21-20.12,35.64-20.26,35.88a8,8,0,1,0,13.71,8.24c.15-.26,11.27-18.79,24.7-44.12H232a8,8,0,0,0,0-16ZM58.74,69.21C62.72,51.74,70.43,40,77.91,40c5.33,0,7.1,1.86,8.13,3.67,3,5.33,6.52,24.19-21.66,86.39C56.12,118.78,53.31,93,58.74,69.21Z"/></svg>
              <span>서명 내보내기</span>
            </p>
            <button type="button" className={styles.btn} onClick={exportCrop}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M216,48V208H40V48A16,16,0,0,1,56,32H200A16,16,0,0,1,216,48Z" opacity="0.2"/><path d="M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,124.69V32a8,8,0,0,0-16,0v92.69L93.66,98.34a8,8,0,0,0-11.32,11.32Z"/></svg>
              <span>PNG 로 내보내기</span>
            </button>
          </div>
          <div className={styles.body}>
            <div className={styles.pad} ref={padRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove}>
              <canvas className={styles.ink} ref={inkRef} role="img" aria-label="서명 칸"></canvas>
              {/* 미리보기용 서명 — canvas 에 그려지는 SAMPLE 과 같은 좌표를 중점 2차 곡선으로 옮긴 것 */}
              <svg className={styles.ghost} viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden="true">
                <path className={styles.stroke} d="M30,56 Q30,56 33,46 Q36,36 41,31 Q46,26 50,31 Q54,36 52,44 Q50,52 47,56 Q44,60 48,59 Q52,58 59,52 Q66,46 72,39 Q78,32 82,30 Q86,28 88,34 Q90,40 93,46 Q96,52 100,53"/>
                <path className={styles.stroke} d="M112,50 Q112,50 117,42 Q122,34 127,30 Q132,26 136,29 Q140,32 138,39 Q136,46 140,47 Q144,48 150,43 Q156,38 160,33"/>
                <path className={styles.stroke} d="M36,70 Q36,70 53,72 Q70,74 90,75 Q110,76 130,74 Q150,72 161,68"/>
              </svg>
              <span className={styles.crop} style={{ inset: cropInset }} aria-hidden="true"></span>
            </div>
            <div className={styles.out}>
              <span className={styles.outLabel}>미리보기</span>
              <div className={styles.frame}>
                <span className={styles.hint}>결과가 여기 보입니다</span>
                {src ? <img className={styles.img} src={src} alt="여백을 잘라낸 서명 미리보기"/> : null}
                {/* 미리보기 루프에서만 보이는 결과 사본 — viewBox 가 잉크 바깥선이라 잘린 그림이 된다 */}
                <svg className={styles.thumb} viewBox="21 19 149 65" aria-hidden="true">
                  <path className={styles.stroke} d="M30,56 Q30,56 33,46 Q36,36 41,31 Q46,26 50,31 Q54,36 52,44 Q50,52 47,56 Q44,60 48,59 Q52,58 59,52 Q66,46 72,39 Q78,32 82,30 Q86,28 88,34 Q90,40 93,46 Q96,52 100,53"/>
                  <path className={styles.stroke} d="M112,50 Q112,50 117,42 Q122,34 127,30 Q132,26 136,29 Q140,32 138,39 Q136,46 140,47 Q144,48 150,43 Q156,38 160,33"/>
                  <path className={styles.stroke} d="M36,70 Q36,70 53,72 Q70,74 90,75 Q110,76 130,74 Q150,72 161,68"/>
                </svg>
              </div>
            </div>
          </div>
          <p className={styles.live}>
            <span className={styles.liveReal} aria-live="polite">{message}</span>
            <span className={`${styles.liveDemo} ${styles.sayBefore}`} aria-hidden="true">내보내기를 누르면 바깥 여백을 잘라냅니다</span>
            <span className={`${styles.liveDemo} ${styles.sayAfter}`} aria-hidden="true">바깥 여백을 잘라낸 미리보기입니다</span>
          </p>
        </div>
      </div>
    </main>
  );
}
