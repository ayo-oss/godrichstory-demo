// SearchAutocompleteGroupedStickyHeader — vanilla 판(run/335/demo/05-search-autocomplete-grouped-sticky-header/index.html)
// 의 React 포트. 각 그룹 헤더는 CSS position: sticky 로 붙는다. 계산 층은 다음 헤더가
// 현재 헤더를 밀어내기 직전 구간을 getBoundingClientRect 로 매 프레임 재서
// overlapRatio(0~1) 를 구하고, 그 값을 그림자 진하기로 환산해 시각적으로 앞당겨 보여준다.
import { useEffect, useRef } from "react";
import styles from "./SearchAutocompleteGroupedStickyHeader.module.scss";

export type SearchAutocompleteGroupedStickyHeaderProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "스크롤해도 지금 보는 그룹 이름이 위에 붙어 옵니다";
const LIST_LABEL = "그룹 목록";

const GROUPS: { label: string; items: string[] }[] = [
  { label: "제품", items: ["바나나", "파인애플", "수박", "자몽"] },
  { label: "브랜드", items: ["체리", "복숭아", "딸기"] },
  { label: "카테고리", items: ["아보카도", "망고", "파파야"] }
];

export default function SearchAutocompleteGroupedStickyHeader({
  duration = "300ms",
  easing = "ease-out",
  color = "#0a4fe8"
}: SearchAutocompleteGroupedStickyHeaderProps) {
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const heads = Array.prototype.slice.call(list.querySelectorAll<HTMLElement>("." + styles.head)) as HTMLElement[];

    function applyShadow(i: number, ratio: number): void {
      const head = heads[i];
      if (!head) return;
      const alpha = 0.1 + 0.28 * ratio;
      head.style.boxShadow = "0 6px 10px rgba(23,20,26," + alpha.toFixed(3) + ")";
      head.style.borderBottomColor = "rgba(23,20,26," + (0.08 + 0.4 * ratio).toFixed(3) + ")";
    }

    function measureStuck(): void {
      const listTop = list!.getBoundingClientRect().top;
      for (let i = 0; i < heads.length; i++) {
        const next = heads[i + 1];
        if (!next) {
          applyShadow(i, 0);
          continue;
        }
        const headH = heads[i].offsetHeight;
        const nextTop = next.getBoundingClientRect().top - listTop;
        let ratio = 1 - Math.min(1, Math.max(0, (nextTop - headH) / headH));
        ratio = Math.min(1, Math.max(0, ratio));
        applyShadow(i, ratio);
      }
    }
    measureStuck();

    let playing = true;
    function stop(): void {
      playing = false;
    }
    list.addEventListener("wheel", stop, { passive: true });
    list.addEventListener("pointerdown", stop);
    list.addEventListener("scroll", measureStuck, { passive: true });

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;

    if (!reduce) {
      const period = 2000;
      const start = performance.now();
      const tick = (now: number): void => {
        if (playing) {
          const t = (now - start) % period;
          const half = period / 2;
          const p = t < half ? t / half : (period - t) / half;
          const max = list!.scrollHeight - list!.clientHeight;
          list!.scrollTop = p * max;
          measureStuck();
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      list.removeEventListener("wheel", stop);
      list.removeEventListener("pointerdown", stop);
      list.removeEventListener("scroll", measureStuck);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.gh}>
        <p className={styles.hint}>{HINT}</p>
        <div
          className={styles.list}
          ref={listRef}
          role="listbox"
          aria-label={LIST_LABEL}
          tabIndex={0}
          style={{ transitionDuration: duration, transitionTimingFunction: easing, caretColor: color }}
        >
          {GROUPS.map((g, gi) => (
            <div className={styles.group} role="group" aria-label={g.label} key={g.label}>
              <div className={styles.head} id={"gh-head-react-" + gi}>
                {g.label}
              </div>
              <ul className={styles.rows}>
                {g.items.map((it) => (
                  <li className={styles.item} role="option" key={it}>
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
