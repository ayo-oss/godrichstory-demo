import styles from "./Hero.module.scss";

// 스크롤 값 하나(--sv)를 두 층(배경·헤드)이 서로 다른 비율(-18px, -42px)로 받아 시차 효과를 만든다.
// 계산 겹: 스크롤 값(--sv) -> 두 층 각각의 translateY 비율 보간. 리스너 없음(자동 재생).
export default function Hero() {
  return (
    <main className={styles.stage}>
      <div className={styles.hero__bg} aria-hidden="true" />
      <div className={styles.hero__head}>
        <p className={styles.hero__eyebrow}>신제품</p>
        <h1 className={styles.hero__title}>가벼운 랜딩 페이지</h1>
        <p className={styles.hero__sub}>스크롤 값 하나로 두 층이 서로 다른 비율로 움직입니다.</p>
        <button className={styles.hero__cta} type="button">
          지금 시작하기
        </button>
      </div>
    </main>
  );
}
