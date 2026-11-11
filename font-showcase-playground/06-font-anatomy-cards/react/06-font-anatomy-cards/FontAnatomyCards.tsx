// FontAnatomyCards — vanilla 판(run/074/demo/06-font-anatomy-cards/index.html) 의 React 포트.
// 세리프와 산세리프 카드에 기준선·x 높이·대문자 높이 줄을 겹쳐 그린다.
// x 높이 줄만 1ex 로 그 실제 서체 치수에서 나온다 — 카드마다 자리가 달라진다.
import { useState } from "react";
import type { FC } from "react";
import styles from "./FontAnatomyCards.module.scss";

export type FontAnatomyCardsProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Face = "serif" | "sans";
const FACES: Face[] = ["serif", "sans"];
const FACE_LABEL: Record<Face, string> = { serif: "세리프", sans: "산세리프" };
const NOTE = "x 높이 줄은 ex 단위로 그려 서체마다 자리가 달라집니다";
const TAGS = ["대문자 높이", "x 높이", "기준선"] as const;

const RULE_CLASS: Record<(typeof TAGS)[number], string> = {
  "대문자 높이": "fa__rule--cap",
  "x 높이": "fa__rule--x",
  "기준선": "fa__rule--base",
};

const Card: FC<{ face: Face }> = ({ face }) => (
  <figure className={styles["fa__card--" + face]}>
    <span className={styles.fa__sample} aria-hidden="true">Hxg</span>
    {TAGS.map((t) => (
      <span key={t} className={[styles.fa__rule, styles[RULE_CLASS[t]]].join(" ")}>
        <span className={styles.fa__tag}>{t}</span>
      </span>
    ))}
    <figcaption className={styles.fa__name}>{FACE_LABEL[face]}</figcaption>
  </figure>
);

const FontAnatomyCards: FC<FontAnatomyCardsProps> = ({ duration, easing, color }) => {
  const [face, setFace] = useState<Face>("serif");
  const [demo, setDemo] = useState(true);

  const cls = [styles.fa, demo ? styles["is-demo"] : "", styles["is-" + face]]
    .filter(Boolean).join(" ");
  const vars = {
    "--duration": duration != null ? duration + "ms" : undefined,
    "--easing": easing,
    "--color": color,
  } as never;

  return (
    <div className={cls} style={vars}>
      <div className={styles.fa__bar} role="group" aria-label="표본 고르기">
        {FACES.map((f) => (
          <button
            key={f}
            type="button"
            className={styles.fa__pick}
            aria-pressed={face === f ? "true" : "false"}
            onClick={() => {
              setDemo(false);
              setFace(f);
            }}
          >
            {FACE_LABEL[f]}
          </button>
        ))}
      </div>
      <div className={styles.fa__cards}>
        <Card face="serif" />
        <Card face="sans" />
      </div>
      <p className={styles.fa__note}>{NOTE}</p>
    </div>
  );
};

export default FontAnatomyCards;
