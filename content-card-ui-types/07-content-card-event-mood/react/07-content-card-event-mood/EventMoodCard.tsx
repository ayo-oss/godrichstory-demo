// EventMoodCard — vanilla 판(run/081/demo/07-content-card-event-mood/index.html) 의 React 포트.
// 색 띠는 rotate 로 기울고 mix-blend-mode: multiply 로 카드 면과 곱해진다 — 카드에 isolation: isolate 가
// 없으면 무대(주황)까지 뚫고 섞인다. 제목 줄은 animation-delay 로 카드 순서에 올라온다.
// @keyframes 본문은 vanilla 와 같은 글자다 (값을 다시 타이핑하지 않는다).
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./EventMoodCard.module.scss";

export type EventMoodCardProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

type Event = { num: string; mon: string; title: string; place: string; link: string; href: string; mood: string };

// 링크 글자는 조각으로 잇지 않는다 — 언어팩 사전의 키가 문장 전체여야 en·ja 판이 반쪽으로 안 나간다
const EVENTS: Event[] = [
  { num: "12", mon: "10월", title: "밤의 재즈 소품집", place: "연남 골목홀", link: "밤의 재즈 소품집 예매", href: "#jazz", mood: "moodA" },
  { num: "19", mon: "10월", title: "종이 공예 워크숍", place: "성수 작업실", link: "종이 공예 워크숍 예매", href: "#paper", mood: "moodB" },
  { num: "26", mon: "10월", title: "가을 야외 상영회", place: "한강 잔디마당", link: "가을 야외 상영회 예매", href: "#screen", mood: "moodC" },
];

function MapPin() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256">
      <g fill="currentColor">
        <path d="M128 24a80 80 0 0 0-80 80c0 72 80 128 80 128s80-56 80-128a80 80 0 0 0-80-80m0 112a32 32 0 1 1 32-32a32 32 0 0 1-32 32" opacity=".2" />
        <path d="M128 64a40 40 0 1 0 40 40a40 40 0 0 0-40-40m0 64a24 24 0 1 1 24-24a24 24 0 0 1-24 24m0-112a88.1 88.1 0 0 0-88 88c0 31.4 14.51 64.68 42 96.25a254.2 254.2 0 0 0 41.45 38.3a8 8 0 0 0 9.18 0a254.2 254.2 0 0 0 41.37-38.3c27.45-31.57 42-64.85 42-96.25a88.1 88.1 0 0 0-88-88m0 206c-16.53-13-72-60.75-72-118a72 72 0 0 1 144 0c0 57.23-55.47 105-72 118" />
      </g>
    </svg>
  );
}

export default function EventMoodCard({
  duration = 600,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: EventMoodCardProps) {
  const [preview, setPreview] = useState(true);

  const vars: Vars = {
    "--duration": duration + "ms",
    "--easing": easing,
    "--color": color,
  };
  const stop = () => setPreview(false);

  return (
    <main className={styles.stage}>
      <ul
        className={styles.em + (preview ? " " + styles.isDemo : "")}
        style={vars}
        onPointerDown={stop}
        onFocus={stop}
      >
        {EVENTS.map((ev) => (
          <li className={styles.card} key={ev.href}>
            <span className={styles.mood + " " + styles[ev.mood]} aria-hidden="true" />
            <div className={styles.day}>
              <b className={styles.num}>{ev.num}</b>
              <span className={styles.mon}>{ev.mon}</span>
            </div>
            <div className={styles.body}>
              <div className={styles.line}>
                <h3 className={styles.title}>{ev.title}</h3>
              </div>
              <p className={styles.place}>
                <span className={styles.ic} aria-hidden="true"><MapPin /></span>
                {ev.place}
              </p>
              <a className={styles.link} href={ev.href}>{ev.link}</a>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
