import { useEffect, useRef } from "react";
import styles from "./LoginCard.module.scss";

// 로그인 카드 — 가짜 이메일·비밀번호를 고정 시나리오로 자동 타이핑하고
// 채운 비율을 카드 진행 링(conic-gradient)에 반영한다. 실키·실서버 요청 없음.
const SAMPLE_EMAIL = "jordan@example.com";
const EMAIL_LEN = SAMPLE_EMAIL.length;
const SAMPLE_PW_LEN = 10;
const PW_DOTS = "••••••••••";
const TYPE_MS = 70;
const CYCLE_MS = 2000;

export default function LoginCard() {
  const ringRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const ring = ringRef.current;
    const emailEl = emailRef.current;
    const pwEl = pwRef.current;
    if (!ring || !emailEl || !pwEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function frameFor(t: number) {
      const emailChars = Math.min(Math.max(Math.floor(t / TYPE_MS), 0), EMAIL_LEN);
      const pwStart = EMAIL_LEN * TYPE_MS;
      const pwChars = t > pwStart
        ? Math.min(Math.max(Math.floor((t - pwStart) / TYPE_MS), 0), SAMPLE_PW_LEN)
        : 0;
      return { emailChars, pwChars };
    }

    function apply(t: number) {
      const f = frameFor(t);
      emailEl!.value = SAMPLE_EMAIL.slice(0, f.emailChars);
      pwEl!.value = PW_DOTS.slice(0, f.pwChars);
      const ratio = (f.emailChars / EMAIL_LEN + f.pwChars / SAMPLE_PW_LEN) / 2;
      ring!.style.setProperty("--ratio", ratio.toFixed(4));
    }

    if (reduce) {
      apply(CYCLE_MS);
      return;
    }

    let start: number | null = null;
    let raf = 0;
    function loop(ts: number) {
      if (start === null) start = ts;
      const t = (ts - start) % CYCLE_MS;
      apply(t);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={styles.stage}>
      <section className={styles.card}>
        <div className={styles.ring} ref={ringRef}>
          <div className={styles.ringHole} />
          <div className={styles.avatar} aria-hidden="true">
            <span className={styles.lockBody} />
            <span className={styles.lockShackle} />
          </div>
        </div>
        <h2 className={styles.title}>로그인</h2>
        <div className={styles.fields}>
          <label className={styles.srOnly} htmlFor="loginEmail">이메일</label>
          <input
            className={styles.field}
            type="email"
            id="loginEmail"
            name="loginEmail"
            autoComplete="email"
            readOnly
            defaultValue=""
            placeholder="you@example.com"
            ref={emailRef}
          />
          <label className={styles.srOnly} htmlFor="loginPw">비밀번호</label>
          <input
            className={styles.field}
            type="password"
            id="loginPw"
            name="loginPw"
            autoComplete="current-password"
            readOnly
            defaultValue=""
            ref={pwRef}
          />
        </div>
      </section>
    </div>
  );
}
