import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./HeroCenterBadge.module.scss";

/* ambient 에 KeyboardEvent 가 없어 파일 안에 필요한 만큼만 선언한다 */
type KeyEvt = { key: string; preventDefault(): void };
type Box<T> = { current: T };

export type TrustMark = {
  /** 일반명사 라벨 — 실제 브랜드 이름을 쓰지 않는다 */
  label: string;
  icon: ReactNode;
};

export type HeroCenterBadgeProps = {
  badge?: string;
  title?: string;
  lead?: string;
  solid?: string;
  line?: string;
  trustLabel?: string;
  marks?: TrustMark[];
  sectionLabel?: string;
  /** 빛줄기가 한 번 지나가고 신뢰 표시 넷이 차례로 들리는 한 바퀴(ms) */
  duration?: number;
  easing?: string;
  /** 옐로 무대 위 글자·면의 색 — 잉크 고정을 권한다 (흰 글자는 1.44:1) */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const CubeIcon = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="15" height="15" aria-hidden="true" focusable="false" fill="currentColor">
    <path d="M128,129.09V232a8,8,0,0,1-3.84-1l-88-48.16a8,8,0,0,1-4.16-7V80.2a8,8,0,0,1,.7-3.27Z" opacity="0.2" />
    <path d="M223.68,66.15,135.68,18h0a15.88,15.88,0,0,0-15.36,0l-88,48.17a16,16,0,0,0-8.32,14v95.64a16,16,0,0,0,8.32,14l88,48.17a15.88,15.88,0,0,0,15.36,0l88-48.17a16,16,0,0,0,8.32-14V80.18A16,16,0,0,0,223.68,66.15ZM128,32h0l80.34,44L128,120,47.66,76ZM40,90l80,43.78v85.79L40,175.82Zm96,129.57V133.82L216,90v85.78Z" />
  </svg>
);

const CirclesIcon = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="15" height="15" aria-hidden="true" focusable="false" fill="currentColor">
    <path d="M128,112a36,36,0,1,1,36-36A36,36,0,0,1,128,112Zm60,24a36,36,0,1,0,36,36A36,36,0,0,0,188,136ZM68,136a36,36,0,1,0,36,36A36,36,0,0,0,68,136Z" opacity="0.2" />
    <path d="M172,76a44,44,0,1,0-44,44A44.05,44.05,0,0,0,172,76Zm-44,28a28,28,0,1,1,28-28A28,28,0,0,1,128,104Zm60,24a44,44,0,1,0,44,44A44.05,44.05,0,0,0,188,128Zm0,72a28,28,0,1,1,28-28A28,28,0,0,1,188,200ZM68,128a44,44,0,1,0,44,44A44.05,44.05,0,0,0,68,128Zm0,72a28,28,0,1,1,28-28A28,28,0,0,1,68,200Z" />
  </svg>
);

const CrosshairIcon = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="15" height="15" aria-hidden="true" focusable="false" fill="currentColor">
    <path d="M160,128a32,32,0,1,1-32-32A32,32,0,0,1,160,128Z" opacity="0.2" />
    <path d="M232,120h-8.34A96.14,96.14,0,0,0,136,32.34V24a8,8,0,0,0-16,0v8.34A96.14,96.14,0,0,0,32.34,120H24a8,8,0,0,0,0,16h8.34A96.14,96.14,0,0,0,120,223.66V232a8,8,0,0,0,16,0v-8.34A96.14,96.14,0,0,0,223.66,136H232a8,8,0,0,0,0-16Zm-96,87.6V200a8,8,0,0,0-16,0v7.6A80.15,80.15,0,0,1,48.4,136H56a8,8,0,0,0,0-16H48.4A80.15,80.15,0,0,1,120,48.4V56a8,8,0,0,0,16,0V48.4A80.15,80.15,0,0,1,207.6,120H200a8,8,0,0,0,0,16h7.6A80.15,80.15,0,0,1,136,207.6ZM128,88a40,40,0,1,0,40,40A40,40,0,0,0,128,88Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,152Z" />
  </svg>
);

const TrendUpIcon = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="15" height="15" aria-hidden="true" focusable="false" fill="currentColor">
    <path d="M232,56v64L168,56Z" opacity="0.2" />
    <path d="M232,48H168a8,8,0,0,0-5.66,13.66L188.69,88,136,140.69l-34.34-34.35a8,8,0,0,0-11.32,0l-72,72a8,8,0,0,0,11.32,11.32L96,123.31l34.34,34.35a8,8,0,0,0,11.32,0L200,99.31l26.34,26.35A8,8,0,0,0,240,120V56A8,8,0,0,0,232,48Zm-8,52.69L187.31,64H224Z" />
  </svg>
);

const DEFAULT_MARKS: TrustMark[] = [
  { label: "구성", icon: <CubeIcon /> },
  { label: "연동", icon: <CirclesIcon /> },
  { label: "정확도", icon: <CrosshairIcon /> },
  { label: "성장", icon: <TrendUpIcon /> },
];

export default function HeroCenterBadge({
  badge = "이번 주 업데이트",
  title = "새 기능이 먼저 도착합니다",
  lead = "가입하면 공개 전에 미리 써 볼 수 있습니다.",
  solid = "지금 신청하기",
  line = "변경 내역 보기",
  trustLabel = "신뢰 표시",
  marks = DEFAULT_MARKS,
  sectionLabel = "출시 안내 첫 화면",
  duration = 2000,
  easing = "ease-out",
  color = "#17141a",
}: HeroCenterBadgeProps): ReactNode {
  const [loop, setLoop] = useState<boolean>(true);
  const refs = useRef<Array<HTMLAnchorElement | null>>([]) as Box<Array<HTMLAnchorElement | null>>;

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const tone = [styles.mark1, styles.mark2, styles.mark3, styles.mark4];

  /* 버튼 쌍은 좌우 화살표로 오간다. preventScroll 이 없으면 iframe 안 포커스가
     부모 페이지를 아래로 끌어당긴다 */
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

  const labels = [solid, line];

  return (
    <section
      className={loop ? `${styles.hb} ${styles.isDemo}` : styles.hb}
      style={vars}
      aria-label={sectionLabel}
      onPointerEnter={() => setLoop(false)}
      onFocus={() => setLoop(false)}
    >
      <p className={styles.badge}>
        <span className={styles.sheen} aria-hidden="true" />
        <svg viewBox="0 0 256 256" width="13" height="13" aria-hidden="true" focusable="false" fill="currentColor">
          <path d="M194.82,151.43l-55.09,20.3-20.3,55.09a7.92,7.92,0,0,1-14.86,0l-20.3-55.09-55.09-20.3a7.92,7.92,0,0,1,0-14.86l55.09-20.3,20.3-55.09a7.92,7.92,0,0,1,14.86,0l20.3,55.09,55.09,20.3A7.92,7.92,0,0,1,194.82,151.43Z" opacity="0.2" />
          <path d="M197.58,129.06,146,110l-19-51.62a15.92,15.92,0,0,0-29.88,0L78,110l-51.62,19a15.92,15.92,0,0,0,0,29.88L78,178l19,51.62a15.92,15.92,0,0,0,29.88,0L146,178l51.62-19a15.92,15.92,0,0,0,0-29.88ZM137,164.22a8,8,0,0,0-4.74,4.74L112,223.85,91.78,169A8,8,0,0,0,87,164.22L32.15,144,87,123.78A8,8,0,0,0,91.78,119L112,64.15,132.22,119a8,8,0,0,0,4.74,4.74L191.85,144ZM144,40a8,8,0,0,1,8-8h16V16a8,8,0,0,1,16,0V32h16a8,8,0,0,1,0,16H184V64a8,8,0,0,1-16,0V48H152A8,8,0,0,1,144,40ZM248,88a8,8,0,0,1-8,8h-8v8a8,8,0,0,1-16,0V96h-8a8,8,0,0,1,0-16h8V72a8,8,0,0,1,16,0v8h8A8,8,0,0,1,248,88Z" />
        </svg>
        <span className={styles.badgeT}>{badge}</span>
      </p>

      <h1 className={styles.title}>{title}</h1>
      <p className={styles.lead}>{lead}</p>

      <div className={styles.actions}>
        {labels.map((t: string, i: number) => (
          <a
            className={`${styles.btn} ${i === 0 ? styles.btnSolid : styles.btnLine}`}
            href="#"
            key={t}
            ref={(el: HTMLAnchorElement | null) => { if (refs.current) { refs.current[i] = el; } }}
            onKeyDown={(e: KeyEvt) => onKey(e, i)}
          >
            {t}
          </a>
        ))}
      </div>

      {/* 신뢰 표시 — 실제 로고가 아니라 둥근 사각형 안에 일반 아이콘 + 일반명사 라벨 */}
      <ul className={styles.trust} aria-label={trustLabel}>
        {marks.map((m: TrustMark, i: number) => (
          <li className={`${styles.mark} ${tone[i % tone.length]}`} key={m.label}>
            <span className={styles.tile}>{m.icon}</span>
            <span className={styles.ml}>{m.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
