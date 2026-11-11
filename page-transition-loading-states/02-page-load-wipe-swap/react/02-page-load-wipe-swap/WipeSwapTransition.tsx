import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./WipeSwapTransition.module.scss";

export type WipePage = { eyebrow: string; head: string; text: string };

export type WipeSwapTransitionProps = {
  /** 갈아 끼울 두 화면. 띠가 완전히 덮은 순간에만 바뀐다 */
  pages?: [WipePage, WipePage];
  buttonLabel?: string;
  groupLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 가 얇아 useRef 가 T | null 을 돌려준다 — 필요한 꼴만 로컬 타입으로 단언
type Box<T> = { current: T };

const DEFAULT_PAGES: [WipePage, WipePage] = [
  { eyebrow: "Work", head: "Twelve photographs", text: "The band comes in from the left and covers the screen." },
  { eyebrow: "Notes", head: "How it was made", text: "The content swaps only while it is covered." },
];

export default function WipeSwapTransition({
  pages = DEFAULT_PAGES,
  buttonLabel = "Next screen",
  groupLabel = "Wipe swap transition preview",
  demo = true,
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
}: WipeSwapTransitionProps) {
  const [live, setLive] = useState(demo);
  const [second, setSecond] = useState(false);
  const [busy, setBusy] = useState(false);
  const [run, setRun] = useState(false);
  const timers = useRef<number[]>([]) as Box<number[]>;

  useEffect(() => () => {
    for (const t of timers.current) clearTimeout(t);
  }, []);

  function sweep() {
    setLive(false);
    if (busy) return;
    setBusy(true);
    setRun(false);
    // 한 프레임 뒤에 켜야 애니메이션이 처음부터 다시 돈다
    const a = window.setTimeout(() => setRun(true), 20);
    // 띠가 화면을 완전히 덮은 한가운데에서만 본문을 갈아 끼운다
    const b = window.setTimeout(() => setSecond((v) => !v), 380);
    const c = window.setTimeout(() => {
      setRun(false);
      setBusy(false);
    }, 780);
    timers.current = [a, b, c];
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = [styles.ws, live ? styles.isDemo : ""].filter(Boolean).join(" ");
  const pageCls = [styles.pages, second ? styles.isB : ""].filter(Boolean).join(" ");
  const bandCls = [styles.band, run ? styles.isRun : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <div className={styles.screen}>
        <div className={pageCls} aria-busy={busy}>
          {pages.map((p, i) => (
            <article className={[styles.page, i === 0 ? styles.pageA : styles.pageB].join(" ")} key={p.head}>
              <p className={styles.eyebrow}>{p.eyebrow}</p>
              <p className={styles.head}>{p.head}</p>
              <p className={styles.text}>{p.text}</p>
            </article>
          ))}
        </div>
        <span className={bandCls} aria-hidden="true" />
      </div>
      <button className={styles.go} type="button" onClick={sweep}>{buttonLabel}</button>
    </section>
  );
}
