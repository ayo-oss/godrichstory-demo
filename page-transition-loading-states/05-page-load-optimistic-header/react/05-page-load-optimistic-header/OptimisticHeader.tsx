import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./OptimisticHeader.module.scss";

export type OptimisticTab = {
  /** 탭 줄에 보이는 짧은 이름 */
  label: string;
  /** 헤더 제목 — 탭을 누른 그 순간 바로 이 제목으로 바뀐다 */
  title: string;
  lead: string;
  sub: string;
};

export type OptimisticHeaderProps = {
  tabs?: OptimisticTab[];
  groupLabel?: string;
  tablistLabel?: string;
  /** 본문이 도착하기까지 걸리는 시간(ms) */
  delay?: number;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 가 얇아 KeyboardEvent 를 못 쓴다 — 필요한 꼴만 로컬 타입으로 선언
type KeyEvt = { key: string; preventDefault(): void };
type Box<T> = { current: T };

const DEFAULT_TABS: OptimisticTab[] = [
  { label: "Summary", title: "This week", lead: "1,284 visits", sub: "12% more than last week" },
  { label: "Activity", title: "Recent activity", lead: "7 new comments", sub: "2 posts still unanswered" },
  { label: "Alerts", title: "Alert settings", lead: "Alerts on", sub: "Weekly digest mail is on" },
];

let seq = 0;

export default function OptimisticHeader({
  tabs = DEFAULT_TABS,
  groupLabel = "Optimistic screen move",
  tablistLabel = "Pick a screen",
  delay = 600,
  demo = true,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: OptimisticHeaderProps) {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(demo);
  const [uid] = useState<string>(() => "optimistic-header-" + String(++seq));
  const timer = useRef<number>(0) as Box<number>;
  const tabsRef = useRef<any>(null);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function go(i: number) {
    setLive(false);
    setTab(i);            // 제목과 탭 표시는 누른 즉시 바뀐다 — 낙관적
    setLoading(true);     // 본문만 아직 오지 않았다
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setLoading(false), delay);
  }

  function onKeyDown(e: KeyEvt) {
    const n = tabs.length;
    const next = e.key === "ArrowRight" ? (tab + 1) % n : e.key === "ArrowLeft" ? (tab + n - 1) % n : -1;
    if (next < 0) return;
    e.preventDefault();
    go(next);
    const row = tabsRef.current;
    const btn = row && row.children ? row.children[next] : null;
    if (btn) btn.focus({ preventScroll: true });
  }

  const cls = [styles.oh, live ? styles.isDemo : "", loading ? styles.isLoading : ""].filter(Boolean).join(" ");
  const bodyId = uid + "-body";

  return (
    <section className={cls} style={vars} data-tab={String(tab + 1)} aria-label={groupLabel} onKeyDown={onKeyDown}>
      <h2 className={styles.title}>
        {tabs.map((t) => (
          <span className={styles.t} key={t.title}>{t.title}</span>
        ))}
      </h2>
      <div className={styles.tabs} role="tablist" aria-label={tablistLabel} ref={tabsRef}>
        {tabs.map((t, i) => (
          <button
            className={styles.tab}
            type="button"
            role="tab"
            key={t.label}
            id={uid + "-tab-" + String(i + 1)}
            aria-controls={bodyId}
            aria-selected={i === tab}
            onClick={() => go(i)}
          >
            <span className={styles.pill} aria-hidden="true" />
            <span className={styles.lab}>{t.label}</span>
          </button>
        ))}
      </div>
      <div
        className={styles.body}
        id={bodyId}
        role="tabpanel"
        aria-labelledby={uid + "-tab-" + String(tab + 1)}
        aria-busy={loading}
      >
        {tabs.map((t) => (
          <div className={styles.panel} key={t.lead}>
            <p className={styles.lead}>{t.lead}</p>
            <p className={styles.sub}>{t.sub}</p>
          </div>
        ))}
        <div className={styles.sk} aria-hidden="true">
          <span className={styles.skBar}><span className={styles.shine} /></span>
          <span className={styles.skBar}><span className={styles.shine} /></span>
          <span className={styles.skBar}><span className={styles.shine} /></span>
        </div>
      </div>
    </section>
  );
}
