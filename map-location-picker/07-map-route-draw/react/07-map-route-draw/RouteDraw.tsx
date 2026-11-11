import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./RouteDraw.module.scss";

export type RouteDrawProps = {
  /** 경로 배지에 쓸 소요시간·거리 */
  eta?: string;
  /** 경로 SVG 의 스크린리더 설명 */
  routeLabel?: string;
  /** 다시 그리기 버튼 글자 */
  buttonLabel?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };

// pathLength="100" 으로 길이를 정규화해 dash 값이 곧 진행률 % 가 되게 한다
const ROUTE = "M58 246 L58 196 L150 196 L150 128 L286 128 L286 74 L414 74";

export default function RouteDraw({
  eta = "12 min · 3.4 km",
  routeLabel = "Route from start to destination, 12 min 3.4 km",
  buttonLabel = "Draw the route again",
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: RouteDrawProps) {
  const [demo, setDemo] = useState(true);
  const [drawn, setDrawn] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function redraw() {
    setDemo(false);           // 사람이 조작하면 자동 루프를 끈다
    setDrawn(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setDrawn(true)));
  }

  return (
    <div className={`${styles.rd} ${demo ? styles.isDemo : ""} ${drawn ? styles.isDrawn : ""}`} style={vars}>
      <div className={styles.map}>
        <span className={`${styles.block} ${styles.blockA}`} aria-hidden="true" />
        <span className={`${styles.block} ${styles.blockB}`} aria-hidden="true" />
        <span className={`${styles.block} ${styles.blockC}`} aria-hidden="true" />
        <svg className={styles.route} viewBox="0 0 480 300" preserveAspectRatio="none" role="img" aria-label={routeLabel}>
          <path className={`${styles.line} ${styles.lineBase}`} pathLength={100} vectorEffect="non-scaling-stroke" d={ROUTE} />
          <path className={`${styles.line} ${styles.lineDraw}`} pathLength={100} vectorEffect="non-scaling-stroke" d={ROUTE} />
        </svg>
        <span className={`${styles.pin} ${styles.pinStart}`} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="24" height="24"><g fill="currentColor"><path d="M128 24a80 80 0 0 0-80 80c0 72 80 128 80 128s80-56 80-128a80 80 0 0 0-80-80m0 112a32 32 0 1 1 32-32a32 32 0 0 1-32 32" opacity=".2" /><path d="M128 64a40 40 0 1 0 40 40a40 40 0 0 0-40-40m0 64a24 24 0 1 1 24-24a24 24 0 0 1-24 24m0-112a88.1 88.1 0 0 0-88 88c0 31.4 14.51 64.68 42 96.25a254.2 254.2 0 0 0 41.45 38.3a8 8 0 0 0 9.18 0a254.2 254.2 0 0 0 41.37-38.3c27.45-31.57 42-64.85 42-96.25a88.1 88.1 0 0 0-88-88m0 206c-16.53-13-72-60.75-72-118a72 72 0 0 1 144 0c0 57.23-55.47 105-72 118" /></g></svg>
        </span>
        <span className={styles.flag} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="20" height="20"><g fill="currentColor"><path d="M224 56v60c-19.89 17.23-38.23 18.39-56 13.48v-60c17.76 4.91 36.11 3.75 56-13.48m-120 46.52v-60C86.24 37.61 67.89 38.77 48 56v60c19.89-17.22 38.23-18.39 56-13.48v60c21.62 6 42.38 21 64 27v-60c-21.62-6-42.38-21-64-27" opacity=".2" /><path d="M227.32 48.75a8 8 0 0 0-8.56 1.25c-28 24.22-51.72 12.48-79.21-1.13C111.07 34.76 78.78 18.79 42.76 50A8 8 0 0 0 40 56v168a8 8 0 0 0 16 0v-44.23c26.79-21.16 49.87-9.75 76.45 3.41c28.49 14.09 60.77 30.06 96.79-1.13a8 8 0 0 0 2.76-6V56a8 8 0 0 0-4.68-7.25M216 71.6v40.65c-14 11.06-27 13.22-40 10.88V79.34a60.05 60.05 0 0 0 40-7.74m-56 3.76v43c-6.66-2.67-13.43-6-20.45-9.48c-8.82-4.37-18-8.91-27.55-12.18v-43c6.66 2.66 13.43 6 20.45 9.48c8.82 4.37 18.01 8.91 27.55 12.18M96 48.91v43.78a60.06 60.06 0 0 0-40 7.75V59.78c14-11.06 27-13.21 40-10.87M86.58 152A60.06 60.06 0 0 0 56 160.43v-40.65c14-11.06 27-13.22 40-10.88v43.8a65.6 65.6 0 0 0-9.42-.7m25.42 4.67v-43c6.66 2.66 13.43 6 20.45 9.48c8.82 4.37 18 8.9 27.55 12.17v43c-6.66-2.67-13.43-6-20.45-9.48c-8.82-4.37-18.01-8.9-27.55-12.17m64 26.45v-43.8a65.6 65.6 0 0 0 9.42.72a60.1 60.1 0 0 0 30.58-8.47v40.68c-14 11.06-27 13.21-40 10.87" /></g></svg>
        </span>
        <span className={styles.badge} aria-hidden="true">
          <span className={styles.badgeIco}>
            <svg viewBox="0 0 256 256" width="12" height="12"><g fill="currentColor"><path d="M234.35 129L152 152l-23 82.35a8 8 0 0 1-15.21.27l-65.28-176a8 8 0 0 1 10.12-10.16l176 65.28a8 8 0 0 1-.28 15.26" opacity=".2" /><path d="M237.33 106.21L61.41 41l-.16-.05a16 16 0 0 0-20.35 20.3a1 1 0 0 0 .05.16l65.26 175.92A15.77 15.77 0 0 0 121.28 248h.3a15.77 15.77 0 0 0 15-11.29l.06-.2l21.84-78l78-21.84l.2-.06a16 16 0 0 0 .62-30.38Zm-87.49 38.09a8 8 0 0 0-5.54 5.54l-23 82.16l-.06-.17L56 56l175.82 65.22l.16.06Z" /></g></svg>
          </span>
          <span>{eta}</span>
        </span>
      </div>
      <button
        type="button"
        className={styles.btn}
        onClick={redraw}
        onKeyDown={(e: KeyEvt) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); redraw(); }
        }}
      >
        <span className={styles.btnIco} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="13" height="13"><g fill="currentColor"><path d="M234.35 129L152 152l-23 82.35a8 8 0 0 1-15.21.27l-65.28-176a8 8 0 0 1 10.12-10.16l176 65.28a8 8 0 0 1-.28 15.26" opacity=".2" /><path d="M237.33 106.21L61.41 41l-.16-.05a16 16 0 0 0-20.35 20.3a1 1 0 0 0 .05.16l65.26 175.92A15.77 15.77 0 0 0 121.28 248h.3a15.77 15.77 0 0 0 15-11.29l.06-.2l21.84-78l78-21.84l.2-.06a16 16 0 0 0 .62-30.38Zm-87.49 38.09a8 8 0 0 0-5.54 5.54l-23 82.16l-.06-.17L56 56l175.82 65.22l.16.06Z" /></g></svg>
        </span>
        <span>{buttonLabel}</span>
      </button>
    </div>
  );
}
