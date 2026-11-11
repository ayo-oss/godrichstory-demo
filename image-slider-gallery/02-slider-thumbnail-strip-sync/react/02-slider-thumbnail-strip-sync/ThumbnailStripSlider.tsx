// ThumbnailStripSlider — vanilla 판(run/082/demo/02-slider-thumbnail-strip-sync/index.html) 의 React 포트.
// 큰 사진과 썸네일 줄이 인덱스 하나를 같이 쓴다.
// ① 썸네일 클릭 → 인덱스가 바뀌고 트랙이 translateX 로 그 장까지 밀린다
// ② 인덱스가 바뀌면 effect 가 scrollIntoView 로 활성 썸네일을 줄 가운데로 끌어온다
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ThumbnailStripSlider.module.scss";

export type ThumbnailStripSliderProps = {
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

// useRef<T> 는 T | null 을 돌려준다 — ambient 타입에 맞춰 상자 타입을 따로 둔다
type Box<T> = { current: T | null };

const REGION_LABEL = "객실 사진 슬라이더";
const STRIP_LABEL = "썸네일 줄";
const SLIDE_LABEL = "{total}장 중 {n}장";
const PREV_LABEL = "이전 사진";
const NEXT_LABEL = "다음 사진";

type Shot = { key: string; cap: string; alt: string };

const SHOTS: Shot[] = [
  { key: "a", cap: "창가 침대", alt: "아침 햇빛이 길게 드는 창가 침대와 흰 침구" },
  { key: "b", cap: "원목 책상", alt: "스탠드 불빛이 동그랗게 떨어지는 원목 책상" },
  { key: "c", cap: "청록 욕실", alt: "청록 타일을 두른 욕실과 둥근 거울" },
  { key: "d", cap: "주방 선반", alt: "나무 선반에 컵이 줄지어 놓인 작은 주방" },
  { key: "e", cap: "좁은 발코니", alt: "화분을 둔 좁은 발코니와 난간 너머 골목" },
  { key: "f", cap: "밤의 거실", alt: "간접등만 켠 밤의 거실과 낮은 소파" },
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

export default function ThumbnailStripSlider(props: ThumbnailStripSliderProps) {
  const duration = props.duration ?? 600;
  const easing = props.easing ?? "ease-out";
  const color = props.color ?? "#2f6df6";
  const autoplayMs = props.autoplayMs ?? 480;
  const total = SHOTS.length;
  const [index, setIndex] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(true);
  const stripRef = useRef<HTMLDivElement>(null) as Box<HTMLDivElement>;

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setIndex((prev: number) => (prev + 1) % total), autoplayMs);
    return () => window.clearInterval(id);
  }, [playing, autoplayMs, total]);

  // 본문 → 썸네일 방향. block:'nearest' 라 줄만 움직이고 페이지는 그대로 있다
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const active = strip.children[index] as HTMLElement | undefined;
    if (!active) return;
    const soft = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    active.scrollIntoView({ block: "nearest", inline: "center", behavior: soft ? "smooth" : "auto" });
  }, [index]);

  const stop = () => setPlaying(false);
  const go = (n: number) => {
    stop();
    setIndex(((n % total) + total) % total);
  };

  const vars: Vars = { "--i": index, "--duration": duration + "ms", "--easing": easing, "--color": color };

  return (
    <main className={styles.stage}>
      <section
        className={styles.gal}
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
        <div className={styles.main}>
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
          <button className={styles.nav + " " + styles.navPrev} type="button" aria-label={PREV_LABEL} onClick={() => go(index - 1)}>
            <CaretLeft />
          </button>
          <button className={styles.nav + " " + styles.navNext} type="button" aria-label={NEXT_LABEL} onClick={() => go(index + 1)}>
            <CaretRight />
          </button>
        </div>
        <div className={styles.strip} ref={stripRef} role="group" aria-label={STRIP_LABEL}>
          {SHOTS.map((shot: Shot, i: number) => (
            <button
              key={shot.key}
              className={styles.thumb}
              type="button"
              aria-selected={i === index ? "true" : "false"}
              onClick={() => go(i)}
            >
              <span className={styles.thumbArt + " " + styles["shot--" + shot.key]} role="img" aria-label={shot.cap} />
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
