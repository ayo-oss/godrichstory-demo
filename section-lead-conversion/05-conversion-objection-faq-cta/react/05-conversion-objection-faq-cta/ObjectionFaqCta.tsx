import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ObjectionFaqCta.module.scss";

export type ObjectionFaqCtaProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--i"?: string };

const ITEMS = [
  { q: "가격이 부담돼요", a: "첫 달 ₩0, 이후엔 쓴 만큼만 냅니다." },
  { q: "써보지 않고 믿기 어려워요", a: "카드 없이 14일 동안 전체 기능을 씁니다." },
  { q: "해지가 번거로울까 봐요", a: "설정에서 버튼 한 번이면 끝납니다." },
];

export default function ObjectionFaqCta({
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: ObjectionFaqCtaProps) {
  const [open, setOpen] = useState<boolean[]>([false, false, false]);
  const [seen, setSeen] = useState<boolean[]>([false, false, false]);
  // 측정용 루프: 처음 조작(pointerdown·keydown)에서 루프를 끈다 — vanilla 판과 같은 동작
  const [demo, setDemo] = useState(true);
  useEffect(() => {
    const off = () => setDemo(false);
    window.addEventListener("pointerdown", off, { once: true });
    window.addEventListener("keydown", off, { once: true });
    return () => {
      window.removeEventListener("pointerdown", off);
      window.removeEventListener("keydown", off);
    };
  }, []);

  const ready = seen.every(Boolean);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = [styles.ob, ready ? styles.isReady : "", demo ? styles.isDemo : ""].join(" ");

  function toggle(i: number) {
    setOpen(open.map((v, k) => (k === i ? !v : v)));
    if (!open[i]) setSeen(seen.map((v, k) => (k === i ? true : v)));
  }

  return (
    <section className={cls} style={vars}>
      <p className={styles.title}>
        <span className={styles.ic} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="18" height="18">
            <g fill="currentColor">
              <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
              <path d="M140 180a12 12 0 1 1-12-12a12 12 0 0 1 12 12M128 72c-22.06 0-40 16.15-40 36v4a8 8 0 0 0 16 0v-4c0-11 10.77-20 24-20s24 9 24 20s-10.77 20-24 20a8 8 0 0 0-8 8v8a8 8 0 0 0 16 0v-.72c18.24-3.35 32-17.9 32-35.28c0-19.85-17.94-36-40-36m104 56A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88" />
            </g>
          </svg>
        </span>
        아직 망설이는 부분
      </p>

      <ul className={styles.list}>
        {ITEMS.map((it, i) => {
          const itemVars: Vars = { "--i": String(i) };
          return (
            <li key={it.q} className={`${styles.item} ${open[i] ? styles.isOpen : ""}`} style={itemVars}>
              <button
                type="button"
                className={styles.q}
                aria-expanded={open[i]}
                aria-controls={`ob-a-${i}`}
                onClick={() => toggle(i)}
              >
                <span>{it.q}</span>
                <span className={styles.done}>
                  <svg className={styles.check} viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth={2} opacity=".35" />
                    <polyline points="7 12.5 10.5 16 17 8.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>해소됨</span>
                </span>
              </button>
              <div className={styles.a} id={`ob-a-${i}`}>
                <div className={styles.aIn}>
                  <p>{it.a}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <button type="button" className={styles.cta}>
        <span className={styles.ctaT} aria-hidden={ready}>자유롭게 시작하기</span>
        <span className={`${styles.ctaT} ${styles.ctaTReady}`} aria-hidden={!ready}>준비됐어요, 눌러주세요</span>
      </button>
      <p className={styles.status} role="status">{ready ? "모든 걸림돌이 풀렸어요" : ""}</p>
    </section>
  );
}
