import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./QuoteSwitcher.module.scss";

/* ambient 에 React 이벤트 제네릭이 없어 파일 안에 필요한 만큼만 선언한다 */
type KeyEvt = { key: string; preventDefault(): void };
type Box<T> = { current: T };

export type SwitcherItem = {
  quote: string;
  by: string;
  /** 아바타 이니셜 한 글자 */
  initial: string;
};

export type QuoteSwitcherProps = {
  sectionLabel?: string;
  groupLabel?: string;
  items?: SwitcherItem[];
  /** 인용 넷 + 링 네 칸이 한 바퀴 도는 시간(ms) */
  duration?: number;
  easing?: string;
  /** 무대 색 */
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--i"?: string;
};

const DEFAULT_ITEMS: SwitcherItem[] = [
  { quote: "데이터를 처음 보는 사람도 어디를 고쳐야 하는지 바로 알게 됐습니다.", by: "운영팀 매니저 · 온라인 서점", initial: "K" },
  { quote: "묻는 전화가 줄고, 주문은 저절로 들어옵니다.", by: "사장 · 동네 빵집", initial: "P" },
  { quote: "회의가 짧아졌습니다. 화면이 대신 설명합니다.", by: "디자인팀 팀장 · 수제 가구 공방", initial: "Y" },
  { quote: "처음 혼자 꾸린 사이트가 이제 동네에서 제일 커 보입니다.", by: "대표 · 꽃집", initial: "H" },
];

export default function QuoteSwitcher({
  sectionLabel = "고객 후기 대형 인용",
  groupLabel = "후기 보는 사람 고르기",
  items = DEFAULT_ITEMS,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ffd23f",
}: QuoteSwitcherProps): ReactNode {
  const [loop, setLoop] = useState<boolean>(true);
  const [active, setActive] = useState<number>(0);
  const faceRefs = useRef<Array<HTMLButtonElement | null>>([]) as Box<Array<HTMLButtonElement | null>>;

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--i": `${active}`,
  };

  /* 정적 경로 — 얼굴을 고르면 자동 순환이 끝기고 그 사람의 인용문으로 바뀐다 */
  const pick = (i: number): void => {
    setLoop(false);
    setActive(i);
  };

  const onFaceKey = (e: KeyEvt, i: number): void => {
    const list = faceRefs.current;
    if (!list) { return; }
    const n = list.length;
    let to = -1;
    if (e.key === "ArrowRight") { to = (i + 1) % n; }
    if (e.key === "ArrowLeft") { to = (i - 1 + n) % n; }
    if (to < 0) { return; }
    e.preventDefault();
    pick(to);
    const btn = list[to];
    if (btn) { btn.focus({ preventScroll: true }); }
  };

  return (
    <section
      className={loop ? `${styles.qs} ${styles.isDemo}` : styles.qs}
      style={vars}
      aria-label={sectionLabel}
    >
      <div className={styles.body} aria-live="polite">
        {items.map((it: SwitcherItem, i: number) => (
          <p className={active === i ? `${styles.quote} ${styles.isOn}` : styles.quote} key={it.by}>
            {it.quote}
          </p>
        ))}
        {items.map((it: SwitcherItem, i: number) => (
          <p className={active === i ? `${styles.by} ${styles.isOn}` : styles.by} key={`${it.by}-by`}>
            {it.by}
          </p>
        ))}
      </div>

      <div className={styles.rail} role="group" aria-label={groupLabel}>
        <span className={styles.ring} aria-hidden="true" style={{ "--i": `${active}` } as Vars} />
        {items.map((it: SwitcherItem, i: number) => (
          <span className={styles.cell} key={it.by}>
            <button
              className={active === i ? `${styles.face} ${styles.isOn}` : styles.face}
              type="button"
              aria-pressed={active === i}
              ref={(el: HTMLButtonElement | null) => { faceRefs.current[i] = el; }}
              onClick={() => pick(i)}
              onKeyDown={(e: KeyEvt) => onFaceKey(e, i)}
            >
              <span className={styles.initial} aria-hidden="true">{it.initial}</span>
            </button>
          </span>
        ))}
      </div>
    </section>
  );
}
