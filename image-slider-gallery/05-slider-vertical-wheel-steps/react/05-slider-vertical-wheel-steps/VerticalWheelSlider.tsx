// VerticalWheelSlider — vanilla 판(run/082/demo/05-slider-vertical-wheel-steps/index.html) 의 React 포트.
// 스크롤 컨테이너가 아니다. 위치를 정하는 값은 트랙의 `--i` 하나이고 화면은 translateY 로만 움직인다.
// 한 번 굴릴 때 수십 개가 이어서 오는 wheel 이벤트는 잠금 시간(LOCK)이 삼킨다 — vanilla 와 같은 값이다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./VerticalWheelSlider.module.scss";

export type VerticalWheelSliderProps = {
  duration?: number;
  easing?: string;
  color?: string;
  lock?: number;
  interval?: number;
  autoPlay?: boolean;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type TrackVars = CSSProperties & { "--i"?: number };
type Box<T> = { current: T | null };

type Shot = { tone: string; cap: string; alt: string; slide: string; step: string };

const REGION = "휠로 한 장씩 넘기는 세로 슬라이더";
const HINT = "휠을 한 번 굴리면 한 장만 넘어갑니다";
const STEPS_LABEL = "장 고르기";
const PREV = "이전 장";
const NEXT = "다음 장";
const SHOTS: Shot[] = [
  { tone: "stair", cap: "오래된 계단", alt: "낡은 벽 사이로 층층이 이어진 좁은 계단", slide: "4장 중 1장", step: "1번째 장" },
  { tone: "curtain", cap: "창가 커튼", alt: "아침 햇살이 비치는 창가에 드리운 얇은 커튼", slide: "4장 중 2장", step: "2번째 장" },
  { tone: "sign", cap: "밤거리 간판", alt: "비 내린 밤거리에 줄지어 켜진 간판 불빛", slide: "4장 중 3장", step: "3번째 장" },
  { tone: "path", cap: "숲속 오솔길", alt: "키 큰 나무 사이로 난 좁은 숲속 오솔길", slide: "4장 중 4장", step: "4번째 장" },
];

export default function VerticalWheelSlider(props: VerticalWheelSliderProps) {
  const duration = props.duration ?? 300;
  const easing = props.easing ?? "cubic-bezier(.2, .8, .2, 1)";
  const color = props.color ?? "#2f6df6";
  const lock = props.lock ?? 420;
  const interval = props.interval ?? 620;
  const [index, setIndex] = useState<number>(0);
  const [preview, setPreview] = useState<boolean>(props.autoPlay ?? true);
  const lockedRef = useRef<boolean>(false) as Box<boolean>;
  const viewRef = useRef<HTMLDivElement>(null) as Box<HTMLDivElement>;

  useEffect(() => {
    if (!preview) { return; }
    const id = window.setInterval(() => {
      setIndex((prev: number) => (prev + 1) % SHOTS.length);
    }, interval);
    return () => window.clearInterval(id);
  }, [preview, interval]);

  const go = (next: number) => {
    setPreview(false);
    setIndex((next + SHOTS.length) % SHOTS.length);
  };

  // React 의 onWheel 은 passive 라 preventDefault 가 통하지 않는다 — 창에 직접 건다
  useEffect(() => {
    const view = viewRef.current;
    if (!view) { return; }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (lockedRef.current) { return; }
      lockedRef.current = true;
      window.setTimeout(() => { lockedRef.current = false; }, lock);
      setPreview(false);
      setIndex((prev: number) => (prev + (e.deltaY > 0 ? 1 : -1) + SHOTS.length) % SHOTS.length);
    };
    view.addEventListener("wheel", onWheel, { passive: false });
    return () => view.removeEventListener("wheel", onWheel);
  }, [lock]);

  const vars: Vars ={ "--duration": duration + "ms", "--easing": easing, "--color": color };
  const trackVars: TrackVars = { "--i": index };

  return (
    <main className={styles.stage}>
      <div className={styles.root} style={vars}>
        <div className={styles.row}>
          <div
            className={styles.view}
            ref={viewRef}
            role="region"
            aria-roledescription="carousel"
            aria-orientation="vertical"
            aria-label={REGION}
            tabIndex={0}
            onKeyDown={(e: { key: string; preventDefault: () => void }) => {
              if (e.key !== "ArrowDown" && e.key !== "ArrowUp") { return; }
              e.preventDefault();
              go(index + (e.key === "ArrowDown" ? 1 : -1));
            }}
          >
            <div className={styles.track} style={trackVars}>
              {SHOTS.map((shot) => (
                <div key={shot.tone} className={styles.shot} role="group" aria-roledescription="slide" aria-label={shot.slide}>
                  <span className={styles.photo + " " + styles["photo--" + shot.tone]} role="img" aria-label={shot.alt} />
                  <span className={styles.cap}>{shot.cap}</span>
                </div>
              ))}
            </div>
          </div>
          <span className={styles.steps} role="group" aria-label={STEPS_LABEL}>
            {SHOTS.map((shot, i) => (
              <button
                key={shot.step}
                className={styles.step}
                type="button"
                aria-label={shot.step}
                aria-current={i === index ? "true" : "false"}
                onClick={() => go(i)}
              />
            ))}
          </span>
        </div>
        <div className={styles.bar}>
          <button className={styles.nav} type="button" aria-label={PREV} onClick={() => go(index - 1)}>
            <svg viewBox="0 0 256 256" width="1em" height="1em" aria-hidden="true" focusable="false">
              <g fill="currentColor">
                <path d="M208,160H48l80-80Z" opacity="0.2" />
                <path d="M213.66,154.34l-80-80a8,8,0,0,0-11.32,0l-80,80A8,8,0,0,0,48,168H208a8,8,0,0,0,5.66-13.66ZM67.31,152,128,91.31,188.69,152Z" />
              </g>
            </svg>
          </button>
          <button className={styles.nav} type="button" aria-label={NEXT} onClick={() => go(index + 1)}>
            <svg viewBox="0 0 256 256" width="1em" height="1em" aria-hidden="true" focusable="false">
              <g fill="currentColor">
                <path d="M208,96l-80,80L48,96Z" opacity="0.2" />
                <path d="M215.39,92.94A8,8,0,0,0,208,88H48a8,8,0,0,0-5.66,13.66l80,80a8,8,0,0,0,11.32,0l80-80A8,8,0,0,0,215.39,92.94ZM128,164.69,67.31,104H188.69Z" />
              </g>
            </svg>
          </button>
          <span className={styles.hint}>{HINT}</span>
        </div>
      </div>
    </main>
  );
}
