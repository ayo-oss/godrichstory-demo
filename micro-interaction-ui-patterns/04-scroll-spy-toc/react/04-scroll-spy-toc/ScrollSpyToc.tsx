import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ScrollSpyToc.module.scss";

// 스크롤 스파이 목차 — 모든 제목의 겹침 비율(intersectionRatio) 값을 매 프레임 비교해 가장 큰 값을 가진
// 항목을 활성으로 고른다. 계산 겹: 고정 스크롤 위치가 아니라 값의 비교로 활성 항목이 정해진다.
const SECTIONS = [
  { title: "시작하기", body: "프로젝트를 새로 만듭니다." },
  { title: "설정하기", body: "환경 값을 채웁니다." },
  { title: "배포하기", body: "결과물을 올립니다." },
];

export default function ScrollSpyToc() {
  const rootRef = useRef<HTMLDivElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const [active, setActiveState] = useState(0);
  const activeRef = useRef(0);
  const autoplayRef = useRef<number | null>(null);

  function activate(i: number) {
    if (i === activeRef.current) return;
    activeRef.current = i;
    setActiveState(i);
    markerRef.current?.style.setProperty("--i", String(i));
  }

  function stopAutoplay() {
    if (autoplayRef.current) {
      window.clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  }

  useEffect(() => {
    const pane = paneRef.current;
    if (!pane) return;
    const ratios = new Array(SECTIONS.length).fill(0);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const i = Number((entry.target as HTMLElement).getAttribute("data-h"));
        ratios[i] = entry.intersectionRatio;
      });
      let best = 0;
      for (let k = 1; k < ratios.length; k++) { if (ratios[k] > ratios[best]) best = k; }
      if (ratios[best] > 0) activate(best);
    }, { root: pane, threshold: [0, .25, .5, .75, 1] });
    (sectionRefs.current ?? []).forEach((s) => { if (s) io.observe(s); });

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      const secs = sectionRefs.current ?? [];
      const targets = [0, secs[1]?.offsetTop || 0, secs[2]?.offsetTop || 0, 0];
      let step = 0;
      autoplayRef.current = window.setInterval(() => {
        pane.scrollTop = targets[step % targets.length];
        step += 1;
      }, 480);
    }
    return () => { io.disconnect(); stopAutoplay(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div ref={rootRef} className={`${styles.ss} ${styles["is-demo"]}`}>
        <nav className={styles.ss__toc} aria-label="목차">
          <div ref={markerRef} className={styles.ss__marker} style={{ "--i": 0 } as CSSProperties} aria-hidden="true" />
          {SECTIONS.map((s, i) => (
            <button
              key={s.title}
              className={styles.ss__link}
              type="button"
              aria-current={i === active}
              onClick={() => {
                rootRef.current?.classList.remove(styles["is-demo"]);
                stopAutoplay();
                (sectionRefs.current ?? [])[i]?.scrollIntoView({ block: "start", behavior: "auto" });
              }}
            >
              {s.title}
            </button>
          ))}
        </nav>
        <div ref={paneRef} className={styles.ss__pane}>
          {SECTIONS.map((s, i) => (
            <section
              key={s.title}
              ref={(el: HTMLElement | null) => { if (sectionRefs.current) sectionRefs.current[i] = el; }}
              className={styles.ss__section}
              data-h={i}
            >
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
