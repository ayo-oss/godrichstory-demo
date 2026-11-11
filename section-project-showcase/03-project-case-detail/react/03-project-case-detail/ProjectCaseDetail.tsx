import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ProjectCaseDetail.module.scss";

export type ProjectCaseDetailProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const STATS = [
  { target: 38, suffix: "%", label: "전환율 상승" },
  { target: 6, suffix: "주", label: "제작 기간" },
  { target: 210, suffix: "%", label: "트래픽 증가" },
];

export default function ProjectCaseDetail({ duration = 300, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#2f6df6" }: ProjectCaseDetailProps) {
  const [open, setOpen] = useState(false);
  const [nums, setNums] = useState(STATS.map(() => 0));
  const played = useRef(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 실제 동작: "결과 보기"를 누르면 패널이 실제로 펼쳐지고, 숫자 세 개가 0에서 목표값까지 올라간다.
  function countUp() {
    if (played.current) return;
    played.current = true;
    const start = performance.now();
    const len = 900;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    function tick(now: number) {
      const t = Math.min(1, (now - start) / len);
      const e = easeOut(t);
      setNums(STATS.map((s) => Math.round(s.target * e)));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) countUp();
  }

  return (
    <section className={styles.cd} style={vars}>
      <span className={styles.accent} aria-hidden="true" />
      <p className={styles.eyebrow}>CASE STUDY</p>
      <h2 className={styles.title}>결제 플로우 리디자인</h2>
      <p className={styles.blurb}>결제 단계 5→3단계로 줄이고, 이탈 지점을 다시 그렸습니다.</p>
      <button type="button" className={styles.toggle} aria-expanded={open} onClick={toggle}>
        결과 보기
      </button>
      <div className={`${styles.panel} ${open ? styles.panelOpen : ""}`} role="status" aria-live="polite">
        {STATS.map((s, i) => (
          <div key={s.label} className={styles.stat}>
            <p className={styles.num}>{nums[i]}{s.suffix}</p>
            <p className={styles.label}>{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
