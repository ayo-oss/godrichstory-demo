import { useEffect, useRef } from "react";
import styles from "./CommentThreadUnreadDividerPosition.module.scss";

// 기법: 각 댓글의 "몇 분 전 작성" 값(가짜 상대값, Date 미사용)과 LAST_VISIT_MINUTES_AGO
// (마지막 방문이 몇 분 전인지)를 비교해, 방문 이후 쓰인 첫 댓글의 위치를 계산한다.
// minAgo < LAST_VISIT_MINUTES_AGO 인 첫 행 앞에 구분선을 삽입하고 위에서 살짝 내려와 멎는다.
const LAST_VISIT_MINUTES_AGO = 90;
const NEW_ROW_HILITE_STAGGER_MS = 90;

const ROWS = [
  { minAgo: 180, label: "읽은 댓글 1 — 이전 방문 때 이미 읽었습니다." },
  { minAgo: 120, label: "읽은 댓글 2 — 이것도 지난번에 봤어요." },
  { minAgo: 95, label: "읽은 댓글 3 — 여기까지가 지난 방문 범위." },
  { minAgo: 40, label: "새 댓글 1 — 마지막 방문 이후 달렸어요." },
  { minAgo: 12, label: "새 댓글 2 — 구분선 아래는 전부 새 댓글." },
];

export default function CommentThreadUnreadDividerPosition() {
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const list = listRef.current;
    const status = statusRef.current;
    if (!root || !list || !status) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) root.classList.remove("is-demo");

    function insertDivider(animate: boolean) {
      const items = Array.from(list!.querySelectorAll<HTMLElement>(".un__item"));
      const idx = items.findIndex((el) => parseInt(el.getAttribute("data-min-ago")!, 10) < LAST_VISIT_MINUTES_AGO);
      if (idx < 0) {
        status!.textContent = "새 댓글이 없습니다.";
        return;
      }
      const firstUnread = items[idx];

      const divider = document.createElement("li");
      divider.className = `un__divider ${styles.un__divider}`;
      divider.setAttribute("role", "listitem");
      const label = document.createElement("span");
      label.className = styles.un__dividerLabel;
      label.textContent = "여기부터 새 댓글";
      divider.appendChild(label);
      list!.insertBefore(divider, firstUnread);

      for (let j = idx; j < items.length; j += 1) {
        items[j].classList.add("is-new");
        if (animate && !reduce) {
          // 계산: 구분선 아래 새 댓글 행마다, 구분선 등장 이후 순서대로 옅은 하이라이트가
          // 번져나갔다 가라앉아 "여기부터 새 댓글" 범위를 행 전체 면적으로도 보여준다.
          items[j].animate(
            [
              { backgroundColor: "rgba(94,234,212,0.22)" },
              { backgroundColor: "rgba(94,234,212,0)" },
            ],
            { duration: 520, delay: 260 + (j - idx) * NEW_ROW_HILITE_STAGGER_MS, easing: "ease-out", fill: "forwards" }
          );
        }
      }

      if (!animate || reduce) {
        divider.style.opacity = "1";
        divider.style.transform = "translateY(0)";
      } else {
        divider.animate(
          [
            { opacity: 0, transform: "translateY(-14px)" },
            { opacity: 1, transform: "translateY(3px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: 460, delay: 220, easing: "ease-out", fill: "forwards" }
        );
      }
      const newCount = items.length - idx;
      status!.textContent = `마지막 방문 이후 새 댓글 ${newCount}개입니다.`;
    }

    insertDivider(!reduce);
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.un} is-demo`} ref={rootRef}>
        <ul className={styles.un__list} role="list" ref={listRef}>
          {ROWS.map((r, i) => (
            <li key={i} className={`un__item ${styles.un__item}`} data-min-ago={r.minAgo}>{r.label}</li>
          ))}
        </ul>
        <p className={styles.un__sr} ref={statusRef} aria-live="polite" />
      </div>
    </main>
  );
}
