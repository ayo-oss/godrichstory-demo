import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./FooterOneLine.module.scss";

/* ambient 에 KeyboardEvent 가 없어 파일 안에 필요한 만큼만 선언한다 */
type KeyEvt = { key: string; preventDefault(): void };

export type SocialDot = {
  /** 스크린 리더가 읽을 이름 */
  label: string;
  icon: ReactNode;
};

export type FooterOneLineProps = {
  mark?: string;
  copy?: string;
  navLabel?: string;
  dots?: SocialDot[];
  /** 점 세 개가 차례로 떠오르는 한 바퀴(ms) */
  duration?: number;
  easing?: string;
  /** 무대 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const PhotoIcon = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true" focusable="false">
    <g fill="currentColor">
      <path d="M176 32H80a48 48 0 0 0-48 48v96a48 48 0 0 0 48 48h96a48 48 0 0 0 48-48V80a48 48 0 0 0-48-48m-48 136a40 40 0 1 1 40-40a40 40 0 0 1-40 40" opacity=".2" />
      <path d="M176 24H80a56.06 56.06 0 0 0-56 56v96a56.06 56.06 0 0 0 56 56h96a56.06 56.06 0 0 0 56-56V80a56.06 56.06 0 0 0-56-56m40 152a40 40 0 0 1-40 40H80a40 40 0 0 1-40-40V80a40 40 0 0 1 40-40h96a40 40 0 0 1 40 40Zm-88-96a48 48 0 1 0 48 48a48.05 48.05 0 0 0-48-48m0 80a32 32 0 1 1 32-32a32 32 0 0 1-32 32m64-84a12 12 0 1 1-12-12a12 12 0 0 1 12 12" />
    </g>
  </svg>
);

const PostIcon = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true" focusable="false">
    <g fill="currentColor">
      <path d="M208 216h-48L48 40h48Z" opacity=".2" />
      <path d="m214.75 211.71l-62.6-98.38l61.77-67.95a8 8 0 0 0-11.84-10.76l-58.84 64.72l-40.49-63.63A8 8 0 0 0 96 32H48a8 8 0 0 0-6.75 12.3l62.6 98.37l-61.77 68a8 8 0 1 0 11.84 10.76l58.84-64.72l40.49 63.63A8 8 0 0 0 160 224h48a8 8 0 0 0 6.75-12.29M164.39 208L62.57 48h29l101.86 160Z" />
    </g>
  </svg>
);

const CodeIcon = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true" focusable="false">
    <g fill="currentColor">
      <path d="M208 104v8a48 48 0 0 1-48 48h-24a32 32 0 0 1 32 32v40h-64v-40a32 32 0 0 1 32-32h-24a48 48 0 0 1-48-48v-8a49.3 49.3 0 0 1 8.51-27.3A51.92 51.92 0 0 1 76 32a52 52 0 0 1 43.83 24h32.34A52 52 0 0 1 196 32a51.92 51.92 0 0 1 3.49 44.7A49.3 49.3 0 0 1 208 104" opacity=".2" />
      <path d="M208.3 75.68A59.74 59.74 0 0 0 202.93 28a8 8 0 0 0-6.93-4a59.75 59.75 0 0 0-48 24h-24a59.75 59.75 0 0 0-48-24a8 8 0 0 0-6.93 4a59.78 59.78 0 0 0-5.38 47.68A58.14 58.14 0 0 0 56 104v8a56.06 56.06 0 0 0 48.44 55.47A39.8 39.8 0 0 0 96 192v8H72a24 24 0 0 1-24-24a40 40 0 0 0-40-40a8 8 0 0 0 0 16a24 24 0 0 1 24 24a40 40 0 0 0 40 40h24v16a8 8 0 0 0 16 0v-40a24 24 0 0 1 48 0v40a8 8 0 0 0 16 0v-40a39.8 39.8 0 0 0-8.44-24.53A56.06 56.06 0 0 0 216 112v-8a58 58 0 0 0-7.7-28.32M200 112a40 40 0 0 1-40 40h-48a40 40 0 0 1-40-40v-8a41.74 41.74 0 0 1 6.9-22.48a8 8 0 0 0 1.1-7.69a43.8 43.8 0 0 1 .79-33.58a43.88 43.88 0 0 1 32.32 20.06a8 8 0 0 0 6.71 3.69h32.35a8 8 0 0 0 6.74-3.69a43.87 43.87 0 0 1 32.32-20.06a43.8 43.8 0 0 1 .77 33.58a8.09 8.09 0 0 0 1 7.65a41.76 41.76 0 0 1 7 22.52Z" />
    </g>
  </svg>
);

const DEFAULT_DOTS: SocialDot[] = [
  { label: "사진 계정", icon: <PhotoIcon /> },
  { label: "짧은 소식 계정", icon: <PostIcon /> },
  { label: "코드 저장소", icon: <CodeIcon /> },
];

export default function FooterOneLine({
  mark = "스튜디오",
  copy = "© 2026 스튜디오",
  navLabel = "소셜 링크",
  dots = DEFAULT_DOTS,
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#fbf6ee",
}: FooterOneLineProps): ReactNode {
  const [loop, setLoop] = useState<boolean>(true);
  const refs = useRef<Array<HTMLAnchorElement | null>>([]);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const tone = [styles.dotA, styles.dotB, styles.dotC];

  /* 소셜 점 셋은 좌우 화살표로 옮겨 다닌다 (Home·End 는 양 끝) */
  const onKey = (e: KeyEvt, i: number): void => {
    const list = refs.current;
    if (!list) { return; }
    let to = -1;
    if (e.key === "ArrowRight") { to = (i + 1) % list.length; }
    if (e.key === "ArrowLeft") { to = (i - 1 + list.length) % list.length; }
    if (e.key === "Home") { to = 0; }
    if (e.key === "End") { to = list.length - 1; }
    if (to < 0) { return; }
    e.preventDefault();
    setLoop(false);
    const next = list[to];
    if (next) { next.focus({ preventScroll: true }); }
  };

  return (
    <footer
      className={loop ? `${styles.fo} ${styles.isDemo}` : styles.fo}
      style={vars}
      role="contentinfo"
      onPointerEnter={() => setLoop(false)}
      onFocus={() => setLoop(false)}
    >
      <a className={styles.mark} href="#">
        <span className={styles.markT}>{mark}</span>
        <span className={styles.line} aria-hidden="true" />
      </a>

      <p className={styles.copy}>{copy}</p>

      <nav className={styles.social} aria-label={navLabel}>
        {dots.map((d: SocialDot, i: number) => (
          <a
            className={`${styles.dot} ${tone[i % tone.length]}`}
            href="#"
            key={d.label}
            aria-label={d.label}
            ref={(el: HTMLAnchorElement | null) => { if (refs.current) { refs.current[i] = el; } }}
            onKeyDown={(e: KeyEvt) => onKey(e, i)}
          >
            {d.icon}
          </a>
        ))}
      </nav>
    </footer>
  );
}
