// CardShuffleSort — vanilla 판(run/080/demo/04-card-shuffle-sort/index.html) 의 React 포트.
// 카드의 렌더 순서는 고정이고 상태로 드는 것은 슬롯 번호 배열 하나뿐이다.
// 슬롯 번호가 인라인 --slot 으로 내려가 CSS 가 translate 로 풀고 transition 이 자리를 이어 준다(FLIP 방식).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CardShuffleSort.module.scss";

export type CardShuffleSortProps = {
  duration?: number;
  easing?: string;
  accentColor?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type SlotVars = CSSProperties & { "--slot"?: string };
type KeyEvt = { key: string; preventDefault(): void };
type TimerBox = { current: number };

const MOVE_MS = 600;
const VALUES = [1, 2, 3, 4, 5, 6];
const TITLE = "카드 셔플·정렬";
const SORTED = "순서대로";
const SHUFFLED = "뒤섞임";
const SHUFFLE_LABEL = "셔플";
const SORT_LABEL = "정렬";

function shuffled(prev: number[]): number[] {
  const next = prev.slice();
  for (let i = next.length - 1; i > 0; i--) {          // Fisher-Yates
    const j = Math.floor(Math.random() * (i + 1));
    const t = next[i]; next[i] = next[j]; next[j] = t;
  }
  if (next.join("") === prev.join("")) {
    const h = next[0]; next[0] = next[5]; next[5] = h;
  }
  return next;
}

export default function CardShuffleSort({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  accentColor = "#0a4fe8",
}: CardShuffleSortProps) {
  const [slots, setSlots] = useState<number[]>([0, 1, 2, 3, 4, 5]);
  const [state, setState] = useState<string>(SORTED);
  const [demo, setDemo] = useState(true);
  const [moving, setMoving] = useState(false);
  const movingRef = useRef(false) as { current: boolean };
  const timerRef = useRef(0) as TimerBox;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": accentColor };

  useEffect(() => {
    return () => { window.clearTimeout(timerRef.current); };
  }, []);

  function lock() {
    movingRef.current = true;
    setMoving(true);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => { movingRef.current = false; setMoving(false); }, MOVE_MS);
  }
  function onShuffle() {
    if (movingRef.current) { return; }
    setDemo(false);
    setSlots((prev) => shuffled(prev));
    setState(SHUFFLED);
    lock();
  }
  function onSort() {
    if (movingRef.current) { return; }
    setDemo(false);
    setSlots([0, 1, 2, 3, 4, 5]);
    setState(SORTED);
    lock();
  }

  useEffect(() => {
    function onKey(e: KeyEvt) {
      const k = (e.key || "").toLowerCase();
      if (k === "s") { e.preventDefault(); onShuffle(); }
      if (k === "r") { e.preventDefault(); onSort(); }
    }
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); };
  });

  const cls = [styles.root, demo ? styles.isDemo : "", moving ? styles.isMoving : ""].filter(Boolean).join(" ");

  return (
    <main className={styles.stage}>
      <section className={cls} style={vars}>
        <header className={styles.bar}>
          <p className={styles.title}>{TITLE}</p>
          <p className={styles.state} role="status">{state}</p>
        </header>
        <div className={styles.rail} role="list">
          {VALUES.map((v, i) => {
            const slotVars: SlotVars = { "--slot": String(slots[i]) };
            return (
              <span
                key={v}
                className={styles.card}
                role="listitem"
                data-value={v}
                data-slot={slots[i]}
                style={slotVars}
              >
                {v}
              </span>
            );
          })}
        </div>
        <div className={styles.acts}>
          <button className={styles.btn} type="button" aria-keyshortcuts="S" onClick={onShuffle}>
            {SHUFFLE_LABEL}<kbd className={styles.kbd}>S</kbd>
          </button>
          <button className={`${styles.btn} ${styles.btnGhost}`} type="button" aria-keyshortcuts="R" onClick={onSort}>
            {SORT_LABEL}<kbd className={styles.kbd}>R</kbd>
          </button>
        </div>
      </section>
    </main>
  );
}
