import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ThresholdGauge.module.scss";

export type ThresholdGaugeProps = {
  title?: string;
  attr?: string;
  lead?: string;
  targetTitle?: string;
  targetSub?: string;
  viewLabel?: string;
  groupLabel?: string;
  candidatesLabel?: string;
  waiting?: string;
  reached?: string;
  foot?: string;
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
type ClickEvt = { target: { closest: (s: string) => HTMLElement | null } };

const CANDIDATES = [0, 0.25, 0.5, 1];
const NUM_LAYERS = ["0.00", "0.25", "0.50", "1.00"];

export default function ThresholdGauge({
  title = "임계값 게이지",
  attr = "threshold: [0, 0.25, 0.5, 1]",
  lead = "타깃이 아래에서 올라옵니다",
  targetTitle = "타깃 요소",
  targetSub = "높이의 몇 %가 들어왔나",
  viewLabel = "타깃 뷰포트 — 스크롤해 보세요",
  groupLabel = "임계값 게이지",
  candidatesLabel = "임계값 후보",
  waiting = "대기",
  reached = "임계값 도달",
  foot = "임계값을 지날 때만 관찰자가 알려줍니다",
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: ThresholdGaugeProps) {
  const [live, setLive] = useState(demo);
  const [ratio, setRatio] = useState(0);
  const [on, setOn] = useState(false);
  const [selected, setSelected] = useState(0.25);
  const viewRef = useRef<HTMLDivElement>(null) as unknown as Box<HTMLDivElement | null>;
  const targetRef = useRef<HTMLDivElement>(null) as unknown as Box<HTMLDivElement | null>;
  const selRef = useRef(0.25) as unknown as Box<number>;
  const inRef = useRef(false) as unknown as Box<boolean>;
  const ratioRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    if (live) return;
    const view = viewRef.current;
    const target = targetRef.current;
    if (!view || !target) return;
    // 관찰자는 임계값 후보를 지날 때만 보고한다 — 숫자·게이지는 계단으로 갱신된다
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const r = entry.intersectionRatio;
          ratioRef.current = r;
          inRef.current = entry.isIntersecting;
          setRatio(r);
          setOn(entry.isIntersecting && r >= selRef.current - 0.01);
        });
      },
      { root: view, threshold: [0, 0.25, 0.5, 1] }
    );
    io.observe(target);
    return () => io.disconnect();
  }, [live]);

  const pick = (e: ClickEvt) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    setLive(false);
    const v = parseFloat(btn.getAttribute("data-th") || "0");
    selRef.current = v;
    setSelected(v);
    setOn(inRef.current && ratioRef.current >= v - 0.01);
  };

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };

  return (
    <section
      className={`${styles.tg} ${live ? styles.isDemo : ""}`}
      style={vars}
      aria-label={groupLabel}
    >
      <header className={styles.head}>
        <p className={styles.title}>{title}</p>
        <p className={styles.attr}><code>{attr}</code></p>
      </header>
      <div className={styles.body}>
        <div
          className={styles.view}
          ref={viewRef as unknown as Box<HTMLDivElement>}
          onScroll={() => setLive(false)}
          onPointerDown={() => setLive(false)}
          onKeyDown={(e: KeyEvt) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === " ") setLive(false);
          }}
          tabIndex={0}
          role="region"
          aria-label={viewLabel}
        >
          <div className={styles.track}>
            <p className={styles.lead}>{lead}</p>
            <div className={styles.target} ref={targetRef as unknown as Box<HTMLDivElement>}>
              <b>{targetTitle}</b>
              <span>{targetSub}</span>
            </div>
          </div>
        </div>
        <div className={styles.panel}>
          <p className={styles.read} aria-live="polite">
            {live ? null : (
              <b className={styles.numcur}>{ratio.toFixed(2)}</b>
            )}
            {live ? (
              <span className={styles.nums} aria-hidden="true">
                {NUM_LAYERS.map((n) => (<b key={n}>{n}</b>))}
              </span>
            ) : null}
          </p>
          <div className={styles.gauge} aria-hidden="true">
            <i
              className={styles.fill}
              style={live ? undefined : { transform: `scaleX(${ratio})` }}
            />
            <i className={`${styles.tick} ${styles.tick0}`}></i>
            <i className={`${styles.tick} ${styles.tick25}`}></i>
            <i className={`${styles.tick} ${styles.tick50}`}></i>
            <i className={`${styles.tick} ${styles.tick100}`}></i>
          </div>
          <p className={styles.scale} aria-hidden="true">
            <span className={styles.s0}>0</span>
            <span className={styles.s25}>0.25</span>
            <span className={styles.s50}>0.5</span>
            <span className={styles.s100}>1</span>
          </p>
          <p className={styles.candt}>{candidatesLabel}</p>
          <div className={styles.cands} onClick={pick}>
            {CANDIDATES.map((v) => (
              <button
                type="button"
                key={v}
                className={`${styles.cand} ${selected === v ? styles.isOn : ""}`}
                data-th={v}
                aria-pressed={selected === v ? "true" : "false"}
              >
                {v}
              </button>
            ))}
          </div>
          <p className={styles.lightline}>
            <span className={styles.led} aria-hidden="true" />
            <span className={styles.state}>
              {live ? (
                <span className={styles.sts} aria-hidden="true">
                  <b>{waiting}</b>
                  <b className={styles.stOn}>{reached}</b>
                </span>
              ) : (
                <b className={`${styles.stcur} ${on ? styles.stcurOn : ""}`}>
                  {on ? reached : waiting}
                </b>
              )}
            </span>
          </p>
        </div>
      </div>
      <footer className={styles.foot}>{foot}</footer>
    </section>
  );
}
