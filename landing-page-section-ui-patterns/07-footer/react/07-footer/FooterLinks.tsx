import { useEffect, useRef } from "react";
import styles from "./FooterLinks.module.scss";

// 포인터가 링크 위로 올라오면 그 글자의 실제 폭 값을 다시 구해 밑줄 너비 값을 0에서 그 값까지 늘린다.
// 계산 겹: 포인터 진입 -> 글자 폭 값(getBoundingClientRect) -> 밑줄 너비 보간. 실사용 포인터 리스너 있음(데모 재생 자체는 고정 시퀀스).
const LINKS = ["회사소개", "이용약관", "개인정보처리방침", "문의하기"];

export default function FooterLinks() {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const links = panel.querySelectorAll<HTMLAnchorElement>(`.${styles.link}`);

    const handlers: Array<() => void> = [];
    links.forEach((link) => {
      const onEnter = () => {
        panel!.classList.remove(styles["is-demo"]);
        const w = link.getBoundingClientRect().width;
        link.style.setProperty("--tw", w + "px");
      };
      const onLeave = () => {
        link.style.setProperty("--tw", "0px");
      };
      link.addEventListener("pointerenter", onEnter);
      link.addEventListener("pointerleave", onLeave);
      handlers.push(() => {
        link.removeEventListener("pointerenter", onEnter);
        link.removeEventListener("pointerleave", onLeave);
      });
    });

    return () => handlers.forEach((off) => off());
  }, []);

  return (
    <main className={styles.stage}>
      <footer ref={panelRef} className={`${styles.panel} ${styles["is-demo"]}`}>
        <nav className={styles.links}>
          {LINKS.map((label) => (
            <a key={label} className={styles.link} href="#">
              {label}
            </a>
          ))}
        </nav>
      </footer>
    </main>
  );
}
