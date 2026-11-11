import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FavoritePins.module.scss";

export type FavoritePinsProps = {
  /** 지도 위 매장 이름 4개 */
  places?: string[];
  /** 칩 목록 제목 */
  title?: string;
  /** 하트 버튼의 스크린리더 설명을 만드는 함수 */
  pinLabel?: (place: string) => string;
  listLabel?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };

const heart = (
  <svg viewBox="0 0 256 256" width="16" height="16"><g fill="currentColor"><path d="M232 102c0 66-104 122-104 122S24 168 24 102a54 54 0 0 1 54-54c22.59 0 41.94 12.31 50 32c8.06-19.69 27.41-32 50-32a54 54 0 0 1 54 54" opacity=".2" /><path d="M178 40c-20.65 0-38.73 8.88-50 23.89C116.73 48.88 98.65 40 78 40a62.07 62.07 0 0 0-62 62c0 70 103.79 126.66 108.21 129a8 8 0 0 0 7.58 0C136.21 228.66 240 172 240 102a62.07 62.07 0 0 0-62-62m-50 174.8c-18.26-10.64-96-59.11-96-112.8a46.06 46.06 0 0 1 46-46c19.45 0 35.78 10.36 42.6 27a8 8 0 0 0 14.8 0c6.82-16.67 23.15-27 42.6-27a46.06 46.06 0 0 1 46 46c0 53.61-77.76 102.15-96 112.8" /></g></svg>
);
const storefront = (
  <svg viewBox="0 0 256 256" width="12" height="12"><g fill="currentColor"><path d="M224 96v16a32 32 0 0 1-64 0V96H96v16a32 32 0 0 1-64 0V96l14.34-50.2A8 8 0 0 1 54 40h148a8 8 0 0 1 7.69 5.8Z" opacity=".2" /><path d="M231.69 93.81L217.35 43.6A16.07 16.07 0 0 0 202 32H54a16.07 16.07 0 0 0-15.35 11.6L24.31 93.81A8 8 0 0 0 24 96v16a40 40 0 0 0 16 32v72a8 8 0 0 0 8 8h160a8 8 0 0 0 8-8v-72a40 40 0 0 0 16-32V96a8 8 0 0 0-.31-2.19M54 48h148l11.42 40H42.61Zm98 56v8a24 24 0 0 1-48 0v-8ZM51.06 132.2A24 24 0 0 1 40 112v-8h48v8a24 24 0 0 1-35.12 21.26a8 8 0 0 0-1.82-1.06M200 208H56v-56.8a40.6 40.6 0 0 0 8 .8a40 40 0 0 0 32-16a40 40 0 0 0 64 0a40 40 0 0 0 32 16a40.6 40.6 0 0 0 8-.8Zm16-96a24 24 0 0 1-11.07 20.2a8 8 0 0 0-1.8 1.05A24 24 0 0 1 168 112v-8h48Z" /></g></svg>
);

export default function FavoritePins({
  places = ["Cafe Ondo", "Hana Books", "Park Bakery", "Salt House"],
  title = "My places",
  pinLabel = (p: string) => `Save ${p} to favorites`,
  listLabel = "Saved places",
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#ff4d1f",
}: FavoritePinsProps) {
  const [demo, setDemo] = useState(true);
  const [on, setOn] = useState<boolean[]>([false, false, false, false]);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const pinPos = [styles.pin1, styles.pin2, styles.pin3, styles.pin4];

  function toggle(i: number) {
    setDemo(false);           // 사람이 조작하면 자동 루프를 끈다
    setOn((prev) => prev.map((v, k) => (k === i ? !v : v)));
  }

  return (
    <div className={`${styles.fp} ${demo ? styles.isDemo : ""}`} style={vars}>
      <div className={styles.map}>
        <span className={`${styles.block} ${styles.blockA}`} aria-hidden="true" />
        <span className={`${styles.block} ${styles.blockB}`} aria-hidden="true" />
        <span className={`${styles.block} ${styles.blockC}`} aria-hidden="true" />
        {places.map((p, i) => (
          <button
            key={p}
            type="button"
            className={`${styles.pin} ${pinPos[i]}`}
            aria-pressed={on[i]}
            aria-label={pinLabel(p)}
            onClick={() => toggle(i)}
            onKeyDown={(e: KeyEvt) => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(i); }
            }}
          >
            <span className={styles.heart} aria-hidden="true">{heart}</span>
          </button>
        ))}
      </div>
      <div className={styles.foot}>
        <p className={styles.title}>{title}</p>
        <ul className={styles.chips} aria-live="polite" aria-label={listLabel}>
          {places.map((p, i) => (
            <li key={p} className={`${styles.chip} ${on[i] ? styles.isOn : ""}`} aria-hidden={!on[i]}>
              <span className={styles.chipIco} aria-hidden="true">{storefront}</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
