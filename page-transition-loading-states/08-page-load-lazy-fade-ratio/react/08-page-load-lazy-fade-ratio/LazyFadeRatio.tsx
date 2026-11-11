import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LazyFadeRatio.module.scss";

export type LazyFadeRatioItem = { name: string; meta: string; alt: string; src: string };

export type LazyFadeRatioProps = {
  /** 목록 항목. src 는 외부 의존 0 을 위해 인라인 data URI 를 기본으로 쓴다 */
  items?: LazyFadeRatioItem[];
  title?: string;
  againLabel?: string;
  groupLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 가 얇다 — 브라우저 전역 중 쓰는 것만 로컬 타입으로 좁혀 받는다
type Host = { requestAnimationFrame(cb: () => void): number };

const RIDGE =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20160%2090'%3E%3Cdefs%3E%3ClinearGradient%20id='g1'%20x1='0'%20y1='0'%20x2='0'%20y2='1'%3E%3Cstop%20offset='0'%20stop-color='%232f6df6'/%3E%3Cstop%20offset='1'%20stop-color='%236ec8ff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width='160'%20height='90'%20fill='url%28%23g1%29'/%3E%3Ccircle%20cx='116'%20cy='28'%20r='14'%20fill='%23fff7e6'/%3E%3Cpath%20d='M0%2072%2040%2044%2074%2066%20112%2036%20160%2060%20160%2090%200%2090Z'%20fill='%2317141a'%20opacity='.38'/%3E%3C/svg%3E";
const BANDS =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20160%2090'%3E%3Cdefs%3E%3ClinearGradient%20id='g2'%20x1='0'%20y1='0'%20x2='1'%20y2='1'%3E%3Cstop%20offset='0'%20stop-color='%234cd4a6'/%3E%3Cstop%20offset='1'%20stop-color='%23b9a0ff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width='160'%20height='90'%20fill='url%28%23g2%29'/%3E%3Crect%20x='18'%20y='22'%20width='124'%20height='12'%20rx='6'%20fill='%23fff7e6'%20opacity='.92'/%3E%3Crect%20x='18'%20y='42'%20width='88'%20height='12'%20rx='6'%20fill='%2317141a'%20opacity='.32'/%3E%3Crect%20x='18'%20y='62'%20width='104'%20height='12'%20rx='6'%20fill='%23fff7e6'%20opacity='.62'/%3E%3C/svg%3E";
const DOTS =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20160%2090'%3E%3Cdefs%3E%3ClinearGradient%20id='g3'%20x1='0'%20y1='1'%20x2='1'%20y2='0'%3E%3Cstop%20offset='0'%20stop-color='%23ff9ebb'/%3E%3Cstop%20offset='1'%20stop-color='%23ff4d1f'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width='160'%20height='90'%20fill='url%28%23g3%29'/%3E%3Ccircle%20cx='44'%20cy='54'%20r='22'%20fill='%23fff7e6'%20opacity='.9'/%3E%3Ccircle%20cx='92'%20cy='36'%20r='14'%20fill='%2317141a'%20opacity='.3'/%3E%3Ccircle%20cx='124'%20cy='62'%20r='18'%20fill='%23fff7e6'%20opacity='.55'/%3E%3C/svg%3E";

const DEFAULT_ITEMS: LazyFadeRatioItem[] = [
  { name: "Ridge at sunset", meta: "1920 × 1080", alt: "Ridge at sunset", src: RIDGE },
  { name: "Stacked color bands", meta: "1600 × 900", alt: "Stacked color bands", src: BANDS },
  { name: "Three floating circles", meta: "1280 × 720", alt: "Three floating circles", src: DOTS },
];

export default function LazyFadeRatio({
  items = DEFAULT_ITEMS,
  title = "3 photos",
  againLabel = "Fetch again",
  groupLabel = "List where the photos arrive late",
  demo = true,
  duration = 600,
  easing = "ease-out",
  color = "#2f6df6",
}: LazyFadeRatioProps) {
  const [live, setLive] = useState(demo);
  const [waiting, setWaiting] = useState(false);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function again() {
    // 상자 크기는 그대로 두고 그림만 다시 떠오르게 한다 — 아래 글은 한 번도 밀리지 않는다
    setLive(false);
    setWaiting(true);
    const host = globalThis as unknown as Host;
    host.requestAnimationFrame(() => {
      host.requestAnimationFrame(() => setWaiting(false));
    });
  }

  const cls = [styles.lz, live ? styles.isDemo : "", waiting ? styles.isWaiting : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <header className={styles.head}>
        <p className={styles.title}>{title}</p>
        <button className={styles.again} type="button" onClick={again}>
          {againLabel}
        </button>
      </header>

      <ul className={styles.list}>
        {items.map((it) => (
          <li className={styles.row} key={it.name}>
            {/* 빈 상자와 그림을 같은 칸에 겹친다 — aspect-ratio 가 높이를 먼저 정한다 */}
            <div className={styles.box}>
              <span className={styles.ph} aria-hidden="true" />
              <img
                className={styles.img}
                src={it.src}
                alt={it.alt}
                width={160}
                height={90}
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className={styles.text}>
              <p className={styles.name}>{it.name}</p>
              <p className={styles.meta}>{it.meta}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
