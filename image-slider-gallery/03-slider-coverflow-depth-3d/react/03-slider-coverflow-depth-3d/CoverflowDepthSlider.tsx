// CoverflowDepthSlider — vanilla 판(run/082/demo/03-slider-coverflow-depth-3d/index.html) 의 React 포트.
// 스크롤 위치가 아니라 "활성 장에서 몇 칸 떨어졌는가" 가 모양을 정한다.
// 컴포넌트는 카드마다 거리 d 와 |d| 만 CSS 변수로 얹고, rotateY·translateZ·축소는 CSS 가 계산한다.
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CoverflowDepthSlider.module.scss";

export type CoverflowDepthSliderProps = {
  duration?: number;
  easing?: string;
  color?: string;
  autoplayMs?: number;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

type CardVars = CSSProperties & { "--d"?: number; "--ad"?: number };

const REGION_LABEL = "앨범 표지 깊이 슬라이더";
const SLIDE_LABEL = "{total}장 중 {n}장 · {name}";
const DOT_LABEL = "{n}번째 표지 보기";
const PREV_LABEL = "이전 표지";
const NEXT_LABEL = "다음 표지";

type Cover = { key: string; name: string; alt: string };

const COVERS: Cover[] = [
  { key: "a", name: "새벽 호수", alt: "물안개가 낮게 덮인 잔잔한 호수 표지" },
  { key: "b", name: "붉은 사막", alt: "해 질 무렵 붉게 물든 사막 바위 표지" },
  { key: "c", name: "밤의 정거장", alt: "불 켜진 승강장이 늘어선 밤 기차 정거장 표지" },
  { key: "d", name: "초록 언덕", alt: "비가 갠 뒤 젖은 초록 언덕과 낮은 구름 표지" },
  { key: "e", name: "얼음 바다", alt: "푸른 얼음 조각이 떠 있는 겨울 바다 표지" },
];

function CaretLeft() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256" aria-hidden="true">
      <g fill="currentColor">
        <path d="M160 48v160l-80-80Z" opacity=".2" />
        <path d="M163.06 40.61a8 8 0 0 0-8.72 1.73l-80 80a8 8 0 0 0 0 11.32l80 80A8 8 0 0 0 168 208V48a8 8 0 0 0-4.94-7.39M152 188.69L91.31 128L152 67.31Z" />
      </g>
    </svg>
  );
}

function CaretRight() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256" aria-hidden="true">
      <g fill="currentColor">
        <path d="m176 128l-80 80V48Z" opacity=".2" />
        <path d="m181.66 122.34l-80-80A8 8 0 0 0 88 48v160a8 8 0 0 0 13.66 5.66l80-80a8 8 0 0 0 0-11.32M104 188.69V67.31L164.69 128Z" />
      </g>
    </svg>
  );
}

export default function CoverflowDepthSlider(props: CoverflowDepthSliderProps) {
  const duration = props.duration ?? 600;
  const easing = props.easing ?? "ease-out";
  const color = props.color ?? "#2f6df6";
  const autoplayMs = props.autoplayMs ?? 440;
  const total = COVERS.length;
  const [index, setIndex] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(true);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setIndex((prev: number) => (prev + 1) % total), autoplayMs);
    return () => window.clearInterval(id);
  }, [playing, autoplayMs, total]);

  const stop = () => setPlaying(false);
  const go = (n: number) => {
    stop();
    setIndex(((n % total) + total) % total);
  };

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };

  return (
    <main className={styles.stage}>
      <section
        className={styles.cf}
        style={vars}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label={REGION_LABEL}
        onPointerDown={stop}
        onKeyDown={(e: { key: string }) => {
          if (e.key === "ArrowLeft") go(index - 1);
          if (e.key === "ArrowRight") go(index + 1);
        }}
      >
        <div className={styles.box}>
          <div className={styles.track}>
            {COVERS.map((cover: Cover, i: number) => {
              const d = i - index;
              const far = Math.abs(d);
              const cardVars: CardVars = { "--d": d, "--ad": far, zIndex: total - far, pointerEvents: far > 2 ? "none" : "auto" };
              const name = SLIDE_LABEL.replace("{n}", String(i + 1)).replace("{total}", String(total)).replace("{name}", cover.name);
              return (
                <button
                  key={cover.key}
                  className={styles.card}
                  style={cardVars}
                  type="button"
                  aria-roledescription="slide"
                  aria-label={name}
                  aria-current={d === 0 ? "true" : "false"}
                  onClick={() => go(i)}
                >
                  <span className={styles.art + " " + styles["art--" + cover.key]} role="img" aria-label={cover.alt} />
                  <span className={styles.name}>{cover.name}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className={styles.bar}>
          <button className={styles.nav} type="button" aria-label={PREV_LABEL} onClick={() => go(index - 1)}>
            <CaretLeft />
          </button>
          <div className={styles.dots}>
            {COVERS.map((cover: Cover, i: number) => (
              <button
                key={cover.key}
                className={styles.dot}
                type="button"
                aria-label={DOT_LABEL.replace("{n}", String(i + 1))}
                aria-current={i === index ? "true" : "false"}
                onClick={() => go(i)}
              />
            ))}
          </div>
          <button className={styles.nav} type="button" aria-label={NEXT_LABEL} onClick={() => go(index + 1)}>
            <CaretRight />
          </button>
        </div>
      </section>
    </main>
  );
}
