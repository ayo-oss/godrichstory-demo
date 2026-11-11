import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./AgendaSwitchCalendar.module.scss";

export type AgendaSwitchCalendarProps = {
  demo?: boolean;
  duration?: number;   // 전환(폭)·줄 올라옴 길이 ms
  easing?: string;
  color?: string;      // 포인트 색 (아이콘·칩·오늘 링)
  rows?: { day: number; weekday: string; chips: string[] }[];
};

type KeyEvt = { key: string; preventDefault: () => void };
type PtrEvt = { currentTarget: HTMLElement };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const DEFAULT_ROWS = [
  { day: 14, weekday: "월요일", chips: ["리뷰", "미팅"] },
  { day: 16, weekday: "수요일", chips: ["운동"] },
  { day: 18, weekday: "금요일", chips: ["병원"] },
  { day: 21, weekday: "월요일", chips: ["회고"] },
  { day: 23, weekday: "수요일", chips: ["배포"] },
];

function pad(n: number): string {
  return n < 10 ? "0" + n : "" + n;
}

export default function AgendaSwitchCalendar({
  demo = true,
  duration = 220,
  easing = "ease-out",
  color = "#2f6df6",
  rows = DEFAULT_ROWS,
}: AgendaSwitchCalendarProps) {
  const [demoOn, setDemoOn] = useState(demo);
  const [agenda, setAgenda] = useState(false);   // @container 결과를 따라간다
  const [fw, setFw] = useState("100%");
  const [cur, setCur] = useState(0);
  const [curI, setCurI] = useState(0);
  const [ann, setAnn] = useState("");
  const frameRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const days = useMemo(() => {
    const eventDays: Record<number, number> = {};
    rows.forEach((r) => { eventDays[r.day] = r.chips.length; });
    const out: { day: number; label: string; events: number }[] = [];
    const lead = new Date(2026, 8, 1).getDay();      // 9월 1일 = 화요일
    const total = 30;
    for (let i = 0; i < 35; i++) {
      const day = i - lead + 1;
      if (day < 1 || day > total) continue;
      out.push({ day, label: "2026-09-" + pad(day), events: eventDays[day] || 0 });
    }
    return out;
  }, [rows]);

  // @container (max-width: 176px) 와 같은 조건을 ResizeObserver 로 — role 도 실제로 바꾼다
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      setAgenda(frame.getBoundingClientRect().width <= 176);
    });
    ro.observe(frame);
    return () => ro.disconnect();
  }, []);

  // 보기가 바뀌어 포커스가 숨겨진 칸에 남으면 새 보기의 첫 칸으로
  useEffect(() => {
    const a = document.activeElement;
    if (!a || a === document.body || !(a as HTMLElement).offsetParent) {
      const pool = (agenda ? itemRefs.current : cellRefs.current) || [];
      const first = pool[0];
      if (first) first.focus({ preventScroll: true });
    }
  }, [agenda]);

  function moveCell(i: number) {
    setDemoOn(false);
    setCur(i);
    const el = cellRefs.current ? cellRefs.current[i] : null;
    if (el) el.focus({ preventScroll: true });
    setAnn(days[i].label);
  }
  function moveItem(i: number) {
    setDemoOn(false);
    setCurI(i);
    const el = itemRefs.current ? itemRefs.current[i] : null;
    if (el) el.focus({ preventScroll: true });
    setAnn("9." + rows[i].day);
  }
  function pick(narrow: boolean) {
    setDemoOn(false);
    setFw(narrow ? "34%" : "100%");   // 폭을 직접 오긴다 — 전환이 눈에 보인다
  }
  function onKey(e: KeyEvt) {
    setDemoOn(false);
    let n: number | null = null;
    if (agenda) {                            // 리스트 축 — ±1
      if (e.key === "ArrowDown") n = Math.min(curI + 1, rows.length - 1);
      else if (e.key === "ArrowUp") n = Math.max(curI - 1, 0);
      else if (e.key === "Home") n = 0;
      else if (e.key === "End") n = rows.length - 1;
      if (n !== null && n !== curI) { e.preventDefault(); moveItem(n); }
    } else {                                 // 격자 축 — ±1일 / ±7일
      if (e.key === "ArrowRight") n = Math.min(cur + 1, days.length - 1);
      else if (e.key === "ArrowLeft") n = Math.max(cur - 1, 0);
      else if (e.key === "ArrowDown") n = Math.min(cur + 7, days.length - 1);
      else if (e.key === "ArrowUp") n = Math.max(cur - 7, 0);
      else if (e.key === "Home") n = 0;
      else if (e.key === "End") n = days.length - 1;
      if (n !== null && n !== cur) { e.preventDefault(); moveCell(n); }
    }
  }

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };

  return (
    <section
      className={`${styles.ag} ${demoOn ? styles.demo : ""} ${agenda ? styles.isAgenda : ""}`}
      style={vars}
      aria-label="9월 일정"
      onKeyDown={onKey}
      onPointerDown={() => setDemoOn(false)}
    >
      <div className={styles.bar}>
        <span className={styles.title}>2026. 9</span>
        <span className={styles.toggl} role="group" aria-label="보기 전환">
          <button
            type="button"
            className={`${styles.btn} ${!agenda ? styles.on : ""}`}
            aria-label="격자 보기"
            aria-pressed={!agenda}
            onClick={() => pick(false)}
          >
            <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true"><g fill="currentColor"><path d="M112 56v48a8 8 0 0 1-8 8H56a8 8 0 0 1-8-8V56a8 8 0 0 1 8-8h48a8 8 0 0 1 8 8m88-8h-48a8 8 0 0 0-8 8v48a8 8 0 0 0 8 8h48a8 8 0 0 0 8-8V56a8 8 0 0 0-8-8m-96 96H56a8 8 0 0 0-8 8v48a8 8 0 0 0 8 8h48a8 8 0 0 0 8-8v-48a8 8 0 0 0-8-8m96 0h-48a8 8 0 0 0-8 8v48a8 8 0 0 0 8 8h48a8 8 0 0 0 8-8v-48a8 8 0 0 0-8-8" opacity=".2"/><path d="M200 136h-48a16 16 0 0 0-16 16v48a16 16 0 0 0 16 16h48a16 16 0 0 0 16-16v-48a16 16 0 0 0-16-16m0 64h-48v-48h48zM104 40H56a16 16 0 0 0-16 16v48a16 16 0 0 0 16 16h48a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16m0 64H56V56h48zm96-64h-48a16 16 0 0 0-16 16v48a16 16 0 0 0 16 16h48a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16m0 64h-48V56h48zm-96 32H56a16 16 0 0 0-16 16v48a16 16 0 0 0 16 16h48a16 16 0 0 0 16-16v-48a16 16 0 0 0-16-16m0 64H56v-48h48z"/></g></svg>
          </button>
          <button
            type="button"
            className={`${styles.btn} ${agenda ? styles.on : ""}`}
            aria-label="목록 보기"
            aria-pressed={agenda}
            onClick={() => pick(true)}
          >
            <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true"><g fill="currentColor"><path d="M216 64v128H88V64Z" opacity=".2"/><path d="M80 64a8 8 0 0 1 8-8h128a8 8 0 0 1 0 16H88a8 8 0 0 1-8-8m136 56H88a8 8 0 1 0 0 16h128a8 8 0 0 0 0-16m0 64H88a8 8 0 1 0 0 16h128a8 8 0 0 0 0-16M44 52a12 12 0 1 0 12 12a12 12 0 0 0-12-12m0 64a12 12 0 1 0 12 12a12 12 0 0 0-12-12m0 64a12 12 0 1 0 12 12a12 12 0 0 0-12-12"/></g></svg>
          </button>
          <span className={styles.pill} aria-hidden="true" />
        </span>
      </div>
      <div className={styles.frame} ref={frameRef} style={{ width: fw }}>
        {/* role 는 보기에 따라 실제로 바뀐다 — grid ↔ list */}
        <div
          className={styles.view}
          role={agenda ? "list" : "grid"}
          aria-label={agenda ? "9월 일정 목록" : "9월 일정 격자"}
        >
          <div className={styles.grid}>
            <div className={styles.wd} aria-hidden="true">
              {["일", "월", "화", "수", "목", "금", "토"].map((w, i) => <span key={i}>{w}</span>)}
            </div>
            <div className={styles.rows}>
              {[0, 1, 2, 3, 4].map((r) => (
                <div key={r} className={styles.row} role="row">
                  {[0, 1, 2, 3, 4, 5, 6].map((c) => {
                    const i = r * 7 + c - 2;   // 9월 1일 = 화요일(lead 2)
                    const d = i >= 0 && i < days.length ? days[i] : null;
                    if (!d) return <span key={c} aria-hidden="true" />;
                    const idx = days.indexOf(d);
                    return (
                      <span
                        key={c}
                        ref={(el: HTMLSpanElement | null) => { if (cellRefs.current) cellRefs.current[idx] = el; }}
                        className={`${styles.cell} ${d.day === 12 ? styles.today : ""}`}
                        role="gridcell"
                        aria-label={d.label}
                        aria-current={d.day === 12 ? "date" : undefined}
                        tabIndex={cur === idx ? 0 : -1}
                        onClick={() => moveCell(idx)}
                      >
                        {d.day}
                        {d.events > 0 && <i className={styles.dot} aria-hidden="true" />}
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className={styles.list}>
            {rows.map((r, i) => (
              <div
                key={r.day}
                ref={(el: HTMLDivElement | null) => { if (itemRefs.current) itemRefs.current[i] = el; }}
                className={styles.item}
                role="listitem"
                tabIndex={curI === i ? 0 : -1}
                style={{ animationDelay: i * 40 + "ms" }}
                onClick={(e: PtrEvt) => { void e; moveItem(i); }}
              >
                <span className={styles.d}>{r.day}</span>
                <span className={styles.wdn}>{r.weekday}</span>
                <span className={styles.chips}>
                  {r.chips.map((chip) => (
                    <span key={chip} className={styles.chip}>{chip}</span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <span className={styles.live} role="status">{ann}</span>
    </section>
  );
}
