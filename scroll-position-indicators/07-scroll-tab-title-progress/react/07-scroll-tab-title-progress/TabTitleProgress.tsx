import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TabTitleProgress.module.scss";

export type TabTitleProgressProps = {
  title?: string;
  titlesAt?: [string, string, string, string];
  lede?: string;
  tail?: string;
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
type ScrollBox = { scrollTop: number; scrollHeight: number; clientHeight: number };

function ArticleIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M224,56V200a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V56a8,8,0,0,1,8-8H216A8,8,0,0,1,224,56Z" opacity="0.2"/><path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM184,96a8,8,0,0,1-8,8H80a8,8,0,0,1,0-16h96A8,8,0,0,1,184,96Zm0,32a8,8,0,0,1-8,8H80a8,8,0,0,1,0-16h96A8,8,0,0,1,184,128Zm0,32a8,8,0,0,1-8,8H80a8,8,0,0,1,0-16h96A8,8,0,0,1,184,160Z"/></svg>
  );
}

export default function TabTitleProgress({
  title = "주말에 읽는 긴 글",
  titlesAt = ["주말에 읽는 긴 글", "34% · 주말에 읽는 긴 글", "78% · 주말에 읽는 긴 글", "100% · 주말에 읽는 긴 글"],
  lede = "탭을 여러 개 열어 두고 읽는 글이에요.",
  tail = "브라우저 탭 이름이 지금 몇 % 인지 따라 바뀌어요.",
  groupLabel = "읽기 진행",
  bodyLabel = "긴 글 본문",
  demo = true,
  duration = 2000,
  easing = "linear",
  color = "#fff7e6",
}: TabTitleProgressProps) {
  const [pct, setPct] = useState(0);
  const [live, setLive] = useState(demo);
  const viewRef = useRef<ScrollBox>(null);
  const ringRef = useRef<HTMLElement>(null);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // document.title 앞에 진행률 숫자를 붙인다 — 탭만 보고도 위치를 안다
  useEffect(() => {
    if (live) return;
    document.title = pct > 0 ? pct + "% · " + title : title;
  }, [pct, live, title]);

  function onScroll() {
    const el = viewRef.current;
    if (!el) return;
    setLive(false);
    const max = el.scrollHeight - el.clientHeight;
    const now = max > 0 ? Math.round((el.scrollTop / max) * 100) : 0;
    setPct(now);
    // @property 등록값은 요소 자신에게 얹는다
    const ring = ringRef.current;
    if (ring) ring.style.setProperty("--p", ((max > 0 ? el.scrollTop / max : 0)).toFixed(3));
  }

  const cls = [styles.tt, live ? styles.isDemo : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label="탭 이름에 적히는 진행률">
      <div className={styles.bar} role="progressbar" aria-label={groupLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <span className={styles.tab}>
          <span className={styles.ring} ref={ringRef} aria-hidden="true"><ArticleIcon /></span>
          <span className={styles.titles}>
            {live ? (
              // 미리보기 루프 — 네 문구를 같은 자리에 겹쳐 두고 컷으로 갈아 낀다
              titlesAt.map((t, i) => (
                <b className={`${styles.t} ${styles["t" + i]}`} key={i}>{t}</b>
              ))
            ) : (
              // 정적(실제 사용) 경로 — 실제 진행률 숫자를 붙인 한 칸만
              <b className={`${styles.t} ${styles.t0}`}>{pct > 0 ? pct + "% · " + title : title}</b>
            )}
          </span>
          <span className={styles.x} aria-hidden="true"></span>
        </span>
      </div>
      <div className={styles.view} ref={viewRef} onScroll={onScroll} tabIndex={0} role="region" aria-label={bodyLabel}>
        <div className={styles.pad}>
          <p className={styles.lede}>{lede}</p>
          <p className={styles.line}></p>
          <p className={styles.line}></p>
          <p className={styles.line}></p>
          <p className={styles.line}></p>
          <p className={styles.line}></p>
          <p className={styles.tail}>{tail}</p>
        </div>
      </div>
    </section>
  );
}
