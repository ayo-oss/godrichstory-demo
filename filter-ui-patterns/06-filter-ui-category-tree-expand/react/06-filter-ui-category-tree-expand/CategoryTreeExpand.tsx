import { useEffect, useRef } from "react";
import styles from "./CategoryTreeExpand.module.scss";

// 하위 목록의 실제 렌더 높이(scrollHeight)를 재서 --tree-height 로 저장(setProperty)해 두고,
// 펼침 상태는 그 값을 height 로 삼아 transition·keyframe 이 0 에서 그 값까지 보간한다.
// 실제 클릭: aria-expanded 를 뒤집고 목록을 펼치거나 접는다.
export default function CategoryTreeExpand() {
  const toggleRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const toggle = toggleRef.current;
    const list = listRef.current;
    if (!toggle || !list) return;

    function measure() {
      list!.style.setProperty("--tree-height", list!.scrollHeight + "px");
    }
    measure();

    function onClick() {
      list!.classList.remove(styles["is-demo"]);
      measure();
      const open = list!.classList.toggle(styles["is-open"]);
      toggle!.setAttribute("aria-expanded", String(open));
    }

    toggle.addEventListener("click", onClick);
    window.addEventListener("resize", measure);
    return () => {
      toggle.removeEventListener("click", onClick);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.tree}>
        <button
          ref={toggleRef}
          className={styles.tree__toggle}
          type="button"
          aria-expanded="false"
          aria-controls="list"
        >
          <svg className={styles.tree__caret} viewBox="0 0 256 256" width="14" height="14" aria-hidden="true">
            <g fill="currentColor">
              <path d="m208 96l-80 80l-80-80Z" opacity=".2" />
              <path d="M215.39 92.94A8 8 0 0 0 208 88H48a8 8 0 0 0-5.66 13.66l80 80a8 8 0 0 0 11.32 0l80-80a8 8 0 0 0 1.73-8.72M128 164.69L67.31 104h121.38Z" />
            </g>
          </svg>
          카테고리
        </button>
        <ul ref={listRef} id="list" className={`${styles.tree__list} ${styles["is-demo"]}`}>
          <li>여성 의류 (128)</li>
          <li>남성 의류 (86)</li>
          <li>액세서리 (42)</li>
        </ul>
      </div>
    </main>
  );
}
