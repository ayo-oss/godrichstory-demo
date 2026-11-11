// TeamFooter — vanilla 판(run/338/demo/09-team-footer/index.html) 의 React 포트.
// 고정 기준시각에 가상의 경과 시간을 더해 팀원마다 다른 시간대의 현지시각을
// 계산한다(계산 한 겹).
import { useEffect, useRef } from "react";
import styles from "./TeamFooter.module.scss";

export type TeamFooterProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "고정 기준시각에 가상의 경과 시간을 더해 팀원마다 다른 시간대의 현지시각을 계산합니다";
const ROW_LABEL = "팀원 현지시각";

const EPOCH = new Date("2026-01-01T09:00:00Z").getTime();
const STEP_MIN = 95;

type Member = { tag: string; zone: string };
const MEMBERS: Member[] = [
  { tag: "M1", zone: "Asia/Seoul" },
  { tag: "M2", zone: "Europe/London" },
  { tag: "M3", zone: "America/New_York" },
  { tag: "M4", zone: "Australia/Sydney" }
];

function hourIn(zone: string, date: Date): number {
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "numeric", hourCycle: "h23" });
  return parseInt(fmt.format(date), 10) || 0;
}

export default function TeamFooter({
  duration = "300ms",
  easing = "ease-out",
  color = "#0a4fe8"
}: TeamFooterProps) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const chipRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const row = rowRef.current;
    const chip = chipRef.current;
    if (!row || !chip) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cells = Array.prototype.slice.call(row.querySelectorAll("." + styles.cell)) as HTMLElement[];
    const timeEls = Array.prototype.slice.call(row.querySelectorAll("." + styles.time)) as HTMLElement[];

    let elapsedMin = 0;

    function render(): void {
      const now = new Date(EPOCH + elapsedMin * 60000);
      MEMBERS.forEach((m, i) => {
        const fmt = new Intl.DateTimeFormat("en-GB", {
          timeZone: m.zone,
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23"
        });
        const label = fmt.format(now);
        const timeEl = timeEls[i];
        const cell = cells[i];
        if (!timeEl || !cell) return;
        timeEl.textContent = label;
        timeEl.setAttribute("datetime", now.toISOString());
        const hour = hourIn(m.zone, now);
        const quiet = hour < 7 || hour >= 22;
        cell.classList.toggle(styles.isQuiet, quiet);
      });
      chip!.textContent = "경과 " + elapsedMin + "분";
    }

    render();

    let timer = 0;
    if (!reduce) {
      timer = window.setInterval(() => {
        elapsedMin += STEP_MIN;
        render();
      }, 550);
    }

    return () => {
      if (timer) window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <section className={styles.foot}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.row} ref={rowRef} role="list" aria-label={ROW_LABEL}>
          {MEMBERS.map((m) => (
            <div className={styles.cell} role="listitem" key={m.tag}>
              <span className={styles.tag}>{m.tag}</span>
              <time className={styles.time}>09:00</time>
              <span className={styles.dot} aria-hidden="true" />
            </div>
          ))}
        </div>
        <p className={styles.meta}>
          <span className={styles.chip} ref={chipRef} style={{ color }}>경과 0분</span>
        </p>
      </section>
    </main>
  );
}
