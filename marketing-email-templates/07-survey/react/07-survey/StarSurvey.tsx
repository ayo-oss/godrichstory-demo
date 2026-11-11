import { useState } from "react";
import styles from "./StarSurvey.module.scss";

export type StarSurveyProps = { duration?: number; easing?: string; color?: string };

function StarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico}>
      <path d="M229.06,108.79l-48.7,42,14.88,62.79a8.4,8.4,0,0,1-12.52,9.17L128,189.09,73.28,222.74a8.4,8.4,0,0,1-12.52-9.17l14.88-62.79-48.7-42A8.46,8.46,0,0,1,31.73,94L95.64,88.8l24.62-59.6a8.36,8.36,0,0,1,15.48,0l24.62,59.6L224.27,94A8.46,8.46,0,0,1,229.06,108.79Z" opacity="0.2" />
      <path d="M239.18,97.26A16.38,16.38,0,0,0,224.92,86l-59-4.76L143.14,26.15a16.36,16.36,0,0,0-30.27,0L90.11,81.23,31.08,86a16.46,16.46,0,0,0-9.37,28.86l45,38.83L53,211.75a16.38,16.38,0,0,0,24.5,17.82L128,198.49l50.53,31.08A16.4,16.4,0,0,0,203,211.75l-13.76-58.07,45-38.83A16.43,16.43,0,0,0,239.18,97.26Zm-15.34,5.47-48.7,42a8,8,0,0,0-2.56,7.91l14.88,62.8a.37.37,0,0,1-.17.48c-.18.14-.23.11-.38,0l-54.72-33.65a8,8,0,0,0-8.38,0L69.09,215.94c-.15.09-.19.12-.38,0a.37.37,0,0,1-.17-.48l14.88-62.8a8,8,0,0,0-2.56-7.91l-48.7-42c-.12-.1-.23-.19-.13-.5s.18-.27.33-.29l63.92-5.16A8,8,0,0,0,103,91.86l24.62-59.61c.08-.17.11-.25.35-.25s.27.08.35.25L153,91.86a8,8,0,0,0,6.75,4.92l63.92,5.16c.15,0,.24,0,.33.29S224,102.63,223.84,102.73Z" />
    </svg>
  );
}

export default function StarSurvey({ duration = 220, easing = "ease-out", color = "#ff4d1f" }: StarSurveyProps) {
  const [demo, setDemo] = useState(true);
  const [rating, setRating] = useState(0);

  return (
    <main className={styles.stage}>
      <div className={styles.mk}>
        <div className={styles.card}>
          <div className={styles.brand}>◆ Acme</div>
          <div className={styles.title}>지난 주 쇼핑은 어땠나요?</div>
          <div className={styles.body}>별을 누르면 답변이 기록돼요. 10초면 끝나요.</div>
          <div className={styles.starsrow}>
            <div className={styles.stars} role="radiogroup" aria-label="별점 5점 만점">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`${styles.star} ${n <= rating ? styles.isFill : ""}`}
                  style={{
                    color: n <= rating ? color : undefined,
                    ...(demo ? { animationName: n < 5 ? "svFill" : "svPop", animationDuration: "2s", animationTimingFunction: n < 5 ? "steps(1, end)" : easing, animationIterationCount: "infinite", animationDelay: `${[120, 280, 440, 600, 0][n - 1]}ms` } : {}),
                  }}
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n}점`}
                  onClick={() => { setDemo(false); setRating((r) => (r === n ? 0 : n)); }}
                >
                  <StarIcon />
                </button>
              ))}
            </div>
          </div>
          <div className={styles.thanks}>
            <span className={styles.thankline} style={demo ? { animationName: "svThanks", animationDuration: "2s", animationTimingFunction: easing, animationIterationCount: "infinite" } : undefined}>
              {rating > 0 ? `${rating}점을 주셨네요, 감사합니다.` : "감사해요! 다른 이야기가 있으면 답장으로 들려주세요."}
            </span>
          </div>
          <div className={styles.footer}>Acme Inc · 서울 · <a href="#" className={styles.unsub}>수신거부</a></div>
        </div>
      </div>
    </main>
  );
}
