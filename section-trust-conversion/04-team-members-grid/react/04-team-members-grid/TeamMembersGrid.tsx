import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TeamMembersGrid.module.scss";

export type TeamMembersGridProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const MEMBERS = [
  { initial: "이", name: "이서윤", role: "제품 디자인", bio: "3년째 컴포넌트 라이브러리를 다듬고 있어요. 커피보다 그리드를 더 좋아해요." },
  { initial: "박", name: "박도현", role: "프런트엔드", bio: "접근성 없는 인터랙션은 안 만든다는 원칙으로 일해요." },
  { initial: "최", name: "최하은", role: "고객 성공", bio: "도입 첫 주를 가장 중요하게 생각해요. 질문은 언제나 환영이에요." },
];

export default function TeamMembersGrid({ duration = 600, easing = "cubic-bezier(.2,.8,.2,1)", color = "#ff9ebb" }: TeamMembersGridProps) {
  const [open, setOpen] = useState<number | null>(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 자동 재생: 900ms 마다 다음 멤버를 돌아가며 펼쳐 보여준다
  useEffect(() => {
    const id = setInterval(() => setOpen((o) => ((o ?? -1) + 1) % MEMBERS.length), 900);
    return () => clearInterval(id);
  }, []);

  return (
    <section className={styles.tm} style={vars}>
      <p className={styles.title}>
        <span className={styles.ic} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="18" height="18">
            <g fill="currentColor">
              <path d="M168 144a40 40 0 1 1-40-40a40 40 0 0 1 40 40M64 56a32 32 0 1 0 32 32a32 32 0 0 0-32-32m128 0a32 32 0 1 0 32 32a32 32 0 0 0-32-32" opacity=".2" />
              <path d="M244.8 150.4a8 8 0 0 1-11.2-1.6A51.6 51.6 0 0 0 192 128a8 8 0 0 1 0-16a24 24 0 1 0-23.24-30a8 8 0 1 1-15.5-4A40 40 0 1 1 219 117.51a67.94 67.94 0 0 1 27.43 21.68a8 8 0 0 1-1.63 11.21M190.92 212a8 8 0 1 1-13.85 8a57 57 0 0 0-98.15 0a8 8 0 1 1-13.84-8a72.06 72.06 0 0 1 33.74-29.92a48 48 0 1 1 58.36 0A72.06 72.06 0 0 1 190.92 212M128 176a32 32 0 1 0-32-32a32 32 0 0 0 32 32m-56-56a8 8 0 0 0-8-8a24 24 0 1 1 23.24-30a8 8 0 1 0 15.5-4A40 40 0 1 0 37 117.51a67.94 67.94 0 0 0-27.4 21.68a8 8 0 1 0 12.8 9.61A51.6 51.6 0 0 1 64 128a8 8 0 0 0 8-8" />
            </g>
          </svg>
        </span>
        팀 소개
      </p>
      <ul className={styles.grid}>
        {MEMBERS.map((m, i) => {
          const isOpen = open === i;
          return (
            <li key={m.name} className={`${styles.card} ${isOpen ? styles.isOpen : ""}`}>
              <button type="button" className={styles.head} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : i)}>
                <span className={styles.avatar}>{m.initial}</span>
                <span className={styles.meta}><b>{m.name}</b><i>{m.role}</i></span>
              </button>
              <div className={styles.bio}><p>{m.bio}</p></div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
