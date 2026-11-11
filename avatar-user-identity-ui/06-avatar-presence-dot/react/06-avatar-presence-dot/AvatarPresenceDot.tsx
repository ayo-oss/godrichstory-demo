import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./AvatarPresenceDot.module.scss";

export type AvatarPresenceDotProps = {
  sectionLabel?: string;
  name?: string;
  stateTexts?: { online: string; away: string; busy: string };
  buttonLabel?: string;
  /** 세 상태를 한 바퀴에 도는 시간(ms) */
  duration?: number;
  easing?: string;
  /** 아바타 면 색 */
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

// 이니셜은 표시 문자열에서 계산한다 — 하드코딩하지 않아야 언어팩이 바뀌어도 따라간다
function initialOf(name: string): string {
  const words = name.trim().split(/\s+/);
  if (/[A-Za-z]/.test(words[0].charAt(0))) {
    return words.slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("");
  }
  return words[0].charAt(0);
}

const ORDER = ["online", "away", "busy"] as const;

export default function AvatarPresenceDot({
  sectionLabel = "접속 상태 표시",
  name = "기획자",
  stateTexts = { online: "접속 중", away: "자리 비움", busy: "다른 용무 중" },
  buttonLabel = "상태 바꾸기",
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#5b4bd6",
}: AvatarPresenceDotProps): ReactNode {
  const [loop, setLoop] = useState<boolean>(true);
  const [idx, setIdx] = useState<number>(0);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const state = ORDER[idx];
  // aria-label 은 조사 앞뒤 공백이 생기지 않게 처음부터 완성된 문장으로 만든다
  const wrapLabel = `${name}, ${stateTexts[state]}`;

  return (
    <section
      className={loop ? `${styles.pd} ${styles.isDemo}` : styles.pd}
      data-state={state}
      style={vars}
      aria-label={sectionLabel}
      onPointerDown={() => setLoop(false)}
      onFocus={() => setLoop(false)}
    >
      <div className={styles.body}>
        <div className={styles.wrap} role="img" aria-label={wrapLabel}>
          {/* 마스크가 아바타 면에 구멍을 파고, 점이 그 구멍에 앉는다 */}
          <span className={styles.av}>{initialOf(name)}</span>
          <span className={styles.dot} aria-hidden="true" />
        </div>
        <div className={styles.meta}>
          <p className={styles.name}>{name}</p>
          <p className={styles.state}>
            <span data-key="online">{stateTexts.online}</span>
            <span data-key="away">{stateTexts.away}</span>
            <span data-key="busy">{stateTexts.busy}</span>
          </p>
        </div>
      </div>

      <button
        className={styles.btn}
        type="button"
        onClick={() => setIdx((i) => (i + 1) % ORDER.length)}
      >
        {buttonLabel}
      </button>
    </section>
  );
}
