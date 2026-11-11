import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CaptionToggle.module.scss";

export type CaptionToggleProps = {
  /** 더미 영상 길이(초) */
  total?: number;
  /** 시작 위치(초) */
  start?: number;
  /** 돌려 가며 보여 줄 자막 문장 */
  lines?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

function fmt(s: number) {
  const n = Math.floor(s);
  return Math.floor(n / 60) + ":" + ("0" + (n % 60)).slice(-2);
}

function CcIcon() {
  return (
    <svg viewBox="0 0 256 256" width="18" height="18" aria-hidden="true">
      <g fill="currentColor">
        <path d="M232 64v128a8 8 0 0 1-8 8H32a8 8 0 0 1-8-8V64a8 8 0 0 1 8-8h192a8 8 0 0 1 8 8" opacity=".2" />
        <path d="M224 48H32a16 16 0 0 0-16 16v128a16 16 0 0 0 16 16h192a16 16 0 0 0 16-16V64a16 16 0 0 0-16-16m0 144H32V64h192zm-105.07-40.29a8 8 0 0 1-2.93 10.93a40 40 0 1 1 0-69.28a8 8 0 1 1-8 13.85a24 24 0 1 0 0 41.58a8 8 0 0 1 10.93 2.92m80 0a8 8 0 0 1-2.93 10.93a40 40 0 1 1 0-69.28a8 8 0 1 1-8 13.85a24 24 0 1 0 0 41.58a8 8 0 0 1 10.93 2.92" />
      </g>
    </svg>
  );
}

export default function CaptionToggle({
  total = 180,
  start = 12,
  lines = ["영상이 시작됩니다", "자막을 켜 보세요", "스타일을 고를 수 있어요", "이제 준비가 끝났어요"],
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: CaptionToggleProps) {
  const [on, setOn] = useState(true);
  const [outline, setOutline] = useState(false);
  const [t, setT] = useState(start);

  // 더미 재생 시계 — 바닐라의 setInterval(250ms) 과 같은 방식(경과 시간으로 걷는다)
  useEffect(() => {
    let last = Date.now();
    const id = setInterval(() => {
      const n = Date.now();
      const step = (n - last) / 1000;
      last = n;
      setT((p) => (p + step) % total);
    }, 250);
    return () => clearInterval(id);
  }, [total]);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  // 시계가 2초마다 문장을 갈아 끼운다
  const cur = Math.floor(t / 2) % lines.length;

  return (
    <figure
      className={`${styles.player} ${on ? "" : styles.isOff} ${outline ? styles.isOutline : ""}`}
      style={vars}
    >
      <div className={styles.screen}>
        <div className={styles.stripes} aria-hidden="true" />
        <div className={styles.world} aria-hidden="true">
          <span className={styles.sun} />
          <span className={`${styles.hill} ${styles.hillA}`} />
          <span className={`${styles.hill} ${styles.hillB}`} />
        </div>
        <span className={styles.clock}>{fmt(t)}</span>
        <span className={styles.badge}>{fmt(total)}</span>
        <div className={styles.cap}>
          {lines.map((l, k) => (
            <span key={l} className={`${styles.line} ${k === cur ? styles.isOn : ""}`}>
              {l}
            </span>
          ))}
        </div>
        <span className={styles.fillwrap} aria-hidden="true">
          <span className={styles.fill} style={{ transform: `scaleX(${(t / total).toFixed(4)})` }} />
        </span>
      </div>
      <div className={styles.bar}>
        <button
          className={styles.cc}
          type="button"
          aria-pressed={on}
          onClick={() => setOn((v) => !v)}
        >
          <span className={styles.ccIc} aria-hidden="true">
            <CcIcon />
          </span>
          <span>자막</span>
        </button>
        <div className={styles.seg} role="group" aria-label="자막 스타일">
          <button
            className={`${styles.segBtn} ${outline ? "" : styles.isOn}`}
            type="button"
            aria-pressed={!outline}
            onClick={() => setOutline(false)}
          >
            바탕칩
          </button>
          <button
            className={`${styles.segBtn} ${outline ? styles.isOn : ""}`}
            type="button"
            aria-pressed={outline}
            onClick={() => setOutline(true)}
          >
            외곽선
          </button>
        </div>
        <span className={styles.time}>
          <b>{fmt(t)}</b> / {fmt(total)}
        </span>
      </div>
    </figure>
  );
}
