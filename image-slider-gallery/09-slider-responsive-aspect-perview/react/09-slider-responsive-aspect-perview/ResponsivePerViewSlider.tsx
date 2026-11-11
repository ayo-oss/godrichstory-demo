// ResponsivePerViewSlider — vanilla 판(run/082/demo/09-slider-responsive-aspect-perview/index.html) 의 React 포트.
// matchMedia 가 폭을 읽어 한 화면 장수(perView)를 1·2·3 으로 정하고, 그 값을 --per 로 내려보낸다.
// 슬라이드 폭은 flex-basis: calc(100% / var(--per)) 하나로 따라가고, 사진은 aspect-ratio 로 높이가 묶여 있다.
// 한 걸음 이동량도 100% 가 아니라 100% / per 이다 — 장수가 바뀌면 걸음 폭도 같이 바뀐다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ResponsivePerViewSlider.module.scss";

export type ResponsivePerViewSliderProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--per"?: number };
// useRef<T> 는 T | null 을 돌려준다 — ambient 타입에 맞춰 상자 타입을 따로 둔다
type Box<T> = { current: T | null };

const REGION_LABEL = "폭에 따라 장수가 바뀌는 사진 슬라이더";
const TITLE = "한 화면 장수";
const DOTS_LABEL = "구간 고르기";
const PHOTOS = [
  { tone: "a", alt: "새벽 부두의 컨테이너", slide: "6장 중 1장", dot: "1번째 구간 보기" },
  { tone: "b", alt: "노을 진 사막 능선", slide: "6장 중 2장", dot: "2번째 구간 보기" },
  { tone: "c", alt: "비 온 뒤 도심 골목", slide: "6장 중 3장", dot: "3번째 구간 보기" },
  { tone: "d", alt: "눈 덮인 자작나무 숲", slide: "6장 중 4장", dot: "4번째 구간 보기" },
  { tone: "e", alt: "한낮의 수영장 물결", slide: "6장 중 5장", dot: "5번째 구간 보기" },
  { tone: "f", alt: "밤 열차의 창가 불빛", slide: "6장 중 6장", dot: "6번째 구간 보기" },
];
const WIDE = "(min-width: 640px)";
const MID = "(min-width: 420px)";

export default function ResponsivePerViewSlider(props: ResponsivePerViewSliderProps) {
  const duration = props.duration ?? 300;
  const easing = props.easing ?? "cubic-bezier(.2, .8, .2, 1)";
  const color = props.color ?? "#0a4fe8";
  const [per, setPer] = useState<number>(1);
  const [index, setIndex] = useState<number>(0);
  const [preview, setPreview] = useState<boolean>(true);
  const perRef = useRef<number>(1) as Box<number>;
  const indexRef = useRef<number>(0) as Box<number>;

  useEffect(() => {
    perRef.current = per;
    indexRef.current = index;
  }, [per, index]);

  // 폭은 matchMedia 가 읽는다. resize 마다 재는 것과 달리 경계를 넘을 때만 한 번 불린다
  useEffect(() => {
    const wide = window.matchMedia(WIDE);
    const mid = window.matchMedia(MID);
    const measure = () => {
      setPer(wide.matches ? 3 : (mid.matches ? 2 : 1));
    };
    measure();
    wide.addEventListener("change", measure);
    mid.addEventListener("change", measure);
    return () => {
      wide.removeEventListener("change", measure);
      mid.removeEventListener("change", measure);
    };
  }, []);

  const maxIndex = Math.max(0, PHOTOS.length - per);

  useEffect(() => {
    setIndex((prev) => Math.min(prev, Math.max(0, PHOTOS.length - per)));
  }, [per]);

  useEffect(() => {
    if (!preview) {
      return;
    }
    const id = window.setInterval(() => {
      const at = indexRef.current ?? 0;
      const top = Math.max(0, PHOTOS.length - (perRef.current ?? 1));
      setIndex(at >= top ? 0 : at + 1);
    }, 620);
    return () => {
      window.clearInterval(id);
    };
  }, [preview]);

  const go = (next: number) => {
    setIndex(Math.max(0, Math.min(maxIndex, next)));
  };

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color, "--per": per };

  return (
    <main className={styles.stage}>
      <section
        className={styles.root}
        style={vars}
        role="region"
        aria-roledescription="carousel"
        aria-label={REGION_LABEL}
        tabIndex={0}
        onKeyDown={(e: { key: string }) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") {
            return;
          }
          setPreview(false);
          go(index + (e.key === "ArrowRight" ? 1 : -1));
        }}
      >
        <header className={styles.bar}>
          <span className={styles.title}>{TITLE}</span>
          <span className={styles.chip}>perView {per}</span>
        </header>
        <div className={styles.frame}>
          <ul
            className={styles.track}
            style={{ transform: "translate3d(" + -index * (100 / per) + "%, 0, 0)" }}
          >
            {PHOTOS.map((photo, i) => (
              <li
                className={styles.slide}
                key={photo.tone}
                role="group"
                aria-roledescription="slide"
                aria-label={photo.slide}
                aria-hidden={i >= index && i < index + per ? "false" : "true"}
              >
                <span className={styles.ph + " " + styles["ph--" + photo.tone]} role="img" aria-label={photo.alt} />
              </li>
            ))}
          </ul>
        </div>
        <nav className={styles.dots} aria-label={DOTS_LABEL}>
          {PHOTOS.map((photo, i) => (
            <button
              className={styles.dot}
              key={photo.tone}
              type="button"
              hidden={i > maxIndex}
              aria-current={i === index ? "true" : "false"}
              aria-label={photo.dot}
              onClick={() => {
                setPreview(false);
                go(i);
              }}
            />
          ))}
        </nav>
      </section>
    </main>
  );
}
