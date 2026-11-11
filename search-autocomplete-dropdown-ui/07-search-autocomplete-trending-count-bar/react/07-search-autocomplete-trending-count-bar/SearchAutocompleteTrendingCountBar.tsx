// SearchAutocompleteTrendingCountBar — vanilla 판(run/335/demo/07-search-autocomplete-trending-count-bar/index.html)
// 의 React 포트. count 를 목록 안 최댓값으로 나눈 ratio 를 transform: scaleX(ratio) 로
// 막대 길이에 맵핑한다. 순위 변동은 prevRank-currRank 부호로 오름/내림/변동없음
// 화살표를 고른다. 스태거는 transition-delay 를 index 마다 다르게 주고, .is-demo 를
// 매 루프 뗐다 다시 붙여 트랜지션을 재발동한다.
import { useEffect, useRef } from "react";
import styles from "./SearchAutocompleteTrendingCountBar.module.scss";

export type SearchAutocompleteTrendingCountBarProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "검색 횟수를 최댓값 대비 비율로 나눠 막대 길이를 그립니다";
const LIST_LABEL = "인기 검색어";

type Row = { q: string; count: number; prevRank: number };

const DATA: Row[] = [
  { q: "수박", count: 145, prevRank: 1 },
  { q: "바나나", count: 128, prevRank: 3 },
  { q: "파인애플", count: 96, prevRank: 2 },
  { q: "체리", count: 82, prevRank: 4 },
  { q: "자몽", count: 54, prevRank: 5 }
];

const ICON_UP =
  '<svg class="' + "trDeltaIc" + '" viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M232 88v64a8 8 0 0 1-16 0v-44.7l-79.4 79.4a8 8 0 0 1-11.3 0L96 157.3l-68.7 68.7a8 8 0 0 1-11.3-11.3l74-74a8 8 0 0 1 11.3 0L131 170.3l73.7-73.7H180a8 8 0 0 1 0-16h44a8 8 0 0 1 8 7.4Z" opacity=".2"/><path d="m226.83 82.83l-96 96a8 8 0 0 1-11.32 0L88 147.31l-68.83 68.84a8 8 0 0 1-11.32-11.32l72-72a8 8 0 0 1 11.32 0L122 164.69l89.66-89.69a8 8 0 0 1 11.31 0a8 8 0 0 1 0 11.31Z"/></g></svg>';
const ICON_DOWN =
  '<svg class="' + "trDeltaIc" + '" viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M232 128v64h-64Z" opacity=".2"/><path d="M235.06 120.61a8 8 0 0 1-1.19 9.19l-96 96a8 8 0 0 1-11.32 0L88 187.31l-68.83 68.84a8 8 0 0 1-11.32-11.32l72-72a8 8 0 0 1 11.32 0L133 214.69l89.66-89.69a8 8 0 0 1 12.4-4.39ZM128 32a8 8 0 0 0-8 8v128a8 8 0 0 0 16 0V40a8 8 0 0 0-8-8" opacity="0"/><path d="m235.66 90.34l-72 72a8 8 0 0 1-11.32 0L122 132.69l-89.66 89.65a8 8 0 0 1-11.32-11.32l96-96a8 8 0 0 1 11.32 0L158 145.31l68.34-68.35a8 8 0 0 1 11.32 11.38Z"/></g></svg>';
const ICON_FLAT =
  '<svg class="' + "trDeltaIc" + '" viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M216 56v144a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" opacity=".2"/><path d="M228 128a12 12 0 0 1-12 12H40a12 12 0 0 1 0-24h176a12 12 0 0 1 12 12"/></g></svg>';

function deltaIcon(prevRank: number, currRank: number): string {
  if (prevRank > currRank) return ICON_UP;
  if (prevRank < currRank) return ICON_DOWN;
  return ICON_FLAT;
}

const max = DATA.reduce((m, d) => Math.max(m, d.count), 0);
const ranked = DATA.slice().sort((a, b) => b.count - a.count);

export default function SearchAutocompleteTrendingCountBar({
  duration = "600ms",
  easing = "ease-out",
  color = "#0a4fe8"
}: SearchAutocompleteTrendingCountBarProps) {
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    function render(): void {
      const rows = ranked.map((d, i) => {
        const currRank = i + 1;
        const ratio = d.count / max;
        return (
          '<li class="' + styles.row + '" role="option" style="--i:' + i + '">' +
          '<span class="' + styles.rank + '">' + currRank + "</span>" +
          '<span class="' + styles.q + '">' + d.q + "</span>" +
          '<span class="' + styles.delta + '">' + deltaIcon(d.prevRank, currRank).replace('class="trDeltaIc"', 'class="' + styles.deltaIc + '"') + "</span>" +
          '<span class="' + styles.track + '"><span class="' + styles.bar + '" style="--ratio:' + ratio.toFixed(3) + '"></span></span>' +
          '<span class="' + styles.count + '">' + d.count + "</span></li>"
        );
      });
      list!.innerHTML = rows.join("");
    }
    render();

    let playing = true;
    function stop(): void {
      playing = false;
      list!.classList.remove(styles.isDemo);
    }
    list.addEventListener("pointerdown", stop);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let interval = 0;
    let raf1 = 0;
    let raf2 = 0;

    if (!reduce) {
      const period = 2000;
      const loopOn = (): void => {
        if (!playing) return;
        list!.classList.remove(styles.isDemo);
        raf1 = requestAnimationFrame(() => {
          raf2 = requestAnimationFrame(() => {
            if (playing) list!.classList.add(styles.isDemo);
          });
        });
      };
      loopOn();
      interval = window.setInterval(loopOn, period);
    } else {
      list.classList.add(styles.isDemo);
    }

    return () => {
      window.clearInterval(interval);
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      list.removeEventListener("pointerdown", stop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.tr}>
        <p className={styles.hint}>{HINT}</p>
        <ul
          className={styles.list}
          ref={listRef}
          role="listbox"
          aria-label={LIST_LABEL}
          style={{ transitionDuration: duration, transitionTimingFunction: easing, caretColor: color }}
        />
      </div>
    </main>
  );
}
