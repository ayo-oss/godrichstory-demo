import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SpeakerGrid.module.scss";

const SPEAKERS = [
  { initials: "김민", name: "김민준", role: "프로덕트 디자이너 · ○○팀", bio: "\"설명이 필요 없는 화면\"을 만드는 법을 발표합니다." },
  { initials: "이서", name: "이서연", role: "엔지니어링 리드 · ○○ 스튜디오", bio: "빠르게 만들고 늦지 않게 되돌리는 배포 이야기." },
  { initials: "박도", name: "박도윤", role: "그로스 매니저 · ○○ 커머스", bio: "숫자보다 먼저 봐야 하는 사용자 신호 세 가지." },
  { initials: "최유", name: "최유나", role: "리서처 · ○○ 랩", bio: "인터뷰 열 번이면 보이는 것, 백 번이면 보이는 것." },
  { initials: "정하", name: "정하은", role: "창업자 · ○○", bio: "세 번 실패하고 배운 것만 골라 짧게 말합니다." },
  { initials: "한지", name: "한지호", role: "플랫폼 엔지니어 · ○○", bio: "트래픽 열 배가 몰릴 때 먼저 죽는 곳은 어디인가." },
];

export type SpeakerGridProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SpeakerGrid({ duration = 600, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#17141a" }: SpeakerGridProps) {
  const [open, setOpen] = useState<number | null>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <ul className={styles.sg} style={vars}>
      {SPEAKERS.map((s, i) => (
        <li key={s.name} className={styles.card}>
          <button
            type="button"
            className={styles.toggle}
            aria-expanded={open === i}
            onClick={() => setOpen((o) => (o === i ? null : i))}
          >
            <span className={styles.avatar} aria-hidden="true">{s.initials}</span>
            <span className={styles.name}>{s.name}</span>
            <span className={styles.role}>{s.role}</span>
          </button>
          <p className={styles.bio} style={{ maxHeight: open === i ? 60 : 0, opacity: open === i ? 1 : 0 }}>{s.bio}</p>
        </li>
      ))}
    </ul>
  );
}
