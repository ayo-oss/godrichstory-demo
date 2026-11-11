import { useEffect, useRef, useState, useCallback } from "react";
import type { ReactNode, CSSProperties } from "react";
import styles from "./SkeletonRowAppend.module.scss";

// 스켈레톤 행 이어붙이기 — skeletonCountFor() 가 실측 여백 높이 값을 행 높이 값으로 나눠
// 미리 보여줄 스켈레톤 행 개수를 다시 구한다. 도착하면 같은 자리에 실제 내용이 앉는다.
const ROW_H = 40;
const TITLES = ["아침 소식", "주간 인기", "추천 채널", "새 댓글", "읽던 글", "북마크"];
const LOAD_DELAY_MS = 680;
const MAX_BATCHES = 4;

export default function SkeletonRowAppend() {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLLIElement>(null);
  const [rows, setRows] = useState<string[]>([]);
  const [skeletons, setSkeletons] = useState<number>(0);
  const rowSeqRef = useRef(0);
  const batchesRef = useRef(0);
  const loadingRef = useRef(false);
  const dirRef = useRef(1);
  const autoplayRef = useRef<number | null>(null);

  const realRow = useCallback((n: number) => {
    return TITLES[n % TITLES.length] + " " + String(n + 1).padStart(2, "0");
  }, []);

  const fillInitial = useCallback(() => {
    const view = viewRef.current;
    if (!view) { return; }
    const need = Math.ceil(view.clientHeight / ROW_H);
    const start: string[] = [];
    for (let i = 0; i < need; i += 1) {
      start.push(realRow(rowSeqRef.current ?? 0));
      rowSeqRef.current = (rowSeqRef.current ?? 0) + 1;
    }
    setRows(start);
  }, [realRow]);

  // 계산 겹: 지금 남아 있는 화면 높이 값을 행 하나의 높이 값으로 나눠 미리 보여줄
  // 스켈레톤 행 개수를 구한다 — 화면이 클수록 더 많이 채운다.
  const skeletonCountFor = useCallback(() => {
    const view = viewRef.current;
    const sentinel = sentinelRef.current;
    if (!view || !sentinel) { return 2; }
    const remainingViewport = view.getBoundingClientRect().bottom - sentinel.getBoundingClientRect().top;
    const visible = Math.max(remainingViewport, view.clientHeight);
    return Math.max(2, Math.ceil(visible / ROW_H));
  }, []);

  const recompute = useCallback(() => {
    const view = viewRef.current;
    const sentinel = sentinelRef.current;
    if (!view || !sentinel) { return; }
    const remaining = sentinel.getBoundingClientRect().top - view.getBoundingClientRect().bottom;
    if (remaining <= 24 && !loadingRef.current && (batchesRef.current ?? 0) < MAX_BATCHES) {
      loadingRef.current = true;
      const count = skeletonCountFor();
      setSkeletons(count);
      window.setTimeout(() => {
        setRows((prev) => {
          const next = [...prev];
          for (let i = 0; i < count; i += 1) {
            next.push(realRow(rowSeqRef.current ?? 0));
            rowSeqRef.current = (rowSeqRef.current ?? 0) + 1;
          }
          return next;
        });
        setSkeletons(0);
        loadingRef.current = false;
        batchesRef.current = (batchesRef.current ?? 0) + 1;
      }, LOAD_DELAY_MS);
    }
  }, [realRow, skeletonCountFor]);

  useEffect(() => {
    fillInitial();
    const view = viewRef.current;
    if (!view) { return; }
    const onScroll = () => recompute();
    view.addEventListener("scroll", onScroll);
    const takeover = () => {
      rootRef.current?.classList.remove(styles["is-demo"]);
      if (autoplayRef.current !== null) { window.clearInterval(autoplayRef.current); }
    };
    view.addEventListener("wheel", takeover, { passive: true });
    view.addEventListener("touchstart", takeover, { passive: true });

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      autoplayRef.current = window.setInterval(() => {
        const v = viewRef.current;
        if (!v) { return; }
        const max = v.scrollHeight - v.clientHeight;
        if ((batchesRef.current ?? 0) >= MAX_BATCHES && v.scrollTop >= max - 1 && dirRef.current !== 0) {
          dirRef.current = 0;
          window.setTimeout(() => {
            rowSeqRef.current = 0;
            batchesRef.current = 0;
            fillInitial();
            v.scrollTop = 0;
            dirRef.current = 1;
          }, 600);
          return;
        }
        if (dirRef.current === 0) { return; }
        v.scrollTop = Math.min(v.scrollTop + 6, max);
        recompute();
      }, 60);
    }
    return () => {
      view.removeEventListener("scroll", onScroll);
      view.removeEventListener("wheel", takeover);
      view.removeEventListener("touchstart", takeover);
      if (autoplayRef.current !== null) { window.clearInterval(autoplayRef.current); }
    };
  }, [fillInitial, recompute]);

  const skeletonEls: ReactNode[] = [];
  return (
    <main className={styles.stage}>
      <div ref={rootRef} className={`${styles.sra} ${styles["is-demo"]}`} id="sra">
        <div ref={viewRef} className={styles["sra__view"]}>
          <ul className={styles["sra__track"]} aria-busy={skeletons > 0}>
            {rows.map((text, i) => (
              <li key={"r" + i} className={styles["sra__row"]}>{text}</li>
            ))}
            {Array.from({ length: skeletons }).map((_, i) => (
              <li
                key={"s" + i}
                className={`${styles["sra__row"]} ${styles["sra__row--skeleton"]}`}
                style={{ "--stagger": i } as CSSProperties}
              />
            ))}
            <li ref={sentinelRef} className={styles["sra__sentinel"]} aria-hidden="true" />
          </ul>
        </div>
      </div>
    </main>
  );
}
