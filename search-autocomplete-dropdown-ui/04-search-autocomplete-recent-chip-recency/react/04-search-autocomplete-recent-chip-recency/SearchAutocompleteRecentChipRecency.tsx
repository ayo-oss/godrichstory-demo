// SearchAutocompleteRecentChipRecency — vanilla 판(run/335/demo/04-search-autocomplete-recent-chip-recency/index.html)
// 의 React 포트. {q, ts} 를 저장해 두고 열 때마다 now-ts 를 분·시간·일 버킷으로 다시
// 계산해 상대 시각 라벨을 만든다. 중복 검색어는 ts 만 now 로 갱신해 맨 앞으로 옮기고
// (FLIP), 칩을 지우면 남은 칩들이 옛 위치→새 위치 델타만큼 트윈으로 좁혀진다.
import { useEffect, useRef } from "react";
import styles from "./SearchAutocompleteRecentChipRecency.module.scss";

export type SearchAutocompleteRecentChipRecencyProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Item = { q: string; ts: number };

const HINT = "최근 검색은 저장된 시각을 다시 계산해 보여줍니다";
const ARIA_LABEL = "최근 검색";
const DELETE_LABEL = "삭제";
const STORE_KEY = "rc-recent-demo-react";

const MIN = 60000;
const HOUR = 3600000;
const DAY = 86400000;

const ICON_CLOCK =
  '<svg viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2"/><path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24m0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88m64-88a8 8 0 0 1-8 8h-56a8 8 0 0 1-8-8V72a8 8 0 0 1 16 0v48h48a8 8 0 0 1 8 8"/></g></svg>';
const ICON_X =
  '<svg viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M216 56v144a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" opacity=".2"/><path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128L50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z"/></g></svg>';

function label(delta: number): string {
  if (delta < MIN) return "방금";
  if (delta < HOUR) return Math.floor(delta / MIN) + "분 전";
  if (delta < DAY) return Math.floor(delta / HOUR) + "시간 전";
  return Math.floor(delta / DAY) + "일 전";
}

function seedItems(): Item[] {
  const now = Date.now();
  return [
    { q: "바나나", ts: now - 45 * 1000 },
    { q: "수박", ts: now - 40 * MIN },
    { q: "파인애플", ts: now - 12 * MIN },
    { q: "자몽", ts: now - 3 * HOUR },
    { q: "체리", ts: now - 2 * DAY }
  ];
}

function loadItems(): Item[] {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return seedItems();
    const parsed = JSON.parse(raw) as Item[];
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch (e) {
    /* 저장소 접근 불가 시 시드로 대체 */
  }
  return seedItems();
}

export default function SearchAutocompleteRecentChipRecency({
  duration = "600ms",
  easing = "ease-out",
  color = "#0a4fe8"
}: SearchAutocompleteRecentChipRecencyProps) {
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    let items = loadItems();

    function saveItems(): void {
      try {
        window.localStorage.setItem(STORE_KEY, JSON.stringify(items));
      } catch (e) {
        /* 무시 */
      }
    }

    function render(): void {
      const nowTick = Date.now();
      list!.innerHTML = items
        .map(
          (it, i) =>
            '<li class="' + styles.chip + '" data-i="' + i + '"><span class="' + styles.q + '">' + it.q +
            '</span><span class="' + styles.time + '">' + label(nowTick - it.ts) + '</span>' +
            '<button class="' + styles.del + '" type="button" data-i="' + i + '" aria-label="' + DELETE_LABEL + '">' +
            '<span class="' + styles.delic + '">' + ICON_X + "</span></button></li>"
        )
        .join("");
    }
    render();

    function measure(): Record<string, DOMRect> {
      const m: Record<string, DOMRect> = {};
      list!.querySelectorAll<HTMLElement>("." + styles.chip).forEach((el) => {
        const i = el.getAttribute("data-i");
        if (i) m[i] = el.getBoundingClientRect();
      });
      return m;
    }

    function flip(before: Record<string, DOMRect>): void {
      const chips = list!.querySelectorAll<HTMLElement>("." + styles.chip);
      chips.forEach((el) => {
        const i = el.getAttribute("data-i") || "";
        const b = before[i];
        if (!b) {
          el.style.transform = "scale(.6)";
          el.style.opacity = "0";
        } else {
          const a = el.getBoundingClientRect();
          const dx = b.left - a.left;
          const dy = b.top - a.top;
          if (dx || dy) {
            el.style.transition = "none";
            el.style.transform = "translate(" + dx + "px," + dy + "px)";
            el.getBoundingClientRect();
          }
        }
        requestAnimationFrame(() => {
          el.style.transition = "";
          el.style.transform = "";
          el.style.opacity = "";
        });
      });
    }

    function bump(q: string): void {
      const before = measure();
      const idx = items.findIndex((it) => it.q === q);
      if (idx === -1) return;
      items[idx].ts = Date.now();
      const moved = items.splice(idx, 1)[0];
      items.unshift(moved);
      saveItems();
      render();
      flip(before);
      const frontEl = list!.querySelector<HTMLElement>('.' + styles.chip + '[data-i="0"]');
      if (frontEl) {
        frontEl.classList.add(styles.chipFlash);
        setTimeout(() => frontEl.classList.remove(styles.chipFlash), 480);
      }
    }

    function removeAt(q: string): void {
      const before = measure();
      items = items.filter((it) => it.q !== q);
      saveItems();
      render();
      flip(before);
    }

    let playing = true;
    function stop(): void {
      playing = false;
    }
    function onClick(e: MouseEvent): void {
      const target = e.target as HTMLElement;
      const btn = target.closest ? (target.closest("." + styles.del) as HTMLElement | null) : null;
      if (!btn) return;
      stop();
      const i = Number(btn.getAttribute("data-i"));
      const it = items[i];
      if (it) removeAt(it.q);
    }
    function onPointerDown(e: PointerEvent): void {
      const target = e.target as HTMLElement;
      if (!target.closest || !target.closest("." + styles.del)) stop();
    }
    list.addEventListener("click", onClick);
    list.addEventListener("pointerdown", onPointerDown);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: number[] = [];

    if (!reduce) {
      timers.push(window.setTimeout(() => { if (playing) bump("수박"); }, 300));
      timers.push(window.setTimeout(() => { if (playing) removeAt("체리"); }, 1000));
      timers.push(
        window.setTimeout(() => {
          if (!playing) return;
          items = seedItems();
          saveItems();
          render();
        }, 1750)
      );
    }

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      list.removeEventListener("click", onClick);
      list.removeEventListener("pointerdown", onPointerDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.rc}>
        <p className={styles.hint}>
          <span className={styles.ic} dangerouslySetInnerHTML={{ __html: ICON_CLOCK }} />
          {HINT}
        </p>
        <ul
          className={styles.list}
          ref={listRef}
          aria-label={ARIA_LABEL}
          style={{ transitionDuration: duration, transitionTimingFunction: easing, caretColor: color }}
        />
      </div>
    </main>
  );
}
