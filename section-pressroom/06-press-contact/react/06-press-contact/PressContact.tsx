import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PressContact.module.scss";

export type PressContactProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const EMAIL = "press@godrichstory.com";

export default function PressContact({ duration = 300, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#2f6df6" }: PressContactProps) {
  const [copied, setCopied] = useState(false);
  const [hint, setHint] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(EMAIL);
    } catch {
      // 클립보드 권한이 없어도 상태는 그대로 갱신한다(폴백은 vanilla 판 참고)
    }
    setCopied(true);
    setHint("이메일 주소를 복사했습니다.");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className={styles.mc} style={vars}>
      <span className={`${styles.orb} ${styles.orb1}`} aria-hidden="true" />
      <span className={`${styles.orb} ${styles.orb2}`} aria-hidden="true" />
      <span className={styles.avatar} aria-hidden="true" />
      <p className={styles.name}>김프레스</p>
      <p className={styles.role}>PR · 미디어 담당</p>
      <button type="button" className={copied ? `${styles.copy} ${styles.copied}` : styles.copy} onClick={onCopy}>
        <span className={styles.copyLabel}>{EMAIL}</span>
        <svg className={styles.copyIc} viewBox="0 0 20 20" aria-hidden="true"><polyline points="4,10 8,14 16,5" /></svg>
      </button>
      <p className={styles.hint} role="status" aria-live="polite">{hint}</p>
    </section>
  );
}
