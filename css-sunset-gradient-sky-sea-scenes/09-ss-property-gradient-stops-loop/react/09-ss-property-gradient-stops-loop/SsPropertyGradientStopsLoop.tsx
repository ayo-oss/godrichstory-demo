import styles from "./SsPropertyGradientStopsLoop.module.scss";

export default function SsPropertyGradientStopsLoop() {
  return (
    <main className={styles.stage}>
      <div className={styles.sc}>
        <input className={styles.sc__toggle} type="checkbox" id="scPause" aria-label="멈춤" />
        <div className={styles.sc__sky} />
        <div className={styles.sc__sea}><div className={styles.sc__glint} /></div>
        <p className={styles.sc__status} role="status" aria-live="polite">CSS 만으로 저무는 하늘</p>
        <label className={styles.sc__btn} htmlFor="scPause"><span className={styles.sc__off}>멈춤</span><span className={styles.sc__on}>재생</span></label>
      </div>
    </main>
  );
}
