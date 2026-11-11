import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ProjectContactForm.module.scss";

export type ProjectContactFormProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ProjectContactForm({ duration = 300, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#0a4fe8" }: ProjectContactFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [status, setStatus] = useState("");
  const [shakeField, setShakeField] = useState<"name" | "email" | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 실제 동작: 제출 시 이름·이메일을 실제로 검사한다. 빠지면 그 칸이 흔들리며 포커스를 받는다({ preventScroll: true } — 홈 목록 iframe 안에서 강제 스크롤을 막는다).
  function onSubmit(e: any) {
    e.preventDefault();
    if (!name.trim()) {
      setShakeField("name");
      nameRef.current?.focus({ preventScroll: true });
      setStatus("이름을 입력해 주세요.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setShakeField("email");
      emailRef.current?.focus({ preventScroll: true });
      setStatus("올바른 이메일을 입력해 주세요.");
      return;
    }
    setDone(true);
    setStatus("메시지를 보냈습니다.");
  }

  return (
    <form className={styles.cf} style={vars} noValidate onSubmit={onSubmit}>
      <h2 className={styles.title}>연락하기</h2>
      <label className={styles.field}>
        <span className={styles.labelText}>이름</span>
        <input
          ref={nameRef}
          className={`${styles.input} ${shakeField === "name" ? styles.shake : ""}`}
          type="text"
          placeholder="홍길동"
          value={name}
          onChange={(e: any) => setName(e.target.value)}
          onAnimationEnd={() => setShakeField(null)}
        />
      </label>
      <label className={styles.field}>
        <span className={styles.labelText}>이메일</span>
        <input
          ref={emailRef}
          className={`${styles.input} ${shakeField === "email" ? styles.shake : ""}`}
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e: any) => setEmail(e.target.value)}
          onAnimationEnd={() => setShakeField(null)}
        />
      </label>
      <button type="submit" className={`${styles.submit} ${done ? styles.done : ""}`}>
        <span>메시지 보내기</span>
        <svg className={styles.check} viewBox="0 0 20 20" aria-hidden="true"><polyline points="4,10 8,14 16,5" /></svg>
      </button>
      <p className={styles.status} role="status" aria-live="polite">{status}</p>
    </form>
  );
}
