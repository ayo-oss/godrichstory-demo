import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./AvatarHoverUserCard.module.scss";

export type AvatarHoverUserCardProps = {
  label?: string;
  name?: string;
  ago?: string;
  rest?: string;
  job?: string;
  statALabel?: string;
  statAValue?: string;
  statBLabel?: string;
  statBValue?: string;
  /** 포인터가 다가가 카드가 열리고 닫히는 한 바퀴(ms) */
  duration?: number;
  easing?: string;
  /** 아바타·초점 테두리·채우는 막대·포인터 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string };

// 이니셜은 표시 문자열에서 계산한다(하드코딩 금지) — 언어팩이 바뀌면 이니셜도 따라간다
function initialOf(name: string): string {
  const p = name.trim().split(/\s+/);
  return /[A-Za-z]/.test(p[0]) ? p.slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("") : p[0].charAt(0);
}

export default function AvatarHoverUserCard({
  label = "사용자 카드 안내",
  name = "편집자",
  ago = "방금",
  rest = "님이 문서를 고쳤습니다",
  job = "문서 편집 담당",
  statALabel = "고친 문서",
  statAValue = "128",
  statBLabel = "받은 감사",
  statBValue = "36",
  duration = 2000,
  easing = "ease-out",
  color = "#2a5fd8",
}: AvatarHoverUserCardProps): ReactNode {
  const [loop, setLoop] = useState<boolean>(true);
  const [open, setOpen] = useState<boolean>(true);
  const openT = useRef(0) as Box<number>;
  const closeT = useRef(0) as Box<number>;

  useEffect(() => () => { window.clearTimeout(openT.current); window.clearTimeout(closeT.current); }, []);

  // 호버 — 300ms 지연 뒤 열리고, 벗어나면 200ms 유예 뒤 닫힌다.
  // 유예 동안 카드 위로 옮겨 가면 닫히지 않는다(카드에도 같은 핸들러)
  function enter() {
    window.clearTimeout(openT.current);
    window.clearTimeout(closeT.current);
    openT.current = window.setTimeout(() => setOpen(true), 300);
  }
  function leave() {
    window.clearTimeout(openT.current);
    window.clearTimeout(closeT.current);
    closeT.current = window.setTimeout(() => setOpen(false), 200);
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section
      className={loop ? `${styles.uc} ${styles.isDemo}` : styles.uc}
      style={vars}
      aria-label={label}
      onPointerDown={() => setLoop(false)}
      onFocus={() => setLoop(false)}
    >
      {/* 가짜 포인터 — 미리보기 루프에서만 보인다 */}
      <span className={styles.pointer} aria-hidden="true" />

      <p className={styles.line}>
        <span className={styles.ago}>{ago}</span>
        <button
          className={styles.trigger}
          type="button"
          aria-describedby="uc-card"
          onPointerEnter={enter}
          onPointerLeave={leave}
          /* 초점 — 지연 없이 열리고, blur·Escape 으로 닫힌다 */
          onFocus={() => { window.clearTimeout(closeT.current); setOpen(true); }}
          onBlur={() => setOpen(false)}
          onKeyDown={(e: KeyEvt) => { if (e.key === "Escape") setOpen(false); }}
        >
          <span className={styles.av} aria-hidden="true">{initialOf(name)}</span>
          <span className={styles.name}>{name}</span>
        </button>
        <span className={styles.rest}>{rest}</span>
      </p>

      <div
        className={styles.card}
        id="uc-card"
        role="tooltip"
        hidden={!open}
        onPointerEnter={() => window.clearTimeout(closeT.current)}
        onPointerLeave={leave}
      >
        <div className={styles.head}>
          <span className={styles.bigav} aria-hidden="true">{initialOf(name)}</span>
          <p className={styles.who}>
            <span className={styles.cardName}>{name}</span>
            <span className={styles.job}>{job}</span>
          </p>
        </div>
        <div className={styles.stats}>
          <p className={styles.stat}><span className={styles.val}>{statAValue}</span><span className={styles.lab}>{statALabel}</span></p>
          <p className={styles.stat}><span className={styles.val}>{statBValue}</span><span className={styles.lab}>{statBLabel}</span></p>
        </div>
        <span className={styles.fill} aria-hidden="true"><span className={styles.fillIn} /></span>
      </div>
    </section>
  );
}
