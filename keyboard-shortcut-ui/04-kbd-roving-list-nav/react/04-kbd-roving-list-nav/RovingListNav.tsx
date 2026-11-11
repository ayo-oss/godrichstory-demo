// RovingListNav — vanilla 판(run/288/demo/04-kbd-roving-list-nav/index.html) 의 React 포트.
// 로빙 tabindex: 한 줄만 tabindex 0 을 갖고, 초점 이동은 preventScroll 과 함께 부른다 (BD18).
import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./RovingListNav.module.scss";

export type RovingListNavProps = {
  /** 격자 미리보기용 2초 자동 루프. 사람이 키를 누르거나 줄을 클릭하면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--i"?: string };

/** useRef 배열은 T | null 을 돌려주므로 쓰기 전에 null 을 걸러 낸다 */
type RowBox = { current: (HTMLLIElement | null)[] };
/** React 이벤트 제네릭이 ambient 에 없어 쓰는 필드만 지역 타입으로 선언한다 */
type KeyEvt = { key: string; preventDefault(): void };

const ROWS: { who: string; what: string }[] = [
  { who: "김하늘", what: "결제 영수증" },
  { who: "배송 알림", what: "오늘 도착" },
  { who: "팀 노트", what: "회의 정리" },
  { who: "이든", what: "주말 일정" },
];

export default function RovingListNav({
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: RovingListNavProps) {
  const [live, setLive] = useState(demo);
  const [index, setIndex] = useState(0);
  const [opened, setOpened] = useState(-1);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]) as RowBox;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color, "--i": String(index) };

  function applySelection(next: number) {
    const clamped = Math.max(0, Math.min(ROWS.length - 1, next));
    setIndex(clamped);
    setOpened(-1);
    const row = rowRefs.current[clamped];
    if (row) {
      // iframe 안에서 preventScroll 없이 부르면 부모 페이지가 이 줄로 끌려 내려간다 (BD18)
      row.focus({ preventScroll: true });
    }
  }

  function handleKeyDown(e: KeyEvt) {
    const key = e.key.toLowerCase();
    if (key !== "j" && key !== "k" && e.key !== "Enter") {
      return;
    }
    e.preventDefault();
    setLive(false);
    if (key === "j") { applySelection(index + 1); }
    if (key === "k") { applySelection(index - 1); }
    if (e.key === "Enter") { setOpened(index); }
  }

  const cls = [styles.root, live ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage} style={vars}>
      <div className={cls}>
        <p className={styles.cap}>J 아래 · K 위 · Enter 열기</p>
        <ul className={styles.list} role="listbox" aria-label="받은 메일" onKeyDown={handleKeyDown}>
          <li className={styles.marker} aria-hidden="true" />
          {ROWS.map((row, i) => (
            <li
              key={row.who}
              ref={(node: HTMLLIElement | null) => { rowRefs.current[i] = node; }}
              className={[styles.row, opened === i ? styles.isOpen : ""].filter(Boolean).join(" ")}
              role="option"
              tabIndex={i === index ? 0 : -1}
              aria-selected={i === index}
              onClick={() => { setLive(false); applySelection(i); }}
            >
              <span className={styles.who}>{row.who}</span>
              <span className={styles.what}>{row.what}</span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
