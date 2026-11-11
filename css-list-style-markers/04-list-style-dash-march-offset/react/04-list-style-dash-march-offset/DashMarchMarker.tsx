// DashMarchMarker — vanilla 판(run/373/demo/04-list-style-dash-march-offset/index.html) 의 React 포트.
// ::marker 는 transform(rotate)·테두리를 지원하지 않아 링 마커를 그릴 수 없다 — 실제 span 링으로 마커를 대신하고
// 오프셋 각도를 시간 적분해 대시가 원을 따라 흐르게 만든다.
import { useEffect, useRef } from "react";
import styles from "./DashMarchMarker.module.scss";

type Box<T> = { current: T };

const MARCH_RATE_DEG_S = 140; // 초당 회전 각도 — 대시가 흐르는 속도

const QUEUES = ["영상 인코딩 대기", "썸네일 생성 대기", "자막 정렬 대기"];

export default function DashMarchMarker() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const listRef = useRef(null) as unknown as Box<HTMLUListElement>;
  const buttonRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const root = rootRef.current;
    const list = listRef.current;
    const button = buttonRef.current;
    if (!root || !list || !button) return;

    const markers = Array.prototype.slice.call(list.querySelectorAll("li")).map(function (li: HTMLElement) {
      const m = document.createElement("span");
      m.className = styles.ring;
      m.setAttribute("aria-hidden", "true");
      li.insertBefore(m, li.firstChild);
      return m;
    });
    let isDemo = true;
    let running = true;

    // 계산 겹: 오프셋 각도는 시간에 정속(MARCH_RATE_DEG_S)으로 누적된다. 대시 테두리를 이 각도만큼 계속
    // 회전시키면 점선이 원을 따라 "흐르는" 것처럼 보인다 — 단일 keyframe 반복이 아니라 시간 적분값이다.
    function apply(offsetDeg: number) {
      markers.forEach(function (m: HTMLElement) { m.style.setProperty("--offset", (offsetDeg % 360) + "deg"); });
    }

    function human() { if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; } }

    function onClick() {
      human();
      running = !running;
      button!.setAttribute("aria-pressed", String(!running));
      button!.textContent = running ? "행진 멈추기" : "행진 다시 시작";
    }
    button.addEventListener("click", onClick);

    let last = 0;
    let acc = 0;
    function loop(ts: number) {
      if (!last) last = ts;
      const dt = ts - last;
      last = ts;
      if (reduce) {
        apply(90); // 계산은 유지, 시간 축소 대신 4분의1 회전 지점으로 즉시 고정 (자동 루프·실사용 공통)
      } else if (running) {
        acc += dt / 1000 * MARCH_RATE_DEG_S;
        apply(acc);
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    apply(0);

    return () => {
      button.removeEventListener("click", onClick);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef}>
        <ul className={styles.queueList} ref={listRef}>
          {QUEUES.map(function (q) { return <li key={q}>{q}</li>; })}
        </ul>
        <button className={styles.toggle} ref={buttonRef} type="button" aria-pressed="false">행진 멈추기</button>
      </div>
    </main>
  );
}
