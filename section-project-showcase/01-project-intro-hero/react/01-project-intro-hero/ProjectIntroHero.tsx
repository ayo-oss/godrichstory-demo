import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ProjectIntroHero.module.scss";

export type ProjectIntroHeroProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ProjectIntroHero({ duration = 220, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#2f6df6" }: ProjectIntroHeroProps) {
  const [available, setAvailable] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.ih} style={vars}>
      <span className={`${styles.orb} ${styles.orb1}`} aria-hidden="true" />
      <span className={`${styles.orb} ${styles.orb2}`} aria-hidden="true" />
      <span className={`${styles.orb} ${styles.orb3}`} aria-hidden="true" />
      <span className={styles.mark} aria-hidden="true" />
      <p className={styles.eyebrow}>PORTFOLIO</p>
      <h1 className={styles.title}>웹으로 만든 것들의<br />기록</h1>
      <p className={styles.sub}>프로젝트 사례와 연락처를 한 화면에서 확인하세요.</p>
      <div className={styles.row}>
        <a className={styles.cta} href="#">프로젝트 보기</a>
        <button
          type="button"
          className={styles.availBtn}
          aria-pressed={available}
          onClick={() => setAvailable((v) => !v)}
        >
          <span className={styles.availIc} aria-hidden="true" />
          새 프로젝트 제안받기
        </button>
      </div>
    </section>
  );
}
