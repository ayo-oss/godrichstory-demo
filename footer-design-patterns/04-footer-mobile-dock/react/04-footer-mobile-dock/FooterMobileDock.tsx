import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./FooterMobileDock.module.scss";

/* ambient 에 React 의 KeyboardEvent 가 없어 필요한 것만 로컬로 선언한다 */
type KeyEvt = { key: string; preventDefault(): void };
type ClickEvt = { preventDefault(): void };

export type FooterMobileDockProps = {
  /** 칸 라벨 4개 */
  labels?: string[];
  /** 알약이 네 칸을 한 바퀴 도는 주기(ms) */
  duration?: number;
  easing?: string;
  /** 활성 칸 알약 색 */
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--n"?: number;
};

/* Phosphor Duotone (MIT) — 집 · 돋보기 · 북마크 · 목록 */
const ICONS: ReactNode[] = [
  <svg key="house" width="22" height="22" viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path opacity=".2" d="M216 120v96h-64v-64h-48v64H40v-96a8 8 0 0 1 2.34-5.66l80-80a8 8 0 0 1 11.32 0l80 80A8 8 0 0 1 216 120" /><path d="m219.31 108.68l-80-80a16 16 0 0 0-22.62 0l-80 80A15.87 15.87 0 0 0 32 120v96a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8v-56h32v56a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8v-96a15.87 15.87 0 0 0-4.69-11.32M208 208h-48v-56a8 8 0 0 0-8-8h-48a8 8 0 0 0-8 8v56H48v-88l80-80l80 80Z" /></g></svg>,
  <svg key="glass" width="22" height="22" viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path opacity=".2" d="M192 112a80 80 0 1 1-80-80a80 80 0 0 1 80 80" /><path d="m229.66 218.34l-50.06-50.06a88.21 88.21 0 1 0-11.32 11.31l50.06 50.07a8 8 0 0 0 11.32-11.32M40 112a72 72 0 1 1 72 72a72.08 72.08 0 0 1-72-72" /></g></svg>,
  <svg key="mark" width="22" height="22" viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path opacity=".2" d="M192 176v48l-64-40l-64 40v-48l64-40Z" /><path d="M184 32H72a16 16 0 0 0-16 16v176a8 8 0 0 0 12.24 6.78L128 193.43l59.77 37.35A8 8 0 0 0 200 224V48a16 16 0 0 0-16-16m0 16v113.57l-51.77-32.35a8 8 0 0 0-8.48 0L72 161.56V48Zm-51.77 129.22a8 8 0 0 0-8.48 0L72 209.57v-29.14l56-35l56 35v29.14Z" /></g></svg>,
  <svg key="list" width="22" height="22" viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path opacity=".2" d="M216 64v128H40V64Z" /><path d="M224 128a8 8 0 0 1-8 8H40a8 8 0 0 1 0-16h176a8 8 0 0 1 8 8M40 72h176a8 8 0 0 0 0-16H40a8 8 0 0 0 0 16m176 112H40a8 8 0 0 0 0 16h176a8 8 0 0 0 0-16" /></g></svg>,
];

const ROWS = ["full", "wide", "mid", "accent", "full", "wide", "short", "mid", "wide"];

export default function FooterMobileDock({
  labels = ["홈", "찾기", "저장", "더보기"],
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#6ee7d7",
}: FooterMobileDockProps): ReactNode {
  const [n, setN] = useState(0);
  const [demo, setDemo] = useState(true);   // 사람이 손을 대면 자동 재생을 끈다
  const navRef = useRef<HTMLElement>(null);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color, "--n": n };

  /* 알약 위치는 칸 번호 하나로만 정한다 — 짐작한 px 이 없으니 칸 폭이 바뀌어도 안 어긋난다 */
  const move = (i: number, focus: boolean) => {
    const next = (i + labels.length) % labels.length;
    setDemo(false);
    setN(next);
    const nav = navRef.current;
    if (focus && nav) {
      const el = nav.querySelectorAll("a")[next] as HTMLElement | undefined;
      if (el) el.focus({ preventScroll: true });
    }
  };

  const onKey = (e: KeyEvt) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    move(n + d, true);
  };

  return (
    <div className={`${styles.dock} ${demo ? styles.isDemo : ""}`} style={vars}>
      <div className={styles.view}>
        <div className={styles.doc}>
          <div className={styles.body}>
            <p className={styles.title}>오늘의 기록</p>
            {ROWS.map((w, i) => (
              <span key={`${w}-${i}`} className={`${styles.row} ${styles[w]}`} aria-hidden="true" />
            ))}
          </div>
          {/* 스크롤되는 본문 안에서 sticky 로 바닥에 붙는다 */}
          <footer className={styles.bar}>
            <nav ref={navRef} className={styles.nav} aria-label="주요 화면 이동" onKeyDown={onKey}>
              {labels.map((t, k) => (
                <a
                  key={t}
                  className={`${styles.tab} ${k === n ? styles.isOn : ""}`}
                  href="#"
                  tabIndex={k === n ? 0 : -1}
                  aria-current={k === n ? "page" : undefined}
                  onClick={(e: ClickEvt) => { e.preventDefault(); move(k, true); }}
                >
                  <span className={styles.ic}>{ICONS[k % ICONS.length]}</span>
                  <span className={styles.label}>{t}</span>
                </a>
              ))}
              {/* 폭이 칸 하나(25%)라 translateX(100%) 한 번이 정확히 한 칸이다 */}
              <span className={styles.pill} aria-hidden="true" />
            </nav>
          </footer>
        </div>
      </div>
    </div>
  );
}
