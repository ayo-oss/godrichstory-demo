import type { CSSProperties } from "react";
import styles from "./FeatureGrid.module.scss";

// 카드 순서 값(--i)에 간격 상수(스태거 간격)를 곱한 값을 animation-delay 로 써서 카드가 순서대로 뜬다.
// 계산 겹: 카드 순서 값(--i) × 간격 상수 -> animation-delay. 리스너 없음(자동 재생).
type Vars = CSSProperties & { "--i"?: number };

const FEATURES = [
  { badge: "01", title: "빠른 설치", desc: "스크립트 한 줄로 끝" },
  { badge: "02", title: "실시간 동기화", desc: "모든 기기에 즉시 반영" },
  { badge: "03", title: "안전한 백업", desc: "매일 자동으로 저장" },
  { badge: "04", title: "간편한 공유", desc: "링크 하나로 초대" },
];

export default function FeatureGrid() {
  return (
    <main className={styles.stage}>
      <div className={`${styles.grid} ${styles["is-demo"]}`}>
        {FEATURES.map((item, i) => (
          <article
            key={item.badge}
            className={styles.card}
            style={{ "--i": i } as Vars}
          >
            <p className={styles.card__badge}>{item.badge}</p>
            <h3 className={styles.card__title}>{item.title}</h3>
            <p className={styles.card__desc}>{item.desc}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
