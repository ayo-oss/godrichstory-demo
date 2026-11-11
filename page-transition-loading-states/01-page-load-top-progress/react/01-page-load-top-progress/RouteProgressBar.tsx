import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./RouteProgressBar.module.scss";

export type RouteProgressBarProps = {
  /** 링크(탭) 라벨 — 누르면 가짜 fetch 진행이 시작된다 */
  links?: string[];
  bodyText?: string;
  waitLabel?: string;
  progressLabel?: string;
  navLabel?: string;
  groupLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 가 얇아 useRef 가 T | null 을 돌려준다 — 필요한 꼴만 로컬 타입으로 단언
type Box<T> = { current: T };

const DEFAULT_LINKS = ["Home", "Posts", "About"];
// 가짜 fetch 진행 — 마지막 100 뒤에만 띠가 사라진다
const STEPS = [12, 38, 66, 88, 100];

export default function RouteProgressBar({
  links = DEFAULT_LINKS,
  bodyText = "The screen you are on stays put; only the next one is fetched.",
  waitLabel = "Preparing the next screen",
  progressLabel = "Loading progress for the next screen",
  navLabel = "Screen navigation",
  groupLabel = "Route progress bar preview",
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: RouteProgressBarProps) {
  const [live, setLive] = useState(demo);
  const [current, setCurrent] = useState(0);
  const [head, setHead] = useState(links[0]);
  const [value, setValue] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const timer = useRef<number>(0) as Box<number>;

  useEffect(() => () => clearInterval(timer.current), []);

  function go(i: number) {
    setLive(false);
    setDone(false);
    setBusy(true);
    setCurrent(i);
    setValue(0);
    clearInterval(timer.current);
    let k = 0;
    timer.current = window.setInterval(() => {
      setValue(STEPS[k]);
      k += 1;
      if (k < STEPS.length) return;
      clearInterval(timer.current);
      setHead(links[i]);
      setBusy(false);
      // 100% 뒤 페이드는 실제 클릭 경로에서만 — 미리보기 루프는 재현하지 않는다
      setDone(true);
    }, 240);
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = [styles.rp, live ? styles.isDemo : "", done ? styles.isDone : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <div className={styles.bar}>
        <span
          className={styles.fill}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={progressLabel}
          style={{ transform: `scaleX(${value / 100})` }}
        />
      </div>
      <nav className={styles.tabs} aria-label={navLabel}>
        {links.map((l, i) => (
          <button
            className={[styles.tab, i === current ? styles.isCurrent : ""].filter(Boolean).join(" ")}
            type="button"
            key={l}
            aria-current={i === current ? "page" : undefined}
            onClick={() => go(i)}
          >
            <span className={styles.pill} aria-hidden="true" />
            <span className={styles.label}>{l}</span>
          </button>
        ))}
      </nav>
      <div className={styles.view} aria-busy={busy}>
        <p className={styles.head}>{head}</p>
        <p className={styles.wait}>{waitLabel}</p>
        <p className={styles.text}>{bodyText}</p>
      </div>
    </section>
  );
}
