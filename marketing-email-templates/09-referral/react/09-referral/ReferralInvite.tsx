import { useState } from "react";
import styles from "./ReferralInvite.module.scss";

export type ReferralInviteProps = { duration?: number; easing?: string; color?: string };

export default function ReferralInvite({ duration = 300, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#b9a0ff" }: ReferralInviteProps) {
  const [demo, setDemo] = useState(true);
  const [copied, setCopied] = useState(false);
  const [live, setLive] = useState("");

  const copyCode = () => {
    setDemo(false);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText("GODRICH-9K2F").then(
        () => { setCopied(true); setLive("코드를 복사했어요"); },
        () => { setLive("복사 실패 — 코드를 직접 선택하세요"); }
      );
    }
  };

  return (
    <main className={styles.stage}>
      <div className={styles.mk}>
        <div className={styles.card}>
          <div className={styles.brand}>◆ Acme</div>
          <div className={styles.hero}>
            <span className={styles.badge} style={{ background: color }} aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico}><path d="M168,144a40,40,0,1,1-40-40A40,40,0,0,1,168,144ZM64,56A32,32,0,1,0,96,88,32,32,0,0,0,64,56Zm128,0a32,32,0,1,0,32,32A32,32,0,0,0,192,56Z" opacity="0.2"/><path d="M244.8,150.4a8,8,0,0,1-11.2-1.6A51.6,51.6,0,0,0,192,128a8,8,0,0,1,0-16,24,24,0,1,0-23.24-30,8,8,0,1,1-15.5-4A40,40,0,1,1,219,117.51a67.94,67.94,0,0,1,27.43,21.68A8,8,0,0,1,244.8,150.4ZM190.92,212a8,8,0,1,1-13.85,8,57,57,0,0,0-98.15,0,8,8,0,1,1-13.84-8,72.06,72.06,0,0,1,33.74-29.92,48,48,0,1,1,58.36,0A72.06,72.06,0,0,1,190.92,212ZM128,176a32,32,0,1,0-32-32A32,32,0,0,0,128,176ZM72,120a8,8,0,0,0-8-8A24,24,0,1,1,87.24,82a8,8,0,1,0,15.5-4A40,40,0,1,0,37,117.51,67.94,67.94,0,0,0,9.6,139.19a8,8,0,1,0,12.8,9.61A51.6,51.6,0,0,1,64,128,8,8,0,0,0,72,120Z"/></svg>
            </span>
          </div>
          <div className={styles.title}>친구를 초대하면 둘 다 10,000원</div>
          <div className={styles.body}>아래 코드로 친구가 가입하면, 두 분 모두 쿠폰을 드려요.</div>
          <div className={styles.coderow}>
            <span className={styles.code} style={demo ? { animationName: "rfPill", animationDuration: "2s", animationTimingFunction: easing, animationIterationCount: "infinite" } : undefined}>GODRICH-9K2F</span>
            <button type="button" className={styles.copy} style={{ background: color }} aria-label="추천 코드 복사" onClick={copyCode}>{copied ? "복사됨" : "복사"}</button>
          </div>
          <div className={styles.dotsrow}>
            <div className={styles.dots} role="img" aria-label="초대 3칸 중 2칸 완료">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`${styles.dot} ${i < 2 ? styles.dotFill : ""} ${demo && i === 0 ? styles.d1 : ""} ${demo && i === 1 ? styles.d2 : ""}`}
                  style={demo && i < 2 ? { animationName: "rfDot", animationDuration: "2s", animationTimingFunction: easing, animationIterationCount: "infinite", animationDelay: `${i === 0 ? 160 : 380}ms`, animationFillMode: "backwards" } : undefined}
                ></span>
              ))}
            </div>
            <span className={styles.dotslabel}>2 / 3 초대 완료 — 한 명 더!</span>
          </div>
          <div className={styles.ctawrap}>
            <a href="#" role="button" className={styles.cta} onClick={(e: { preventDefault: () => void }) => { e.preventDefault(); }}>친구 초대하기</a>
          </div>
          <div className={styles.live} aria-live="polite">{live}</div>
          <div className={styles.footer}>Acme Inc · 서울 · <a href="#" className={styles.unsub}>수신거부</a></div>
        </div>
      </div>
    </main>
  );
}
