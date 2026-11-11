// RgbHistogram — vanilla 판(run/295/demo/08-image-edit-histogram-rgb/index.html) 의 React 포트.
// 보정을 먹인 사진을 작은 판에 다시 그린 뒤 getImageData 로 픽셀을 통째로 읽어 16칸 3채널을 센다.
// 격자 미리보기(.isDemo)는 그 캔버스를 감추고 DOM 막대 열여섯 개를 scaleY 로 오르내리게 한다.
// 값·수치는 vanilla 와 같다.
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./RgbHistogram.module.scss";

export type RgbHistogramProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type BarVars = CSSProperties & { "--i"?: string; "--h"?: string };
// ambient 타입에 KeyboardEvent 가 없다 — 화살표 조작에 쓰는 것만 지역 타입으로 선언한다
type KeyEvt = { key: string; shiftKey: boolean; preventDefault(): void };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };

const BINS = 16;
const CHANNEL = ["rgba(47, 109, 246, .85)", "rgba(43, 157, 116, .85)", "rgba(194, 54, 26, .85)"];
const VOICE = "%v배";
// 미리보기 막대의 키 — 실제로 센 값이 아니라 모양만 보여주는 유령 판이다
const GHOST = [0.18, 0.3, 0.46, 0.62, 0.8, 0.95, 0.72, 0.5, 0.38, 0.44, 0.58, 0.7, 0.85, 0.62, 0.4, 0.24];

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

// 보정을 먹인 사진을 작은 판에 다시 그린 다음 픽셀을 통째로 읽어 칸마다 센다.
// 한 칸은 밝기 16단계 — 256 단계를 그대로 세면 막대가 너무 잘아서 모양이 안 읽힌다
// ctx.filter 는 Safari 에 아직 없다(caniuse 81.08%). 없으면 읽은 값에 직접 곱해 같은 결과를 만든다
function countBins(wctx: CanvasRenderingContext2D, work: HTMLCanvasElement, view: HTMLCanvasElement, level: number): number[] {
  const canFilter = typeof wctx.filter === "string";
  if (canFilter) wctx.filter = "brightness(" + level.toFixed(2) + ")";
  wctx.clearRect(0, 0, work.width, work.height);
  wctx.drawImage(view, 0, 0, work.width, work.height);
  const data = wctx.getImageData(0, 0, work.width, work.height).data;
  const bins: number[] = [];
  for (let i = 0; i < BINS * 3; i++) bins.push(0);
  for (let p = 0; p < data.length; p += 4) {
    for (let ch = 0; ch < 3; ch++) {
      const v = canFilter ? data[p + ch] : Math.min(255, Math.round(data[p + ch] * level));
      bins[Math.min(BINS - 1, v >> 4) * 3 + ch] += 1;
    }
  }
  return bins;
}

function drawHist(hctx: CanvasRenderingContext2D, hist: HTMLCanvasElement, bins: number[]): void {
  const w = hist.width;
  const h = hist.height;
  let top = 1;
  for (let i = 0; i < bins.length; i++) {
    if (bins[i] > top) top = bins[i];
  }
  hctx.clearRect(0, 0, w, h);
  const slot = w / BINS;
  const bar = slot / 3;
  for (let i = 0; i < BINS; i++) {
    for (let ch = 0; ch < 3; ch++) {
      const tall = (bins[i * 3 + ch] / top) * h;
      hctx.fillStyle = CHANNEL[ch];
      hctx.fillRect(i * slot + ch * bar, h - tall, bar - 1, tall);
    }
  }
}

export default function RgbHistogram({
  duration = 2000,
  easing = "ease-out",
  color = "#17141a",
}: RgbHistogramProps) {
  const viewRef = useRef<HTMLCanvasElement | null>(null);
  const histRef = useRef<HTMLCanvasElement | null>(null);
  const trackRef = useRef<HTMLSpanElement | null>(null);
  const workRef = useRef<HTMLCanvasElement | null>(null);
  const wctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const queuedRef = useRef<number>(0) as Box<number>;
  const levelRef = useRef<number>(1) as Box<number>;
  const [demo, setDemo] = useState(true);
  const [level, setLevel] = useState(1);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 픽셀을 읽는 판은 한 번만 만든다 — willReadFrequently 는 만들 때 한 번만 먹는 옵션이다
  const ensureWork = useCallback((): HTMLCanvasElement | null => {
    if (!workRef.current) {
      const work = document.createElement("canvas");
      work.width = 80;
      work.height = 50;
      const wctx = work.getContext("2d", { willReadFrequently: true });
      if (!wctx) return null;
      workRef.current = work;
      wctxRef.current = wctx;
    }
    return workRef.current;
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const vctx = view.getContext("2d");
    if (vctx) paintPhoto(vctx, view.width, view.height);
  }, []);

  // 픽셀 세기는 무거우니 프레임마다 한 번으로 묶는다 — 슬라이더를 빠르게 끌어도 밀리지 않는다
  useEffect(() => {
    if (queuedRef.current) return;
    queuedRef.current = requestAnimationFrame(() => {
      queuedRef.current = 0;
      const view = viewRef.current;
      const hist = histRef.current;
      const work = ensureWork();
      const wctx = wctxRef.current;
      if (!view || !hist || !work || !wctx) return;
      const hctx = hist.getContext("2d");
      if (!hctx) return;
      drawHist(hctx, hist, countBins(wctx, work, view, levelRef.current));
    });
  }, [level, ensureWork]);

  useEffect(() => {
    return () => {
      if (queuedRef.current) cancelAnimationFrame(queuedRef.current);
    };
  }, []);

  const applyLevel = useCallback((next: number) => {
    const value = Math.max(0.6, Math.min(1.6, Math.round(next * 100) / 100));
    levelRef.current = value;
    setLevel(value);
    setDemo(false);
  }, []);

  function fromPointer(event: ReactPointerEvent<HTMLSpanElement>): void {
    const track = trackRef.current;
    if (!track) return;
    const r = track.getBoundingClientRect();
    applyLevel((event.clientX - r.left) / r.width + 0.6);
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

  // 화살표 0.02, Shift 와 함께면 0.1
  function onTrackKey(event: KeyEvt): void {
    const step = event.shiftKey ? 0.1 : 0.02;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      applyLevel(level - step);
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      applyLevel(level + step);
    }
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div className={styles.top}>
          <div className={styles.frame}>
            <canvas
              className={styles.view}
              ref={viewRef}
              width={320}
              height={200}
              role="img"
              aria-label="샘플 사진"
              style={{ filter: `brightness(${level.toFixed(2)})` }}
            ></canvas>
          </div>
          <div className={styles.chart}>
            <p className={styles.cap}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className={styles.ico} aria-hidden="true"><g fill="currentColor"><path d="M208 40v168h-56V40Z" opacity=".2"/><path d="M224 200h-8V40a8 8 0 0 0-8-8h-56a8 8 0 0 0-8 8v40H96a8 8 0 0 0-8 8v40H48a8 8 0 0 0-8 8v64h-8a8 8 0 0 0 0 16h192a8 8 0 0 0 0-16M160 48h40v152h-40Zm-56 48h40v104h-40Zm-48 48h32v56H56Z"/></g></svg>
              <span>히스토그램</span>
            </p>
            <div className={styles.plot}>
              <canvas className={styles.hist} ref={histRef} width={240} height={120} role="img" aria-label="채널별 분포 그래프"></canvas>
              <span className={styles.bars} aria-hidden="true">
                {GHOST.map((h, i) => {
                  const barVars: BarVars = { "--i": String(i), "--h": String(h) };
                  return <span key={i} className={styles.gb} style={barVars}></span>;
                })}
              </span>
            </div>
          </div>
        </div>
        <div className={styles.ctl}>
          <span className={styles.lab} id="levelLab">밝기</span>
          <span
            className={styles.track}
            ref={trackRef}
            role="slider"
            tabIndex={0}
            aria-labelledby="levelLab"
            aria-valuemin={0.6}
            aria-valuemax={1.6}
            aria-valuenow={level.toFixed(2)}
            aria-valuetext={VOICE.replace("%v", level.toFixed(2))}
            onPointerDown={onTrackDown}
            onPointerMove={onTrackMove}
            onKeyDown={onTrackKey}
          >
            <span className={styles.thumb} style={{ left: `${(level - 0.6) * 100}%` }}></span>
          </span>
        </div>
      </div>
    </main>
  );
}
