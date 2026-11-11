import { useState, useEffect, useRef } from "react";
import styles from "./EmailVerification.module.scss";

export type EmailVerificationProps = { duration?: number; easing?: string; color?: string };

export default function EmailVerification({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: EmailVerificationProps) {
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);
  const [copyState, setCopyState] = useState("");
  const code = "482 913";
  function copyCode() {
    let ok = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code); ok = true;
    } else {
      const ta = document.createElement("textarea");
      ta.value = code; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(ta);
    }
    setCopyState(ok ? "복사됨" : "복사 실패 — 직접 선택하세요");
    setTimeout(() => setCopyState(""), 1500);
  }
  return (
    <main className={styles.stage} style={{ background: "#ffd23f" }}>
      <div className={`${styles.ema}`}>
        <div className={`${styles.card} ${dark ? styles.dark : ""}`}>
          <div className={styles.row + " " + styles.brand}>◆ Acme</div>
          <div className={styles.hero}>
            <span className={styles.badge} style={{ background: "#2f6df6" }} aria-hidden="true">✉️</span>
          </div>
          <div className={styles.title}>이메일 주소를 인증하세요</div>
          <div className={styles.body}>아래 인증 코드를 입력하면 가입이 완료돼요.</div>
          <div className={styles.ctawrap}>
            <a href="#" role="button" className={styles.cta} style={{ background: "#2f6df6", animationName: "stagger", animationDuration: "2s", animationTimingFunction: "ease-in-out", animationIterationCount: "infinite" }} onClick={(e: { preventDefault: () => void }) => { e.preventDefault(); }}>{"482 913"}</a>
          </div>
          <div className={styles.row} style={{ textAlign: "center" }}>
            <button type="button" className={styles.detailtoggle} style={{ display: "inline-block", width: "auto", border: "1px solid rgba(0,0,0,.16)", borderRadius: 12, padding: "4px 12px" }}
              onClick={copyCode}>
              복사 {copyState}
            </button>
          </div>
          <div className={styles.footer}>Acme Inc · 서울 · <a href="#">수신거부</a></div>
        </div>
        <button type="button" className={styles.darktoggle} aria-pressed={dark} onClick={() => setDark((v) => !v)}>다크 모드 미리보기</button>
      </div>
    </main>
  );
}
