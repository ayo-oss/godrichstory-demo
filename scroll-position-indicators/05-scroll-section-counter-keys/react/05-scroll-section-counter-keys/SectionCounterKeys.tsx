import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SectionCounterKeys.module.scss";

export type SectionCounterKeysProps = {
  title?: string;
  scenes?: [string, string][];
  hint?: string;
  groupLabel?: string;
  listLabel?: string;
  prevLabel?: string;
  nextLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 가 얇아 DOM·이벤트 타입을 못 쓴다 — 필요한 꼴만 로컬 타입으로 선언
type ScrollBox = { scrollTop: number; clientHeight: number; scrollTo: (o: { top: number; behavior: string }) => void };
type SecBox = { offsetTop: number; offsetHeight: number };
type KeyEvt = { key: string; preventDefault(): void };

const DEFAULT_SCENES: [string, string][] = [
  ["01", "처음 보는 화면"],
  ["02", "무엇을 만들까요"],
  ["03", "재료를 고르세요"],
  ["04", "조립이 시작돼요"],
  ["05", "색을 입힙니다"],
  ["06", "움직임을 붙여요"],
  ["07", "검사를 지나가요"],
  ["08", "포장하는 장면"],
  ["09", "다음 이야기로"],
];

function CaretUpIcon() {
  return <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M208,160H48l80-80Z" opacity="0.2"/><path d="M213.66,154.34l-80-80a8,8,0,0,0-11.32,0l-80,80A8,8,0,0,0,48,168H208a8,8,0,0,0,5.66-13.66ZM67.31,152,128,91.31,188.69,152Z"/></svg>;
}

function CaretDownIcon() {
  return <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M208,96l-80,80L48,96Z" opacity="0.2"/><path d="M215.39,92.94A8,8,0,0,0,208,88H48a8,8,0,0,0-5.66,13.66l80,80a8,8,0,0,0,11.32,0l80-80A8,8,0,0,0,215.39,92.94ZM128,164.69,67.31,104H188.69Z"/></svg>;
}

export default function SectionCounterKeys({
  title = "제품 소개 자료",
  scenes = DEFAULT_SCENES,
  hint = "화살표 키로도 넘어가요",
  groupLabel = "구간 카운터",
  listLabel = "장면 목록 — 위아래 화살표 키로 이동",
  prevLabel = "이전 장면",
  nextLabel = "다음 장면",
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: SectionCounterKeysProps) {
  const [current, setCurrent] = useState(0);
  const [live, setLive] = useState(demo);
  const viewRef = useRef<ScrollBox>(null);
  const secRefs = useRef<(SecBox | null)[]>([]);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 뷰포트 가운데에 가장 가까운 장면이 몇 번째인지
  function pick(): number {
    const view = viewRef.current;
    if (!view) return 0;
    const mid = view.scrollTop + view.clientHeight / 2;
    let best = 0;
    let dist = 1e9;
    (secRefs.current || []).forEach((s, i) => {
      if (!s) return;
      const d = Math.abs(s.offsetTop + s.offsetHeight / 2 - mid);
      if (d < dist) { dist = d; best = i; }
    });
    return best;
  }

  function onScroll() {
    setLive(false);
    setCurrent(pick());
  }

  function go(i: number) {
    setLive(false);
    const view = viewRef.current;
    const s = (secRefs.current || [])[Math.max(0, Math.min(scenes.length - 1, i))];
    if (!view || !s) return;
    view.scrollTo({ top: s.offsetTop, behavior: "smooth" });
  }

  // keydown — 위아래 화살표로 앞뒤 장면을 부른다
  function onKey(e: KeyEvt) {
    if (e.key === "ArrowDown") { e.preventDefault(); go(pick() + 1); }
    if (e.key === "ArrowUp") { e.preventDefault(); go(pick() - 1); }
  }

  const cls = [styles.sc, live ? styles.isDemo : ""].filter(Boolean).join(" ");
  const nums = ["n1", "n3", "n6", "n9"];

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <header className={styles.head}>
        <p className={styles.stitle}>{title}</p>
        <p className={styles.count}>
          {live ? (
            nums.map((n, i) => (
              <span className={`${styles.num} ${styles[n]}`} key={n} aria-hidden="true">{[1, 3, 6, 9][i]}</span>
            ))
          ) : (
            <b className={styles.now}>{current + 1}</b>
          )}
          <span className={styles.slash}> / {scenes.length}</span>
        </p>
      </header>
      <div className={styles.view} ref={viewRef} onScroll={onScroll} onKeyDown={onKey} tabIndex={0} role="region" aria-label={listLabel}>
        <div className={styles.track}>
          {scenes.map(([num, label], i) => (
            <article
              key={num}
              ref={(el: SecBox | null) => { if (secRefs.current) secRefs.current[i] = el; }}
              className={`${styles.sec} ${styles["s" + i]}`}
              aria-current={i === current ? "true" : undefined}
            >
              <b>{num}</b><span>{label}</span>
            </article>
          ))}
        </div>
      </div>
      <footer className={styles.keys}>
        <button className={styles.key} type="button" aria-label={prevLabel} onClick={() => go(pick() - 1)}>
          <CaretUpIcon />
        </button>
        <span className={styles.hint}>{hint}</span>
        <button className={styles.key} type="button" aria-label={nextLabel} onClick={() => go(pick() + 1)}>
          <CaretDownIcon />
        </button>
      </footer>
    </section>
  );
}
