import styles from "./CtaBand.module.scss";

// 회전하는 테두리의 각도 값(--angle)이 계속 늘어나며 conic-gradient 시작점을 돌린다.
// 계산 겹: 각도 값(--angle) -> conic-gradient 시작점 보간. 리스너 없음(자동 재생).
export default function CtaBand() {
  return (
    <main className={styles.stage}>
      <section className={styles.band}>
        <p className={styles.band__text}>지금 무료로 시작해보세요</p>
        <div className={styles["band__cta-wrap"]}>
          <div className={styles.band__ring} aria-hidden="true" />
          <button className={styles.band__cta} type="button">
            무료 체험 시작
          </button>
        </div>
      </section>
    </main>
  );
}
