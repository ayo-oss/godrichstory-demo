import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ProjectResumeCta.module.scss";

export type ProjectResumeCtaProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

type Status = "idle" | "loading" | "done";

export default function ProjectResumeCta({ duration = 900, easing = "ease-out", color = "#2f6df6" }: ProjectResumeCtaProps) {
  const [status, setStatus] = useState<Status>("idle");
  const busy = useRef(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 실제 동작: 클릭하면 진행바가 실제로 채워진 뒤 체크 아이콘으로 바뀌고, 잠시 뒤 원래 상태로 되돌아간다.
  function onClick() {
    if (busy.current) return;
    busy.current = true;
    setStatus("loading");
    window.setTimeout(() => {
      setStatus("done");
      window.setTimeout(() => {
        setStatus("idle");
        busy.current = false;
      }, 1600);
    }, duration);
  }

  return (
    <section className={styles.rc} style={vars}>
      <span className={styles.accent} aria-hidden="true" />
      <p className={styles.eyebrow}>RESUME</p>
      <h2 className={styles.title}>이력서 PDF 받기</h2>
      <button type="button" className={`${styles.btn} ${status === "loading" ? styles.loading : ""} ${status === "done" ? styles.done : ""}`} onClick={onClick}>
        <span className={styles.fill} aria-hidden="true" />
        <span className={styles.icWrap} aria-hidden="true">
          <svg className={styles.icArrow} viewBox="0 0 20 20"><polyline points="10,3 10,13" /><polyline points="5,9 10,14 15,9" /></svg>
          <svg className={styles.icCheck} viewBox="0 0 20 20"><polyline points="4,10 8,14 16,5" /></svg>
        </span>
        <span className={styles.label}>PDF 내려받기{status === "done" ? " 완료" : ""}</span>
      </button>
      <p className={styles.status} role="status" aria-live="polite">
        {status === "loading" ? "준비 중" : status === "done" ? "다운로드 완료" : ""}
      </p>
    </section>
  );
}
