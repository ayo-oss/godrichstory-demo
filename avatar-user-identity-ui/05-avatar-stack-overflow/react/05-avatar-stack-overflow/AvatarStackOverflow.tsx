import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./AvatarStackOverflow.module.scss";

export type AvatarStackOverflowProps = {
  label?: string;
  /** 앞 네 명은 스택에, 나머지는 +N 뒤에 접힌다 */
  people?: string[];
  line?: string;
  moreLabel?: string;
  /** 벌어졌다 모이는 한 바퀴(ms) */
  duration?: number;
  easing?: string;
  /** +N 칸 면 색 */
  color?: string;
};

type Vars = CSSProperties & {
  "--i"?: string;
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

// 이니셜은 표시 문자열에서 계산한다 — 하드코딩하지 않아야 언어팩이 바뀌어도 따라간다
function initialOf(name: string): string {
  const words = name.trim().split(/\s+/);
  if (/[A-Za-z]/.test(words[0].charAt(0))) {
    return words.slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("");
  }
  return words[0].charAt(0);
}

function faceClass(i: number): string {
  const map = [styles.face1, styles.face2, styles.face3, styles.face4, styles.face5, styles.face6, styles.face1];
  return map[i % map.length] ?? styles.face1;
}

export default function AvatarStackOverflow({
  label = "문서 참여자",
  people = ["관리자", "편집자", "디자이너", "개발자", "검토자", "번역가", "운영자"],
  line = "문서에 일곱 명이 참여 중",
  moreLabel = "접힌 참여자 펼치기",
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#3b4a63",
}: AvatarStackOverflowProps): ReactNode {
  const [loop, setLoop] = useState<boolean>(true);
  const [open, setOpen] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<boolean>(false);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const visible = people.slice(0, 4);
  const folded = people.slice(4);

  return (
    <section
      className={loop ? `${styles.st} ${styles.isDemo}` : open ? `${styles.st} ${styles.isOpen}` : styles.st}
      style={vars}
      aria-label={label}
      onPointerDown={() => setLoop(false)}
    >
      <div
        className={styles.stack}
        onPointerEnter={() => { setLoop(false); setOpen(true); }}
        onPointerLeave={() => setOpen(false)}
        onFocus={() => { setLoop(false); setOpen(true); }}
        onBlur={() => setOpen(false)}
      >
        {visible.map((name, i) => (
          <button
            key={name}
            className={`${styles.av} ${faceClass(i)}`}
            type="button"
            style={{ "--i": `${i}` } as Vars}
            aria-label={name}
          >
            {initialOf(name)}
          </button>
        ))}
        <button
          className={styles.more}
          type="button"
          style={{ "--i": `${visible.length}` } as Vars}
          aria-expanded={expanded ? "true" : "false"}
          aria-label={moreLabel}
          onClick={() => setExpanded(!expanded)}
        >
          +{folded.length}
        </button>
      </div>

      <p className={styles.line}>{line}</p>

      {/* 접힌 인원 — 실제 DOM 요소를 hidden 으로 여닫는다 */}
      <ul className={styles.folded}>
        {folded.map((name, i) => (
          <li key={name} className={styles.row} hidden={!expanded}>
            <span className={`${styles.mini} ${faceClass(visible.length + i)}`} aria-hidden="true">
              {initialOf(name)}
            </span>
            {name}
          </li>
        ))}
      </ul>
    </section>
  );
}
