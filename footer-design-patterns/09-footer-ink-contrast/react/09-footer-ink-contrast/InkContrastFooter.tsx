import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./InkContrastFooter.module.scss";

export type InkContrastFooterProps = {
  /** 한 주기(ms) — 카드가 내려앉고 밑줄 넷이 차례로 스캔되는 시간 */
  duration?: number;
  easing?: string;
  /** 밑줄·초점 테두리 색 — 잉크 위 11.58:1 인 아쿠아가 기본 */
  color?: string;
  /** 푸터 링크 이름 4개 */
  links?: string[];
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
/** ambient 에 HTMLHeadingElement 초점 호출용 타입만 로컬로 둔다 */
type FocusTarget = { focus(o: { preventScroll: boolean }): void };

export default function InkContrastFooter({
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#6ee7d7",
  links = ["소개", "글 목록", "문의", "개인정보"],
}: InkContrastFooterProps): ReactNode {
  const [demo, setDemo] = useState(true);
  const headRef = useRef<FocusTarget>(null);

  // 격자 미리보기용 자동 재생. 사람이 손을 대면 떼고 진짜 조작으로 넘긴다
  useEffect(() => {
    const off = (): void => setDemo(false);
    document.addEventListener("pointerdown", off, { once: true });
    document.addEventListener("keydown", off, { once: true });
    return () => {
      document.removeEventListener("pointerdown", off);
      document.removeEventListener("keydown", off);
    };
  }, []);

  // 맨 위로 — 스크롤을 되돌리고 초점도 문서 맨 위로 옮긴다.
  // focus() 에는 반드시 preventScroll: 데모가 목록에 iframe 으로 박히면 부모 페이지가 끌려간다
  const goTop = useCallback((): void => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (headRef.current) headRef.current.focus({ preventScroll: true });
  }, []);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <footer className={`${styles.ic} ${demo ? styles.isDemo : ""}`} style={vars}>
      <div className={styles.sheet}>
        <p className={styles.eyebrow}>본문 끝</p>
        <h2 className={styles.head} tabIndex={-1} ref={headRef}>읽어 주셔서 고맙습니다</h2>
      </div>

      <div className={styles.floor}>
        <nav className={styles.nav} aria-label="푸터 링크">
          {links.map((t) => (
            <a key={t} className={styles.link} href="#">
              <span className={styles.lt}>{t}</span>
              <span className={styles.rule} aria-hidden="true" />
            </a>
          ))}
        </nav>
        <div className={styles.bottom}>
          <p className={styles.copy}>© 2026 예시 사이트</p>
          <button className={styles.top} type="button" onClick={goTop}>
            <span className={styles.ic2} aria-hidden="true">
              <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true">
                <g fill="currentColor">
                  <path d="M200 112H56l72-72Z" opacity=".2" />
                  <path d="m205.66 106.34l-72-72a8 8 0 0 0-11.32 0l-72 72A8 8 0 0 0 56 120h64v96a8 8 0 0 0 16 0v-96h64a8 8 0 0 0 5.66-13.66M75.31 104L128 51.31L180.69 104Z" />
                </g>
              </svg>
            </span>
            맨 위로
          </button>
        </div>
      </div>
    </footer>
  );
}
