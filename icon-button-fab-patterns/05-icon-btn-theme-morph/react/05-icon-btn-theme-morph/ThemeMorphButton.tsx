import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ThemeMorphButton.module.scss";

export type ThemeMorphButtonProps = {
  who?: string;
  /** 미리보기 판의 세 줄. 위에서 아래로 옅어진다 */
  lines?: string[];
  dayLabel?: string;
  nightLabel?: string;
  /** 낮일 때의 버튼 이름 (누르면 밤이 된다) */
  toNightLabel?: string;
  /** 밤일 때의 버튼 이름 (누르면 낮이 된다) */
  toDayLabel?: string;
  groupLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  /** 해·달·원반이 돌아 자리를 바꾸는 시간(ms) */
  duration?: number;
  easing?: string;
  /** 밤 원반의 색 — 초점 테두리도 같은 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const DEFAULT_LINES = ["Bright paper by day", "Soft ink by night", "Whichever is easier on the eyes"];

function Sun({ cls }: { cls: string }) {
  return (
    <svg className={cls} viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <path d="M184,128a56,56,0,1,1-56-56A56,56,0,0,1,184,128Z" opacity=".2" />
      <path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z" />
    </svg>
  );
}

function Moon({ cls }: { cls: string }) {
  return (
    <svg className={cls} viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <path d="M227.89,147.89A96,96,0,1,1,108.11,28.11,96.09,96.09,0,0,0,227.89,147.89Z" opacity=".2" />
      <path d="M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.34A88,88,0,0,1,65.66,67.11a89,89,0,0,1,31.4-26A106,106,0,0,0,96,56,104.11,104.11,0,0,0,200,160a106,106,0,0,0,14.92-1.06A89,89,0,0,1,188.9,190.34Z" />
    </svg>
  );
}

export default function ThemeMorphButton({
  who = "My notes",
  lines = DEFAULT_LINES,
  dayLabel = "Day",
  nightLabel = "Night",
  toNightLabel = "Switch to the night theme",
  toDayLabel = "Switch to the day theme",
  groupLabel = "Theme button where the sun and moon trade places",
  demo = true,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#b9a0ff",
}: ThemeMorphButtonProps) {
  const [dark, setDark] = useState(false);
  const [live, setLive] = useState(demo);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 누르면 미리보기 루프를 끄고 사람이 고른 테마만 남긴다
  function toggle() {
    setLive(false);
    setDark((v) => !v);
  }

  const cls = [styles.tm, live ? styles.isDemo : "", dark ? styles.isDark : ""].filter(Boolean).join(" ");
  const fade = [styles.lineA, styles.lineB, styles.lineC];

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <article className={styles.card}>
        <header className={styles.head}>
          <span className={styles.avatar} aria-hidden="true" />
          <span className={styles.who}>{who}</span>
        </header>
        {lines.map((t, i) => (
          <p key={t} className={[styles.line, fade[i] || ""].filter(Boolean).join(" ")}>
            {t}
          </p>
        ))}
      </article>
      <button
        className={styles.btn}
        type="button"
        aria-pressed={dark}
        aria-label={dark ? toDayLabel : toNightLabel}
        onClick={toggle}
      >
        {/* 해와 달은 반투명으로 섞지 않고 한 프레임 컷으로 맞바뀐다 */}
        <span className={styles.disc} aria-hidden="true">
          <Sun cls={styles.sun} />
          <Moon cls={styles.moon} />
        </span>
        <span className={styles.t}>
          <span className={styles.tDay}>{dayLabel}</span>
          <span className={styles.tNight}>{nightLabel}</span>
        </span>
      </button>
    </section>
  );
}
