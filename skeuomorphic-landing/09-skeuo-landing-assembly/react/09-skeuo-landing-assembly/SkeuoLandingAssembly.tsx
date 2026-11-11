import type { CSSProperties } from "react";
import styles from "./SkeuoLandingAssembly.module.scss";

export type SkeuoLandingAssemblyProps = {
  eyebrow?: string;
  heroBtn?: string;
  ctaBtn?: string;
  plan?: string;
  price?: string;
  noteTex?: string;
  noteFlat?: string;
  noteScroll?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SkeuoLandingAssembly({
  eyebrow = "질감 랜딩",
  heroBtn = "시작하기",
  ctaBtn = "무료로 시작",
  plan = "Pro 멤버십",
  price = "월 24,000원",
  noteTex = "질감 3곳 — 나무 내비 · 금속 다이얼 · 가죽 카드",
  noteFlat = "나머지 구간은 밝은 평면으로 대비",
  noteScroll = "스크롤이 질감의 자리를 알려준다",
  duration = 2000,
  easing = "ease-out",
  color = "#f7f5f0",
}: SkeuoLandingAssemblyProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.minipage} style={vars} aria-label="질감 세 곳만 쓴 미니 랜딩">
      <div className={styles.frame}>
        <div className={styles.track}>
          <header className={styles.nav}>
            <span className={styles.navdot} />
            <span className={styles.navlink} />
            <span className={styles.navlink} />
          </header>
          <section className={styles.hero}>
            <p className={styles.heroEyebrow}>{eyebrow}</p>
            <span className={styles.heroBar} />
            <span className={`${styles.heroBar} ${styles.heroBarShort}`} />
            <span className={styles.heroBtn}>{heroBtn}</span>
          </section>
          <section className={styles.features}>
            <article className={styles.fcard}><span className={styles.fdot} /><span className={styles.fline} /></article>
            <article className={styles.fcard}><span className={`${styles.fdot} ${styles.fdotB}`} /><span className={styles.fline} /></article>
            <article className={styles.fcard}><span className={`${styles.fdot} ${styles.fdotC}`} /><span className={styles.fline} /></article>
          </section>
          <section className={styles.cta}>
            <span className={styles.dial} aria-hidden="true"><span /></span>
            <span className={styles.ctaBtn}>{ctaBtn}</span>
          </section>
          <section className={styles.pricing}>
            <p className={styles.plan}>{plan}</p>
            <p className={styles.price}>{price}</p>
            <span className={styles.stitch} aria-hidden="true" />
          </section>
          <section className={styles.quote}>
            <span className={styles.avatar} />
            <span className={styles.qline} />
            <span className={`${styles.qline} ${styles.qlineShort}`} />
          </section>
          <section className={styles.faq}>
            <span className={styles.qrow} />
            <span className={`${styles.qrow} ${styles.qrowOpen}`}>
              <span className={styles.qbody} />
            </span>
            <span className={styles.qrow} />
          </section>
          <footer className={styles.foot}>
            <span className={styles.footdot} />
            <span className={styles.footdot} />
            <span className={styles.footdot} />
          </footer>
        </div>
      </div>
      <div className={styles.notes}>
        <p className={`${styles.note} ${styles.noteTex}`}>{noteTex}</p>
        <p className={styles.note}>{noteFlat}</p>
        <p className={styles.note}>{noteScroll}</p>
      </div>
    </section>
  );
}
