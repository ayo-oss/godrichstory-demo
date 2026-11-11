import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./HeroMinimalLogoPulse.module.scss";

export type HeroMinimalLogoPulseProps = {
  label?: string;
  copy?: string;
  cta?: string;
  ctaOn?: string;
  note?: string;
  noteOn?: string;
  /** 고리 한 겹이 퍼졌다 사라지는 한 바퀴(ms) */
  duration?: number;
  easing?: string;
  /** 고리·안내 줄의 강조색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const CirclesThreeIcon = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="30" height="30" aria-hidden="true" focusable="false" fill="currentColor">
    <path d="M128,112a36,36,0,1,1,36-36A36,36,0,0,1,128,112Zm60,24a36,36,0,1,0,36,36A36,36,0,0,0,188,136ZM68,136a36,36,0,1,0,36,36A36,36,0,0,0,68,136Z" opacity="0.2" />
    <path d="M172,76a44,44,0,1,0-44,44A44.05,44.05,0,0,0,172,76Zm-44,28a28,28,0,1,1,28-28A28,28,0,0,1,128,104Zm60,24a44,44,0,1,0,44,44A44.05,44.05,0,0,0,188,128Zm0,72a28,28,0,1,1,28-28A28,28,0,0,1,188,200ZM68,128a44,44,0,1,0,44,44A44.05,44.05,0,0,0,68,128Zm0,72a28,28,0,1,1,28-28A28,28,0,0,1,68,200Z" />
  </svg>
);

export default function HeroMinimalLogoPulse({
  label = "준비 중 안내",
  copy = "곧 문을 엽니다",
  cta = "열리면 알려 주세요",
  ctaOn = "알림 받기 취소",
  note = "이메일 없이 이 화면에서만 받습니다",
  noteOn = "알림 대기자로 표시했습니다",
  duration = 2000,
  easing = "ease-out",
  color = "#9d93ff",
}: HeroMinimalLogoPulseProps): ReactNode {
  const [loop, setLoop] = useState<boolean>(true);
  const [on, setOn] = useState<boolean>(false);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section
      className={loop ? `${styles.hm} ${styles.isDemo}` : styles.hm}
      style={vars}
      aria-label={label}
      onPointerDown={() => setLoop(false)}
      onFocus={() => setLoop(false)}
    >
      <div className={styles.mark}>
        {/* 고리 두 겹이 시차를 두고 퍼진다. 주인공(로고 표시)은 루프 내내 제자리에 남는다 */}
        <span className={`${styles.ring} ${styles.ringA}`} aria-hidden="true" />
        <span className={`${styles.ring} ${styles.ringB}`} aria-hidden="true" />
        <span className={styles.badge}><CirclesThreeIcon /></span>
      </div>

      <p className={styles.copy}>{copy}</p>

      <button
        className={styles.btn}
        type="button"
        aria-pressed={on ? "true" : "false"}
        onClick={() => setOn(!on)}
      >
        {on ? ctaOn : cta}
      </button>

      {/* 버튼을 누르면 이 한 줄이 바뀐다 — 실제 등록이 아니라 이 화면 안의 표시 */}
      <p className={styles.live} role="status" aria-live="polite">{on ? noteOn : note}</p>
    </section>
  );
}
