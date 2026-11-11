import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./VelocityResponse.module.scss";

export type VelocityResponseProps = {
  title?: string;
  attr?: string;
  lines?: string[];
  filler?: string;
  meterLabel?: string;
  groupLabel?: string;
  listLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 가 얇아 DOM 요소 타입을 못 쓴다 — 필요한 꼴만 로컬 타입으로 선언
type Box<T> = { current: T };
type KeyEvt = { key: string };

const DEFAULT_LINES: string[] = ["빠르게 내리면", "글자가 눕고", "벌어진다"];

export default function VelocityResponse({
  title = "속도 반응",
  attr = "--vel",
  lines = DEFAULT_LINES,
  filler = "다음 섹션",
  meterLabel = "스크롤 속도",
  groupLabel = "속도 반응 데모",
  listLabel = "타이틀 미리보기 — 빠르게 스크롤해 보세요",
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: VelocityResponseProps) {
  const [live, setLive] = useState(demo);
  const [num, setNum] = useState("0.00");
  const rootRef = useRef<HTMLElement>(null) as unknown as Box<HTMLElement | null>;
  const viewRef = useRef<HTMLDivElement>(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    const view = viewRef.current;
    if (!root || !view) return;
    let lastY = view.scrollTop;
    let vel = 0;
    let raf = 0;
    // 프레임 사이 이동량으로 스크롤 속도를 재고 --vel 로 넘긴다 — 멈추면 감쇠해 0 으로 돌아온다
    const tick = () => {
      const y = view.scrollTop;
      const dy = Math.abs(y - lastY);
      lastY = y;
      const target = Math.min(dy / 26, 1);
      vel += (target - vel) * 0.16;
      if (vel < 0.004) vel = 0;
      root.style.setProperty("--vel", vel.toFixed(4));
      // 읽는 순간의 --vel — 미리보기 중에는 애니메이션 값이 인라인 값보다 우선한다
      const shown = parseFloat(getComputedStyle(root).getPropertyValue("--vel")) || 0;
      setNum(shown.toFixed(2));
      raf = requestAnimationFrame(tick);
    };
    // reduce 에서는 속도 효과만 끈다 — 엔진을 돌리지 않아 --vel 은 0 그대로다 (기울기 0deg)
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };

  return (
    <section
      ref={rootRef as unknown as Box<HTMLElement>}
      className={`${styles.vl} ${live ? styles.isDemo : ""}`}
      style={vars}
      aria-label={groupLabel}
    >
      <header className={styles.head}>
        <p className={styles.title}>{title}</p>
        <p className={styles.attr}><code>{attr}</code></p>
      </header>
      <div
        className={styles.view}
        ref={viewRef as unknown as Box<HTMLDivElement>}
        onScroll={() => setLive(false)}
        onPointerDown={() => setLive(false)}
        onKeyDown={(e: KeyEvt) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") setLive(false);
        }}
        tabIndex={0}
        role="region"
        aria-label={listLabel}
      >
        <div className={styles.track}>
          <div className={styles.rule} aria-hidden="true"><span /><span /></div>
          {lines.map((text, i) => (
            <h2 key={text} className={`${styles.line} ${i % 2 === 0 ? styles.lineOdd : styles.lineEven}`}>
              {text}
            </h2>
          ))}
          <p className={styles.filler} aria-hidden="true">{filler}</p>
        </div>
      </div>
      <footer className={styles.meter} aria-label={meterLabel}>
        <span className={styles.bar}><span className={styles.fill} /></span>
        <b className={styles.num}>{num}</b>
      </footer>
    </section>
  );
}
