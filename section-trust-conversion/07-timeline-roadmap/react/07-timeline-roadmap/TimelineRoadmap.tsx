import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TimelineRoadmap.module.scss";

export type TimelineRoadmapProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const STEPS = [
  { q: "1분기", t: "컴포넌트 라이브러리 공개", done: true },
  { q: "2분기", t: "i18n(영어·일본어) 지원", done: true },
  { q: "3분기", t: "React 패키지 출시", done: false },
  { q: "4분기", t: "셀프 호스팅 지원", done: false },
];

function CalendarCheck() {
  return (
    <svg viewBox="0 0 256 256" width="16" height="16">
      <g fill="currentColor">
        <path d="M216 48v40H40V48a8 8 0 0 1 8-8h160a8 8 0 0 1 8 8" opacity=".2" />
        <path d="M208 32h-24v-8a8 8 0 0 0-16 0v8H88v-8a8 8 0 0 0-16 0v8H48a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16M72 48v8a8 8 0 0 0 16 0v-8h80v8a8 8 0 0 0 16 0v-8h24v32H48V48Zm136 160H48V96h160zm-38.34-85.66a8 8 0 0 1 0 11.32l-48 48a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L116 164.69l42.34-42.35a8 8 0 0 1 11.32 0" />
      </g>
    </svg>
  );
}
function RocketLaunch() {
  return (
    <svg viewBox="0 0 256 256" width="16" height="16">
      <g fill="currentColor">
        <path d="M184 120v61.65a8 8 0 0 1-2.34 5.65l-34.35 34.35a8 8 0 0 1-13.57-4.53L128 176Zm-48-48H74.35a8 8 0 0 0-5.65 2.34l-34.35 34.35a8 8 0 0 0 4.53 13.57L80 128ZM40 216c37.65 0 50.69-19.69 54.56-28.18l-26.38-26.38C59.69 165.31 40 178.35 40 216" opacity=".2" />
        <path d="M223.85 47.12a16 16 0 0 0-15-15c-12.58-.75-44.73.4-71.41 27.07L132.69 64H74.36A15.9 15.9 0 0 0 63 68.68L28.7 103a16 16 0 0 0 9.07 27.16l38.47 5.37l44.21 44.21l5.37 38.49a15.94 15.94 0 0 0 10.78 12.92a16.1 16.1 0 0 0 5.1.83a15.9 15.9 0 0 0 11.3-4.68l34.32-34.3a15.9 15.9 0 0 0 4.68-11.36v-58.33l4.77-4.77c26.68-26.68 27.83-58.83 27.08-71.42M74.36 80h42.33l-39.53 39.52L40 114.34Zm74.41-9.45a76.65 76.65 0 0 1 59.11-22.47a76.46 76.46 0 0 1-22.42 59.16L128 164.68L91.32 128ZM176 181.64L141.67 216l-5.19-37.17L176 139.31Zm-74.16 9.5C97.34 201 82.29 224 40 224a8 8 0 0 1-8-8c0-42.29 23-57.34 32.86-61.85a8 8 0 0 1 6.64 14.56c-6.43 2.93-20.62 12.36-23.12 38.91c26.55-2.5 36-16.69 38.91-23.12a8 8 0 1 1 14.56 6.64Z" />
      </g>
    </svg>
  );
}

export default function TimelineRoadmap({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#b9a0ff" }: TimelineRoadmapProps) {
  const [active, setActive] = useState(0);
  const [top, setTop] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function moveTo(idx: number) {
    setActive(idx);
    const list = listRef.current;
    const refs = stepRefs.current || [];
    const step = refs[idx];
    if (list && step) setTop(step.getBoundingClientRect().top - list.getBoundingClientRect().top);
  }

  useEffect(() => {
    moveTo(0);
    const id = setInterval(() => setActive((a) => (a + 1) % STEPS.length), 400);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { moveTo(active); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [active]);

  return (
    <ol className={styles.rm} style={vars} ref={listRef}>
      {STEPS.map((s, i) => (
        <li
          key={s.q}
          ref={(el: HTMLLIElement | null) => { const refs = stepRefs.current; if (refs) refs[i] = el; }}
          className={`${styles.step} ${active === i ? styles.isActive : ""}`}
          tabIndex={0}
          onClick={() => moveTo(i)}
          onFocus={() => moveTo(i)}
        >
          <span className={styles.marker} aria-hidden="true">{s.done ? <CalendarCheck /> : <RocketLaunch />}</span>
          <p className={styles.q}>{s.q}</p>
          <p className={styles.t}>{s.t}</p>
        </li>
      ))}
      <li className={styles.spot} aria-hidden="true" style={{ transform: `translateY(${top}px)` }} />
    </ol>
  );
}
