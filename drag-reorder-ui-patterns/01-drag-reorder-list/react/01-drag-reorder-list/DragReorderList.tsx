// DragReorderList — vanilla 판(run/336/demo/01-drag-reorder-list/index.html)
// 의 React 포트. 배열 순서(order)를 실제 DOM 자식에 적용하기 전 각 행의 getBoundingClientRect().top
// (first)을 재 두었다가, 적용 후 좌표(last)와의 차(invert)를 transform translateY 로 즉시 되돌리고
// 다음 프레임에 transform 을 0 으로 풀어(play) 행이 미끄러지듯 정렬된다(FLIP). 사람 조작(클릭·Shift+클릭)
// 도 같은 applyOrder 를 타고, 자동 시연은 시드 고정 시나리오(CYCLE)로 같은 함수를 호출한다.
import { useEffect, useRef } from "react";
import styles from "./DragReorderList.module.scss";

export type DragReorderListProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Box<T> = { current: T };

const HINT = "드롭 직전·직후 좌표 차를 transform 으로 되돌렸다가 풀어 행들이 미끄러져 정렬됩니다";
const ARIA_LABEL = "재생목록";

const ROW_NAMES = ["아침 산책", "점심 라디오", "오후 집중", "저녁 재즈", "밤하늘"];
const LENS = ["3:12", "4:05", "5:48", "3:57", "4:31"];

type CycleStep = { pick: number; to: number; hold: number };
const CYCLE: CycleStep[] = [
  { pick: 2, to: 0, hold: 700 },
  { pick: 0, to: 3, hold: 700 },
  { pick: 0, to: 1, hold: 600 }
];

export default function DragReorderList({
  duration = "180ms",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#0a4fe8"
}: DragReorderListProps) {
  const listRef = useRef<HTMLUListElement | null>(null);
  const stateRef = useRef<HTMLElement | null>(null);
  const deltaRef = useRef<HTMLSpanElement | null>(null);
  const rafRef = useRef(0) as Box<number>;

  useEffect(() => {
    const list = listRef.current;
    const stateEl = stateRef.current;
    const deltaEl = deltaRef.current;
    if (!list || !stateEl || !deltaEl) return;

    const DUR = parseFloat(duration) || 180;

    function rows(): HTMLElement[] {
      return Array.prototype.slice.call(list!.children);
    }

    function applyOrder(order: number[]): HTMLElement[] {
      let rs = rows();
      const first = rs.map((r) => r.getBoundingClientRect().top);
      for (let i = 0; i < order.length; i++) list!.appendChild(rs[order[i]]);
      rs = rows();
      let maxAbs = 0;
      for (let j = 0; j < rs.length; j++) {
        const dy = first[order[j]] - rs[j].getBoundingClientRect().top;
        if (Math.abs(dy) > Math.abs(maxAbs)) maxAbs = dy;
        if (dy !== 0) {
          rs[j].style.transition = "none";
          rs[j].style.transform = "translateY(" + dy + "px)";
        }
      }
      deltaEl!.textContent = "dy " + Math.round(maxAbs) + "px";
      requestAnimationFrame(() => {
        rs.forEach((r) => {
          r.style.transition = "transform " + DUR + "ms " + easing;
          r.style.transform = "translateY(0)";
        });
        setTimeout(() => {
          rs.forEach((r) => { r.style.transition = ""; });
        }, DUR + 40);
      });
      rs.forEach((r, i) => {
        const rank = r.querySelector("." + styles.rank);
        if (rank) rank.textContent = String(i + 1);
      });
      return rs;
    }

    function stop(): void {
      playing = false;
    }

    function onClick(e: MouseEvent): void {
      stop();
      const target = e.target as HTMLElement;
      const li = target.closest("." + styles.row) as HTMLElement | null;
      if (!li) return;
      const idx = rows().indexOf(li);
      const order = [0, 1, 2, 3, 4];
      if (e.shiftKey) {
        if (idx === 0) return;
        order.splice(idx - 1, 0, order.splice(idx, 1)[0]);
      } else {
        if (idx === 4) return;
        order.splice(idx + 1, 0, order.splice(idx, 1)[0]);
      }
      applyOrder(order);
    }
    list.addEventListener("click", onClick as EventListener);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let playing = true;
    function permute(pick: number, to: number): void {
      const order = [0, 1, 2, 3, 4];
      order.splice(to, 0, order.splice(pick, 1)[0]);
      applyOrder(order);
    }

    if (reduce) {
      permute(2, 0);
    } else {
      let seg = 0;
      let segStart = performance.now();
      const step = (now: number): void => {
        if (playing) {
          const s = CYCLE[seg];
          if (now - segStart >= s.hold) {
            seg = (seg + 1) % CYCLE.length;
            segStart = now;
            permute(CYCLE[seg].pick, CYCLE[seg].to);
          }
        }
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      list.removeEventListener("click", onClick as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.fl}>
        <p className={styles.hint} id="flHintReact">{HINT}</p>
        <ul className={styles.list} ref={listRef} role="listbox" aria-label={ARIA_LABEL} aria-describedby="flHintReact">
          {ROW_NAMES.map((name, i) => (
            <li key={i} className={styles.row} role="option" aria-selected="false" tabIndex={0}>
              <span className={styles.rank} aria-hidden="true" style={{ background: color }}>{i + 1}</span>
              <span className={styles.name}>{name}</span>
              <span className={styles.len}>{LENS[i]}</span>
            </li>
          ))}
        </ul>
        <p className={styles.meta}>
          <b className={styles.tag} ref={stateRef}>FLIP {duration}</b>
          <span className={styles.unit} ref={deltaRef}>dy 0px</span>
        </p>
      </div>
    </main>
  );
}
