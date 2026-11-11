import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./LoginHistoryTimeline.module.scss";

export type LoginEntry = {
  when: string;
  where: string;
  tag: string;
  ok: boolean;
  flag?: boolean;
  icon: "mobile" | "laptop" | "globe" | "fail";
};
export type LoginHistoryTimelineProps = {
  entries?: LoginEntry[];
  summary?: string;
  alert?: string;
  onMark?: (when: string, marked: boolean) => string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const ICONS: Record<LoginEntry["icon"], ReactNode> = {
  mobile: (
    <g fill="currentColor">
      <path d="M192 56v144H64V56Z" opacity=".2" />
      <path d="M176 16H80a24 24 0 0 0-24 24v176a24 24 0 0 0 24 24h96a24 24 0 0 0 24-24V40a24 24 0 0 0-24-24M72 64h112v128H72Zm8-32h96a8 8 0 0 1 8 8v8H72v-8a8 8 0 0 1 8-8m96 192H80a8 8 0 0 1-8-8v-8h112v8a8 8 0 0 1-8 8" />
    </g>
  ),
  laptop: (
    <g fill="currentColor">
      <path d="M216 72v104H40V72a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" opacity=".2" />
      <path d="M232 168h-8V72a24 24 0 0 0-24-24H56a24 24 0 0 0-24 24v96h-8a8 8 0 0 0-8 8v16a24 24 0 0 0 24 24h176a24 24 0 0 0 24-24v-16a8 8 0 0 0-8-8M48 72a8 8 0 0 1 8-8h144a8 8 0 0 1 8 8v96H48Zm176 120a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8v-8h192ZM152 88a8 8 0 0 1-8 8h-32a8 8 0 0 1 0-16h32a8 8 0 0 1 8 8" />
    </g>
  ),
  globe: (
    <g fill="currentColor">
      <path d="M213.09 172.48a96 96 0 0 1-80.41 51.41l3.17-16.44a8 8 0 0 0-2-6.95l-19.74-20.33a8 8 0 0 1-1.44-8.69l13.7-30.74a8 8 0 0 1 8.38-4.67l22.82 3.08a8.1 8.1 0 0 1 3.12 1.11ZM116.71 95L129 88.24a7.5 7.5 0 0 0 1.5-1.07l26.91-24.33A8 8 0 0 0 159 53l-10.5-18.81A96.6 96.6 0 0 0 128 32a95.6 95.6 0 0 0-60.22 21.23L56 81.08a8 8 0 0 0-.12 5.92l11.5 30.67a8 8 0 0 0 5.81 5l2.69.58L89.2 100a8 8 0 0 1 6.94-4h16.71a7.9 7.9 0 0 0 3.86-1" opacity=".2" />
      <path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24m88 104a87.6 87.6 0 0 1-6.4 32.94l-44.7-27.49a15.9 15.9 0 0 0-6.24-2.23l-22.82-3.08a16.11 16.11 0 0 0-16 7.86h-8.72l-3.8-7.86a15.91 15.91 0 0 0-11-8.67l-8-1.73L96.14 104h16.71a16.06 16.06 0 0 0 7.73-2l12.25-6.76a16.6 16.6 0 0 0 3-2.14l26.91-24.34A15.93 15.93 0 0 0 166 49.1l-.36-.65A88.11 88.11 0 0 1 216 128m-72.69-86.66L152 56.9l-26.91 24.34L112.85 88H96.14a16 16 0 0 0-13.88 8l-8.73 15.23l-10.15-27.04l10.94-25.87a87.87 87.87 0 0 1 69-17ZM40 128a87.5 87.5 0 0 1 8.54-37.8l11.34 30.27a16 16 0 0 0 11.62 10l21.43 4.61l3.81 7.92a16.09 16.09 0 0 0 14.4 9h1.48l-7.23 16.23a16 16 0 0 0 2.86 17.37l.14.14l19.61 20.2l-1.94 10A88.11 88.11 0 0 1 40 128m102.58 86.78l1.13-5.81a16.09 16.09 0 0 0-4-13.9a2 2 0 0 1-.14-.14L120 174.74L133.7 144l22.82 3.08l45.72 28.12a88.18 88.18 0 0 1-59.66 39.58" />
    </g>
  ),
  fail: (
    <g fill="currentColor">
      <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
      <path d="M165.66 101.66L139.31 128l26.35 26.34a8 8 0 0 1-11.32 11.32L128 139.31l-26.34 26.35a8 8 0 0 1-11.32-11.32L116.69 128l-26.35-26.34a8 8 0 0 1 11.32-11.32L128 116.69l26.34-26.35a8 8 0 0 1 11.32 11.32M232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88" />
    </g>
  ),
};

const DEFAULT_ENTRIES: LoginEntry[] = [
  { when: "Today 09:41", where: "Seoul · Chrome · Android", tag: "OK", ok: true, icon: "mobile" },
  { when: "Today 08:02", where: "Daejeon · Safari · Mac", tag: "OK", ok: true, icon: "laptop" },
  { when: "Yesterday 23:18", where: "Unusual country · Windows", tag: "Check", ok: true, flag: true, icon: "globe" },
  { when: "Yesterday 22:57", where: "Seoul · 5 wrong passwords", tag: "Failed", ok: false, icon: "fail" },
];

export default function LoginHistoryTimeline({
  entries = DEFAULT_ENTRIES,
  summary = "4 recent sign-ins",
  alert = "One sign-in came from an unusual country",
  onMark = (when: string, marked: boolean) =>
    marked ? `${when} marked as reviewed` : `${when} review mark cleared`,
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: LoginHistoryTimelineProps) {
  const [demo, setDemo] = useState(true);
  const [marked, setMarked] = useState<number[]>([]);
  const [live, setLive] = useState("");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 줄을 누르면 「확인함」 표시가 켜지고 알림 영역이 그 줄을 읽어 준다. 키보드로도 된다
  function toggleMark(i: number) {
    setDemo(false);
    const isOn = marked.indexOf(i) >= 0;
    setMarked(isOn ? marked.filter((n) => n !== i) : marked.concat([i]));
    setLive(onMark(entries[i].when, !isOn));
  }

  // 떠오르는 차례는 DOM 순서가 아니라 지연값이 정한다 — 눈에 띄어야 할 줄이 마지막
  const delayOf = (e: LoginEntry, i: number) => (e.flag ? 520 : [40, 200, 360, 360][i] || 360);

  return (
    <section className={`${styles.lh} ${demo ? styles.isDemo : ""}`} style={vars}>
      <ul className={styles.list}>
        {entries.map((e, i) => (
          <li
            className={styles.item}
            key={e.when}
            data-ok={e.ok ? "yes" : "no"}
            data-flag={e.flag ? "yes" : undefined}
            style={{ animationDelay: `${delayOf(e, i)}ms, ${delayOf(e, i)}ms` }}
          >
            <span className={styles.dot} aria-hidden="true" />
            <button
              className={styles.row}
              type="button"
              aria-pressed={marked.indexOf(i) >= 0}
              onClick={() => toggleMark(i)}
            >
              <span className={styles.ic} aria-hidden="true">
                <svg viewBox="0 0 256 256" width="14" height="14">{ICONS[e.icon]}</svg>
              </span>
              <span className={styles.body}>
                <span className={styles.when}>{e.when}</span>
                <span className={styles.where}>{e.where}</span>
              </span>
              <span className={styles.tag}>{e.tag}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className={styles.live} role="status" aria-live="polite">
        {live ? (
          live
        ) : (
          <>
            <span className={styles.word} data-word="a">{summary}</span>
            <span className={styles.word} data-word="b">{alert}</span>
          </>
        )}
      </p>
    </section>
  );
}
