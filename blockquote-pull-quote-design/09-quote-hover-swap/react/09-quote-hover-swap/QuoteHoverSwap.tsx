// QuoteHoverSwap — vanilla 판(run/282/demo/09-quote-hover-swap) 의 React 포트.
import { useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import styles from "./QuoteHoverSwap.module.scss";

export type QuoteLine = { id: string; text: string };

export type QuoteHoverSwapProps = {
  lines?: QuoteLine[];
  nextLabel?: string;
  groupLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const DEFAULT_LINES: QuoteLine[] = [
  { id: "read", text: "코드는 읽히기 위해 쓴다." },
  { id: "wait", text: "화면은 기다리는 사람을 배려한다." },
  { id: "digits", text: "숫자는 자릿수를 지킨다." },
];

function QuotesMark({ bump }: { bump: boolean }) {
  const cls = [styles.mark, bump ? styles.isBump : ""].filter(Boolean).join(" ");
  return (
    <svg className={cls} viewBox="0 0 256 256" width="20" height="20" fill="currentColor" aria-hidden="true"><g><path d="M108 72v72H40a8 8 0 0 1-8-8V72a8 8 0 0 1 8-8h60a8 8 0 0 1 8 8m108-8h-60a8 8 0 0 0-8 8v64a8 8 0 0 0 8 8h68V72a8 8 0 0 0-8-8" opacity=".2"/><path d="M100 56H40a16 16 0 0 0-16 16v64a16 16 0 0 0 16 16h60v8a32 32 0 0 1-32 32a8 8 0 0 0 0 16a48.05 48.05 0 0 0 48-48V72a16 16 0 0 0-16-16m0 80H40V72h60Zm116-80h-60a16 16 0 0 0-16 16v64a16 16 0 0 0 16 16h60v8a32 32 0 0 1-32 32a8 8 0 0 0 0 16a48.05 48.05 0 0 0 48-48V72a16 16 0 0 0-8-16m0 80h-60V72h60Z"/></g></svg>
  );
}

export default function QuoteHoverSwap({
  lines = DEFAULT_LINES,
  nextLabel = "다음 인용",
  groupLabel = "손을 얹으면 바뀌는 인용구",
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: QuoteHoverSwapProps) {
  const [live, setLive] = useState(demo);
  const [index, setIndex] = useState(0);
  const [bump, setBump] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 다음 인용으로 — 교체를 알리는 따옴표 튕김을 한 번 되돌렸다 켠다
  function applyNext(next: number) {
    setIndex(next);
    setBump(false);
    setTimeout(() => setBump(true), 0);
  }
  function goNext() {
    applyNext((index + 1) % lines.length);
  }
  // 카드에 손을 얹으면 격자 루프를 뗀다 — 이때부터 상태가 곧 화면이다
  function onEnter() {
    setLive(false);
    applyNext((index + 1) % lines.length);
  }
  // 버튼은 키보드 경로다 — 마우스 클릭(detail > 0)은 진입(hover)에서 이미 한 번
  // 진행됐으므로 무시한다. 두 번 건너뛰는 것을 막는다.
  function onNextClick(event: ReactMouseEvent<HTMLButtonElement>) {
    if (event.detail > 0) return;
    goNext();
  }

  const cls = [styles.qx, live ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <figure className={cls} style={vars} aria-label={groupLabel} onMouseEnter={onEnter}>
      <QuotesMark bump={bump} />
      <div className={styles.swap} aria-live="polite">
        {lines.map((line, i) => (
          <p
            key={line.id}
            className={[styles.line, i === index ? styles.isOn : ""].filter(Boolean).join(" ")}
            aria-hidden={i === index ? "false" : "true"}
          >
            {line.text}
          </p>
        ))}
      </div>
      <figcaption className={styles.foot}>
        <span className={styles.dots} aria-hidden="true">
          {lines.map((line, i) => (
            <span key={line.id} className={[styles.dot, i === index ? styles.isOn : ""].filter(Boolean).join(" ")}></span>
          ))}
        </span>
        <button className={styles.next} type="button" onClick={onNextClick}>{nextLabel}</button>
      </figcaption>
    </figure>
  );
}
