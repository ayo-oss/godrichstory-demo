import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./FooterLinktreeSteps.module.scss";

/* ambient 에 React 의 KeyboardEvent 가 없어 필요한 것만 로컬로 선언한다 */
type KeyEvt = { key: string; preventDefault(): void };

export type FooterLinktreeStepsProps = {
  /** 링크 넷에 차례로 밑줄이 차는 주기(ms) */
  duration?: number;
  easing?: string;
  /** 밑줄·글자 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/* 중요도 계단 — lead 가 주요 링크, sub 가 보조 링크, fine 이 법적 문서 */
const TREE: { text: string; lead: boolean; current?: boolean }[] = [
  { text: "작업 모음", lead: true, current: true },
  { text: "글 목록", lead: true },
  { text: "소개", lead: false },
  { text: "문의하기", lead: false },
];
const LEGAL = ["이용약관", "개인정보 처리방침", "쿠키 설정"];

export default function FooterLinktreeSteps({
  duration = 2000,
  easing = "ease-out",
  color = "#1b1a20",
}: FooterLinktreeStepsProps): ReactNode {
  const [demo, setDemo] = useState(true);   // 손이 닿으면 자동 재생을 끈다
  const rootRef = useRef<HTMLElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  /* 계단은 세로 한 줄이라 ↑↓ 가 다음·이전 링크, Home·End 가 처음·끝 */
  const onKey = (e: KeyEvt) => {
    const root = rootRef.current;
    if (!root) return;
    const list = root.querySelectorAll("a");
    const now = Array.prototype.indexOf.call(list, document.activeElement);
    let to = -1;
    if (e.key === "ArrowDown") to = (now + 1 + list.length) % list.length;
    else if (e.key === "ArrowUp") to = (now - 1 + list.length) % list.length;
    else if (e.key === "Home") to = 0;
    else if (e.key === "End") to = list.length - 1;
    if (to < 0) return;
    e.preventDefault();
    setDemo(false);
    const el = list[to] as HTMLElement | undefined;
    if (el) el.focus({ preventScroll: true });
  };

  return (
    <footer
      ref={rootRef}
      className={`${styles.lt} ${demo ? styles.isDemo : ""}`}
      style={vars}
      onKeyDown={onKey}
      onPointerDown={() => setDemo(false)}
      onPointerOver={() => setDemo(false)}
    >
      <nav className={styles.tree} aria-label="주요 링크">
        {TREE.map((l) => (
          <a
            key={l.text}
            className={`${styles.link} ${l.lead ? styles.lead : styles.sub}`}
            href="#"
            aria-current={l.current ? "page" : undefined}
          >
            {l.text}
          </a>
        ))}
      </nav>
      <nav className={styles.legal} aria-label="법적 고지">
        {LEGAL.map((t) => (
          <a key={t} className={styles.fine} href="#">{t}</a>
        ))}
      </nav>
    </footer>
  );
}
