// DragKeyboardAlt — vanilla 판(run/336/demo/06-drag-keyboard-alt/index.html)
// 의 React 포트. 포커스된 행에서 keydown 의 altKey && (ArrowUp|ArrowDown) 을 잡아 배열의
// 이웃 인덱스와 자리를 바꾼다. DOM 재배치는 FLIP 되돌림으로, 결과는 aria-live 영역에 알린다.
// 마우스 없는 사용자도 같은 handler 로 조작하므로 자동 시연도 이 함수를 그대로 부른다.
import { useEffect, useRef } from "react";
import styles from "./DragKeyboardAlt.module.scss";

export type DragKeyboardAltProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "Alt+화살표로 인덱스를 옮기고 그 결과를 화면 낭독 영역에 알립니다";
const HELP_TEXT = "Alt+↑↓ 로 행을 옮깁니다";
const ROW_TXT = ["메시지", "사진", "메모", "음악"];

export default function DragKeyboardAlt({
  duration = "220ms",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a"
}: DragKeyboardAltProps) {
  const listRef = useRef<HTMLUListElement | null>(null);
  const liveRef = useRef<HTMLElement | null>(null);
  const stateRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const list = listRef.current;
    const liveEl = liveRef.current;
    const stateEl = stateRef.current;
    if (!list || !liveEl || !stateEl) return;

    function rows(): HTMLElement[] {
      return Array.prototype.slice.call(list!.children);
    }

    function flipSwap(row: HTMLElement, dir: number): number {
      const arr = rows();
      const i = arr.indexOf(row);
      const j = i + dir;
      if (j < 0 || j >= arr.length) return i;
      const first = arr.map((r) => r.getBoundingClientRect());
      if (dir > 0) list!.insertBefore(arr[j], row);
      else list!.insertBefore(row, arr[j]);
      arr.forEach((r, k) => {
        const rr = r.getBoundingClientRect();
        const dy = first[k].top - rr.top;
        if (dy !== 0) {
          r.style.transition = "none";
          r.style.transform = "translateY(" + dy + "px)";
          requestAnimationFrame(() => {
            r.style.transition = "transform " + duration + " " + easing;
            r.style.transform = "translateY(0)";
          });
        }
      });
      return j;
    }

    function move(row: HTMLElement, dir: number): void {
      const j = flipSwap(row, dir);
      row.focus({ preventScroll: true });
      stateEl!.textContent = "행 재정렬";
      liveEl!.textContent = "move " + (j + 1) + "/" + rows().length;
    }

    function onKeydown(e: KeyboardEvent): void {
      if (!e.altKey) return;
      const row = (e.target as HTMLElement).closest("." + styles.row) as HTMLElement | null;
      if (!row) return;
      if (e.key === "ArrowUp") {
        stop();
        e.preventDefault();
        move(row, -1);
      } else if (e.key === "ArrowDown") {
        stop();
        e.preventDefault();
        move(row, 1);
      }
    }
    list.addEventListener("keydown", onKeydown as EventListener);

    let playing = true;
    function stop(): void {
      playing = false;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const timeouts: number[] = [];
    let intervalId = 0;

    function loopOnce(): void {
      const row = list!.children[1] as HTMLElement | undefined;
      if (!row) return;
      row.focus({ preventScroll: true });
      move(row, 1);
      timeouts.push(
        window.setTimeout(() => {
          const r2 = list!.children[2] as HTMLElement | undefined;
          if (r2) {
            r2.focus({ preventScroll: true });
            move(r2, -1);
          }
        }, 480)
      );
      timeouts.push(
        window.setTimeout(() => {
          const r3 = list!.children[1] as HTMLElement | undefined;
          if (r3) {
            r3.focus({ preventScroll: true });
            move(r3, 1);
          }
        }, 980)
      );
      timeouts.push(
        window.setTimeout(() => {
          const r4 = list!.children[2] as HTMLElement | undefined;
          if (r4) {
            r4.focus({ preventScroll: true });
            move(r4, -1);
          }
        }, 1480)
      );
    }

    if (reduce) {
      const r0 = list.children[1] as HTMLElement | undefined;
      if (r0) move(r0, 1);
    } else {
      loopOnce();
      intervalId = window.setInterval(() => {
        if (playing) loopOnce();
      }, 1500);
    }

    return () => {
      timeouts.forEach((t) => clearTimeout(t));
      if (intervalId) clearInterval(intervalId);
      list.removeEventListener("keydown", onKeydown as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.ka}>
        <p className={styles.hint}>{HINT}</p>
        <ul className={styles.list} ref={listRef} role="listbox" aria-orientation="vertical" aria-describedby="kaHelpReact">
          {ROW_TXT.map((txt, i) => (
            <li key={i} className={styles.row} role="option" tabIndex={0} aria-selected="false">
              <span>{txt}</span>
            </li>
          ))}
        </ul>
        <span id="kaHelpReact" className={styles.sr}>{HELP_TEXT}</span>
        <p className={styles.meta}>
          <b className={styles.state} ref={stateRef} style={{ color }}>행 재정렬</b>
          <span className={styles.unit}>{HELP_TEXT}</span>
        </p>
        <p className={styles.live} ref={liveRef} aria-live="polite"></p>
      </div>
    </main>
  );
}
