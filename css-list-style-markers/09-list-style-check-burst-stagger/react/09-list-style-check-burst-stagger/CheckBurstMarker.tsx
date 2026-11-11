// CheckBurstMarker — vanilla 판(run/373/demo/09-list-style-check-burst-stagger/index.html) 의 React 포트.
// ::marker 는 animation·자식 막대를 지원하지 않아 체크가 터지는 마커를 그릴 수 없다 — list-style:none 으로 지우고
// ::before·::after 막대 체크를 얹되, 항목마다 지연 값(i * DELAY_STEP_MS)을 누적해 연쇄 터진다.
import { useEffect, useRef } from "react";
import styles from "./CheckBurstMarker.module.scss";

type Box<T> = { current: T };

const DELAY_STEP_MS = 110; // 항목 사이 누적 지연 — 값이 커질수록 파동이 느리게 번진다
const CYCLE_MS = 950; // 자동 루프에서 연쇄를 다시 터뜨리는 주기

const STEPS = ["계약서 확인", "결제 정보 등록", "배송지 입력", "최종 제출"];

export default function CheckBurstMarker() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const listRef = useRef(null) as unknown as Box<HTMLUListElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const root = rootRef.current;
    const list = listRef.current;
    if (!root || !list) return;

    const items = Array.prototype.slice.call(list.querySelectorAll("li"));
    let isDemo = true;

    // 계산 겹: 항목 i 가 터지는 시각은 지연 값을 i 번 누적한 값(i * DELAY_STEP_MS)이다 — CSS 변수로 실어
    // animation-delay 에 그대로 쓴다. 자바스크립트는 트리거 한 번(클래스 토글)만 하고 연쇄는 CSS 가 계산한다.
    items.forEach(function (li: HTMLElement, i: number) {
      li.style.setProperty("--delay", (i * DELAY_STEP_MS) + "ms");
    });

    function human() { if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; } }

    function burst() {
      list!.classList.remove("is-bursting");
      // reflow 를 강제해 같은 클래스를 다시 걸어도 애니메이션이 재시작되게 한다
      void list!.offsetWidth;
      list!.classList.add("is-bursting");
    }

    function onClick() { human(); burst(); }
    root!.addEventListener("click", onClick);

    let last = 0;
    function loop(ts: number) {
      if (!last) { last = ts; if (isDemo && !reduce) burst(); }
      if (isDemo) {
        if (reduce) {
          list!.classList.add("is-bursting"); // 계산은 유지, 시간 축소 대신 완료 상태로 즉시 고정
        } else if (ts - last >= CYCLE_MS) {
          last = ts;
          burst();
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      root!.removeEventListener("click", onClick);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef}>
        <ul className={styles.doneList} ref={listRef}>
          {STEPS.map(function (s, i) { return <li key={s} style={{ ["--i" as string]: String(i) } as Record<string, string>}>{s}</li>; })}
        </ul>
        <button className={styles.submit} type="button">전체 제출</button>
      </div>
    </main>
  );
}
