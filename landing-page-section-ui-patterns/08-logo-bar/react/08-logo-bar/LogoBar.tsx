import styles from "./LogoBar.module.scss";

// 트랙을 통째로 복제해 이어 붙이고, 가로 이동 값(translateX)이 계속 늘어나다 -50% 지점에서 이음매 없이 되돌아간다.
// 계산 겹: 가로 이동 값 -> translateX 보간(무한 반복). 리스너 없음(자동 재생).
const LOGOS = ["BRAND A", "BRAND B", "BRAND C", "BRAND D"];

export default function LogoBar() {
  const track = [...LOGOS, ...LOGOS];

  return (
    <main className={styles.stage}>
      <section className={styles["marquee-wrap"]}>
        <p className={styles.marquee__caption}>함께하는 파트너</p>
        <div className={styles.marquee}>
          <div className={`${styles.marquee__track} ${styles["is-demo"]}`}>
            {track.map((name, i) => (
              <span key={`${name}-${i}`} className={styles.logo} aria-hidden={i >= LOGOS.length}>
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
