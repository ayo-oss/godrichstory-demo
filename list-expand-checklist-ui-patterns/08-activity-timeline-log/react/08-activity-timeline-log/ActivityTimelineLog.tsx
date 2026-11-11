import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import styles from "./ActivityTimelineLog.module.scss";

export type ActivityEvent = { text: ReactNode; time: string; icon: "chat" | "upload" | "check" };

export type ActivityTimelineLogProps = {
  events: ActivityEvent[];
  /** 항목이 떠오르는 시간 (기본 600ms) */
  duration?: number;
  easing?: string;
  /** 세로선·점 배경(파스텔) */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const ICONS: Record<ActivityEvent["icon"], ReactNode> = {
  chat: (
    <svg viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M224 128a96 96 0 0 1-144.07 83.11l-37.39 12.47a8 8 0 0 1-10.12-10.12l12.47-37.39A96 96 0 1 1 224 128" opacity=".2" /><path d="M128 24a104 104 0 0 0-91.82 152.88l-11.35 34.05a16 16 0 0 0 20.24 20.24l34.05-11.35A104 104 0 1 0 128 24m0 192a87.87 87.87 0 0 1-44.06-11.81a8 8 0 0 0-6.54-.67L40 216l12.47-37.4a8 8 0 0 0-.66-6.54A88 88 0 1 1 128 216" /></g></svg>
  ),
  upload: (
    <svg viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M216 48v160H40V48a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" opacity=".2" /><path d="M224 144v64a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8v-64a8 8 0 0 1 16 0v56h160v-56a8 8 0 0 1 16 0M93.66 77.66L120 51.31V144a8 8 0 0 0 16 0V51.31l26.34 26.35a8 8 0 0 0 11.32-11.32l-40-40a8 8 0 0 0-11.32 0l-40 40a8 8 0 0 0 11.32 11.32" /></g></svg>
  ),
  check: (
    <svg viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" /><path d="M173.66 98.34a8 8 0 0 1 0 11.32l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 0M232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88" /></g></svg>
  ),
};

/** 위에서부터 순서대로 옅게 떠오르는 stagger — CSS 변수 --n 을 각 li 에 주고 transition-delay 로 순서를 만든다 */
export default function ActivityTimelineLog({
  events,
  duration = 600,
  easing = "ease-out",
  color = "#b9a0ff",
}: ActivityTimelineLogProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const [shown, setShown] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(id); }, []);
  return (
    <ul className={styles.list} style={vars} aria-label="활동 내역">
      {events.map((ev, i) => (
        <li key={i} className={`${styles.item} ${shown ? styles.shown : ""}`} data-i={i % 3} style={{ transitionDelay: `${i * 140}ms` }}>
          <span className={styles.dot}>{ICONS[ev.icon]}</span>
          <div className={styles.body}>{ev.text}<time>{ev.time}</time></div>
        </li>
      ))}
    </ul>
  );
}
