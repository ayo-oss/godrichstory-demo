// TeamApplyCta — vanilla 판(run/338/demo/08-team-apply-cta/index.html) 의 React 포트.
// 고정 기준일에서 마감일까지 남은 날을 Math.ceil 로 올려 계산하고, 사흘 이하면
// 급함 상태로 바뀐다(계산 한 겹).
import { useEffect, useRef } from "react";
import styles from "./TeamApplyCta.module.scss";

export type TeamApplyCtaProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "고정 기준일에서 마감일까지 남은 날을 Math.ceil 로 올려 계산하고, 사흘 이하면 급함 상태로 바뀝니다";
const APPLY_LABEL = "지원하기";

const EPOCH = new Date("2026-01-01T00:00:00Z").getTime();
const DAY_MS = 86400000;
const URGENT_DAYS = 3;

type Role = { name: string; deadline: string };
const ROLES: Role[] = [
  { name: "프론트엔드 엔지니어", deadline: "2026-01-13T00:00:00Z" },
  { name: "프로덕트 디자이너", deadline: "2026-01-03T00:00:00Z" },
  { name: "백엔드 엔지니어", deadline: "2026-01-21T00:00:00Z" }
];

function daysLeft(deadlineIso: string): number {
  const deadline = new Date(deadlineIso).getTime();
  return Math.ceil((deadline - EPOCH) / DAY_MS);
}

export default function TeamApplyCta({
  duration = "300ms",
  easing = "ease-out",
  color = "#0a4fe8"
}: TeamApplyCtaProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const roleRef = useRef<HTMLParagraphElement | null>(null);
  const daysRef = useRef<HTMLParagraphElement | null>(null);
  const chipRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const card = cardRef.current;
    const roleEl = roleRef.current;
    const daysEl = daysRef.current;
    const chip = chipRef.current;
    if (!card || !roleEl || !daysEl || !chip) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function apply(i: number): void {
      const r = ROLES[i];
      const d = daysLeft(r.deadline);
      roleEl!.textContent = r.name;
      daysEl!.textContent = "D-" + d;
      const urgent = d <= URGENT_DAYS;
      card!.classList.toggle(styles.isUrgent, urgent);
      chip!.textContent = "기준일 2026-01-01 · " + (urgent ? "급함" : "여유");
    }

    let idx = 0;
    apply(0);

    let timer = 0;
    if (!reduce) {
      timer = window.setInterval(() => {
        idx = (idx + 1) % ROLES.length;
        apply(idx);
      }, 700);
    }

    return () => {
      if (timer) window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <section className={styles.cta}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.card} ref={cardRef}>
          <p className={styles.role} ref={roleRef}>프론트엔드 엔지니어</p>
          <p className={styles.days} ref={daysRef} aria-live="polite">D-12</p>
          <button className={styles.btn} type="button" style={{ background: color }}>
            {APPLY_LABEL}
          </button>
        </div>
        <p className={styles.meta}>
          <span className={styles.chip} ref={chipRef}>기준일 2026-01-01</span>
        </p>
      </section>
    </main>
  );
}
