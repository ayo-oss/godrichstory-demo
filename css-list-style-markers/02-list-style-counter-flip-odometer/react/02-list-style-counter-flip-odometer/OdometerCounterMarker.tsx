// OdometerCounterMarker — vanilla 판(run/373/demo/02-list-style-counter-flip-odometer/index.html) 의 React 포트.
// 카운터 값을 10 의 거듭제곱으로 나눠 자릿수로 분해하고, 각 자릿수 칸이 서로 다른 전환 속도로 굴러간다.
// 네이티브 ::marker 는 자식을 가질 수 없어 세로 스트립을 담지 못하므로 실제 DOM 요소로 마커 자리를 대신한다.
import { useEffect, useRef } from "react";
import styles from "./OdometerCounterMarker.module.scss";

type Box<T> = { current: T };

const ODO_DIGITS = 2; // 자릿수 — 변형 02 목표: 2 → 3
const DIGIT_H = 18; // 숫자 스트립 한 칸 높이(px)
const STEP_MS = 620; // 자동 루프에서 1위 값을 올리는 간격

const ROWS = [
  { label: "코드 리뷰 챌린지", value: 8 },
  { label: "주간 배포 노트", value: 24 },
  { label: "신규 컴포넌트", value: 61 },
];

export default function OdometerCounterMarker() {
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

    // 계산 겹: 카운터 값을 10 의 거듭제곱으로 나눠 자릿수로 분해한다. 각 자릿수 칸은 서로 다른 전환 속도를 가져
    // 낮은 자리부터 먼저 자리를 잡고(빠름) 높은 자리가 뒤따른다(느림) — 단순 opacity 페이드가 아니라 자릿수별 롤링.
    function setDigits(odo: Element, value: number) {
      const strips = odo.querySelectorAll("." + (styles.odoStrip || "odo-strip"));
      for (let d = 0; d < ODO_DIGITS; d++) {
        const place = Math.pow(10, ODO_DIGITS - 1 - d);
        const digit = Math.floor(value / place) % 10;
        (strips[d] as HTMLElement).style.transform = "translateY(" + (-digit * DIGIT_H) + "px)";
      }
    }

    function speedClass() {
      items.forEach(function (li: HTMLElement) {
        const odo = li.querySelector("." + (styles.odo || "odo"));
        if (!odo) return;
        const strips = odo.querySelectorAll("." + (styles.odoStrip || "odo-strip"));
        Array.prototype.forEach.call(strips, function (s: HTMLElement, d: number) {
          // d=0(가장 왼쪽=가장 높은 자리)이 가장 느리고, 오른쪽(낮은 자리)일수록 빠르다
          const ms = 260 + d * 220;
          s.style.transitionDuration = ms + "ms";
        });
      });
    }

    let values = ROWS.map(function (r) { return r.value; });
    function render() {
      items.forEach(function (li: HTMLElement, i: number) {
        const odo = li.querySelector("." + (styles.odo || "odo"));
        if (odo) setDigits(odo, values[i] % Math.pow(10, ODO_DIGITS));
      });
    }

    function human() { if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; } }

    function bump() {
      values[0] = (values[0] + 7) % Math.pow(10, ODO_DIGITS);
      render();
    }

    function onClick() { human(); bump(); }
    root!.addEventListener("click", onClick);

    speedClass();

    let last = 0;
    function loop(ts: number) {
      if (!last) last = ts;
      if (isDemo) {
        if (reduce) {
          values = [42, 97, 5]; // 계산은 유지, 시간 축소 대신 굴러간 결과 상태로 즉시 고정
          render();
        } else if (ts - last >= STEP_MS) {
          last = ts;
          bump();
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    render();

    return () => {
      root!.removeEventListener("click", onClick);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef}>
        <ol className={styles.rankList} ref={listRef}>
          {ROWS.map(function (r) {
            return (
              <li key={r.label}>
                <span className={styles.odo} aria-hidden="true">
                  {Array.from({ length: ODO_DIGITS }).map(function (_, d) {
                    return (
                      <span className={styles.odoCol} key={d}>
                        <span className={styles.odoStrip}>
                          {Array.from({ length: 10 }).map(function (_, n) {
                            return <span className={styles.odoDigit} key={n}>{String(n)}</span>;
                          })}
                        </span>
                      </span>
                    );
                  })}
                </span>
                {r.label}
              </li>
            );
          })}
        </ol>
        <button className={styles.bump} type="button">1위 순위 올리기</button>
      </div>
    </main>
  );
}
