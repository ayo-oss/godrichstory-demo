// DialRotateMarker — vanilla 판(run/373/demo/01-list-style-marker-dial-rotate/index.html) 의 React 포트.
// ::marker 는 transform(rotate) 을 지원하지 않아 list-style:none 으로 지우고 ::before(다이얼 원판)·
// ::after(바늘) 로 마커를 다시 그린다. 바늘 각도는 turns[i] * DIAL_STEP_DEG * (i+1) 로 항목 번호에 비례해 쌓인다.
import { useEffect, useRef } from "react";
import styles from "./DialRotateMarker.module.scss";

type Box<T> = { current: T };

const DIAL_STEP_DEG = 30; // 클릭 한 번이 바늘에 더하는 각도 — 변형 01 목표: 30 → 15
const STEP_MS = 480; // 자동 루프에서 한 단계 전진하는 간격

const STEPS = ["설계 검토", "시안 제작", "내부 검수", "고객 확인", "배포 완료"];

export default function DialRotateMarker() {
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

    // 계산 겹: 항목 i 의 바늘 각도는 그 항목이 지금까지 지나온 횟수(turns[i]) 에 자기 번호(i+1) 를 곱해 쌓인다.
    // 뒤 항목일수록 같은 한 번의 전진에도 더 큰 각도를 받는다 — 단순 지연이 아니라 번호에 비례한 누적이다.
    let turns = items.map(function () { return 0; });

    function render() {
      items.forEach(function (el: HTMLElement, i: number) {
        const deg = turns[i] * DIAL_STEP_DEG * (i + 1);
        el.style.setProperty("--angle", (deg % 360) + "deg");
      });
    }

    function human() { if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; } }

    let active = 0;
    function advance() {
      turns[active] += 1;
      items[active].classList.add("is-active");
      setTimeout(function () { items[active] && items[active].classList.remove("is-active"); }, 260);
      active = (active + 1) % items.length;
      render();
    }

    function onClick() { human(); advance(); }
    root!.addEventListener("click", onClick);

    let last = 0;
    function loop(ts: number) {
      if (!last) last = ts;
      if (isDemo) {
        if (reduce) {
          turns = items.map(function (_: HTMLElement, i: number) { return i + 1; }); // 계산은 유지, 종료 상태로 즉시 고정
          render();
        } else if (ts - last >= STEP_MS) {
          last = ts;
          advance();
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
        <ol className={styles.dialList} ref={listRef}>
          {STEPS.map(function (s, i) { return <li key={s} style={{ ["--i" as string]: String(i) } as Record<string, string>}>{s}</li>; })}
        </ol>
        <button className={styles.advance} type="button">다음 단계로 바늘 돌리기</button>
      </div>
    </main>
  );
}
