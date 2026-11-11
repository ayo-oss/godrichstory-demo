import { useState } from "react";
import styles from "./EventInvite.module.scss";

export type EventInviteProps = { duration?: number; easing?: string; color?: string };

export default function EventInvite({ duration = 300, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#ff4d1f" }: EventInviteProps) {
  const [demo, setDemo] = useState(true);
  const [pick, setPick] = useState(-1);

  return (
    <main className={styles.stage}>
      <div className={styles.mk}>
        <div className={styles.card}>
          <div className={styles.brand}>◆ Acme</div>
          <div className={styles.evrow}>
            <div className={styles.datecard} style={{ background: color }} aria-hidden="true">
              <span className={styles.month}>9월</span>
              <span className={styles.day}>24</span>
              <span className={styles.weekday}>목요일</span>
            </div>
            <div className={styles.evinfo}>
              <span className={styles.evtitle}>가을 정기 모임, 두 번째</span>
              <span className={styles.meta}>온라인 웨비나 · 19:30</span>
              <span className={styles.meta}>발표 2편 + 질문 30분</span>
            </div>
          </div>
          <div className={styles.title}>참석하시겠어요?</div>
          <div className={styles.rsvp}>
            {["참석", "미정", "불참"].map((label, i) => (
              <button
                key={label}
                type="button"
                className={`${styles.opt} ${i === 0 ? styles.yes : ""} ${pick === i ? styles.isOn : ""}`}
                style={demo && i === 0 ? { animationName: "evYes", animationDuration: "2s", animationTimingFunction: "steps(1, end)", animationIterationCount: "infinite", transitionDuration: `${duration}ms` } : { transitionDuration: `${duration}ms` }}
                aria-pressed={pick === i}
                onClick={() => { setDemo(false); setPick((p) => (p === i ? -1 : i)); }}
              >
                {i === 0 ? (
                  <span className={styles.check} style={demo ? { animationName: "evCheck", animationDuration: "2s", animationTimingFunction: easing, animationIterationCount: "infinite" } : undefined} aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico}><path d="M232,56V200a16,16,0,0,1-16,16H40a16,16,0,0,1-16-16V56A16,16,0,0,1,40,40H216A16,16,0,0,1,232,56Z" opacity="0.2"/><path d="M205.66,85.66l-96,96a8,8,0,0,1-11.32,0l-40-40a8,8,0,0,1,11.32-11.32L104,164.69l90.34-90.35a8,8,0,0,1,11.32,11.32Z"/></svg>
                  </span>
                ) : null}
                {label}
              </button>
            ))}
          </div>
          <div className={styles.body}>누르면 답장으로 확정 링크를 보내드려요.</div>
          <div className={styles.footer}>Acme Inc · 서울 · <a href="#" className={styles.unsub}>수신거부</a></div>
        </div>
      </div>
    </main>
  );
}
