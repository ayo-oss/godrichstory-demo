// TextHeatWarp — vanilla 판(run/077/demo/04-fx-text-heat-warp/index.html) 의 React 포트.
// 글자를 오프스크린 캔버스에 한 번만 fillText 로 그려 두고, 가로 스캔라인(2px) 단위로 drawImage
// 잘라 붙이되 줄마다 사인파 위상만큼 옆으로 민다. 아래 복사층이 두께(가짜 3D 돌출)를 만든다.
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 가 없다 — props 는 CSS 변수로 내려간다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./TextHeatWarp.module.scss";

export type TextHeatWarpProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// React 이벤트 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type InEvt = { target: { value: string } };

const PRESETS = ["깃발처럼 출렁", "canvas 한 장으로", "3D 돌출 글자"];
const ROW = 2;           // 스캔라인 한 줄의 높이(CSS px). 화면 배지와 같은 값이다
const DROP = 7;          // 복사층을 아래로 미루는 양 — 두께로 읽힌다
const STILL_T = 1.7;     // reduce 정지판을 찍는 파동의 시각(초)
const FONT = '-apple-system, "Segoe UI", "Noto Sans KR", sans-serif';
const PHRASE_LABEL = "표시할 문구";
const PLACEHOLDER = "문구를 입력하세요";
const NEXT_LABEL = "다음 문구";

export default function TextHeatWarp({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "cubic-bezier(.2, .8, .2, 1)",     // vanilla $easing: $ease-spring
  color = "#2f6df6",                          // vanilla $color: $subject-blue
}: TextHeatWarpProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const faceRef = useRef<HTMLCanvasElement | null>(null);
  const depthRef = useRef<HTMLCanvasElement | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 }) as Box<{ w: number; h: number; dpr: number }>;
  const phraseRef = useRef("깃발처럼 출렁") as Box<string>;
  const presetRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function fit(): void {
    const cv = cvRef.current;
    if (!cv || !cv.parentElement) return;
    const r = cv.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    sizeRef.current.w = r.width;
    sizeRef.current.h = r.height;
    sizeRef.current.dpr = dpr;
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    ctxRef.current!.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // 오프스크린 한 번 그리기 — measureText 로 100px 에서 폭을 재고 판 폭의 84% 에 맞춰
  // 크기를 역산해 중앙 정렬한다. 긴 문구를 넣어도 넘치지 않는 이유가 이 두 줄이다.
  function build(): void {
    const cv = cvRef.current;
    const face = faceRef.current;
    const depth = depthRef.current;
    const root = rootRef.current;
    if (!cv || !face || !depth || !root) return;
    face.width = cv.width; face.height = cv.height;
    depth.width = cv.width; depth.height = cv.height;
    const fctx = face.getContext("2d");
    const dctx = depth.getContext("2d");
    if (!fctx || !dctx) return;
    const cssv = (n: string) => getComputedStyle(root).getPropertyValue(n).trim();
    const w = face.width, h = face.height;
    const phrase = phraseRef.current;
    fctx.font = "700 100px " + FONT;
    const wide = Math.max(1, fctx.measureText(phrase).width);
    const size = Math.min(100 * (w * 0.84) / wide, h * 0.5);
    fctx.textAlign = "center";
    fctx.textBaseline = "middle";
    fctx.fillStyle = cssv("--face");
    fctx.font = "700 " + size + "px " + FONT;
    fctx.fillText(phrase, w * 0.5, h * 0.47);
    dctx.textAlign = "center";
    dctx.textBaseline = "middle";
    dctx.fillStyle = cssv("--depth");
    dctx.font = "700 " + size + "px " + FONT;
    dctx.fillText(phrase, w * 0.5, h * 0.47);
  }

  // 파동 — 사인 합성. 줄의 옆 이동 sx 는 y 와 시간 t 의 사인 둘, 가로 스케일 w 는 y 와 t 의
  // 사인 하나. 스케일은 중심 기준이므로 밀림이 x 의 1차 함수가 되어 세 항을 합하면 변위가
  // x·y·t 에 모두 의존하는 마퀴식 출렁임이 된다.
  function pass(img: HTMLCanvasElement, drop: number, t: number): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { w: W, h: H, dpr } = sizeRef.current;
    for (let y = 0; y < H; y += ROW) {
      const sx = 7 * Math.sin(0.055 * y + 2.4 * t) + 3 * Math.sin(0.021 * y - 1.5 * t + 1.4);
      const w = 1 + 0.05 * Math.sin(0.026 * y - 1.9 * t + 0.7);
      ctx.drawImage(img, 0, y * dpr, img.width, ROW * dpr, (W - W * w) * 0.5 + sx, y + drop, W * w, ROW);
    }
  }

  function draw(t: number): void {
    const ctx = ctxRef.current;
    const face = faceRef.current;
    const depth = depthRef.current;
    if (!ctx || !face || !depth) return;
    const { w: W, h: H } = sizeRef.current;
    ctx.clearRect(0, 0, W, H);
    // 복사층 먼저 — 위상을 조금 늦게 줘 앞면과 어긋나면 돌출이 더 산다
    pass(depth, DROP, t - 0.12);
    pass(face, 0, t);
  }

  function frame(now: number): void {
    draw(now / 1000);
    rafRef.current = requestAnimationFrame(frame);
  }

  function setPhrase(p: string): void {
    phraseRef.current = p || PRESETS[0];
    build();
    if (reduced()) draw(STILL_T);
  }

  function onInput(e: InEvt): void {
    setPhrase(e.target.value);
  }

  function onNext(): void {
    const input = inputRef.current;
    presetRef.current = (presetRef.current + 1) % PRESETS.length;
    const next = PRESETS[presetRef.current];
    if (input) input.value = next;
    setPhrase(next);
  }

  function onResize(): void {
    fit();
    build();
    if (reduced()) draw(STILL_T);
  }

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    ctxRef.current = cv.getContext("2d");
    faceRef.current = document.createElement("canvas");
    depthRef.current = document.createElement("canvas");
    if (!ctxRef.current) return;
    fit();
    build();
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 루프를 시작하지 않는다. 출렁임이 잡힌 한 순간의 정적 한 장만 그린다
      rootRef.current?.classList.add("is-still");
      draw(STILL_T);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.root} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M232 128c-52 110.85-78 55.43-104 0Zm-208 0h104c-26-55.43-52-110.85-104 0" opacity=".2"/><path d="M239.24 131.4c-22 46.8-41.4 68.6-61.2 68.6c-25.1 0-40.73-33.32-57.28-68.6C107.7 103.56 92.9 72 78 72c-16.4 0-36.31 37.21-46.72 59.4a8 8 0 0 1-14.48-6.8C38.71 77.8 58.16 56 78 56c25.1 0 40.73 33.32 57.28 68.6C148.3 152.44 163.1 184 178 184c16.4 0 36.31-37.21 46.72-59.4a8 8 0 0 1 14.48 6.8Z"/></g></svg>
          <span>문구를 바꾸면 가로 줄마다 사인파 위상만큼 밀려 출렁입니다</span>
        </p>
        <div className={styles.field}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum}>2px</span><span className={styles.badgeUnit}>스캔라인</span></b>
        </div>
        <div className={styles.bar}>
          <input
            className={styles.in}
            ref={inputRef}
            type="text"
            maxLength={12}
            defaultValue="깃발처럼 출렁"
            placeholder={PLACEHOLDER}
            aria-label={PHRASE_LABEL}
            onChange={onInput}
          />
          <button className={styles.btn} type="button" onClick={onNext}>{NEXT_LABEL}</button>
        </div>
      </div>
    </main>
  );
}
