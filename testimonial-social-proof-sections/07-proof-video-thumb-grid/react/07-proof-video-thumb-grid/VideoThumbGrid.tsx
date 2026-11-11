import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./VideoThumbGrid.module.scss";

/* ambient 에 KeyboardEvent 가 없어 파일 안에 필요한 만큼만 선언한다 */
type KeyEvt = { key: string; preventDefault(): void };
type Box<T> = { current: T };

export type VideoClip = {
  /** 후기를 남긴 사람의 직함 한 줄 */
  name: string;
  /** 영상 길이 (예 "1:12") */
  time: string;
  /** 칸이 넓어졌을 때 드러나는 한마디 */
  quote: string;
};

export type VideoThumbGridProps = {
  label?: string;
  clips?: VideoClip[];
  /** 한 칸이 넓어졌다 제자리로 돌아오는 한 바퀴(ms) */
  duration?: number;
  easing?: string;
  /** 무대 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const PlayIcon = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true" focusable="false" fill="currentColor">
    <path d="M228.23,134.69,84.15,222.81A8,8,0,0,1,72,216.12V39.88a8,8,0,0,1,12.15-6.69l144.08,88.12A7.82,7.82,0,0,1,228.23,134.69Z" opacity="0.2" />
    <path d="M232.4,114.49,88.32,26.35a16,16,0,0,0-16.2-.3A15.86,15.86,0,0,0,64,39.87V216.13A15.94,15.94,0,0,0,80,232a16.07,16.07,0,0,0,8.36-2.35L232.4,141.51a15.81,15.81,0,0,0,0-27ZM80,215.94V40l143.83,88Z" />
  </svg>
);

const DEFAULT_CLIPS: VideoClip[] = [
  { name: "디자인팀 팀장", time: "1:12", quote: "주문서 흐름이 사흘 만에 정리됐다" },
  { name: "온라인 서점 대표", time: "0:48", quote: "재고 화면을 직접 고칠 수 있게 됐다" },
  { name: "학원 운영자", time: "2:05", quote: "수업 신청이 밤에도 들어온다" },
  { name: "동네 카페 사장", time: "1:36", quote: "예약 전화가 절반으로 줄었다" },
];

const THUMBS = [styles.thumbA, styles.thumbB, styles.thumbC, styles.thumbD];
const OPEN = [styles.open0, styles.open1, styles.open2, styles.open3];

export default function VideoThumbGrid({
  label = "영상 후기 모음",
  clips = DEFAULT_CLIPS,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ffd23f",
}: VideoThumbGridProps): ReactNode {
  const [loop, setLoop] = useState<boolean>(true);
  const [open, setOpen] = useState<number>(-1);
  const refs = useRef<Array<HTMLButtonElement | null>>([]) as Box<Array<HTMLButtonElement | null>>;

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  /* 한 칸만 열린다 — 열린 칸 번호가 격자의 grid-template-columns 를 바꾼다 */
  const toggle = (i: number): void => {
    setLoop(false);
    setOpen(open === i ? -1 : i);
  };

  /* 좌우 화살표로 칸을 옮긴다 (Home·End 는 양 끝) */
  const onKey = (e: KeyEvt, i: number): void => {
    const list = refs.current;
    let to = -1;
    if (e.key === "ArrowRight") { to = (i + 1) % clips.length; }
    if (e.key === "ArrowLeft") { to = (i - 1 + clips.length) % clips.length; }
    if (e.key === "Home") { to = 0; }
    if (e.key === "End") { to = clips.length - 1; }
    if (to < 0) { return; }
    e.preventDefault();
    setLoop(false);
    const next = list[to];
    if (next) { next.focus({ preventScroll: true }); }
  };

  const gridClass = [styles.grid, open >= 0 ? OPEN[open % OPEN.length] : ""].join(" ").trim();

  return (
    <section
      className={loop ? `${styles.vg} ${styles.isDemo}` : styles.vg}
      style={vars}
      aria-label={label}
      onPointerEnter={() => setLoop(false)}
      onFocus={() => setLoop(false)}
    >
      <div className={gridClass}>
        {clips.map((c: VideoClip, i: number) => (
          <button
            className={styles.item}
            key={c.name}
            type="button"
            aria-expanded={open === i}
            ref={(el: HTMLButtonElement | null) => { refs.current[i] = el; }}
            onClick={() => toggle(i)}
            onKeyDown={(e: KeyEvt) => onKey(e, i)}
          >
            <span className={`${styles.thumb} ${THUMBS[i % THUMBS.length]}`}>
              <span className={styles.play}><PlayIcon /></span>
              <span className={styles.time}>{c.time}</span>
            </span>
            <span className={styles.name}>{c.name}</span>
            <span className={styles.reveal}><span className={styles.quote}>{c.quote}</span></span>
          </button>
        ))}
      </div>
    </section>
  );
}
