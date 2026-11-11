import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./FooterSitemapMega.module.scss";

/* ambient 에 KeyboardEvent 가 없어 파일 안에 필요한 만큼만 선언한다 */
type KeyEvt = { key: string; preventDefault(): void };

export type SitemapColumn = {
  /** 열 머리 이름 */
  title: string;
  /** 링크 묶음의 이름 — nav 의 aria-label 이 된다 */
  navLabel: string;
  links: string[];
};

export type FooterSitemapMegaProps = {
  brand?: string;
  legal?: string;
  columns?: SitemapColumn[];
  /** 세 단이 한 바퀴 열렸다 닫히는 주기(ms) */
  duration?: number;
  easing?: string;
  /** 무대 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const DEFAULT_COLUMNS: SitemapColumn[] = [
  { title: "제품", navLabel: "제품 링크", links: ["기능 소개", "요금 안내", "사용 사례"] },
  { title: "회사", navLabel: "회사 링크", links: ["회사 소개", "채용 정보", "보도 자료"] },
  { title: "지원", navLabel: "지원 링크", links: ["도움말", "문의 창구", "상태 알림"] },
];

const Caret = (): ReactNode => (
  <svg className={styles.caret} viewBox="0 0 256 256" width="14" height="14" aria-hidden="true" focusable="false">
    <g fill="currentColor">
      <path d="m208 96l-80 80l-80-80Z" opacity=".2" />
      <path d="M215.39 92.94A8 8 0 0 0 208 88H48a8 8 0 0 0-5.66 13.66l80 80a8 8 0 0 0 11.32 0l80-80a8 8 0 0 0 1.73-8.72M128 164.69L67.31 104h121.38Z" />
    </g>
  </svg>
);

export default function FooterSitemapMega({
  brand = "스튜디오",
  legal = "© 2026 스튜디오",
  columns = DEFAULT_COLUMNS,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fbf6ee",
}: FooterSitemapMegaProps): ReactNode {
  /* aria-expanded 가 열림/닫힘의 유일한 출처다 */
  const [open, setOpen] = useState<boolean[]>(columns.map(() => true));
  const [loop, setLoop] = useState<boolean>(true);
  const btns = useRef<Array<HTMLButtonElement | null>>([]);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const toggle = (i: number): void => {
    setLoop(false);
    setOpen((prev: boolean[]) => prev.map((v: boolean, k: number) => (k === i ? !v : v)));
  };

  /* 위아래 화살표로 열 머리 사이를 옮긴다. Enter·Space 는 button 이 기본으로 처리한다 */
  const onKey = (e: KeyEvt, i: number): void => {
    const step = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (step === 0) { return; }
    e.preventDefault();
    setLoop(false);
    const list = btns.current;
    if (!list) { return; }
    const next = list[(i + step + list.length) % list.length];
    if (next) { next.focus({ preventScroll: true }); }
  };

  return (
    <footer
      className={loop ? `${styles.fsm} ${styles.isDemo}` : styles.fsm}
      style={vars}
      role="contentinfo"
      onPointerEnter={() => setLoop(false)}
      onFocus={() => setLoop(false)}
    >
      <p className={styles.brand}>{brand}</p>

      <div className={styles.cols}>
        {columns.map((c: SitemapColumn, i: number) => (
          <section className={styles.col} key={c.title}>
            <h2 className={styles.head}>
              <button
                className={styles.btn}
                type="button"
                aria-expanded={open[i] ? "true" : "false"}
                aria-controls={`fsm-p${i + 1}`}
                ref={(el: HTMLButtonElement | null) => { if (btns.current) { btns.current[i] = el; } }}
                onClick={() => toggle(i)}
                onKeyDown={(e: KeyEvt) => onKey(e, i)}
              >
                <span className={styles.btnT}>{c.title}</span>
                <Caret />
              </button>
            </h2>
            <div className={styles.panel} id={`fsm-p${i + 1}`}>
              <nav className={styles.list} aria-label={c.navLabel}>
                {c.links.map((l: string) => (
                  <a href="#" key={l}>{l}</a>
                ))}
              </nav>
            </div>
          </section>
        ))}
      </div>

      <p className={styles.legal}>{legal}</p>
    </footer>
  );
}
