import { useEffect, useRef, useState } from "react";
import styles from "./NavOrb.module.scss";

export type NavOrbProps = { duration?: string; easing?: string; color?: string };

const TABS = ["홈", "기능", "모델", "요금", "문서"];

export default function NavOrb({ duration = "300ms", easing = "cubic-bezier(.2,.8,.2,1)", color = "#6ec8ff" }: NavOrbProps) {
  // 변수 3개는 props 로 — 점이 옆 탭으로 옮겨가는 시간 · 그 이징 · 빛 색
  const [demo, setDemo] = useState(true);
  const [active, setActive] = useState(0);
  const navRef = useRef<HTMLElement>(null);

  // --p1~--p5 의 기본값은 한국어 480×300 실측 px 이다. 라벨 폭은 언어마다 다르므로
  // 실제 렌더 좌표로 한 번 덮어써 en·ja 에서도 점이 라벨 한가운데 선다
  useEffect(() => {
    const root = navRef.current;
    if (!root) return;
    const dotEl = root.querySelector("[data-dot]") as HTMLElement | null;
    if (!dotEl) return;
    const tabEls = root.querySelectorAll("[data-tab]");
    for (let i = 0; i < tabEls.length; i++) {
      const t = tabEls[i] as HTMLElement;
      dotEl.style.setProperty(`--p${i + 1}`, `${t.offsetLeft + t.offsetWidth / 2 - dotEl.offsetWidth / 2}px`);
    }
  }, []);

  // 자리는 CSS 변수 --p1~--p5 (480×300·320×200 렌더 실측값). 클릭하면 그 자리로 미끄러진다
  const dotStyle = demo
    ? { transitionDuration: duration, transitionTimingFunction: easing }
    : { transform: `translateX(var(--p${active + 1}))`, transitionDuration: duration, transitionTimingFunction: easing };

  return (
    <main className={styles.stage}>
      <div className={styles.nv}>
        <div className={styles.top}>
          <span className={styles.brand}>
            <span className={styles.mark} aria-hidden="true" style={{ color }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M194.82,151.43l-55.09,20.3-20.3,55.09a7.92,7.92,0,0,1-14.86,0l-20.3-55.09-55.09-20.3a7.92,7.92,0,0,1,0-14.86l55.09-20.3,20.3-55.09a7.92,7.92,0,0,1,14.86,0l20.3,55.09,55.09,20.3A7.92,7.92,0,0,1,194.82,151.43Z" opacity="0.2"/><path d="M197.58,129.06,146,110l-19-51.62a15.92,15.92,0,0,0-29.88,0L78,110l-51.62,19a15.92,15.92,0,0,0,0,29.88L78,178l19,51.62a15.92,15.92,0,0,0,29.88,0L146,178l51.62-19a15.92,15.92,0,0,0,0-29.88ZM137,164.22a8,8,0,0,0-4.74,4.74L112,223.85,91.78,169A8,8,0,0,0,87,164.22L32.15,144,87,123.78A8,8,0,0,0,91.78,119L112,64.15,132.22,119a8,8,0,0,0,4.74,4.74L191.85,144ZM144,40a8,8,0,0,1,8-8h16V16a8,8,0,0,1,16,0V32h16a8,8,0,0,1,0,16H184V64a8,8,0,0,1-16,0V48H152A8,8,0,0,1,144,40ZM248,88a8,8,0,0,1-8,8h-8v8a8,8,0,0,1-16,0V96h-8a8,8,0,0,1,0-16h8V72a8,8,0,0,1,16,0v8h8A8,8,0,0,1,248,88Z"/></svg>
            </span>
            Orbit AI
          </span>
          <a className={styles.cta} href="#" role="button" onClick={(e: { preventDefault: () => void }) => { e.preventDefault(); }}>시작하기</a>
        </div>
        <nav className={styles.nav} aria-label="주요 메뉴" ref={navRef}>
          <ul className={styles.tabs}>
            {TABS.map((label, i) => (
              <li className={styles.item} key={label}>
                <a
                  className={`${styles.tab} ${active === i ? styles.isOn : ""}`}
                  href="#"
                  data-tab=""
                  aria-current={active === i ? "page" : undefined}
                  onClick={(e: { preventDefault: () => void }) => { e.preventDefault(); setDemo(false); setActive(i); }}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
          <span className={`${styles.dot} ${demo ? styles.isDemo : ""}`} aria-hidden="true" data-dot="" style={dotStyle} />
        </nav>
        <div className={styles.panel} aria-hidden="true">
          <span className={styles.block} />
          <span className={`${styles.line} ${styles.lineA}`} />
          <span className={`${styles.line} ${styles.lineB}`} />
        </div>
      </div>
    </main>
  );
}
