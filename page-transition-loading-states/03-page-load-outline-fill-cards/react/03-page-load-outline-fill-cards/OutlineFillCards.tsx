import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./OutlineFillCards.module.scss";

export type OutlineFillCardsProps = {
  /** 목록 항목 — 점선 빈 칸이 먼저 자리를 잡고 한 칸씩 늦게 채워진다 */
  items?: string[];
  title?: string;
  reloadLabel?: string;
  groupLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 가 얇아 useRef 가 T | null 을 돌려준다 — 필요한 꼴만 로컬 타입으로 단언
type Box<T> = { current: T };

const DEFAULT_ITEMS = ["A weekend walking route", "Ten minute dinners", "Desk tidying tools"];
const GAP = 240;

export default function OutlineFillCards({
  items = DEFAULT_ITEMS,
  title = "Today's picks",
  reloadLabel = "Reload",
  groupLabel = "List fill-in preview",
  demo = true,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: OutlineFillCardsProps) {
  const [live, setLive] = useState(demo);
  const [loading, setLoading] = useState(false);
  const [filled, setFilled] = useState(items.length);
  const timers = useRef<number[]>([]) as Box<number[]>;

  useEffect(() => () => {
    for (const t of timers.current) clearTimeout(t);
  }, []);

  function reload() {
    setLive(false);
    for (const t of timers.current) clearTimeout(t);
    setLoading(true);
    setFilled(0);
    const next: number[] = [];
    items.forEach((_, k) => {
      next.push(window.setTimeout(() => {
        setFilled(k + 1);
        if (k !== items.length - 1) return;
        // 다 차면 기다림이 끝난다
        setLoading(false);
      }, GAP * (k + 1)));
    });
    timers.current = next;
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = [styles.of, live ? styles.isDemo : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <header className={styles.bar}>
        <p className={styles.title}>{title}</p>
        <button className={styles.again} type="button" onClick={reload}>{reloadLabel}</button>
      </header>
      <ul className={styles.list} aria-busy={loading}>
        {items.map((name, i) => (
          <li className={styles.slot} key={name}>
            <span className={styles.ghost} aria-hidden="true" />
            <article className={[styles.card, loading && i >= filled ? styles.isOut : ""].filter(Boolean).join(" ")}>
              <span className={styles.no}>{String(i + 1).padStart(2, "0")}</span>
              <span className={styles.name}>{name}</span>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
