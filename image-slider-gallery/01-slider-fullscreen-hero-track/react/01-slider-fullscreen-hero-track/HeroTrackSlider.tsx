// HeroTrackSlider — vanilla 판(run/082/demo/01-slider-fullscreen-hero-track/index.html) 의 React 포트.
// 사진 넉 장이 한 줄로 이어 붙은 트랙 하나를 translate3d 로 밀고, 화살표와 점이 같은 인덱스 하나를 본다.
// 옮기는 값은 CSS 변수 --i 뿐이다 — 컴포넌트는 숫자만 바꾸고 거리 계산은 calc(-100% * var(--i)) 가 한다.
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./HeroTrackSlider.module.scss";

export type HeroTrackSliderProps = {
  duration?: number;
  easing?: string;
  color?: string;
  autoplayMs?: number;
};

type Vars = CSSProperties & {
  "--i"?: number;
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

const REGION_LABEL = "여행 사진 히어로 슬라이더";
const SLIDE_LABEL = "{total}장 중 {n}장";
const DOT_LABEL = "{n}번째 사진 보기";
const PREV_LABEL = "이전 사진";
const NEXT_LABEL = "다음 사진";

type Shot = { key: string; cap: string; alt: string };

const SHOTS: Shot[] = [
  { key: "a", cap: "해안 도로", alt: "노을이 번진 하늘 아래 바다를 끼고 굽어 도는 해안 도로" },
  { key: "b", cap: "새벽 호수", alt: "새벽 물안개가 낮게 깔린 잔잔한 호수와 건너편 숲" },
  { key: "c", cap: "눈 덮인 능선", alt: "눈이 덮인 산등성이와 그 위로 트인 차가운 하늘" },
  { key: "d", cap: "밤의 옥상", alt: "밤의 도시 옥상에서 내려다본 창문 불빛과 먼 지평선" },
];

function label(form: string, n: number, total: number): string {
  return form.replace("{n}", String(n)).replace("{total}", String(total));
}

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

export default function HeroTrackSlider(props: HeroTrackSliderProps) {
  const duration = props.duration ?? 600;
  const easing = props.easing ?? "ease-out";
  const color = props.color ?? "#2f6df6";
  const autoplayMs = props.autoplayMs ?? 560;
  const total = SHOTS.length;
  const [index, setIndex] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(true);

  // 격자 미리보기: playing 인 동안만 혼자 넘어간다. 손이 닿으면 stop() 이 끈다
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

  const vars: Vars = { "--i": index, "--duration": duration + "ms", "--easing": easing, "--color": color };

  return (
    <main className={styles.stage}>
      <section
        className={styles.hero}
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
        <div className={styles.view}>
          <div className={styles.track}>
            {SHOTS.map((shot: Shot, i: number) => (
              <article
                key={shot.key}
                className={styles.slide}
                aria-roledescription="slide"
                aria-label={label(SLIDE_LABEL, i + 1, total)}
                aria-hidden={i === index ? "false" : "true"}
              >
                <div className={styles.shot + " " + styles["shot--" + shot.key]} role="img" aria-label={shot.alt} />
                <p className={styles.cap}>{shot.cap}</p>
              </article>
            ))}
          </div>
        </div>
        <button className={styles.nav + " " + styles.navPrev} type="button" aria-label={PREV_LABEL} onClick={() => go(index - 1)}>
          <CaretLeft />
        </button>
        <button className={styles.nav + " " + styles.navNext} type="button" aria-label={NEXT_LABEL} onClick={() => go(index + 1)}>
          <CaretRight />
        </button>
        <div className={styles.dots}>
          {SHOTS.map((shot: Shot, i: number) => (
            <button
              key={shot.key}
              className={styles.dot}
              type="button"
              aria-label={label(DOT_LABEL, i + 1, total)}
              aria-current={i === index ? "true" : "false"}
              onClick={() => go(i)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
