import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./SessionDeviceList.module.scss";

export type SessionIcon = "laptop" | "phone" | "globe";
export type Session = { id: string; name: string; meta: string; icon: SessionIcon; current?: boolean };
export type SessionDeviceListProps = {
  title?: string;
  sessions?: Session[];
  currentLabel?: string;
  outLabel?: string;
  sayTail?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const LAPTOP: ReactNode = (
  <g fill="currentColor">
    <path d="M216 72v104H40V72a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" opacity=".2" />
    <path d="M232 168h-8V72a24 24 0 0 0-24-24H56a24 24 0 0 0-24 24v96h-8a8 8 0 0 0-8 8v16a24 24 0 0 0 24 24h176a24 24 0 0 0 24-24v-16a8 8 0 0 0-8-8M48 72a8 8 0 0 1 8-8h144a8 8 0 0 1 8 8v96H48Zm176 120a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8v-8h192ZM152 88a8 8 0 0 1-8 8h-32a8 8 0 0 1 0-16h32a8 8 0 0 1 8 8" />
  </g>
);

const PHONE: ReactNode = (
  <g fill="currentColor">
    <path d="M192 56v144H64V56Z" opacity=".2" />
    <path d="M176 16H80a24 24 0 0 0-24 24v176a24 24 0 0 0 24 24h96a24 24 0 0 0 24-24V40a24 24 0 0 0-24-24M72 64h112v128H72Zm8-32h96a8 8 0 0 1 8 8v8H72v-8a8 8 0 0 1 8-8m96 192H80a8 8 0 0 1-8-8v-8h112v8a8 8 0 0 1-8 8" />
  </g>
);

const GLOBE: ReactNode = (
  <g fill="currentColor">
    <path d="M213.09 172.48a96 96 0 0 1-80.41 51.41l3.17-16.44a8 8 0 0 0-2-6.95l-19.74-20.33a8 8 0 0 1-1.44-8.69l13.7-30.74a8 8 0 0 1 8.38-4.67l22.82 3.08a8.1 8.1 0 0 1 3.12 1.11ZM116.71 95L129 88.24a7.5 7.5 0 0 0 1.5-1.07l26.91-24.33A8 8 0 0 0 159 53l-10.5-18.81A96.6 96.6 0 0 0 128 32a95.6 95.6 0 0 0-60.22 21.23L56 81.08a8 8 0 0 0-.12 5.92l11.5 30.67a8 8 0 0 0 5.81 5l2.69.58L89.2 100a8 8 0 0 1 6.94-4h16.71a7.9 7.9 0 0 0 3.86-1" opacity=".2" />
    <path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24m88 104a87.6 87.6 0 0 1-6.4 32.94l-44.7-27.49a15.9 15.9 0 0 0-6.24-2.23l-22.82-3.08a16.11 16.11 0 0 0-16 7.86h-8.72l-3.8-7.86a15.91 15.91 0 0 0-11-8.67l-8-1.73L96.14 104h16.71a16.06 16.06 0 0 0 7.73-2l12.25-6.76a16.6 16.6 0 0 0 3-2.14l26.91-24.34A15.93 15.93 0 0 0 166 49.1l-.36-.65A88.11 88.11 0 0 1 216 128m-72.69-86.66L152 56.9l-26.91 24.34L112.85 88H96.14a16 16 0 0 0-13.88 8l-8.73 15.23l-10.15-27.04l10.94-25.87a87.87 87.87 0 0 1 69-17ZM40 128a87.5 87.5 0 0 1 8.54-37.8l11.34 30.27a16 16 0 0 0 11.62 10l21.43 4.61l3.81 7.92a16.09 16.09 0 0 0 14.4 9h1.48l-7.23 16.23a16 16 0 0 0 2.86 17.37l.14.14l19.61 20.2l-1.94 10A88.11 88.11 0 0 1 40 128m102.58 86.78l1.13-5.81a16.09 16.09 0 0 0-4-13.9a2 2 0 0 1-.14-.14L120 174.74L133.7 144l22.82 3.08l45.72 28.12a88.18 88.18 0 0 1-59.66 39.58" />
  </g>
);

const ICONS: Record<SessionIcon, ReactNode> = { laptop: LAPTOP, phone: PHONE, globe: GLOBE };

const DEFAULT_SESSIONS: Session[] = [
  { id: "s1", name: "크롬 · 윈도우", meta: "서울 · 방금 전", icon: "laptop", current: true },
  { id: "s2", name: "모바일 앱 · 안드로이드", meta: "부산 · 2시간 전", icon: "phone" },
  { id: "s3", name: "웹 · 태블릿", meta: "부산 · 어제", icon: "globe" },
];

export default function SessionDeviceList({
  title = "로그인된 기기",
  sessions = DEFAULT_SESSIONS,
  currentLabel = "이 기기",
  outLabel = "로그아웃",
  sayTail = " 기기를 로그아웃했습니다",
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: SessionDeviceListProps) {
  const [demo, setDemo] = useState(true);
  const [gone, setGone] = useState<string[]>([]);
  const [say, setSay] = useState("");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 버튼을 누르면 그 줄만 옆으로 밀려 나가며 높이가 접히고, 읽히는 영역으로 한 번 알린다
  function cut(s: Session) {
    if (gone.indexOf(s.id) >= 0) return;
    setDemo(false); // 사람이 만졌으니 자동 루프를 끈다
    setGone((prev: string[]) => prev.concat([s.id]));
    setSay(s.name + sayTail);
  }

  return (
    <section
      className={`${styles.sd} ${demo ? styles.isDemo : ""}`}
      style={vars}
      data-said={say ? "1" : undefined}
    >
      <h2 className={styles.title}>{title}</h2>
      <ul className={styles.list}>
        {sessions.map((s: Session, i: number) => (
          <li
            key={s.id}
            className={styles.row}
            data-row={String(i + 1)}
            data-gone={gone.indexOf(s.id) >= 0 ? "1" : undefined}
          >
            <span className={styles.ic} aria-hidden="true">
              <svg viewBox="0 0 256 256" width="20" height="20">{ICONS[s.icon]}</svg>
            </span>
            <span className={styles.txt}>
              <span className={styles.name}>
                {s.name}
                {s.current ? <span className={styles.badge}>{currentLabel}</span> : null}
              </span>
              <span className={styles.meta}>{s.meta}</span>
            </span>
            <button
              className={styles.out}
              type="button"
              disabled={gone.indexOf(s.id) >= 0}
              onClick={() => cut(s)}
            >
              {outLabel}
            </button>
          </li>
        ))}
      </ul>
      <p className={styles.live} role="status" aria-live="polite">{say}</p>
    </section>
  );
}
