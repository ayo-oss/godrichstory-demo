// SearchAutocompleteTypoSuggestDistance — vanilla 판(run/335/demo/06-search-autocomplete-typo-suggest-distance/index.html)
// 의 React 포트. 입력어와 후보 사이의 레벤슈타인 편집거리를 2차원 DP 표로 계산해
// 최소 거리 후보를 찾는다. 거리 0 이면 정확히 일치, 1~THRESHOLD 이면 "이것을
// 찾으셨나요?" 줄에 원래 단어를 제안한다.
import { useEffect, useRef } from "react";
import styles from "./SearchAutocompleteTypoSuggestDistance.module.scss";

export type SearchAutocompleteTypoSuggestDistanceProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "오타면 편집거리를 계산해 가장 가까운 단어를 제안합니다";
const ARIA_LABEL = "과일 검색";
const LIST_LABEL = "후보 목록";
const DID_YOU_MEAN = "이것을 찾으셨나요?";
const NO_MATCH = "일치하는 과일이 없습니다";

const WORDS = ["바나나", "파파야", "아보카도", "파인애플", "자몽", "체리", "복숭아", "수박", "딸기", "망고"];
const THRESHOLD = 2;

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = [];
  for (let i = 0; i <= m; i++) {
    dp.push([i]);
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function nearest(query: string): { word: string; dist: number } {
  const q = normalize(query);
  let best = "";
  let bestDist = Infinity;
  WORDS.forEach((w) => {
    const d = editDistance(q, normalize(w));
    if (d < bestDist) {
      bestDist = d;
      best = w;
    }
  });
  return { word: best, dist: bestDist };
}

const STEPS: { q: string; ms: number }[] = [
  { q: "", ms: 260 },
  { q: "바나나", ms: 420 },
  { q: "바다나", ms: 560 },
  { q: "", ms: 220 },
  { q: "수박", ms: 420 },
  { q: "슈박", ms: 560 }
];

export default function SearchAutocompleteTypoSuggestDistance({
  duration = "220ms",
  easing = "ease-out",
  color = "#0a4fe8"
}: SearchAutocompleteTypoSuggestDistanceProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    const field = fieldRef.current;
    const input = inputRef.current;
    const list = listRef.current;
    if (!field || !input || !list) return;

    function render(query: string): void {
      if (!query) {
        list!.innerHTML = WORDS.map((w) => '<li class="' + styles.item + '" role="option">' + w + "</li>").join("");
        field!.setAttribute("aria-expanded", "false");
        return;
      }
      const q = normalize(query);
      const exact = WORDS.filter((w) => normalize(w).indexOf(q) !== -1);
      let rows = "";
      if (exact.length) {
        rows = exact.map((w) => '<li class="' + styles.item + " " + styles.isExact + '" role="option">' + w + "</li>").join("");
      } else {
        const n = nearest(query);
        if (n.dist >= 1 && n.dist <= THRESHOLD) {
          const emph = (THRESHOLD - n.dist + 1) / THRESHOLD;
          const alpha = (0.08 + 0.14 * emph).toFixed(3);
          rows =
            '<li class="' + styles.item + " " + styles.itemTypo + '" role="option" aria-live="polite" style="--emph:' +
            emph.toFixed(2) + ";background:rgba(10,79,232," + alpha + ')">' +
            '<span class="' + styles.typoLabel + '">' + DID_YOU_MEAN + "</span>" +
            '<span class="' + styles.typoWord + '">' + n.word + "</span></li>";
        } else {
          rows = '<li class="' + styles.item + " " + styles.itemEmpty + '">' + NO_MATCH + "</li>";
        }
      }
      list!.innerHTML = rows;
      field!.setAttribute("aria-expanded", "true");
    }
    render("");

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let playing = true;
    function stop(): void {
      playing = false;
    }
    function onInput(): void {
      render(input!.value);
    }
    input.addEventListener("beforeinput", stop);
    input.addEventListener("input", onInput);
    input.addEventListener("pointerdown", stop);

    let raf = 0;

    if (reduce) {
      input.value = STEPS[2].q;
      render(STEPS[2].q);
    } else {
      let seg = 0;
      let segStart = performance.now();
      const step = (now: number): void => {
        if (playing) {
          const elapsed = now - segStart;
          if (elapsed >= STEPS[seg].ms) {
            seg = (seg + 1) % STEPS.length;
            segStart = now;
          }
          const q = STEPS[seg].q;
          if (input!.value !== q) {
            input!.value = q;
            render(q);
          }
        }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }

    return () => {
      cancelAnimationFrame(raf);
      input.removeEventListener("beforeinput", stop);
      input.removeEventListener("input", onInput);
      input.removeEventListener("pointerdown", stop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.ty}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.field} ref={fieldRef} role="combobox" aria-expanded="false" aria-owns="tyListReact" aria-haspopup="listbox">
          <input
            className={styles.input}
            ref={inputRef}
            type="text"
            role="searchbox"
            aria-autocomplete="list"
            aria-controls="tyListReact"
            aria-label={ARIA_LABEL}
            autoComplete="off"
            readOnly
            style={{ caretColor: color, transitionDuration: duration, transitionTimingFunction: easing }}
          />
        </div>
        <ul className={styles.list} id="tyListReact" ref={listRef} role="listbox" aria-label={LIST_LABEL} />
      </div>
    </main>
  );
}
