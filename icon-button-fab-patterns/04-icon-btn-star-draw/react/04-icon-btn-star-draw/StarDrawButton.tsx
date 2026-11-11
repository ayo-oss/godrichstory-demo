import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./StarDrawButton.module.scss";

export type StarDrawButtonProps = {
  title?: string;
  meta?: string;
  /** 꺼진 상태의 버튼 이름 (누르면 담긴다) */
  addLabel?: string;
  /** 켜진 상태의 버튼 이름 (누르면 빠진다) */
  removeLabel?: string;
  savedText?: string;
  removedText?: string;
  groupLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  /** 테두리를 그리는 시간(ms). 채움 컷은 이 시간이 끝난 뒤에 온다 */
  duration?: number;
  easing?: string;
  /** 다 그린 별의 채움색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

// vanilla 판 index.html 에 인라인된 Phosphor Duotone 별 — 테두리용·채움용 두 장이 같은 경로를 쓴다
const STAR =
  "M239.18,97.26A16.38,16.38,0,0,0,224.92,86l-59-4.76L143.14,26.15a16.36,16.36,0,0,0-30.27,0L90.11,81.23,31.08,86a16.46,16.46,0,0,0-9.37,28.86l45,38.83L53,211.75a16.38,16.38,0,0,0,24.5,17.82L128,198.49l50.53,31.08A16.4,16.4,0,0,0,203,211.75l-13.76-58.07,45-38.83A16.43,16.43,0,0,0,239.18,97.26Z";

function Thumb() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <path
        d="M224,56V178.06l-39.72-39.72a8,8,0,0,0-11.31,0L147.31,164,97.66,114.34a8,8,0,0,0-11.32,0L32,168.69V56a8,8,0,0,1,8-8H216A8,8,0,0,1,224,56Z"
        opacity=".2"
      />
      <path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,16V158.75l-26.07-26.06a16,16,0,0,0-22.63,0l-20,20-44-44a16,16,0,0,0-22.62,0L40,149.37V56ZM40,172l52-52,80,80H40Zm176,28H194.63l-36-36,20-20L216,181.38V200ZM144,100a12,12,0,1,1,12,12A12,12,0,0,1,144,100Z" />
    </svg>
  );
}

export default function StarDrawButton({
  title = "Spring garden dress",
  meta = "Soft mint · one size",
  addLabel = "Add to favorites",
  removeLabel = "Remove from favorites",
  savedText = "Saved to favorites",
  removedText = "Removed from favorites",
  groupLabel = "Product card you can save to favorites",
  demo = true,
  duration = 460,
  easing = "ease-out",
  color = "#ffd23f",
}: StarDrawButtonProps) {
  const [on, setOn] = useState(false);
  const [live, setLive] = useState(demo);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 누르면 미리보기 루프를 끄고 사람이 만든 상태만 남긴다
  function toggle() {
    setLive(false);
    setOn((v) => !v);
  }

  const cls = [styles.st, live ? styles.isDemo : "", on ? styles.isOn : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <article className={styles.card}>
        <span className={styles.thumb} aria-hidden="true">
          <Thumb />
        </span>
        <div className={styles.body}>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.meta}>{meta}</p>
        </div>
        <button
          className={styles.btn}
          type="button"
          aria-pressed={on}
          aria-label={on ? removeLabel : addLabel}
          onClick={toggle}
        >
          <span className={styles.star} aria-hidden="true">
            {/* 바탕 — 담기 전에도 별자리가 보이게 옅은 윤곽을 늘 깔아 둔다 */}
            <svg className={styles.base} viewBox="0 0 256 256" width="1em" height="1em">
              <path d={STAR} />
            </svg>
            {/* 테두리 — pathLength 100 이라 100 → 0 으로 한 바퀴 그려진다 */}
            <svg className={styles.draw} viewBox="0 0 256 256" width="1em" height="1em">
              <path pathLength={100} d={STAR} />
            </svg>
            {/* 채움 — 반투명으로 섞지 않고 그리기가 끝난 뒤 컷으로 나타난다 */}
            <svg className={styles.fill} viewBox="0 0 256 256" width="1em" height="1em" aria-hidden="true">
              <path pathLength={100} d={STAR} />
            </svg>
          </span>
        </button>
        <p className={styles.saved} aria-live="polite">
          {on ? savedText : removedText}
        </p>
      </article>
    </section>
  );
}
