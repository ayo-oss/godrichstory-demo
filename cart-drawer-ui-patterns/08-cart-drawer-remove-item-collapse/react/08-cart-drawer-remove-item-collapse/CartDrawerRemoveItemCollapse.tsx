import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CartDrawerRemoveItemCollapse.module.scss";

export type CartDrawerRemoveItemCollapseProps = {
  duration?: number;
  color?: string;
};

type Row = { id: number; name: string; price: string };

const STOCK: [string, string][] = [
  ["에코백", "$11"], ["머그컵", "$13"], ["카드지갑", "$22"],
  ["우산", "$17"], ["볼캡", "$19"],
];

const DUR_MS = 320;
// 계산 겹: 삭제된 행의 실제 높이(px)를 시작값으로 두고 매 프레임 3제곱 이징으로 0 에 다가가게
// 계산한다(collapseRow()) — max-height 전환 곡선이 아니라 실측 높이에서 시작하는 보간이다.
function easeInCubic(p: number): number {
  return p * p * p;
}

export default function CartDrawerRemoveItemCollapse({
  color = "#0a4fe8",
}: CartDrawerRemoveItemCollapseProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const [rows, setRows] = useState<Row[]>([
    { id: 0, name: "스니커즈", price: "$52" },
    { id: 1, name: "양말", price: "$9" },
    { id: 2, name: "깔창", price: "$7" },
  ]);
  const stockIndexRef = useRef(0);
  const nextIdRef = useRef(3);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function refillIfEmpty(count: number) {
    if (count < 2) {
      const item = STOCK[(stockIndexRef.current ?? 0) % STOCK.length];
      stockIndexRef.current = (stockIndexRef.current ?? 0) + 1;
      const id = nextIdRef.current ?? 3;
      nextIdRef.current = (nextIdRef.current ?? 3) + 1;
      setRows((prev) => [...prev, { id, name: item[0], price: item[1] }]);
    }
  }

  function collapseRow(id: number) {
    const li = listRef.current?.querySelector<HTMLLIElement>(`[data-id="${id}"]`);
    if (!li) return;
    const h = li.getBoundingClientRect().height;
    li.style.overflow = "hidden";
    li.style.height = `${h}px`;
    li.style.willChange = "height, opacity, transform";
    const start = performance.now();
    function frame(now: number) {
      const p = Math.min(1, (now - start) / DUR_MS);
      const eased = easeInCubic(p);
      li!.style.height = `${h * (1 - eased)}px`;
      li!.style.opacity = String(1 - eased);
      li!.style.transform = `translateX(${-eased * 24}px)`;
      if (p < 1) {
        requestAnimationFrame(frame);
      } else {
        setRows((prev) => {
          const next = prev.filter((r) => r.id !== id);
          refillIfEmpty(next.length);
          return next;
        });
      }
    }
    requestAnimationFrame(frame);
  }

  function stopAutoplay() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => {
    function autoTick() {
      const first = listRef.current?.querySelector<HTMLLIElement>(`.${styles.row}`);
      const id = first?.getAttribute("data-id");
      if (id != null) collapseRow(Number(id));
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      timerRef.current = setInterval(autoTick, 1100);
    }
    return stopAutoplay;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.isDemo}`} style={{ "--color": color } as CSSProperties}>
      <div className={styles.cric}>
        <ul ref={listRef} className={styles.list}>
          {rows.map((row) => (
            <li key={row.id} data-id={row.id} className={styles.row}>
              <span>{row.name}</span>
              <b>{row.price}</b>
              <button
                className={styles.x}
                type="button"
                aria-label="삭제"
                onClick={() => {
                  rootRef.current?.classList.remove(styles.isDemo);
                  stopAutoplay();
                  collapseRow(row.id);
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
