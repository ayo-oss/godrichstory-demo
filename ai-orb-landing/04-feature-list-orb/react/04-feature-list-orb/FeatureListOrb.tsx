import styles from "./FeatureListOrb.module.scss";

export type FeatureListOrbProps = {
  /** 한 바퀴(ms). 행 수로 나눈 값이 행 사이 간격이 된다 */
  duration?: number;
  easing?: string;
  /** 오브 색. 6자리 hex 로 준다 (#2f6df6) */
  color?: string;
};

const FEATURES = [
  "문서에서 답 찾기",
  "회의록 자동 요약",
  "표 데이터 정리",
  "초안 다시 쓰기",
  "말투 맞춰 번역",
  "코드 조각 만들기",
];

// 6자리 hex 에 알파 두 자리를 붙인다 — #2f6df6 + "73" 꼴
function withAlpha(hex: string, alpha: number): string {
  const n = Math.round(alpha * 255);
  return hex + (n < 16 ? "0" : "") + n.toString(16);
}

export default function FeatureListOrb({
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
}: FeatureListOrbProps) {
  const orbSkin = {
    background:
      "radial-gradient(circle at 34% 26%, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0) 44%), " +
      "radial-gradient(circle at 52% 54%, " + color + " 0%, " + withAlpha(color, 0.45) + " 58%, rgba(23, 20, 26, 0.92) 100%)",
    boxShadow: "0 0 10px " + withAlpha(color, 0.5),
  };
  // animation 단축을 쓰면 delay 가 0s 로 리셋된다 → 낱개로. 지연이 걸리므로 fill-mode 는 scss 쪽에서 backwards
  const loop = (i: number) => ({
    animationDuration: duration + "ms",
    animationTimingFunction: easing,
    animationDelay: Math.round((duration / FEATURES.length) * i) + "ms",
  });

  return (
    <main className={styles.stage}>
      <section className={`${styles.fl} ${styles.demoLoop}`}>
        <p className={styles.eyebrow}>
          <span className={styles.ico} aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M194.82,151.43l-55.09,20.3-20.3,55.09a7.92,7.92,0,0,1-14.86,0l-20.3-55.09-55.09-20.3a7.92,7.92,0,0,1,0-14.86l55.09-20.3,20.3-55.09a7.92,7.92,0,0,1,14.86,0l20.3,55.09,55.09,20.3A7.92,7.92,0,0,1,194.82,151.43Z" opacity="0.2"/><path d="M197.58,129.06,146,110l-19-51.62a15.92,15.92,0,0,0-29.88,0L78,110l-51.62,19a15.92,15.92,0,0,0,0,29.88L78,178l19,51.62a15.92,15.92,0,0,0,29.88,0L146,178l51.62-19a15.92,15.92,0,0,0,0-29.88ZM137,164.22a8,8,0,0,0-4.74,4.74L112,223.85,91.78,169A8,8,0,0,0,87,164.22L32.15,144,87,123.78A8,8,0,0,0,91.78,119L112,64.15,132.22,119a8,8,0,0,0,4.74,4.74L191.85,144ZM144,40a8,8,0,0,1,8-8h16V16a8,8,0,0,1,16,0V32h16a8,8,0,0,1,0,16H184V64a8,8,0,0,1-16,0V48H152A8,8,0,0,1,144,40ZM248,88a8,8,0,0,1-8,8h-8v8a8,8,0,0,1-16,0V96h-8a8,8,0,0,1,0-16h8V72a8,8,0,0,1,16,0v8h8A8,8,0,0,1,248,88Z"/></svg>
          </span>
          AI 워크스페이스
        </p>
        <h2 className={styles.title}>차례로 깨어나는 기능 6가지</h2>
        <ul className={styles.list}>
          {FEATURES.map((feature, i) => (
            <li className={styles.row} key={feature}>
              <span className={styles.orb} aria-hidden="true" style={{ ...orbSkin, ...loop(i) }} />
              <span className={styles.label} style={loop(i)}>{feature}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
