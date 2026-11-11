// DragInertiaSlider — vanilla 판(run/082/demo/07-slider-drag-swipe-inertia/index.html) 의 React 포트.
// pointerdown 부터의 이동량이 트랙을 그대로 따라오고, setPointerCapture 로 포인터를 붙잡아 둔 채
// 놓는 순간의 속도(px/ms)와 이동 거리가 다음 장으로 넘길지 제자리로 돌릴지를 정한다.
// 판정 기준(0.4 px/ms · 폭의 28%)과 미리보기 주기(760ms · 180ms)는 vanilla 와 같은 값이다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./DragInertiaSlider.module.scss";

export type DragInertiaSliderProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef<T> 는 T | null 을 돌려준다 — ambient 타입에 맞춰 상자 타입을 따로 둔다
type Box<T> = { current: T | null };
type DragState = { on: boolean; startX: number; lastX: number; lastT: number; velocity: number; width: number };

const REGION_LABEL = "드래그로 넘기는 사진 슬라이더";
const TITLE = "끌어서 넘기기";
const DOTS_LABEL = "사진 고르기";
const PHOTOS = [
  { tone: "a", alt: "새벽 부두의 컨테이너", slide: "4장 중 1장", dot: "1번째 사진 보기" },
  { tone: "e", alt: "한낮의 수영장 물결", slide: "4장 중 2장", dot: "2번째 사진 보기" },
  { tone: "c", alt: "비 온 뒤 도심 골목", slide: "4장 중 3장", dot: "3번째 사진 보기" },
  { tone: "d", alt: "눈 덮인 자작나무 숲", slide: "4장 중 4장", dot: "4번째 사진 보기" },
];

export default function DragInertiaSlider(props: DragInertiaSliderProps) {
  const duration = props.duration ?? 600;
  const easing = props.easing ?? "cubic-bezier(.2, .8, .2, 1)";
  const color = props.color ?? "#0a4fe8";
  const [index, setIndex] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);
  const [animate, setAnimate] = useState<boolean>(true);
  const [speed, setSpeed] = useState<string>("0.00");
  const [preview, setPreview] = useState<boolean>(true);
  const [width, setWidth] = useState<number>(0);
  const frameRef = useRef<HTMLDivElement>(null) as Box<HTMLDivElement>;
  const indexRef = useRef<number>(0) as Box<number>;
  const dragRef = useRef<DragState>({ on: false, startX: 0, lastX: 0, lastT: 0, velocity: 0, width: 0 }) as Box<DragState>;

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    const measure = () => {
      const frame = frameRef.current;
      if (frame) {
        setWidth(frame.clientWidth);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
    };
  }, []);

  // 미리보기 — 한 번 끌었다 놓는 손짓을 흉내 낸다. 먼저 64px 당기고 180ms 뒤에 남은 거리를 잇는다
  useEffect(() => {
    if (!preview) {
      return;
    }
    const id = window.setInterval(() => {
      const at = indexRef.current ?? 0;
      const last = at === PHOTOS.length - 1;
      setSpeed(last ? "0.52" : "0.84");
      setAnimate(true);
      setOffset(last ? 64 : -64);
      window.setTimeout(() => {
        setOffset(0);
        setIndex(last ? 0 : at + 1);
      }, 180);
    }, 760);
    return () => {
      window.clearInterval(id);
    };
  }, [preview]);

  const go = (next: number) => {
    setAnimate(true);
    setOffset(0);
    setIndex(Math.max(0, Math.min(PHOTOS.length - 1, next)));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const frame = frameRef.current;
    const drag = dragRef.current;
    if (!frame || !drag) {
      return;
    }
    setPreview(false);
    setAnimate(false);
    setWidth(frame.clientWidth);
    drag.on = true;
    drag.startX = e.clientX;
    drag.lastX = e.clientX;
    drag.lastT = e.timeStamp;
    drag.velocity = 0;
    drag.width = frame.clientWidth;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || !drag.on) {
      return;
    }
    const dt = e.timeStamp - drag.lastT;
    if (dt > 0) {
      drag.velocity = (e.clientX - drag.lastX) / dt;
    }
    drag.lastX = e.clientX;
    drag.lastT = e.timeStamp;
    setSpeed(Math.abs(drag.velocity).toFixed(2));
    setOffset(e.clientX - drag.startX);
  };

  // 놓는 순간의 속도가 먼저고, 느리게 끌었을 땐 이동 거리(28%)가 두 번째 기준이다
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || !drag.on) {
      return;
    }
    drag.on = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const moved = e.clientX - drag.startX;
    const carry = Math.abs(drag.velocity) > 0.4 || Math.abs(moved) > drag.width * 0.28;
    go((indexRef.current ?? 0) + (carry && moved < 0 ? 1 : 0) - (carry && moved > 0 ? 1 : 0));
  };

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };
  const shift = offset - index * width;

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
          <span className={styles.speed}>{speed} px/ms</span>
        </header>
        <div className={styles.frame} ref={frameRef}>
          <div
            className={styles.track}
            style={{ transform: "translate3d(" + shift + "px, 0, 0)", transition: animate ? "" : "none" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {PHOTOS.map((photo) => (
              <article
                className={styles.slide}
                key={photo.tone}
                role="group"
                aria-roledescription="slide"
                aria-label={photo.slide}
              >
                <span className={styles.ph + " " + styles["ph--" + photo.tone]} role="img" aria-label={photo.alt} />
                <span className={styles.cap} aria-hidden="true">{photo.alt}</span>
              </article>
            ))}
          </div>
        </div>
        <nav className={styles.dots} aria-label={DOTS_LABEL}>
          {PHOTOS.map((photo, i) => (
            <button
              className={styles.dot}
              key={photo.tone}
              type="button"
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
