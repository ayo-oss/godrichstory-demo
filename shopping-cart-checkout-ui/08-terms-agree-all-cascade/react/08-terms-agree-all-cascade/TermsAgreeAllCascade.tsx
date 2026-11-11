import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TermsAgreeAllCascade.module.scss";

export type TermsAgreeAllCascadeProps = {
  allLabel?: string;
  items?: string[];
  groupLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type RowVars = CSSProperties & { "--i"?: number };
// ambient 가 얇아 DOM 요소 타입을 못 쓴다 — 필요한 꼴만 로컬 타입으로 선언
type Toggle = { indeterminate: boolean };

function CheckSquareIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M216,48V208a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V48a8,8,0,0,1,8-8H208A8,8,0,0,1,216,48Z" opacity="0.2"/><path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM224,48V208a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V48A16,16,0,0,1,48,32H208A16,16,0,0,1,224,48ZM208,208V48H48V208H208Z"/></svg>
  );
}

export default function TermsAgreeAllCascade({
  allLabel = "전체 동의",
  items = [
    "이용약관 동의 (필수)",
    "개인정보 수집 (필수)",
    "결제 대행 서비스 (필수)",
    "마케팅 정보 수신 (선택)",
  ],
  groupLabel = "약관 동의 묶음",
  demo = true,
  duration = 2000,
  easing = "ease-out",
  color = "#17141a",
}: TermsAgreeAllCascadeProps) {
  const [checked, setChecked] = useState<boolean[]>(items.map(() => false));
  const [live, setLive] = useState(demo);
  const masterRef = useRef<Toggle>(null);

  const on = checked.filter(Boolean).length;
  const all = on === items.length && on > 0;

  // 「몇 개는 켜져 있다」 는 상태는 속성으로만 있다 — 렌더 뒤에 직접 놓는다
  useEffect(() => {
    const el = masterRef.current;
    if (!el) return;
    el.indeterminate = on > 0 && on < items.length;
  }, [on, items.length]);

  function toggleAll(next: boolean) {
    setLive(false);
    setChecked(items.map(() => next));
  }

  function toggleOne(index: number, next: boolean) {
    setLive(false);
    setChecked((prev) => prev.map((was, n) => (n === index ? next : was)));
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = [styles.ta, live ? styles.isDemo : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <div className={styles.all}>
        <span className={styles.ic} aria-hidden="true"><CheckSquareIcon /></span>
        <label className={styles.allText} htmlFor="ta-all">{allLabel}</label>
        <input
          className={styles.switch}
          type="checkbox"
          id="ta-all"
          ref={masterRef}
          checked={all}
          onChange={(event: { target: { checked: boolean } }) => toggleAll(event.target.checked)}
        />
      </div>

      <ul className={styles.list}>
        {items.map((text, n) => {
          const rowVars: RowVars = { "--i": n };
          const id = `ta-${n + 1}`;
          return (
            <li className={styles.row} style={rowVars} key={text}>
              <input
                className={styles.box}
                type="checkbox"
                id={id}
                checked={checked[n]}
                onChange={(event: { target: { checked: boolean } }) => toggleOne(n, event.target.checked)}
              />
              <label className={styles.mark} htmlFor={id} aria-hidden="true">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <polyline
                    className={styles.tick}
                    points="5 12.5 10 17 19 7"
                    pathLength="1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </label>
              <label className={styles.text} htmlFor={id}>{text}</label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
