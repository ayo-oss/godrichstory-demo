// AutoplayProgressSlider — vanilla 판(run/082/demo/06-slider-autoplay-progress-pause/index.html) 의 React 포트.
// 타이머는 하나뿐이고 장 넘김과 남은 시간 막대가 그 타이머를 함께 본다.
// 멈춤 단추와 visibilitychange 가 같은 타이머를 세우고, 움직임을 줄이라는 설정이면
// 자동재생을 아예 시작하지 않는다 (WCAG 2.2.2) — vanilla 와 같은 규칙이다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./AutoplayProgressSlider.module.scss";

export type AutoplayProgressSliderProps = {
  duration?: number;
  easing?: string;
  color?: string;
  hold?: number;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type TrackVars = CSSProperties & { "--i"?: number };
type FillVars = CSSProperties & { "--p"?: number };
type Box<T> = { current: T | null };

type Shot = { tone: string; cap: string; alt: string; slide: string; dot: string };

const REGION = "매장 안내 자동 슬라이드쇼";
const PAUSE_LABEL = "자동재생 멈춤";
const PLAY_LABEL = "자동재생 시작";
const DOTS_LABEL = "장 고르기";
const SHOTS: Shot[] = [
  { tone: "bread", cap: "갓 구운 빵", alt: "오븐에서 막 꺼낸 빵이 진열대에 놓인 장면", slide: "4장 중 1장", dot: "1번째 장" },
  { tone: "window", cap: "창가 자리", alt: "햇살이 드는 창가 자리와 나무 탁자", slide: "4장 중 2장", dot: "2번째 장" },
  { tone: "drink", cap: "여름 음료", alt: "얼음과 과일을 담은 여름 음료 두 잔", slide: "4장 중 3장", dot: "3번째 장" },
  { tone: "plant", cap: "문 앞 화분", alt: "가게 문 앞에 나란히 놓인 초록 화분들", slide: "4장 중 4장", dot: "4번째 장" },
];

export default function AutoplayProgressSlider(props: AutoplayProgressSliderProps) {
  const duration = props.duration ?? 220;
  const easing = props.easing ?? "cubic-bezier(.2, .8, .2, 1)";
  const color = props.color ?? "#0a4fe8";
  const hold = props.hold ?? 1200;
  const reduce = typeof window === "undefined" ? false : window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [index, setIndex] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(!reduce);
  const [left, setLeft] = useState<number>(1);
  const startRef = useRef<number>(0) as Box<number>;
  const leftRef = useRef<number>(1) as Box<number>;

  // 남은 비율 하나를 rAF 가 계속 고쳐 쓰고, 0 이 되는 순간 다음 장으로 넘긴다
  useEffect(() => {
    if (!playing) { return; }
    const total = hold * (leftRef.current ?? 1);
    startRef.current = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const passed = Math.min(1, (now - (startRef.current ?? now)) / total);
      const rest = 1 - passed;
      leftRef.current = rest;
      setLeft(rest);
      if (passed >= 1) {
        leftRef.current = 1;
        setIndex((prev: number) => (prev + 1) % SHOTS.length);
        startRef.current = now;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [playing, hold, index]);

  // 탭을 떠나 있는 동안 사진이 혼자 넘어가면 돌아왔을 때 어디였는지 알 수 없다
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) { setPlaying(false); } else if (!reduce) { setPlaying(true); }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [reduce]);

  const jump = (next: number) => {
    leftRef.current = 1;
    setLeft(1);
    setIndex((next + SHOTS.length) % SHOTS.length);
  };

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };
  const trackVars: TrackVars = { "--i": index };
  const fillVars: FillVars = { "--p": left };

  return (
    <main className={styles.stage}>
      <div className={styles.root + (playing ? "" : " " + styles.isPaused)} style={vars}>
        <div className={styles.view} role="region" aria-roledescription="carousel" aria-label={REGION} tabIndex={0}>
          <div className={styles.track} style={trackVars}>
            {SHOTS.map((shot) => (
              <div key={shot.tone} className={styles.shot} role="group" aria-roledescription="slide" aria-label={shot.slide}>
                <span className={styles.photo + " " + styles["photo--" + shot.tone]} role="img" aria-label={shot.alt} />
                <span className={styles.cap}>{shot.cap}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.bar}>
          <button
            className={styles.toggle}
            type="button"
            aria-label={playing ? PAUSE_LABEL : PLAY_LABEL}
            onClick={() => {
              if (playing) { setPlaying(false); } else { leftRef.current = 1; setLeft(1); setPlaying(true); }
            }}
          >
            <span className={styles.ico + " " + styles["ico--pause"]}>
              <svg viewBox="0 0 256 256" width="1em" height="1em" aria-hidden="true" focusable="false">
                <path d="M200,32H160a16,16,0,0,0-16,16V208a16,16,0,0,0,16,16h40a16,16,0,0,0,16-16V48A16,16,0,0,0,200,32Zm0,176H160V48h40ZM96,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V48A16,16,0,0,0,96,32Zm0,176H56V48H96Z" fill="currentColor" />
              </svg>
            </span>
            <span className={styles.ico + " " + styles["ico--play"]}>
              <svg viewBox="0 0 256 256" width="1em" height="1em" aria-hidden="true" focusable="false">
                <path d="M232.4,114.49,88.32,26.35a16,16,0,0,0-16.2-.3A15.86,15.86,0,0,0,64,39.87V216.13A15.94,15.94,0,0,0,80,232a16.07,16.07,0,0,0,8.36-2.35L232.4,141.51a15.81,15.81,0,0,0,0-27ZM80,215.94V40l143.83,88Z" fill="currentColor" />
              </svg>
            </span>
          </button>
          <span className={styles.meter}>
            <span className={styles.fill} style={fillVars} />
          </span>
          <span className={styles.count} aria-hidden="true">{index + 1} / {SHOTS.length}</span>
        </div>
        <span className={styles.dots} role="group" aria-label={DOTS_LABEL}>
          {SHOTS.map((shot, i) => (
            <button
              key={shot.dot}
              className={styles.dot}
              type="button"
              aria-label={shot.dot}
              aria-current={i === index ? "true" : "false"}
              onClick={() => jump(i)}
            />
          ))}
        </span>
      </div>
    </main>
  );
}
