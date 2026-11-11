// InertiaScrub — vanilla 판(run/292/demo/09-physics-inertia-scrub/index.html) 의 React 포트.
// pointerup 이 잡은 놓는 속도로 미끄러지고, 마찰은 60fps 기준 0.91^dt 지수 감쇠,
// 속도가 160px/s 아래로 떨어지면 가장 가까운 칸으로 스프링(150, 감쇠 13)이 붙인다.
// 트랙은 translate 하나로만 움직인다 — 진짜 스크롤(scrollLeft) 은 rAF 로 잴 수 없다.
// 상수·식은 vanilla 와 같은 값이다. 격자 미리보기(isDemo)는 module.scss 의 키프레임이 돌린다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./InertiaScrub.module.scss";

export type InertiaScrubProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// React 의 KeyboardEvent 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type KeyEvt = { key: string; preventDefault(): void };
type Sample = { x: number; t: number };

const CW = 120;
const GAP2 = 12;
const STEP = CW + GAP2; // 카드 120px + 간격 12px = 한 칸 132px
const HINT = "세게 훑고 놓으면 손 뗀 속도로 미끄러지다 카드에 붙습니다";
const VIEW_LABEL = "카드 스크럽";
const METER_LABEL = "던진 속도";
const RESET_LABEL = "처음으로";
const CARDS = [
  { n: "1", name: "첫 카드" },
  { n: "2", name: "둘 카드" },
  { n: "3", name: "셋 카드" },
  { n: "4", name: "넷 카드" },
  { n: "5", name: "다섯 카드" },
  { n: "6", name: "여섯 카드" },
];

function SwipeIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 256 256" className={className} aria-hidden="true" fill="currentColor"><g><path d="M208 140v36c0 24-8 40-8 40H64l-29.32-50a20 20 0 0 1 34.64-20L88 176V68a20 20 0 0 1 40 0v56a20 20 0 0 1 40 0v16a20 20 0 0 1 40 0" opacity=".2"/><path d="M216 140v36c0 25.59-8.49 42.85-8.85 43.58A8 8 0 0 1 200 224a7.9 7.9 0 0 1-3.57-.85a8 8 0 0 1-3.58-10.73c.06-.12 7.16-14.81 7.16-36.42v-36a12 12 0 0 0-24 0v4a8 8 0 0 1-16 0v-20a12 12 0 0 0-24 0v12a8 8 0 0 1-16 0V68a12 12 0 0 0-24 0v108a8 8 0 0 1-14.79 4.23l-18.68-30l-.14-.23a12 12 0 1 0-20.8 12l29.29 50a8 8 0 1 1-13.81 8l-29.32-50a28 28 0 0 1 48.41-28.17L80 148V68a28 28 0 0 1 56 0v30.7a28 28 0 0 1 38.65 16.69A28 28 0 0 1 216 140m33-92h-52.69l18.34-18.34a8 8 0 0 0-11.31-11.32l-32 32a8 8 0 0 0 0 11.32l32 32a8 8 0 0 0 11.31-11.32L195.31 64H248a8 8 0 0 0 0-16Z"/></g></svg>
  );
}

function ResetIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 256 256" className={className} aria-hidden="true" fill="currentColor"><g><path d="M232 136a104 104 0 1 1-38.17-80.55L208 60v-4a8 8 0 0 1 16 0v34a8 8 0 0 1-8 8h-34a8 8 0 0 1 0-16h7.6l-8.89-7.4A88 88 0 1 0 216 136a8 8 0 0 1 16 0Z" opacity=".2"/><path d="M232 136a104 104 0 1 1-38.17-80.55L208 60v-4a8 8 0 0 1 16 0v34a8 8 0 0 1-8 8h-34a8 8 0 0 1 0-16h7.6l-8.89-7.4A88 88 0 1 0 216 136a8 8 0 0 1 16 0Z"/></g></svg>
  );
}

export default function InertiaScrub({
  duration = 2000,
  easing = "ease-out",
  color = "#ffd23f",
}: InertiaScrubProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const meterRef = useRef<HTMLElement | null>(null);
  const xBox = useRef(0) as Box<number>;
  const vxBox = useRef(0) as Box<number>;
  const draggingBox = useRef(false) as Box<boolean>;
  const settlingBox = useRef(false) as Box<boolean>;
  const samplesBox = useRef<Sample[]>([]) as Box<Sample[]>;
  const lastBox = useRef(0) as Box<number>;
  const runningBox = useRef(false) as Box<boolean>;
  const frameBox = useRef(0) as Box<number>;
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function clampX(v: number): number {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) { return v; }
    const max = 0;
    const min = viewport.clientWidth - track.scrollWidth;
    return Math.max(min, Math.min(max, v));
  }

  function snapTarget(): number {
    return Math.round(clampX(xBox.current) / STEP) * STEP;
  }

  function paint(): void {
    const track = trackRef.current;
    if (track) {
      track.style.transform = "translate(" + xBox.current.toFixed(1) + "px, 0)";
    }
    const meter = meterRef.current;
    if (meter) {
      const pct = Math.min(1, Math.abs(vxBox.current) / 900);
      meter.style.transform = "scaleX(" + pct.toFixed(3) + ")";
    }
  }

  function step(now: number): void {
    const dt = Math.min((now - lastBox.current) / 1000, 0.033);
    lastBox.current = now;
    // 손이 붙어 있는 동안은 물리를 돌리지 않는다 — 돌리면 마찰 감속과 스냅 스프링이 끄는 손과 싸운다
    if (draggingBox.current) { frameBox.current = requestAnimationFrame(step); return; }
    if (settlingBox.current) {
      // 카드에 붙는 마지막 스프링 — 목표는 가장 가까운 칸
      const target = snapTarget();
      vxBox.current += (150 * (target - xBox.current) - 13 * vxBox.current) * dt;
      xBox.current += vxBox.current * dt;
      if (Math.abs(target - xBox.current) < 0.4 && Math.abs(vxBox.current) < 6) {
        xBox.current = target;
        vxBox.current = 0;
        settlingBox.current = false;
        paint();
        runningBox.current = false;
        return;
      }
    } else {
      // 마찰 감속 — 프레임 비율과 무관하게 60fps 기준 0.91^dt 로 지수 감쇠시킨다
      vxBox.current *= Math.pow(0.91, dt * 60);
      xBox.current += vxBox.current * dt;
      const c = clampX(xBox.current);
      if (c !== xBox.current) { xBox.current = c; vxBox.current = 0; }
      if (Math.abs(vxBox.current) < 160) { settlingBox.current = true; vxBox.current = 0; }
    }
    paint();
    frameBox.current = requestAnimationFrame(step);
  }

  function wake(): boolean {
    setDemo(false);
    if (reduced()) { xBox.current = snapTarget(); vxBox.current = 0; paint(); return false; }
    if (!runningBox.current) {
      runningBox.current = true;
      lastBox.current = performance.now();
      frameBox.current = requestAnimationFrame(step);
    }
    return true;
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    event.preventDefault();
    draggingBox.current = true;
    settlingBox.current = false;
    xBox.current = clampX(xBox.current);
    vxBox.current = 0;
    samplesBox.current = [{ x: event.clientX, t: performance.now() }];
    const viewport = viewportRef.current;
    if (viewport) { viewport.setPointerCapture(event.pointerId); }
    wake();
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    if (!draggingBox.current) { return; }
    const now = performance.now();
    const samples = samplesBox.current;
    const prev = samples[samples.length - 1];
    xBox.current = clampX(xBox.current + (event.clientX - prev.x));
    samples.push({ x: event.clientX, t: now });
    if (samples.length > 8) { samples.shift(); }
    paint();
  }

  function onPointerUp(): void {
    if (!draggingBox.current) { return; }
    draggingBox.current = false;
    if (reduced()) { xBox.current = snapTarget(); vxBox.current = 0; paint(); return; }
    // 놓는 순간의 속도 = 최근 표본들의 기울기 (pointerup 이 순간을 잡는다)
    const now = performance.now();
    const samples = samplesBox.current;
    let i = samples.length - 1;
    while (i > 0 && now - samples[i - 1].t < 120) { i -= 1; }
    const span = samples[samples.length - 1].t - samples[i].t;
    vxBox.current = span > 8 ? ((samples[samples.length - 1].x - samples[i].x) / span) * 1000 : 0;
    vxBox.current = Math.max(-1400, Math.min(1400, vxBox.current));
    settlingBox.current = false;
    if (!runningBox.current) { wake(); }
  }

  function onKeyDown(event: KeyEvt): void {
    if (event.key === "ArrowLeft") {
      xBox.current = clampX(xBox.current + STEP);
      vxBox.current = 0;
      settlingBox.current = true;
      wake();
    } else if (event.key === "ArrowRight") {
      xBox.current = clampX(xBox.current - STEP);
      vxBox.current = 0;
      settlingBox.current = true;
      wake();
    } else { return; }
    event.preventDefault();
  }

  function onReset(): void {
    xBox.current = 0;
    vxBox.current = 0;
    settlingBox.current = false;
    paint();
    wake();
  }

  useEffect(() => {
    paint();
    const onResize = (): void => { xBox.current = clampX(xBox.current); paint(); };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frameBox.current);
    };
  }, []);

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <p className={styles.hint}><SwipeIcon className={styles.ico} /><span>{HINT}</span></p>
        <div
          className={styles.viewport}
          ref={viewportRef}
          role="application"
          aria-label={VIEW_LABEL}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onKeyDown={onKeyDown}
        >
          <div className={styles.track} ref={trackRef}>
            {CARDS.map((card) => (
              <span className={styles.card} key={card.n}><b>{card.n}</b><i>{card.name}</i></span>
            ))}
          </div>
        </div>
        <div className={styles.bar}>
          <p className={styles.meter}>
            <span className={styles.meterLabel}>{METER_LABEL}</span>
            <b className={styles.meterBar}>
              <i className={styles.meterFill} ref={meterRef} />
            </b>
          </p>
          <button className={styles.reset} type="button" onClick={onReset}>
            <ResetIcon className={styles.ico} /><span>{RESET_LABEL}</span>
          </button>
        </div>
      </div>
    </main>
  );
}
