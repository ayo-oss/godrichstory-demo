// ListReorder — vanilla 판(run/401/demo/08-view-transition-list-reorder/index.html) 의 React 포트.
// 계산 겹: 카드마다 데이터 id 값으로 고유한 이름표 값을 지어 붙인다 — 순서가 바뀌어도 같은 카드는
// 같은 이름표를 유지하니 브라우저가 "이 카드가 저 자리로 이동했다"를 알 수 있다.
import { useEffect, useRef } from "react";
import styles from "./ListReorder.module.scss";

type Box<T> = { current: T };

const ITEMS = [
  { id: "a", name: "알파 상품", price: 12000 },
  { id: "b", name: "베타 상품", price: 4000 },
  { id: "c", name: "감마 상품", price: 19000 },
  { id: "d", name: "델타 상품", price: 8000 },
];
const HOLD_MS = 1000;

export default function ListReorder() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const listRef = useRef(null) as unknown as Box<HTMLUListElement>;
  const sortBtnRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const itemRefs = useRef([null, null, null, null]) as unknown as Box<(HTMLLIElement | null)[]>;
  const timerRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const SUPPORTS_VT = "startViewTransition" in document;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;
    let asc = true;

    const items = itemRefs.current.filter((el): el is HTMLLIElement => !!el);
    // 계산 겹: 카드마다 고유한 이름표 값을 지어 붙인다
    items.forEach((el) => {
      el.style.viewTransitionName = "lr-item-" + el.dataset.id;
    });

    function human() {
      if (isDemo) { rootRef.current?.classList.remove(styles.isDemo); isDemo = false; }
    }

    function render() {
      const list = listRef.current;
      if (!list) return;
      const sorted = items.slice().sort((a, b) => {
        const av = Number(a.dataset.v);
        const bv = Number(b.dataset.v);
        return asc ? av - bv : bv - av;
      });
      sorted.forEach((el) => list.appendChild(el));
      if (sortBtnRef.current) sortBtnRef.current.textContent = asc ? "가격 오름차순" : "가격 내림차순";
    }

    function change(fn: () => void) {
      if (SUPPORTS_VT) { document.startViewTransition(fn); }
      else { fn(); }
    }

    function toggleSort() {
      asc = !asc;
      change(render);
    }

    function onClick() { human(); toggleSort(); }
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") { human(); e.preventDefault(); toggleSort(); }
    }

    sortBtnRef.current?.addEventListener("click", onClick);
    rootRef.current?.addEventListener("keydown", onKeydown);

    function loop() {
      if (!isDemo) return;
      toggleSort();
      timerRef.current = window.setTimeout(loop, HOLD_MS);
    }

    if (!reduce) {
      timerRef.current = window.setTimeout(loop, HOLD_MS);
    } else {
      rootRef.current?.classList.remove(styles.isDemo);
    }

    return () => {
      window.clearTimeout(timerRef.current);
      sortBtnRef.current?.removeEventListener("click", onClick);
      rootRef.current?.removeEventListener("keydown", onKeydown);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.lr + " " + styles.isDemo} ref={rootRef}>
        <button type="button" className={styles.sort} ref={sortBtnRef} aria-label="가격순 정렬 뒤집기">가격 오름차순</button>
        <ul className={styles.list} ref={listRef}>
          {ITEMS.map((it, i) => (
            <li key={it.id} className={styles.item} data-id={it.id} ref={(el: HTMLLIElement | null) => { itemRefs.current[i] = el; }}>
              <span className={styles.name}>{it.name}</span>
              <span className={styles.price} data-v={it.price}>{it.price.toLocaleString("ko-KR")}</span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
