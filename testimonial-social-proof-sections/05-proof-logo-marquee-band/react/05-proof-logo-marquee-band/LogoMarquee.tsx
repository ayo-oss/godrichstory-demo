import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./LogoMarquee.module.scss";

/* ambient 에 React 이벤트 제네릭이 없어 파일 안에 필요한 만큼만 선언한다 */
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export type MarqueeMark = {
  /** 일반 명사 이름 — 실재 브랜드 이름은 쓰지 않는다 */
  name: string;
  /** 일반 도형 인라인 SVG */
  shape: ReactNode;
};

export type LogoMarqueeProps = {
  sectionLabel?: string;
  lead?: string;
  marks?: MarqueeMark[];
  /** 마크 한 벌이 지나가는 한 바퀴(ms) */
  duration?: number;
  easing?: string;
  /** 띠 양 끝이 녹아드는 무대 색 */
  color?: string;
};

const Circle = (): ReactNode => (
  <svg className={styles.shape} viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" /></svg>
);
const Triangle = (): ReactNode => (
  <svg className={styles.shape} viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true" focusable="false"><path d="M12 3 21 20H3Z" /></svg>
);
const Diamond = (): ReactNode => (
  <svg className={styles.shape} viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true" focusable="false"><path d="M12 2 22 12 12 22 2 12Z" /></svg>
);
const Hexagon = (): ReactNode => (
  <svg className={styles.shape} viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true" focusable="false"><path d="M12 2 21 7v10l-9 5-9-5V7Z" /></svg>
);
const Rounded = (): ReactNode => (
  <svg className={styles.shape} viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="5" /></svg>
);
const Ring = (): ReactNode => (
  <svg className={styles.shape} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="4" /></svg>
);
const Pentagon = (): ReactNode => (
  <svg className={styles.shape} viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true" focusable="false"><path d="M12 2 22 9.3 18.2 21H5.8L2 9.3Z" /></svg>
);
const Cross = (): ReactNode => (
  <svg className={styles.shape} viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true" focusable="false"><path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7Z" /></svg>
);

const DEFAULT_MARKS: MarqueeMark[] = [
  { name: "온라인 서점", shape: <Circle /> },
  { name: "사진 스튜디오", shape: <Triangle /> },
  { name: "물류 회사", shape: <Diamond /> },
  { name: "디자인 에이전시", shape: <Hexagon /> },
  { name: "어학원", shape: <Rounded /> },
  { name: "동네 빵집", shape: <Ring /> },
  { name: "여행 플랫폼", shape: <Pentagon /> },
  { name: "피트니스 센터", shape: <Cross /> },
];

export default function LogoMarquee({
  sectionLabel = "도입 고객사 띠",
  lead = "500곳이 넘는 팀이 쓰고 있습니다",
  marks = DEFAULT_MARKS,
  duration = 2000,
  easing = "linear",
  color = "#ffffff",
}: LogoMarqueeProps): ReactNode {
  /* 마퀴는 흐름 자체가 부품이라 루프를 끄지 않는다. 손을 대면 그 자리에 멈춘다 */
  const [paused, setPaused] = useState<boolean>(false);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const tone = [styles.t1, styles.t2, styles.t3, styles.t4];

  const cls = [styles.lm, styles.isDemo, paused ? styles.isPaused : ""].filter(Boolean).join(" ");

  return (
    <section
      className={cls}
      style={vars}
      aria-label={sectionLabel}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onPointerDown={() => setPaused(true)}
      onPointerUp={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <p className={styles.lead}>{lead}</p>

      <div className={styles.band}>
        {/* 마크 8개를 두 벌 이어 붙인 트랙. 간격을 flex gap 으로 주면 16개 사이 간격이 15개라
            translateX(-50%) 가 한 간격만큼 모자라 한 바퀴마다 튄다 (BD15).
            간격을 항목마다 margin-right 로 주면 트랙 폭 = (항목폭 + 간격) × 16 이라
            절반이 정확히 마크 한 벌이다 */}
        <div className={styles.track}>
          {marks.map((m: MarqueeMark, i: number) => (
            <a className={`${styles.mark} ${tone[i % tone.length]}`} href="#" key={`a-${m.name}`}>
              {m.shape}
              {m.name}
            </a>
          ))}
          {marks.map((m: MarqueeMark, i: number) => (
            <a
              className={`${styles.mark} ${tone[i % tone.length]} ${styles.dup}`}
              href="#"
              key={`b-${m.name}`}
              tabIndex={-1}
              aria-hidden="true"
            >
              {m.shape}
              {m.name}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
