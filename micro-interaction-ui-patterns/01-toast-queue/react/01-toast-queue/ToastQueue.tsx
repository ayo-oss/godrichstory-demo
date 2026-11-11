import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ToastQueue.module.scss";

// 토스트 알림 큐 — 쌓인 순서 값(order)으로 소멸 시점을 다시 계산한다.
// 계산 겹: order * STACK_STEP_MS 만큼 뒤로 갈수록 더 오래 떠 있는다. 실사용 클릭 리스너 있음.
const MESSAGES = ["저장되었습니다", "전송 완료", "변경 사항 반영됨", "동기화 완료"];
const STACK_STEP_MS = 900;
const BASE_MS = 1500;
const MAX_ROWS = 3;

type Item = { id: number; text: string; out: boolean };

export default function ToastQueue() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const seqRef = useRef(0);
  const timersRef = useRef<{ [id: number]: number }>({});
  const autoplayRef = useRef<number | null>(null);
  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;

  function remove(id: number) {
    const timers = timersRef.current ?? {};
    window.clearTimeout(timers[id]);
    delete timers[id];
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, out: true } : it)));
    window.setTimeout(() => {
      setItems((prev) => prev.filter((it) => it.id !== id));
    }, 240);
  }

  function add() {
    const id = seqRef.current ?? 0;
    const text = MESSAGES[id % MESSAGES.length];
    seqRef.current = id + 1;
    setItems((prev) => {
      const next = [...prev, { id, text, out: false }];
      if (next.length > MAX_ROWS) {
        const first = next[0];
        window.setTimeout(() => remove(first.id), 0);
      }
      return next;
    });
    const order = (itemsRef.current ?? []).filter((it) => !it.out).length;
    const dismissAfter = BASE_MS + order * STACK_STEP_MS;
    const timers = timersRef.current ?? {};
    timers[id] = window.setTimeout(() => remove(id), dismissAfter);
  }

  function stopAutoplay() {
    if (autoplayRef.current) {
      window.clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  }

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      autoplayRef.current = window.setInterval(add, 620);
      add();
    }
    return () => {
      stopAutoplay();
      const timers = timersRef.current ?? {};
      Object.keys(timers).forEach((k) => window.clearTimeout(timers[Number(k)]));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onAddClick() {
    rootRef.current?.classList.remove(styles["is-demo"]);
    stopAutoplay();
    add();
  }

  return (
    <main className={styles.stage}>
      <div ref={rootRef} className={`${styles.tq} ${styles["is-demo"]}`} id="tq">
        <button className={styles.tq__add} type="button" onClick={onAddClick}>알림 추가</button>
        <ul className={styles.tq__list} aria-live="polite">
          {items.map((it, i) => (
            <li
              key={it.id}
              className={`${styles.tq__row} ${it.out ? styles["tq__row--out"] : ""}`}
              style={{ "--i": i } as CSSProperties}
              onClick={() => {
                rootRef.current?.classList.remove(styles["is-demo"]);
                stopAutoplay();
                remove(it.id);
              }}
            >
              <span className={styles.tq__dot} />
              <span className={styles.tq__text}>{it.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
