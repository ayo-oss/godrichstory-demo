import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FullscreenToggle.module.scss";

export type FullscreenToggleProps = {
  /** 더미 영상 길이(초) */
  total?: number;
  /** 시작 위치(초) */
  start?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

function fmt(s: number) {
  const n = Math.floor(s);
  return Math.floor(n / 60) + ":" + ("0" + (n % 60)).slice(-2);
}

function ExpandIcon() {
  return (
    <svg viewBox="0 0 256 256" width="17" height="17" aria-hidden="true">
      <g fill="currentColor">
        <path d="M208 48v160H48V48Z" opacity=".2" />
        <path d="M216 48v40a8 8 0 0 1-16 0V56h-32a8 8 0 0 1 0-16h40a8 8 0 0 1 8 8M88 200H56v-32a8 8 0 0 0-16 0v40a8 8 0 0 0 8 8h40a8 8 0 0 0 0-16m120-40a8 8 0 0 0-8 8v32h-32a8 8 0 0 0 0 16h40a8 8 0 0 0 8-8v-40a8 8 0 0 0-8-8M88 40H48a8 8 0 0 0-8 8v40a8 8 0 0 0 16 0V56h32a8 8 0 0 0 0-16" />
      </g>
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg viewBox="0 0 256 256" width="17" height="17" aria-hidden="true">
      <g fill="currentColor">
        <path d="M208 64v128a16 16 0 0 1-16 16H64a16 16 0 0 1-16-16V64a16 16 0 0 1 16-16h128a16 16 0 0 1 16 16" opacity=".2" />
        <path d="M152 96V48a8 8 0 0 1 16 0v40h40a8 8 0 0 1 0 16h-48a8 8 0 0 1-8-8m-56 56H48a8 8 0 0 0 0 16h40v40a8 8 0 0 0 16 0v-48a8 8 0 0 0-8-8m112 0h-48a8 8 0 0 0-8 8v48a8 8 0 0 0 16 0v-40h40a8 8 0 0 0 0-16M96 40a8 8 0 0 0-8 8v40H48a8 8 0 0 0 0 16h48a8 8 0 0 0 8-8V48a8 8 0 0 0-8-8" />
      </g>
    </svg>
  );
}

export default function FullscreenToggle({
  total = 180,
  start = 47,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: FullscreenToggleProps) {
  const [full, setFull] = useState(false);
  const [t, setT] = useState(start);
  const btnRef = useRef<HTMLButtonElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 더미 재생 시계 — 바닐라의 setInterval(500ms, +0.5초) 을 그대로
  useEffect(() => {
    const id = setInterval(() => setT((p) => (p + 0.5) % total), 500);
    return () => clearInterval(id);
  }, [total]);

  // Escape 로 나간다. 진짜 Fullscreen API 는 iframe 안에서 못 쓴다 — transform 으로 흉내 낸다
  useEffect(() => {
    if (!full) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setFull(false);
        btnRef.current?.focus({ preventScroll: true });
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [full]);

  return (
    <figure className={`${styles.player} ${full ? styles.isFull : ""}`} style={vars}>
      <div className={styles.screen}>
        <div className={styles.stripes} aria-hidden="true" />
        <div className={styles.world} aria-hidden="true">
          <span className={styles.sun} />
          <span className={`${styles.hill} ${styles.hillA}`} />
          <span className={`${styles.hill} ${styles.hillB}`} />
        </div>
        <span className={styles.clock}>{fmt(t)}</span>
        <span className={styles.badge}>{fmt(total)}</span>
        <span className={styles.hint} aria-hidden="true">Esc 로 나가기</span>
        <div className={styles.bar}>
          <span className={styles.time}>
            <b>{fmt(t)}</b> / {fmt(total)}
          </span>
          <button
            ref={btnRef}
            className={styles.fsb}
            type="button"
            aria-expanded={full}
            aria-label={full ? "전체화면 나가기" : "전체화면"}
            onClick={() => setFull((v) => !v)}
          >
            <span className={`${styles.ic} ${styles.icOut}`}>
              <ExpandIcon />
            </span>
            <span className={`${styles.ic} ${styles.icIn}`}>
              <CollapseIcon />
            </span>
          </button>
        </div>
        <span className={styles.fillwrap} aria-hidden="true">
          <span className={styles.fill} style={{ transform: `scaleX(${(t / total).toFixed(4)})` }} />
        </span>
      </div>
    </figure>
  );
}
