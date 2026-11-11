import { useEffect, useRef } from "react";
import styles from "./SocialLogin.module.scss";

// 소셜 로그인 — 제공자 개수가 시나리오에 따라 바뀔 때 그리드 열 수를 재계산한다.
// 브랜드 로고·브랜드명 없이 순수 CSS 도형 아이콘 + 가상명("Provider A" 류)만 사용.
const COUNTS = [2, 3, 4, 5, 3];
const STEP_MS = 400;
const CYCLE_MS = COUNTS.length * STEP_MS;
const PROVIDERS = [
  { id: "btn0", icon: "iconCircle", label: "Provider A" },
  { id: "btn1", icon: "iconSquare", label: "Provider B" },
  { id: "btn2", icon: "iconTriangle", label: "Provider C" },
  { id: "btn3", icon: "iconDiamond", label: "Provider D" },
  { id: "btn4", icon: "iconStar", label: "Provider E" },
] as const;

function colsFor(n: number) {
  return n <= 3 ? n : Math.ceil(n / 2);
}

export default function SocialLogin() {
  const rowRef = useRef<HTMLDivElement>(null);
  const hintCountRef = useRef<HTMLSpanElement>(null);
  const tickBarRef = useRef<HTMLDivElement>(null);
  const btnRefs = [
    useRef<HTMLButtonElement>(null),
    useRef<HTMLButtonElement>(null),
    useRef<HTMLButtonElement>(null),
    useRef<HTMLButtonElement>(null),
    useRef<HTMLButtonElement>(null),
  ];

  useEffect(() => {
    const row = rowRef.current;
    const hintCount = hintCountRef.current;
    const tickBar = tickBarRef.current;
    const btns = btnRefs.map((r) => r.current);
    if (!row || !hintCount || !tickBar || btns.some((b) => !b)) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function apply(t: number) {
      const tt = t % CYCLE_MS;
      const idx = Math.min(Math.max(Math.floor(tt / STEP_MS), 0), COUNTS.length - 1);
      const n = COUNTS[idx];
      const cols = colsFor(n);
      row!.style.setProperty("--cols", String(cols));
      hintCount!.textContent = String(n);
      btns.forEach((btn, i) => {
        if (!btn) return;
        if (i < n) {
          btn.classList.remove(styles.isHidden);
        } else {
          btn.classList.add(styles.isHidden);
        }
      });
      // 다음 개수 전환까지 남은 구간을 매 프레임 다시 계산해 가는 줄(계산 한 겹) —
      // 그리드 재배치가 갑자기 튀지 않고 다음 변화가 다가옴을 예고한다.
      const within = (tt % STEP_MS) / STEP_MS;
      tickBar!.style.setProperty("--within", within.toFixed(4));
    }

    if (reduce) {
      apply(0);
      return;
    }

    let start: number | null = null;
    let raf = 0;
    function loop(ts: number) {
      if (start === null) start = ts;
      apply(ts - start);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.stage}>
      <section className={styles.wrap}>
        <p className={styles.hint}>
          로그인 방법 5개 중 <span ref={hintCountRef}>2</span>개 표시
        </p>
        <div className={styles.tick} aria-hidden="true">
          <div className={styles.tickBar} ref={tickBarRef} />
        </div>
        <div className={styles.row} ref={rowRef}>
          {PROVIDERS.map((p, i) => (
            <button
              type="button"
              className={i >= 2 ? `${styles.btn} ${styles.isHidden}` : styles.btn}
              ref={btnRefs[i]}
              key={p.id}
            >
              <span className={`${styles.icon} ${styles[p.icon]}`} aria-hidden="true" />
              <span className={styles.label}>{p.label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
