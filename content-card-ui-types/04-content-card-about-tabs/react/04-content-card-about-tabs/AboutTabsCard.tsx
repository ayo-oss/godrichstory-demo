// AboutTabsCard — vanilla 판(run/081/demo/04-content-card-about-tabs/index.html) 의 React 포트.
// 바닐라는 라디오 입력의 :checked 를 카드가 :has() 로 읽어 상태를 잡는다. React 판은 그 상태를
// useState 하나로 들고, 밑줄의 자리는 CSS 변수 --tab(0·1·2)에 넘겨 같은 $step 값으로 계산한다.
// 미리보기 루프(@keyframes)는 vanilla 와 같은 글자다 (값을 다시 타이핑하지 않는다).
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./AboutTabsCard.module.scss";

export type AboutTabsCardProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--tab"?: string;
};

const NAME = "정다인";
const ROLE = "프론트엔드 개발자";
const TABS = ["소개", "경력", "연락"];
const INTRO = ["여덟 해째 웹 화면을 만듭니다.", "작은 움직임으로 설명하는 일을 좋아합니다."];
const CAREER = [
  { year: "2021 — 지금", job: "Studio On · 프론트엔드 리드" },
  { year: "2018 — 2021", job: "Lightup · UI 개발" },
];
const MAIL = "정다인에게 메일 보내기";
const REPLY = "평일 낮에 가장 빨리 답합니다.";

export default function AboutTabsCard({
  duration = 600,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: AboutTabsCardProps) {
  const [tab, setTab] = useState(0);
  const [preview, setPreview] = useState(true);

  const vars: Vars = {
    "--duration": duration + "ms",
    "--easing": easing,
    "--color": color,
    "--tab": String(tab),
  };

  const pick = (i: number) => {
    setPreview(false);
    setTab(i);
  };

  const panelClass = (i: number) => styles.panel + (tab === i ? " " + styles.isOn : "");

  return (
    <main className={styles.stage}>
      <div className={styles.card + (preview ? " " + styles.isDemo : "")} style={vars}>
        <div className={styles.head}>
          <span className={styles.face} aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256">
              <g fill="currentColor">
                <path d="M192 96a64 64 0 1 1-64-64a64 64 0 0 1 64 64" opacity=".2" />
                <path d="M230.92 212c-15.23-26.33-38.7-45.21-66.09-54.16a72 72 0 1 0-73.66 0c-27.39 8.94-50.86 27.82-66.09 54.16a8 8 0 1 0 13.85 8c18.84-32.56 52.14-52 89.07-52s70.23 19.44 89.07 52a8 8 0 1 0 13.85-8M72 96a56 56 0 1 1 56 56a56.06 56.06 0 0 1-56-56" />
              </g>
            </svg>
          </span>
          <span className={styles.who}>
            <span className={styles.name}>{NAME}</span>
            <span className={styles.role}>{ROLE}</span>
          </span>
        </div>

        <div className={styles.tabs}>
          {TABS.map((label, i) => (
            <span className={styles.slot} key={label}>
              <input
                className={styles.radio}
                type="radio"
                name="aboutTab"
                id={"aboutTab" + i}
                checked={tab === i}
                onChange={() => pick(i)}
              />
              <label className={styles.tab + (tab === i ? " " + styles.isPick : "")} htmlFor={"aboutTab" + i}>
                {label}
              </label>
            </span>
          ))}
          <span className={styles.ink} aria-hidden="true" />
        </div>

        <div className={styles.body}>
          <div className={panelClass(0) + " " + styles.panelA}>
            <p className={styles.line}>{INTRO[0]}</p>
            <p className={styles.line + " " + styles.lineDim}>{INTRO[1]}</p>
          </div>

          <div className={panelClass(1) + " " + styles.panelB}>
            {CAREER.map((row) => (
              <p className={styles.row} key={row.year}>
                <b className={styles.year}>{row.year}</b>
                <span className={styles.job}>{row.job}</span>
              </p>
            ))}
          </div>

          <div className={panelClass(2) + " " + styles.panelC}>
            <a className={styles.mail} href="#dain-mail">
              <span className={styles.ico} aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256">
                  <g fill="currentColor">
                    <path d="m224 56l-96 88l-96-88Z" opacity=".2" />
                    <path d="M224 48H32a8 8 0 0 0-8 8v136a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a8 8 0 0 0-8-8m-20.57 16L128 133.15L52.57 64ZM216 192H40V74.19l82.59 75.71a8 8 0 0 0 10.82 0L216 74.19z" />
                  </g>
                </svg>
              </span>
              {MAIL}
            </a>
            <p className={styles.line + " " + styles.lineDim}>{REPLY}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
