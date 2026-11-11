import { useEffect, useState, type CSSProperties } from "react";
import styles from "./SplitScreenLogin.module.scss";

export type SplitScreenLoginProps = {
  /** 패널이 밀려 들어오는 시간 (기본 600ms) */
  duration?: number;
  easing?: string;
  /** 이미지 패널 색 */
  color?: string;
};

/** 화면 진입 시 두 패널이 좌우에서 밀려 들어온다. 마운트 직후 한 번만 재생 */
export default function SplitScreenLogin({
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: SplitScreenLoginProps) {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const style = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <div className={styles.split} style={style}>
      <div className={`${styles.panel} ${styles.image} ${entered ? styles.in : styles.outLeft}`}>
        <span className={styles.brand}>Godrich</span>
        <p className={styles.tagline}>Build fast, ship faster.</p>
      </div>
      <form
        className={`${styles.panel} ${styles.form} ${entered ? styles.in : styles.outRight}`}
        onSubmit={(e: { preventDefault(): void }) => e.preventDefault()}
      >
        <span className={`${styles.line} ${styles.label}`} />
        <span className={`${styles.line} ${styles.field}`} />
        <span className={`${styles.line} ${styles.label}`} />
        <span className={`${styles.line} ${styles.field}`} />
        <button className={styles.btn} type="submit">Sign in</button>
      </form>
    </div>
  );
}
