// PrimeGlowMarker — vanilla 판(run/373/demo/05-list-style-number-prime-glow/index.html) 의 React 포트.
// ::marker 는 box-shadow(글로우)·animation 을 지원하지 않는다(color·content·font 뿐) — counter() 값을
// ::before 콘텐츠로 다시 그려 그 위에 글로우를 건다. 소수 판정은 매번 직접 계산한다.
import { useEffect, useRef } from "react";
import styles from "./PrimeGlowMarker.module.scss";

type Box<T> = { current: T };

const STEP_MS = 900; // 자동 루프에서 시작 번호를 한 칸 옮기는 간격

const LESSONS = ["변수와 타입", "조건과 반복", "함수와 스코프", "배열과 객체", "비동기 처리", "모듈 시스템", "테스트 작성"];

export default function PrimeGlowMarker() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const listRef = useRef(null) as unknown as Box<HTMLOListElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const root = rootRef.current;
    const list = listRef.current;
    if (!root || !list) return;

    const items = Array.prototype.slice.call(list.querySelectorAll("li"));
    let isDemo = true;
    let start = 1;

    // 계산 겹: 각 항목 번호에 소수 판정을 직접 계산한다 — 미리 정해둔 목록이 아니라 실행마다 다시 돈다.
    function isPrime(n: number) {
      if (n < 2) return false;
      for (let d = 2; d * d <= n; d++) {
        if (n % d === 0) return false;
      }
      return true;
    }

    function recompute() {
      list!.setAttribute("start", String(start));
      items.forEach(function (li: HTMLElement, i: number) {
        const n = start + i;
        li.classList.toggle("is-prime", isPrime(n));
      });
    }

    function human() { if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; } }

    function onClick() {
      human();
      start += 1;
      recompute();
    }
    root!.addEventListener("click", onClick);

    let last = 0;
    function loop(ts: number) {
      if (!last) last = ts;
      if (isDemo && !reduce && ts - last >= STEP_MS) {
        last = ts;
        start += 1;
        recompute();
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    recompute();

    return () => {
      root!.removeEventListener("click", onClick);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef}>
        <ol className={styles.primeList} ref={listRef} start={1}>
          {LESSONS.map(function (l) { return <li key={l}>{l}</li>; })}
        </ol>
        <button className={styles.shift} type="button">시작 번호 한 칸 이동</button>
      </div>
    </main>
  );
}
