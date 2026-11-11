import { useState } from "react";
import styles from "./TestimonialOrb.module.scss";

export type TestimonialOrbProps = {
  /** 카드 셋이 한 바퀴 도는 시간(ms). 카드 수로 나눈 값이 카드 사이 간격이 된다 */
  duration?: number;
  easing?: string;
  /** 오브 아바타 색조. 6자리 hex 로 준다 */
  hues?: string[];
};

type Quote = { quote: string; role: string };

const QUOTES: Quote[] = [
  { quote: "회의록을 넣으면 할 일만 추려서 돌려줘요.", role: "데이터 분석가" },
  { quote: "초안을 세 가지 말투로 받아 골라 씁니다.", role: "제품 디자이너" },
  { quote: "로그를 붙여넣으면 어디가 터졌는지 짚어줘요.", role: "백엔드 개발자" },
];

// 6자리 hex 에 알파 두 자리를 붙인다 — #2f6df6 + "73" 꼴
function withAlpha(hex: string, alpha: number): string {
  const n = Math.round(alpha * 255);
  return hex + (n < 16 ? "0" : "") + n.toString(16);
}

export default function TestimonialOrb({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  hues = ["#2f6df6", "#ff9ebb", "#4cd4a6"],
}: TestimonialOrbProps) {
  const [demo, setDemo] = useState(true);
  const stopLoop = () => { setDemo(false); };

  const orbSkin = (hue: string) => ({
    background:
      "radial-gradient(circle at 32% 26%, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0) 44%), " +
      "radial-gradient(circle at 52% 56%, " + hue + " 0%, " + withAlpha(hue, 0.5) + " 58%, rgba(23, 20, 26, 0.92) 100%)",
    boxShadow: "0 0 12px " + withAlpha(hue, 0.42),
  });
  // animation 단축을 쓰면 delay 가 0s 로 리셋된다 → 낱개로. 지연이 걸리므로 fill-mode 는 scss 쪽에서 backwards
  const loop = (i: number) => ({
    animationDuration: duration + "ms",
    animationTimingFunction: easing,
    animationDelay: Math.round((duration / QUOTES.length) * i) + "ms",
  });

  return (
    <main className={styles.stage}>
      <section
        className={`${styles.tm} ${demo ? styles.demoLoop : ""}`}
        onPointerEnter={stopLoop}
        onClick={stopLoop}
      >
        <p className={styles.eyebrow}>
          <span className={styles.ico} aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M224,128A96,96,0,0,1,79.93,211.11h0L42.54,223.58a8,8,0,0,1-10.12-10.12l12.47-37.39h0A96,96,0,1,1,224,128Z" opacity="0.2"/><path d="M128,24A104,104,0,0,0,36.18,176.88L24.83,210.93a16,16,0,0,0,20.24,20.24l34.05-11.35A104,104,0,1,0,128,24Zm0,192a87.87,87.87,0,0,1-44.06-11.81,8,8,0,0,0-4-1.08,7.85,7.85,0,0,0-2.53.42L40,216,52.47,178.6a8,8,0,0,0-.66-6.54A88,88,0,1,1,128,216Zm12-88a12,12,0,1,1-12-12A12,12,0,0,1,140,128Zm-44,0a12,12,0,1,1-12-12A12,12,0,0,1,96,128Zm88,0a12,12,0,1,1-12-12A12,12,0,0,1,184,128Z"/></svg>
          </span>
          먼저 써 본 사람들
        </p>
        <div className={styles.grid}>
          {QUOTES.map((q, i) => (
            <article key={q.role} className={styles.card} style={demo ? loop(i) : undefined}>
              <span
                className={styles.orb}
                aria-hidden="true"
                style={demo ? { ...orbSkin(hues[i % hues.length]), ...loop(i) } : orbSkin(hues[i % hues.length])}
              />
              <p className={styles.quote}>{q.quote}</p>
              <p className={styles.role}>{q.role}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
