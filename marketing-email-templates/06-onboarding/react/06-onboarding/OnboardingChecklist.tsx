import { useState } from "react";
import styles from "./OnboardingChecklist.module.scss";

export type OnboardingChecklistProps = { duration?: number; easing?: string; color?: string };

const DONE = ["이메일 주소 확인", "프로필 사진 올리기", "첫 소식 구독하기"];
const NEXT = "알림 설정하기";
const TODO = "친구 초대하기";

export default function OnboardingChecklist({ duration = 600, easing = "ease-out", color = "#0f7a52" }: OnboardingChecklistProps) {
  const [demo, setDemo] = useState(true);
  const [done4, setDone4] = useState(false);
  const steps = 3 + (done4 ? 1 : 0);

  return (
    <main className={styles.stage}>
      <div className={styles.mk}>
        <div className={styles.card}>
          <div className={styles.brand}>◆ Acme</div>
          <div className={styles.title}>반가워요! 시작할 준비가 거의 끝났어요</div>
          <div className={styles.body}>5단계 중 3단계를 끝냈어요. 아래 칸을 눌러 다음 단계를 끝내 보세요.</div>
          <div className={styles.barrow}>
            <div className={styles.bar} role="progressbar" aria-valuenow={steps * 20} aria-valuemin={0} aria-valuemax={100} aria-label="시작 단계 진행률">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} className={`${styles.seg} ${(i < 3 || (i === 3 && done4)) ? styles.isFill : ""}`}></span>
              ))}
            </div>
            <span className={styles.barlabel}>{steps}/5</span>
          </div>
          <div className={styles.list}>
            {DONE.map((label) => (
              <div key={label} className={`${styles.stepRow} ${styles.isDone}`}>
                <span className={styles.done} style={{ background: "#0f7a52" }} aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico}><path d="M232,56V200a16,16,0,0,1-16,16H40a16,16,0,0,1-16-16V56A16,16,0,0,1,40,40H216A16,16,0,0,1,232,56Z" opacity="0.2"/><path d="M205.66,85.66l-96,96a8,8,0,0,1-11.32,0l-40-40a8,8,0,0,1,11.32-11.32L104,164.69l90.34-90.35a8,8,0,0,1,11.32,11.32Z"/></svg>
                </span>
                <span className={styles.label}>{label}</span>
              </div>
            ))}
            <button
              type="button"
              className={`${styles.stepRow} ${styles.next} ${done4 ? styles.isDone : ""}`}
              aria-pressed={done4}
              onClick={() => { setDemo(false); setDone4((v) => !v); }}
            >
              <span className={styles.draw} style={{ ...(demo ? { animationName: "obFill", animationDuration: "2s", animationTimingFunction: "steps(1, end)", animationIterationCount: "infinite", background: color } : (done4 ? { background: "#0f7a52" } : {})) }} aria-hidden="true">
                <svg viewBox="0 0 24 24" className={styles.drawsvg}><polyline className={styles.line} pathLength="1" points="4,13 9.5,18.5 20,6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style={demo ? { animationName: "obDraw", animationDuration: "2s", animationTimingFunction: easing, animationIterationCount: "infinite" } : undefined} /></svg>
              </span>
              <span className={styles.label}>{NEXT}</span>
              <span className={styles.hint} style={demo ? { animationName: "obHint", animationDuration: "2s", animationTimingFunction: easing, animationIterationCount: "infinite" } : undefined}>눌러서 완료</span>
            </button>
            <div className={`${styles.stepRow} ${styles.isTodo}`}>
              <span className={styles.todo} aria-hidden="true"></span>
              <span className={styles.label}>{TODO}</span>
            </div>
          </div>
          <div className={styles.footer}>Acme Inc · 서울 · <a href="#" className={styles.unsub}>수신거부</a></div>
        </div>
      </div>
    </main>
  );
}
