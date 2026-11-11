import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./HeroZoomHotspot.module.scss";

export type Hotspot = {
  /** 점의 이름 — 스크린 리더가 읽는다 */
  label: string;
  /** 터진 자리에 뜨는 쪽지 */
  note: string;
};

export type HeroZoomHotspotProps = {
  title?: string;
  sub?: string;
  spots?: [Hotspot, Hotspot];
  /** 확대 한 바퀴 · 호출점 둘이 차례로 터지는 한 바퀴(ms) */
  duration?: number;
  easing?: string;
  /** 제품 화면 타일의 강조색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const Crosshair = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="11" height="11" aria-hidden="true" focusable="false" fill="currentColor">
    <path d="M160,128a32,32,0,1,1-32-32A32,32,0,0,1,160,128Z" opacity="0.2" />
    <path d="M232,120h-8.34A96.14,96.14,0,0,0,136,32.34V24a8,8,0,0,0-16,0v8.34A96.14,96.14,0,0,0,32.34,120H24a8,8,0,0,0,0,16h8.34A96.14,96.14,0,0,0,120,223.66V232a8,8,0,0,0,16,0v-8.34A96.14,96.14,0,0,0,223.66,136H232a8,8,0,0,0,0-16Zm-96,87.6V200a8,8,0,0,0-16,0v7.6A80.15,80.15,0,0,1,48.4,136H56a8,8,0,0,0,0-16H48.4A80.15,80.15,0,0,1,120,48.4V56a8,8,0,0,0,16,0V48.4A80.15,80.15,0,0,1,207.6,120H200a8,8,0,0,0,0,16h7.6A80.15,80.15,0,0,1,136,207.6ZM128,88a40,40,0,1,0,40,40A40,40,0,0,0,128,88Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,152Z" />
  </svg>
);

const DEFAULT_SPOTS: [Hotspot, Hotspot] = [
  { label: "지표 설명 열기", note: "지표를 한눈에" },
  { label: "알림 설명 열기", note: "알림만 골라서" },
];

export default function HeroZoomHotspot({
  title = "기능은 짚어서 보여 준다",
  sub = "점을 누르면 그 자리에 설명 쪽지가 뜹니다.",
  spots = DEFAULT_SPOTS,
  duration = 2000,
  easing = "ease-out",
  color = "#5b4bd6",
}: HeroZoomHotspotProps): ReactNode {
  const [loop, setLoop] = useState<boolean>(true);
  const [open, setOpen] = useState<boolean[]>([false, false]);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const place = [styles.spot1, styles.spot2];

  /* 점을 누르면 그 쪽지만 열리고 닫힌다 — 미리보기 루프는 그 자리에서 뗀다 */
  const toggle = (i: number): void => {
    setLoop(false);
    setOpen(open.map((v: boolean, k: number) => (k === i ? !v : v)));
  };

  return (
    <section
      className={loop ? `${styles.hz} ${styles.isDemo}` : styles.hz}
      style={vars}
      onPointerEnter={() => setLoop(false)}
      onFocus={() => setLoop(false)}
    >
      <div className={styles.copy}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.sub}>{sub}</p>
      </div>

      <div className={styles.frame}>
        {/* 제품 그림은 사진이 아니라 도형 조합 — transform-origin 을 첫 호출점 쪽에 둔다 */}
        <div className={styles.art} aria-hidden="true">
          <span className={styles.screen}>
            <i className={`${styles.bar} ${styles.barHead}`} />
            <i className={`${styles.bar} ${styles.barA}`} />
            <span className={styles.row}>
              <i className={`${styles.tile} ${styles.tileV}`} />
              <i className={`${styles.tile} ${styles.tileG}`} />
            </span>
          </span>
        </div>

        {spots.map((s: Hotspot, i: number) => (
          <div
            className={`${styles.spot} ${place[i]} ${open[i] ? styles.isOpen : ""}`}
            key={s.label}
          >
            <button
              className={styles.dot}
              type="button"
              aria-expanded={open[i]}
              aria-controls={`hz-note-${i + 1}`}
              aria-label={s.label}
              onClick={() => toggle(i)}
            >
              <span className={styles.ring} aria-hidden="true" />
              <Crosshair />
            </button>
            <p className={styles.note} id={`hz-note-${i + 1}`}>{s.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
