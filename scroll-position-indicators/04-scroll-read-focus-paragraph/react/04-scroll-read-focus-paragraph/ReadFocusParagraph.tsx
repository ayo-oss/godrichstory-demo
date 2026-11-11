import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ReadFocusParagraph.module.scss";

export type ReadFocusParagraphProps = {
  title?: string;
  stateFormat?: string;
  paragraphs?: string[];
  groupLabel?: string;
  bodyLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 가 얇아 DOM 요소 타입을 못 쓴다 — 필요한 꼴만 로컬 타입으로 선언
type ScrollBox = { scrollTop: number; clientHeight: number };
type ParaBox = { offsetTop: number; offsetHeight: number };

const DEFAULT_PARAGRAPHS = [
  "첫 문단은 서비스가 무엇인지 설명합니다. 지나치면 흐려지고 가운데 오면 또렷해져요.",
  "두 번째 문단은 계정과 회원가입에 관한 이야기를 담습니다.",
  "세 번째 문단은 이용 중 지켜야 할 규칙을 적는 자리입니다.",
  "네 번째 문단은 환불과 철회에 관한 안내를 담습니다.",
  "마지막 문단은 문의처와 언제든 되돌아올 수 있다는 말로 끝나요.",
];

export default function ReadFocusParagraph({
  title = "서비스 이용약관",
  stateFormat = "지금: 문단 {n}",
  paragraphs = DEFAULT_PARAGRAPHS,
  groupLabel = "읽는 문단 초점",
  bodyLabel = "약관 본문",
  demo = true,
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
}: ReadFocusParagraphProps) {
  const [current, setCurrent] = useState(0);
  const [live, setLive] = useState(demo);
  const viewRef = useRef<ScrollBox>(null);
  const paraRefs = useRef<(ParaBox | null)[]>([]);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 가운데 띠(-45% ~ -45%)를 지나는 문단 하나만 고른다.
  // 로컬 타입(ScrollBox·ParaBox)과 DOM 의 Element 는 겹치지 않으므로 관측기에 넘길 때만 unknown 을 거쳐 단언한다
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const list = paraRefs.current || [];
          const i = list.indexOf(e.target as unknown as ParaBox);
          if (i >= 0) setCurrent(i);
        });
      },
      { root: view as unknown as Element, rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    (paraRefs.current || []).forEach((p) => { if (p) io.observe(p as unknown as Element); });
    return () => io.disconnect();
  }, []);

  function touch() {
    setLive(false);
  }

  const cls = [styles.rf, live ? styles.isDemo : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <header className={styles.head}>
        <p className={styles.rtitle}>{title}</p>
        <p className={styles.state}>{stateFormat.replace("{n}", String(current + 1))}</p>
      </header>
      <div className={styles.body}>
        <div className={styles.rail} aria-hidden="true">
          <span className={styles.dot} style={{ transform: `translateY(${current * 20}px)` }}></span>
        </div>
        <div
          className={styles.view}
          ref={viewRef}
          tabIndex={0}
          role="region"
          aria-label={bodyLabel}
          onWheel={touch}
          onPointerDown={touch}
          onTouchStart={touch}
          onKeyDown={touch}
        >
          <div className={styles.pad}>
            {paragraphs.map((p, i) => (
              <p
                key={p}
                ref={(el: ParaBox | null) => { if (paraRefs.current) paraRefs.current[i] = el; }}
                className={`${styles.p} ${styles["p" + (i + 1)]} ${i === current ? styles.cur : ""}`}
                aria-current={i === current ? "true" : undefined}
              >
                {p}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
