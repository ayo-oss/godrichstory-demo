import { useState } from "react";
import styles from "./NewsletterDigest.module.scss";

export type NewsletterDigestProps = { duration?: number; easing?: string; color?: string };

const HEADLINES = [
  { head: "굵은 글씨 하나로 화면 순서를 만드는 법", time: "6분" },
  { head: "버튼이 눌렸다고 느껴지는 0.1초의 정체", time: "4분" },
  { head: "카드가 겹치는 첫 화면, 각을 잡는 순서", time: "8분" },
];

export default function NewsletterDigest({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#0a4fe8" }: NewsletterDigestProps) {
  const [demo, setDemo] = useState(true);
  const [read, setRead] = useState<boolean[]>([false, false, false]);

  return (
    <main className={styles.stage}>
      <div className={styles.mk}>
        <div className={styles.card}>
          <div className={styles.brand}>
            <span className={styles.brandmark} aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico}><path d="M224,56l-96,88L32,56Z" opacity="0.2"/><path d="M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48ZM203.43,64,128,133.15,52.57,64ZM216,192H40V74.19l82.59,75.71a8,8,0,0,0,10.82,0L216,74.19V192Z"/></svg>
            </span>
            ◆ Acme 주간편지 <span className={styles.issue}>59호</span>
          </div>
          <div className={styles.title}>이번 주에 잘 읽힌 3편</div>
          <div className={styles.sub}>연 사람이 많은 순서로 담았어요.</div>
          <div className={styles.rows}>
            {HEADLINES.map((h, i) => (
              <button
                key={h.head}
                type="button"
                className={`${styles.row} ${read[i] ? styles.isRead : ""}`}
                style={demo ? { animationName: "nlRise", animationDuration: "2s", animationTimingFunction: easing, animationIterationCount: "infinite", animationDelay: `${i * 120}ms`, animationFillMode: "backwards" } : undefined}
                aria-pressed={read[i]}
                onClick={() => { setDemo(false); setRead((r) => r.map((v, j) => (j === i ? !v : v))); }}
              >
                <span className={styles.num} aria-hidden="true">{i + 1}</span>
                <span className={styles.head}>{h.head}</span>
                <span className={styles.time}>{read[i] ? "읽음" : h.time}</span>
              </button>
            ))}
          </div>
          <div className={styles.ctawrap}>
            <a href="#" role="button" className={styles.cta} style={{ background: "#2a5fd8" }} onClick={(e: { preventDefault: () => void }) => { e.preventDefault(); }}>전체 편지 보기</a>
          </div>
          <div className={styles.footer}>Acme Inc · 서울 · <a href="#" className={styles.unsub}>수신거부</a></div>
        </div>
      </div>
    </main>
  );
}
