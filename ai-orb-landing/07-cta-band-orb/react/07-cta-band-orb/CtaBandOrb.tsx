import { useState } from "react";
import styles from "./CtaBandOrb.module.scss";

export type CtaBandOrbProps = {
  /** 오브가 좌 → 우 → 좌 를 한 바퀴 도는 시간 */
  duration?: string;
  /** 버튼이 떠오르는 이징 */
  easing?: string;
  /** 오브 핵심 색 — --orbColor 로 내려간다 */
  color?: string;
};

export default function CtaBandOrb({
  duration = "2s",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#b9a0ff",
}: CtaBandOrbProps) {
  // 사람이 손을 대면 미리보기 루프를 끄고 진짜 호버·포커스에 넘긴다
  const [preview, setPreview] = useState(true);
  const stopPreview = () => { setPreview(false); };

  return (
    <main className={styles.stage}>
      <section className={styles.cb} style={{ "--orbColor": color }}>
        {/* 오브는 순수 장식 — 낭독기에서 숨긴다 */}
        <span
          className={styles.orb}
          aria-hidden="true"
          style={{
            animationName: "orbDrift",
            animationDuration: duration,
            animationTimingFunction: "ease-in-out",
            animationIterationCount: "infinite",
          }}
        />
        <p className={styles.eyebrow}>
          <span className={styles.ico} aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M194.82,151.43l-55.09,20.3-20.3,55.09a7.92,7.92,0,0,1-14.86,0l-20.3-55.09-55.09-20.3a7.92,7.92,0,0,1,0-14.86l55.09-20.3,20.3-55.09a7.92,7.92,0,0,1,14.86,0l20.3,55.09,55.09,20.3A7.92,7.92,0,0,1,194.82,151.43Z" opacity="0.2"/><path d="M197.58,129.06,146,110l-19-51.62a15.92,15.92,0,0,0-29.88,0L78,110l-51.62,19a15.92,15.92,0,0,0,0,29.88L78,178l19,51.62a15.92,15.92,0,0,0,29.88,0L146,178l51.62-19a15.92,15.92,0,0,0,0-29.88ZM137,164.22a8,8,0,0,0-4.74,4.74L112,223.85,91.78,169A8,8,0,0,0,87,164.22L32.15,144,87,123.78A8,8,0,0,0,91.78,119L112,64.15,132.22,119a8,8,0,0,0,4.74,4.74L191.85,144ZM144,40a8,8,0,0,1,8-8h16V16a8,8,0,0,1,16,0V32h16a8,8,0,0,1,0,16H184V64a8,8,0,0,1-16,0V48H152A8,8,0,0,1,144,40ZM248,88a8,8,0,0,1-8,8h-8v8a8,8,0,0,1-16,0V96h-8a8,8,0,0,1,0-16h8V72a8,8,0,0,1,16,0v8h8A8,8,0,0,1,248,88Z"/></svg></span>
          무료 체험 열림
        </p>
        <h2 className={styles.title}>첫 프롬프트를 오늘 안에 돌려보세요</h2>
        <p className={styles.sub}>카드 등록 없이 5분이면 팀 작업실이 열립니다.</p>
        <button
          type="button"
          className={styles.cta}
          style={preview ? {
            animationName: "ctaLift",
            animationDuration: duration,
            animationTimingFunction: easing,
            animationIterationCount: "infinite",
          } : undefined}
          onPointerEnter={stopPreview}
          onFocus={stopPreview}
          onClick={stopPreview}
        >
          무료로 시작하기
          <span className={`${styles.ico} ${styles.icoSm}`} aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M216,128l-72,72V56Z" opacity="0.2"/><path d="M221.66,122.34l-72-72A8,8,0,0,0,136,56v64H40a8,8,0,0,0,0,16h96v64a8,8,0,0,0,13.66,5.66l72-72A8,8,0,0,0,221.66,122.34ZM152,180.69V75.31L204.69,128Z"/></svg></span>
        </button>
        <p className={styles.note}>언제든 해지할 수 있어요</p>
      </section>
    </main>
  );
}
