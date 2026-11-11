import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ContactFormSplit.module.scss";

export type ContactFormSplitProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactFormSplit({ duration = 220, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: ContactFormSplitProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [shake, setShake] = useState({ name: false, email: false, message: false });
  const [msg, setMsg] = useState("");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const fieldRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 자동 재생: 입력칸을 하나씩 돌아가며 focus 해 라벨이 떠오르는 모습을 보여준다. preventScroll 로 부모 페이지를 끌어당기지 않는다(BD18).
  useEffect(() => {
    let fi = 0;
    const id = setInterval(() => {
      const refs = fieldRefs.current || [];
      refs[fi]?.blur();
      fi = (fi + 1) % refs.length;
      refs[fi]?.focus({ preventScroll: true });
    }, 900);
    return () => clearInterval(id);
  }, []);

  function onSubmit(e: any) {
    e.preventDefault();
    const bad = { name: !name.trim(), email: !RE.test(email), message: !message.trim() };
    if (bad.name || bad.email || bad.message) {
      setShake({ name: false, email: false, message: false });
      requestAnimationFrame(() => setShake(bad));
      setMsg("빈 칸을 모두 채워 주세요.");
      return;
    }
    setSent(true);
    setMsg("문의가 접수됐어요. 1영업일 안에 답장 드려요.");
  }

  return (
    <section className={styles.cf} style={vars}>
      <div className={styles.info}>
        <p className={styles.infoT}>상담 문의</p>
        <p className={styles.infoRow}><span aria-hidden="true">⏱</span>평균 응답 1영업일</p>
        <p className={styles.infoRow}><span aria-hidden="true">📍</span>서울 · 원격 우선</p>
      </div>
      <form className={`${styles.form} ${sent ? styles.sent : ""}`} onSubmit={onSubmit} noValidate>
        <label className={styles.field}>
          <input type="text" placeholder=" " value={name} onChange={(e: any) => setName(e.target.value)}
            ref={(el: HTMLInputElement | null) => { const r = fieldRefs.current; if (r) r[0] = el; }}
            className={shake.name ? styles.shake : ""} onAnimationEnd={() => setShake((s) => ({ ...s, name: false }))} />
          <span>이름</span>
        </label>
        <label className={styles.field}>
          <input type="email" placeholder=" " value={email} onChange={(e: any) => setEmail(e.target.value)}
            ref={(el: HTMLInputElement | null) => { const r = fieldRefs.current; if (r) r[1] = el; }}
            className={shake.email ? styles.shake : ""} onAnimationEnd={() => setShake((s) => ({ ...s, email: false }))} />
          <span>이메일</span>
        </label>
        <label className={styles.field}>
          <input type="text" placeholder=" " value={message} onChange={(e: any) => setMessage(e.target.value)}
            ref={(el: HTMLInputElement | null) => { const r = fieldRefs.current; if (r) r[2] = el; }}
            className={shake.message ? styles.shake : ""} onAnimationEnd={() => setShake((s) => ({ ...s, message: false }))} />
          <span>문의 내용</span>
        </label>
        <button type="submit" className={styles.send}>
          <span>{sent ? "전송 완료" : "문의 보내기"}</span>
          <svg className={styles.plane} viewBox="0 0 256 256" width="16" height="16" aria-hidden="true">
            <g fill="currentColor">
              <path d="m223.69 42.18l-58.22 192a8 8 0 0 1-14.92 1.25L108 148l-87.42-42.55a8 8 0 0 1 1.25-14.92l192-58.22a8 8 0 0 1 9.86 9.87" opacity=".2" />
              <path d="M227.32 28.68a16 16 0 0 0-15.66-4.08h-.15L19.57 82.84a16 16 0 0 0-2.49 29.8L102 154l41.3 84.87a15.86 15.86 0 0 0 14.44 9.13q.69 0 1.38-.06a15.88 15.88 0 0 0 14-11.51l58.2-191.94v-.15a16 16 0 0 0-4-15.66" />
            </g>
          </svg>
        </button>
        <p className={styles.msg} role="status">{msg}</p>
      </form>
    </section>
  );
}
