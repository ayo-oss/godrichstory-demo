// SortableTable — vanilla 판(run/381/demo/07-sortable-table/index.html)의 React 포트.
// FLIP 기법: 재정렬 전 각 행의 위치(First)를 재고, DOM 순서를 바꾼 뒤 위치(Last)를 다시 재
// 그 차이(Invert)만큼 역이동시켰다가 트랜지션으로 0 으로 풀어(Play) 자연스럽게 미끄러지게 한다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./SortableTable.module.scss";

export type SortableTableProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

type SortKey = "name" | "qty";
type SortDir = "asc" | "desc";

const ROWS: { id: number; name: string; qty: number }[] = [
  { id: 1, name: "사과", qty: 12 },
  { id: 2, name: "바나나", qty: 27 },
  { id: 3, name: "체리", qty: 8 },
  { id: 4, name: "대추", qty: 19 },
  { id: 5, name: "포도", qty: 33 },
];

export default function SortableTable({
  duration = "300ms", // vanilla $duration: $dur-base
  easing = "cubic-bezier(.2, .8, .2, 1)", // vanilla $easing: $ease-spring
  color = "#5b8cf8", // vanilla $color: $subject-blue-light
}: SortableTableProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const table = root.querySelector<HTMLTableElement>('[data-role="table"]');
    const tbody = root.querySelector<HTMLTableSectionElement>('[data-role="tbody"]');
    if (!table || !tbody) return;
    const headerCells = Array.prototype.slice.call(
      table.querySelectorAll("th[data-key]")
    ) as HTMLTableCellElement[];

    const SORT_REORDER_MS = 250; // 변형 대상 — 정렬로 행이 이동하는 애니메이션 길이
    const AUTO_STEP_MS = 900;
    const AUTO_KEYS: SortKey[] = ["name", "qty"];

    table.style.setProperty("--reorder-ms", SORT_REORDER_MS + "ms");

    let currentKey: SortKey | null = null;
    let currentDir: SortDir = "asc";

    function getRows(): HTMLTableRowElement[] {
      return Array.prototype.slice.call(tbody!.querySelectorAll("tr"));
    }

    function comparator(key: SortKey, dir: SortDir) {
      return (a: HTMLTableRowElement, b: HTMLTableRowElement): number => {
        let av: string | number = a.dataset[key] as string;
        let bv: string | number = b.dataset[key] as string;
        if (key === "qty") {
          av = Number(av);
          bv = Number(bv);
        }
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return dir === "asc" ? cmp : -cmp;
      };
    }

    function updateHeaders(): void {
      headerCells.forEach((th) => {
        if (th.dataset.key === currentKey) {
          th.setAttribute("aria-sort", currentDir === "asc" ? "ascending" : "descending");
        } else {
          th.setAttribute("aria-sort", "none");
        }
      });
    }

    function human(): void {
      if (root!.classList.contains("is-demo")) {
        root!.classList.remove("is-demo");
        if (timer) {
          window.clearInterval(timer);
          timer = null;
        }
      }
    }

    function sortBy(key: SortKey): void {
      const dir: SortDir = key === currentKey ? (currentDir === "asc" ? "desc" : "asc") : "asc";
      currentKey = key;
      currentDir = dir;

      const rows = getRows();
      const first: Record<string, number> = {};
      rows.forEach((row) => {
        first[row.dataset.id as string] = row.getBoundingClientRect().top;
      });

      rows.sort(comparator(key, dir));
      rows.forEach((row) => tbody!.appendChild(row));

      rows.forEach((row) => {
        const last = row.getBoundingClientRect().top;
        const delta = first[row.dataset.id as string] - last;
        if (delta) {
          row.style.transition = "none";
          row.style.transform = "translateY(" + delta + "px)";
          void row.offsetHeight; // 리플로우 강제 — Invert 값을 실제로 적용한 뒤 되돌려야 트랜지션이 재생된다
          row.style.transition = "";
          row.style.transform = "translateY(0)";
        }
      });

      updateHeaders();
    }

    const clickHandlers: (() => void)[] = [];
    const buttons: HTMLButtonElement[] = [];
    headerCells.forEach((th) => {
      const btn = th.querySelector<HTMLButtonElement>("button")!;
      const onClick = () => {
        human();
        sortBy(th.dataset.key as SortKey);
      };
      btn.addEventListener("click", onClick);
      buttons.push(btn);
      clickHandlers.push(onClick);
    });

    let timer: number | null = null;
    let seqPos = 0;

    function autoTick(): void {
      sortBy(AUTO_KEYS[seqPos % AUTO_KEYS.length]);
      seqPos += 1;
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      timer = window.setInterval(autoTick, AUTO_STEP_MS);
    }
    // reduce: 실사용 경로 적용 — 자동 정렬 루프를 멈춘다. 헤더 클릭 정렬·FLIP 계산은 그대로 동작(트랜지션만 scss 에서 제거)

    return () => {
      buttons.forEach((btn, i) => {
        btn.removeEventListener("click", clickHandlers[i]);
      });
      if (timer) {
        window.clearInterval(timer);
      }
    };
  }, []);

  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  return (
    <main className={styles.stage}>
      <div className={`${styles.srt} is-demo`} ref={rootRef} style={vars}>
        <table className={styles.srt__table} data-role="table">
          <thead>
            <tr>
              <th scope="col" className={styles.srt__th} data-key="name" aria-sort="none">
                <button type="button" className={styles.srt__headerBtn}>
                  품목명
                </button>
              </th>
              <th
                scope="col"
                className={`${styles.srt__th} ${styles["srt__th--num"]}`}
                data-key="qty"
                aria-sort="none"
              >
                <button type="button" className={styles.srt__headerBtn}>
                  수량
                </button>
              </th>
            </tr>
          </thead>
          <tbody data-role="tbody">
            {ROWS.map((row) => (
              <tr key={row.id} data-id={row.id} data-name={row.name} data-qty={row.qty}>
                <td>{row.name}</td>
                <td className={styles.srt__num}>{row.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
