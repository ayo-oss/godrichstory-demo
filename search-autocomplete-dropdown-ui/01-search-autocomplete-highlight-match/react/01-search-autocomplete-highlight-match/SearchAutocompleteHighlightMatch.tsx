// SearchAutocompleteHighlightMatch — vanilla 판(run/335/demo/01-search-autocomplete-highlight-match/index.html)
// 의 React 포트. indexOf 로 입력어의 첫 일치 위치를 찾아 <mark> 로 감싸고, 그 뒤부터 다시
// 찾아 모든 일치를 강조한다(다중 일치). 비교는 toLowerCase 로 통일해 대소문자를 무시한다.
// CSS @keyframes 는 없다 — 자동 시연은 performance.now() 시계로 타이핑 시퀀스를 재생한다.
import { useEffect, useRef } from "react";
import styles from "./SearchAutocompleteHighlightMatch.module.scss";

export type SearchAutocompleteHighlightMatchProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Box<T> = { current: T };

const HINT = "입력한 글자가 후보 어디에 있는지 찾아 굵게 칠합니다";
const ARIA_LABEL = "과일 검색";
const ARIA_LIST_LABEL = "후보 목록";

const WORDS = ["바나나", "파파야", "아보카도", "파인애플", "자몽", "체리", "복숭아", "수박"];

type Step = { q: string; ms: number };
const STEPS: Step[] = [
  { q: "", ms: 220 },
  { q: "파", ms: 360 },
  { q: "파야", ms: 520 },
  { q: "파야", ms: 260 },
  { q: "", ms: 220 },
  { q: "수", ms: 360 },
  { q: "수박", ms: 520 }
];

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
}

function highlightAll(text: string, query: string): string {
  if (!query) return escapeHtml(text);
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let out = "";
  let i = 0;
  while (i < text.length) {
    const idx = lowerText.indexOf(lowerQuery, i);
    if (idx === -1) {
      out += escapeHtml(text.slice(i));
      break;
    }
    out += escapeHtml(text.slice(i, idx));
    out += '<mark class="' + styles.mark + '">' + escapeHtml(text.slice(idx, idx + query.length)) + "</mark>";
    i = idx + query.length;
  }
  return out;
}

export default function SearchAutocompleteHighlightMatch({
  duration = "220ms",
  easing = "ease-out",
  color = "#0a4fe8"
}: SearchAutocompleteHighlightMatchProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const rafRef = useRef(0) as Box<number>;

  useEffect(() => {
    const field = fieldRef.current;
    const input = inputRef.current;
    const list = listRef.current;
    if (!field || !input || !list) return;

    function render(query: string): void {
      const rows = WORDS.map((w) => {
        const hit = query !== "" && w.toLowerCase().indexOf(query.toLowerCase()) !== -1;
        return '<li class="' + styles.item + (hit ? " " + styles.isHit : "") + '" role="option">' + highlightAll(w, query) + "</li>";
      });
      list!.innerHTML = rows.join("");
      field!.setAttribute("aria-expanded", query ? "true" : "false");
    }
    render("");

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let playing = true;
    function stop(): void {
      playing = false;
    }
    function onUserInput(): void {
      stop();
      render(input!.value);
    }
    input.addEventListener("input", onUserInput);
    input.addEventListener("keydown", stop);
    input.addEventListener("pointerdown", stop);

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
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      input.removeEventListener("input", onUserInput);
      input.removeEventListener("keydown", stop);
      input.removeEventListener("pointerdown", stop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.hl}>
        <p className={styles.hint}>{HINT}</p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="combobox"
          aria-expanded="false"
          aria-owns="hlListReact"
          aria-haspopup="listbox"
        >
          <svg className={styles.ic} viewBox="0 0 256 256" aria-hidden="true">
            <g fill="currentColor">
              <path d="M192 112a80 80 0 1 1-80-80a80 80 0 0 1 80 80" opacity=".2" />
              <path d="m229.66 218.34l-50.06-50.06a88.21 88.21 0 1 0-11.32 11.31l50.06 50.07a8 8 0 0 0 11.32-11.32M40 112a72 72 0 1 1 72 72a72.08 72.08 0 0 1-72-72" />
            </g>
          </svg>
          <input
            className={styles.input}
            ref={inputRef}
            type="text"
            role="searchbox"
            aria-autocomplete="list"
            aria-controls="hlListReact"
            aria-label={ARIA_LABEL}
            autoComplete="off"
            style={{ caretColor: color, transitionDuration: duration, transitionTimingFunction: easing }}
          />
        </div>
        <ul className={styles.list} id="hlListReact" ref={listRef} role="listbox" aria-label={ARIA_LIST_LABEL} />
      </div>
    </main>
  );
}
