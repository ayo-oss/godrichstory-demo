import { useState, type CSSProperties } from "react";
import styles from "./LoadMoreButton.module.scss";

export type LoadMoreButtonProps = {
  initial: string[];
  more: string[];
  /** 새 행이 밀려 올라오는 시간 (기본 600ms) */
  duration?: number;
  easing?: string;
  /** 브랜드 컬러 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** 더보기 클릭 → 로딩 스피너 → 대기 행이 stagger 로 펼쳐진다 */
export default function LoadMoreButton({
  initial,
  more,
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: LoadMoreButtonProps) {
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const click = () => {
    if (loaded) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setLoaded(true); }, 500);
  };

  return (
    <div className={styles.list} style={vars}>
      <ul className={styles.rows}>
        {initial.map((t) => <li key={t} className={styles.row}>{t}</li>)}
        {more.map((t, i) => (
          <li key={t} className={`${styles.row} ${styles.pending} ${loaded ? styles.shown : ""}`} style={{ transitionDelay: `${i * 90}ms` }}>{t}</li>
        ))}
      </ul>
      <button className={styles.btn} type="button" onClick={click} disabled={loaded}>
        <svg className={`${styles.icon} ${loading ? styles.spin : ""}`} viewBox="0 0 256 256" aria-hidden="true">
          <g fill="currentColor"><path d="M216 128a88 88 0 1 1-88-88a88 88 0 0 1 88 88" opacity=".2" /><path d="M240 56v48a8 8 0 0 1-8 8h-48a8 8 0 0 1 0-16h27.4l-26.59-24.36l-.25-.24a80 80 0 1 0-1.67 114.78a8 8 0 0 1 11 11.63A95.44 95.44 0 0 1 128 224h-1.32a96 96 0 1 1 69.07-164L224 85.8V56a8 8 0 1 1 16 0" /></g>
        </svg>
        <span>{loaded ? "더 이상 없음" : "더보기"}</span>
      </button>
    </div>
  );
}
