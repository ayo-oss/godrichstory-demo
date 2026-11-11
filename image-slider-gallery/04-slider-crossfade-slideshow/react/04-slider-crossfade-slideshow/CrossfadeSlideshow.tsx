// CrossfadeSlideshow — vanilla 판(run/082/demo/04-slider-crossfade-slideshow/index.html) 의 React 포트.
// 네 장을 같은 격자 칸에 포개 두고 켜진 장만 opacity 1 로 둔다. 트랙이 없으니 이동 거리가 0 이다.
// 인덱스 하나를 화살표·점·사진이 함께 보고, 화면에서 사라진 장은 aria-hidden 으로 접근성 트리에서도 빠진다.
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CrossfadeSlideshow.module.scss";

export type CrossfadeSlideshowProps = {
  duration?: number;
  easing?: string;
  color?: string;
  interval?: number;
  autoPlay?: boolean;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

type Shot = { tone: string; cap: string; alt: string; slide: string; dot: string };

const REGION = "배경 사진이 천천히 바뀌는 슬라이드쇼";
const DOTS_LABEL = "장 고르기";
const PREV = "이전 장";
const NEXT = "다음 장";
const SHOTS: Shot[] = [
  { tone: "rain", cap: "비 온 뒤 골목", alt: "비 온 뒤 젖은 골목 바닥에 간판 불빛이 번진 풍경", slide: "4장 중 1장", dot: "1번째 장" },
  { tone: "dusk", cap: "해 질 녘 옥상", alt: "해 질 녘 옥상에서 내려다본 주황빛 하늘", slide: "4장 중 2장", dot: "2번째 장" },
  { tone: "fog", cap: "안개 낀 호수", alt: "새벽 안개가 낮게 깔린 호수와 갈대밭", slide: "4장 중 3장", dot: "3번째 장" },
  { tone: "snow", cap: "눈 덮인 마당", alt: "눈이 소복이 쌓인 마당과 낮은 담장", slide: "4장 중 4장", dot: "4번째 장" },
];

export default function CrossfadeSlideshow(props: CrossfadeSlideshowProps) {
  const duration = props.duration ?? 600;
  const easing = props.easing ?? "ease-out";
  const color = props.color ?? "#0a4fe8";
  const interval = props.interval ?? 720;
  const [index, setIndex] = useState<number>(0);
  const [preview, setPreview] = useState<boolean>(props.autoPlay ?? true);

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

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };

  return (
    <main className={styles.stage}>
      <div className={styles.root} style={vars}>
        <div
          className={styles.view}
          role="region"
          aria-roledescription="carousel"
          aria-label={REGION}
          tabIndex={0}
          onKeyDown={(e: { key: string; preventDefault: () => void }) => {
            if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") { return; }
            e.preventDefault();
            go(index + (e.key === "ArrowRight" ? 1 : -1));
          }}
        >
          {SHOTS.map((shot, i) => (
            <div
              key={shot.tone}
              className={styles.shot + (i === index ? " " + styles.isOn : "")}
              role="group"
              aria-roledescription="slide"
              aria-label={shot.slide}
              aria-hidden={i === index ? "false" : "true"}
            >
              <span className={styles.photo + " " + styles["photo--" + shot.tone]} role="img" aria-label={shot.alt} />
              <span className={styles.cap}>{shot.cap}</span>
            </div>
          ))}
        </div>
        <div className={styles.bar}>
          <button className={styles.nav} type="button" aria-label={PREV} onClick={() => go(index - 1)}>
            <svg viewBox="0 0 256 256" width="1em" height="1em" aria-hidden="true" focusable="false">
              <g fill="currentColor">
                <path d="M160 48v160l-80-80Z" opacity=".2" />
                <path d="M163.06 40.61a8 8 0 0 0-8.72 1.73l-80 80a8 8 0 0 0 0 11.32l80 80A8 8 0 0 0 168 208V48a8 8 0 0 0-4.94-7.39M152 188.69L91.31 128L152 67.31Z" />
              </g>
            </svg>
          </button>
          <span className={styles.dots} role="group" aria-label={DOTS_LABEL}>
            {SHOTS.map((shot, i) => (
              <button
                key={shot.dot}
                className={styles.dot}
                type="button"
                aria-label={shot.dot}
                aria-current={i === index ? "true" : "false"}
                onClick={() => go(i)}
              />
            ))}
          </span>
          <button className={styles.nav} type="button" aria-label={NEXT} onClick={() => go(index + 1)}>
            <svg viewBox="0 0 256 256" width="1em" height="1em" aria-hidden="true" focusable="false">
              <g fill="currentColor">
                <path d="m176 128l-80 80V48Z" opacity=".2" />
                <path d="m181.66 122.34l-80-80A8 8 0 0 0 88 48v160a8 8 0 0 0 13.66 5.66l80-80a8 8 0 0 0 0-11.32M104 188.69V67.31L164.69 128Z" />
              </g>
            </svg>
          </button>
        </div>
      </div>
    </main>
  );
}
