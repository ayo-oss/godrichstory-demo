import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PressHero.module.scss";

export type PressHeroProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PressHero({ duration = 220, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#2f6df6" }: PressHeroProps) {
  const [subscribed, setSubscribed] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.ph} style={vars}>
      <span className={`${styles.orb} ${styles.orb1}`} aria-hidden="true" />
      <span className={`${styles.orb} ${styles.orb2}`} aria-hidden="true" />
      <span className={`${styles.orb} ${styles.orb3}`} aria-hidden="true" />
      <span className={styles.mark} aria-hidden="true" />
      <p className={styles.eyebrow}>PRESS ROOM</p>
      <h1 className={styles.title}>언론과 파트너를 위한<br />최신 소식</h1>
      <p className={styles.sub}>보도자료·미디어 키트·연락처를 한 곳에서 확인하세요.</p>
      <div className={styles.row}>
        <a className={styles.cta} href="#">보도자료 보기</a>
        <button
          type="button"
          className={styles.subBtn}
          aria-pressed={subscribed}
          onClick={() => setSubscribed((v) => !v)}
        >
          <span className={styles.subIc} aria-hidden="true" />
          보도자료 구독
        </button>
      </div>
    </section>
  );
}
