// WaterfallOrderGrid — vanilla 판(run/081/demo/09-content-card-waterfall-order/index.html) 의 React 포트.
// grid-auto-flow: row dense 가 남는 칸을 되짚어 채우고, 키 큰 카드의 grid-row 명시 배치가
// 번호 순서를 지킨다. 나중에 붙은 공지는 order: -1 로 배치에서만 맨 앞으로 보낸다.
// @keyframes 본문은 vanilla 와 같은 글자다 (값을 다시 타이핑하지 않는다).
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./WaterfallOrderGrid.module.scss";

export type WaterfallOrderGridProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

type Card = { no: string; title: string; meta: string; cls: string[] };

// HTML 순서가 곧 자동 배치 순서다. 공지(1번)는 마지막에 붙는다 — order 로 앞으로 보낸다
const CARDS: Card[] = [
  { no: "2", title: "사진 고르는 기준", meta: "읽는 데 6분", cls: ["tall", "s2"] },
  { no: "3", title: "여백 눈금", meta: "3분", cls: ["s3"] },
  { no: "4", title: "색 이름 정리", meta: "2분", cls: ["s4"] },
  { no: "5", title: "긴 제목이 줄바꿈될 때", meta: "읽는 데 7분", cls: ["tall", "s5"] },
  { no: "6", title: "목록 카드 폭 잡기", meta: "읽는 데 4분", cls: ["wide", "s6"] },
  { no: "1", title: "이번 주 공지", meta: "고정한 글", cls: ["pin", "s1"] },
];

export default function WaterfallOrderGrid({
  duration = 600,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#0a4fe8",
}: WaterfallOrderGridProps) {
  const [preview, setPreview] = useState(true);

  const vars: Vars = {
    "--duration": duration + "ms",
    "--easing": easing,
    "--color": color,
  };
  const stop = () => setPreview(false);

  return (
    <main className={styles.stage}>
      <ol
        className={styles.wf + (preview ? " " + styles.isDemo : "")}
        style={vars}
        onPointerDown={stop}
        onFocus={stop}
      >
        {CARDS.map((card) => (
          <li className={[styles.card].concat(card.cls.map((c) => styles[c])).join(" ")} key={card.no}>
            <span className={styles.no}>{card.no}</span>
            <h3 className={styles.title}>{card.title}</h3>
            <p className={styles.meta}>{card.meta}</p>
          </li>
        ))}
      </ol>
    </main>
  );
}
