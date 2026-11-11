// NestedIndentRailMarker — vanilla 판(run/373/demo/07-list-style-nested-indent-rail/index.html) 의 React 포트.
// ::marker 는 transform(scaleY) 을 지원하지 않아 레일을 늘일 수 없다 — 중첩 <ul> 자체에 ::before 레일을 붙이고
// 깊이 값과 공개 깊이의 비교식으로 레일 전체를 한 번에 갱신한다.
import { useEffect, useRef } from "react";
import styles from "./NestedIndentRailMarker.module.scss";

type Box<T> = { current: T };

const STEP_MS = 750; // 자동 루프에서 깊이 한 단계를 더 보이는 간격

export default function NestedIndentRailMarker() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const treeRef = useRef(null) as unknown as Box<HTMLUListElement>;
  const buttonRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const MAX_DEPTH = 2;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const root = rootRef.current;
    const tree = treeRef.current;
    const button = buttonRef.current;
    if (!root || !tree || !button) return;

    const rails = Array.prototype.slice.call(tree.querySelectorAll("." + (styles.rail || "rail")));
    let isDemo = true;
    let revealed = 0;

    // 계산 겹: 레일 각각의 표시 여부는 "지금 공개된 깊이 ≥ 이 레일의 깊이" 라는 비교식의 결과다.
    // 값 하나(revealed)가 바뀌면 그보다 얕은 레일은 전부 즉시 갱신된다 — 레일마다 별도 타이머가 아니다.
    function apply() {
      tree!.style.setProperty("--revealed", String(revealed));
      rails.forEach(function (rail: HTMLElement) {
        const d = parseInt(rail.getAttribute("data-depth") || "1", 10);
        rail.classList.toggle("is-open", revealed >= d);
      });
      button!.setAttribute("aria-expanded", String(revealed >= MAX_DEPTH));
    }

    function human() { if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; } }

    function step() {
      revealed = (revealed + 1) % (MAX_DEPTH + 1);
      apply();
    }

    function onClick() { human(); step(); }
    button.addEventListener("click", onClick);

    let last = 0;
    function loop(ts: number) {
      if (!last) last = ts;
      if (isDemo) {
        if (reduce) {
          revealed = MAX_DEPTH; // 계산은 유지, 시간 축소 대신 완전히 펼쳐진 상태로 즉시 고정
          apply();
        } else if (ts - last >= STEP_MS) {
          last = ts;
          step();
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    apply();

    return () => {
      button.removeEventListener("click", onClick);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef}>
        <ul className={styles.tree} ref={treeRef}>
          <li>사이트맵
            <ul className={styles.rail} data-depth="1">
              <li>제품
                <ul className={styles.rail} data-depth="2">
                  <li>가격 안내</li>
                  <li>도입 사례</li>
                </ul>
              </li>
              <li>고객지원</li>
            </ul>
          </li>
          <li>회사 소개</li>
        </ul>
        <button className={styles.reveal} ref={buttonRef} type="button" aria-expanded="false">깊이 한 단계 더 보기</button>
      </div>
    </main>
  );
}
