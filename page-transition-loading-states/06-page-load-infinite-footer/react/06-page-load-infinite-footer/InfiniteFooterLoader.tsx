import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./InfiniteFooterLoader.module.scss";

export type InfiniteFooterLoaderProps = {
  /** 처음부터 들어 있는 카드 이름들 */
  items?: string[];
  /** 새로 붙는 카드 이름 */
  nextLabel?: string;
  loaderLabel?: string;
  boxLabel?: string;
  groupLabel?: string;
  /** aria-live 로 읽히는 첫 안내 */
  startMessage?: string;
  /** 새 카드가 붙었을 때의 안내 */
  moreMessage?: string;
  /** 한 번에 붙는 장수 */
  step?: number;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 가 얇아 DOM 이벤트 제네릭을 못 쓴다 — 필요한 꼴만 로컬 타입으로 선언
type Box<T> = { current: T };
type ScrollBox = { scrollTop: number; scrollHeight: number; clientHeight: number };
type IoEntry = { isIntersecting: boolean };
type IoLike = { observe(el: unknown): void; disconnect(): void };
type IoCtor = new (cb: (e: IoEntry[]) => void, opt: { root: unknown; threshold: number }) => IoLike;

const DEFAULT_ITEMS = ["Today's log", "A short note", "Weekend plan", "The book I left", "Saved links", "Photo cleanup"];

export default function InfiniteFooterLoader({
  items = DEFAULT_ITEMS,
  nextLabel = "Just arrived",
  loaderLabel = "Fetching the next page",
  boxLabel = "Scrollable list",
  groupLabel = "Infinite scroll list",
  startMessage = "Showing 6 cards",
  moreMessage = "3 more cards arrived",
  step = 3,
  demo = true,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
}: InfiniteFooterLoaderProps) {
  const base = items.length;
  const [extra, setExtra] = useState(0);
  const [live, setLive] = useState(demo);
  const [msg, setMsg] = useState(startMessage);
  const boxRef = useRef<any>(null) as Box<any>;
  const loaderRef = useRef<any>(null) as Box<any>;

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 미리보기에서는 바닥(로더가 있는 쪽)부터 보여 준다
  useEffect(() => {
    const b: ScrollBox | null = boxRef.current;
    if (!live || !b) return;
    if (b.scrollHeight > b.clientHeight) b.scrollTop = b.scrollHeight;
  }, [live]);

  // 로더가 상자 안에 들어오면 다음 묶음을 붙인다. 미리보기 동안에는 관찰하지 않는다
  useEffect(() => {
    if (live) return;
    const box = boxRef.current;
    const target = loaderRef.current;
    if (!box || !target) return;
    const Ctor = IntersectionObserver as unknown as IoCtor;
    const io = new Ctor(
      (es: IoEntry[]) => {
        if (!es[0] || !es[0].isIntersecting) return;
        setExtra((n: number) => n + step);
        setMsg(moreMessage);
      },
      { root: box, threshold: 0.9 },
    );
    io.observe(target);
    return () => io.disconnect();
  }, [live]);

  function wake() {
    if (live) setLive(false);
  }

  const names: string[] = items.slice();
  for (let i = 0; i < extra; i++) names.push(nextLabel);

  const cls = [styles.inf, live ? styles.isDemo : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <div
        className={styles.box}
        ref={boxRef}
        tabIndex={0}
        aria-label={boxLabel}
        onWheel={wake}
        onPointerDown={wake}
        onKeyDown={wake}
        onTouchStart={wake}
      >
        <ol className={styles.list}>
          {names.map((name, i) => (
            <li
              className={i < base ? styles.card : styles.card + " " + styles.isIn}
              key={String(i)}
              style={i < base ? undefined : { animationDelay: `${((i - base) % step) * 90}ms` }}
            >
              <span className={styles.no}>{i + 1}</span>
              <span className={styles.t}>{name}</span>
            </li>
          ))}
        </ol>
        <div className={styles.loader} ref={loaderRef}>
          <span className={styles.pulse} aria-hidden="true" />
          <span className={styles.loaderT}>{loaderLabel}</span>
        </div>
      </div>
      <p className={styles.live} aria-live="polite">{msg}</p>
    </section>
  );
}
