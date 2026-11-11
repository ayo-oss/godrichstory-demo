import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./StatCountUpCard.module.scss";

export type StatCountUpCardProps = {
  duration?: number;
  easing?: string;
  color?: string;
  countMs?: number;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Triple = [number, number, number];
// useRef 는 항상 `T | null` 을 돌려주므로 값 보관용 상자는 널이 아닌 타입으로 좁혀 쓴다
type Box<T> = { current: T };

const BASE: Triple = [12480, 316, 48920];

function commas(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

const IconUserPlus = () => (
  <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true"><g fill="currentColor"><path d="M168 100a60 60 0 1 1-60-60a60 60 0 0 1 60 60" opacity=".2"/><path d="M256 136a8 8 0 0 1-8 8h-16v16a8 8 0 0 1-16 0v-16h-16a8 8 0 0 1 0-16h16v-16a8 8 0 0 1 16 0v16h16a8 8 0 0 1 8 8m-57.87 58.85a8 8 0 0 1-12.26 10.3C165.75 181.19 138.09 168 108 168s-57.75 13.19-77.87 37.15a8 8 0 0 1-12.25-10.3c14.94-17.78 33.52-30.41 54.17-37.17a68 68 0 1 1 71.9 0c20.65 6.76 39.23 19.39 54.18 37.17M108 152a52 52 0 1 0-52-52a52.06 52.06 0 0 0 52 52"/></g></svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true"><g fill="currentColor"><path d="M232 56v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16" opacity=".2"/><path d="m205.66 85.66l-96 96a8 8 0 0 1-11.32 0l-40-40a8 8 0 0 1 11.32-11.32L104 164.69l90.34-90.35a8 8 0 0 1 11.32 11.32"/></g></svg>
);

export default function StatCountUpCard({
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
  countMs = 1400,
}: StatCountUpCardProps) {
  const [shown, setShown] = useState<Triple>([0, 0, 0]);
  const [following, setFollowing] = useState(false);
  const shownRef = useRef<Triple>([0, 0, 0]) as Box<Triple>;
  const targetsRef = useRef<Triple>([...BASE] as Triple) as Box<Triple>;
  const rafRef = useRef(0) as Box<number>;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function count(to: Triple, ms: number): void {
    cancelAnimationFrame(rafRef.current);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      const done: Triple = [...to] as Triple;
      shownRef.current = done;
      setShown(done);
      return;
    }
    const from: Triple = [...shownRef.current] as Triple;
    const t0 = performance.now();
    const step = (now: number): void => {
      const p = Math.min(1, (now - t0) / ms);
      const next = [0, 0, 0] as Triple;
      for (let i = 0; i < 3; i += 1) {
        next[i] = Math.round(from[i] + (to[i] - from[i]) * easeOutCubic(p));
      }
      shownRef.current = next;
      setShown(next);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }

  useEffect((): (() => void) => {
    count([...BASE] as Triple, countMs);
    return (): void => cancelAnimationFrame(rafRef.current);
    // 마운트 시 1회 — 값은 BASE 로 고정
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onFollow(): void {
    const next = !following;
    setFollowing(next);
    targetsRef.current = [targetsRef.current[0] + (next ? 1 : -1), targetsRef.current[1], targetsRef.current[2]];
    count(targetsRef.current, 600);
  }

  return (
    <div className={styles.pc} style={vars}>
      <div className={styles.card}>
        <div className={styles.head}>
          <span className={styles.avatar} aria-hidden="true">TO</span>
          <span className={styles.id}>
            <span className={styles.name}>윤태오</span>
            <span className={styles.role}>데이터 분석가</span>
          </span>
        </div>
        <div className={styles.stats} aria-live="polite">
          <div className={styles.stat}>
            <span className={styles.num}>{commas(shown[0])}</span>
            <span className={styles.label}>팔로워</span>
            <span className={styles.bar}><i aria-hidden="true" /></span>
          </div>
          <div className={styles.stat}>
            <span className={styles.num}>{commas(shown[1])}</span>
            <span className={styles.label}>게시물</span>
            <span className={styles.bar}><i aria-hidden="true" /></span>
          </div>
          <div className={styles.stat}>
            <span className={styles.num}>{commas(shown[2])}</span>
            <span className={styles.label}>좋아요</span>
            <span className={styles.bar}><i aria-hidden="true" /></span>
          </div>
        </div>
        <button
          type="button"
          className={following ? `${styles.btn} ${styles.isOn}` : styles.btn}
          aria-pressed={following}
          onClick={onFollow}
        >
          <span className={styles.fOff}><IconUserPlus />팔로우</span>
          <span className={styles.fOn}><IconCheck />팔로잉</span>
        </button>
      </div>
    </div>
  );
}
