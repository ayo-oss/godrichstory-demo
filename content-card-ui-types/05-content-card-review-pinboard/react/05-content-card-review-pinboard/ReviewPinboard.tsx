// ReviewPinboard — vanilla 판(run/081/demo/05-content-card-review-pinboard/index.html) 의 React 포트.
// 다단(column-count)에 길이가 제각각인 카드를 흘려 넣고, break-inside: avoid 로 칸 경계에서 안 잘리게 한다.
// 자리를 잡는 순서는 animation-delay 의 시차 — 지연 구간에도 시작 상태가 보이도록 fill-mode: backwards.
// @keyframes 본문은 vanilla 와 같은 글자다 (값을 다시 타이핑하지 않는다).
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ReviewPinboard.module.scss";

export type ReviewPinboardProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

type Review = { rate: string; say: string; by: string };

const REVIEWS: Review[] = [
  { rate: "5.0", say: "설명이 짧고 정확해서 팀 저장소에 그대로 붙여 넣었습니다.", by: "박서윤" },
  { rate: "4.8", say: "바로 돌아갑니다.", by: "정우진" },
  { rate: "5.0", say: "헤매던 자리가 여기서 풀렸어요.", by: "한소미" },
  { rate: "4.9", say: "주석까지 읽을 값어치가 있었고 폰에서도 줄이 안 깨집니다.", by: "오재희" },
  { rate: "4.7", say: "파일 하나로 끝나요.", by: "임도현" },
  { rate: "5.0", say: "예제가 받자마자 그대로 동작합니다.", by: "최나린" },
];

const STAGGER = [styles.d0, styles.d1, styles.d2, styles.d3, styles.d4, styles.d5];

export default function ReviewPinboard({
  duration = 600,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: ReviewPinboardProps) {
  const [preview, setPreview] = useState(true);

  const vars: Vars = {
    "--duration": duration + "ms",
    "--easing": easing,
    "--color": color,
  };

  return (
    <main className={styles.stage}>
      <svg className={styles.defs} aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <symbol id="pinStar" viewBox="0 0 256 256">
          <g fill="currentColor">
            <path d="m229.06 108.79l-48.7 42l14.88 62.79a8.4 8.4 0 0 1-12.52 9.17L128 189.09l-54.72 33.65a8.4 8.4 0 0 1-12.52-9.17l14.88-62.79l-48.7-42A8.46 8.46 0 0 1 31.73 94l63.91-5.2l24.62-59.6a8.36 8.36 0 0 1 15.48 0l24.62 59.6l63.91 5.2a8.46 8.46 0 0 1 4.79 14.79" opacity=".2" />
            <path d="M239.18 97.26A16.38 16.38 0 0 0 224.92 86l-59-4.76l-22.78-55.09a16.36 16.36 0 0 0-30.27 0L90.11 81.23L31.08 86a16.46 16.46 0 0 0-9.37 28.86l45 38.83L53 211.75a16.38 16.38 0 0 0 24.5 17.82l50.5-31.08l50.53 31.08A16.4 16.4 0 0 0 203 211.75l-13.76-58.07l45-38.83a16.43 16.43 0 0 0 4.94-17.59m-15.34 5.47l-48.7 42a8 8 0 0 0-2.56 7.91l14.88 62.8a.37.37 0 0 1-.17.48c-.18.14-.23.11-.38 0l-54.72-33.65a8 8 0 0 0-8.38 0l-54.72 33.67c-.15.09-.19.12-.38 0a.37.37 0 0 1-.17-.48l14.88-62.8a8 8 0 0 0-2.56-7.91l-48.7-42c-.12-.1-.23-.19-.13-.5s.18-.27.33-.29l63.92-5.16a8 8 0 0 0 6.72-4.94l24.62-59.61c.08-.17.11-.25.35-.25s.27.08.35.25L153 91.86a8 8 0 0 0 6.75 4.92l63.92 5.16c.15 0 .24 0 .33.29s0 .4-.16.5" />
          </g>
        </symbol>
      </svg>

      <div
        className={styles.board + (preview ? " " + styles.isDemo : "")}
        style={vars}
        onPointerDown={() => setPreview(false)}
      >
        {REVIEWS.map((r, i) => (
          <article className={styles.card + " " + STAGGER[i]} key={r.by}>
            <p className={styles.top}>
              <svg className={styles.star} aria-hidden="true">
                <use href="#pinStar" />
              </svg>
              <b className={styles.rate}>{r.rate}</b>
            </p>
            <p className={styles.say}>{r.say}</p>
            <p className={styles.by}>{r.by}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
