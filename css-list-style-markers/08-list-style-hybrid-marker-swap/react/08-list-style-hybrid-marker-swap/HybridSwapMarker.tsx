// HybridSwapMarker — vanilla 판(run/373/demo/08-list-style-hybrid-marker-swap/index.html) 의 React 포트.
// ::marker 는 자식·box-shadow 를 가질 수 없어 점·다이아·체크 모양 마커를 그릴 수 없다 — 실제 <button class="marker">
// 로 마커 자리를 대신하고, 상태마다 크기와 두께를 면적 보존 식으로 함께 바꾼다.
import { useEffect, useRef } from "react";
import styles from "./HybridSwapMarker.module.scss";

type Box<T> = { current: T };

const BASE_AREA = 400; // 마커 기준 면적(px^2) — 두께는 면적/지름 으로 역산해 커질수록 얇아진다
const SIZE_BY_STATE = [14, 20, 24]; // 대기(점) < 진행(다이아) < 완료(체크) 지름
const STATES = ["대기 중", "진행 중", "완료"];
const STEP_MS = 700; // 자동 루프에서 다음 행의 상태를 넘기는 간격

const TASKS = [
  { label: "디자인 시안 승인", state: 0 },
  { label: "배너 애니메이션 제작", state: 1 },
  { label: "문구 교정", state: 2 },
];

export default function HybridSwapMarker() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const listRef = useRef(null) as unknown as Box<HTMLUListElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const root = rootRef.current;
    const list = listRef.current;
    if (!root || !list) return;

    const rows = Array.prototype.slice.call(list.querySelectorAll("li"));
    let isDemo = true;

    // 계산 겹: 두께는 "면적 보존" 식(BASE_AREA / size)으로 역산한다 — 커지는 마커일수록 선이 얇아져
    // 시각적 무게가 서로 비슷하게 맞물린다. 임의의 고정 두께 3종을 나열한 것이 아니다.
    function thicknessFor(size: number) {
      return Math.max(1.5, BASE_AREA / (size * size) * 3);
    }

    function apply(li: HTMLElement) {
      const state = parseInt(li.getAttribute("data-state") || "0", 10);
      const btn = li.querySelector("." + (styles.marker || "marker")) as HTMLElement | null;
      if (!btn) return;
      const size = SIZE_BY_STATE[state];
      const thick = thicknessFor(size);
      btn.style.setProperty("--size", size + "px");
      btn.style.setProperty("--thick", thick.toFixed(2) + "px");
      btn.className = (styles.marker || "marker") + " state-" + state;
      btn.setAttribute("aria-label", "상태 전환: " + STATES[state]);
      btn.textContent = STATES[state];
    }

    function human() { if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; } }

    function advance(li: HTMLElement) {
      const state = (parseInt(li.getAttribute("data-state") || "0", 10) + 1) % 3;
      li.setAttribute("data-state", String(state));
      apply(li);
    }

    rows.forEach(function (li: HTMLElement) {
      const btn = li.querySelector("." + (styles.marker || "marker"));
      const onClick = function () {
        human();
        advance(li);
      };
      btn!.addEventListener("click", onClick);
      apply(li);
    });

    let last = 0;
    let cursor = 0;
    function loop(ts: number) {
      if (!last) last = ts;
      if (isDemo) {
        if (reduce) {
          rows.forEach(function (li: HTMLElement, i: number) { li.setAttribute("data-state", String(i % 3)); apply(li); }); // 계산은 유지, 시간 축소 대신 서로 다른 상태로 즉시 고정
        } else if (ts - last >= STEP_MS) {
          last = ts;
          advance(rows[cursor]);
          cursor = (cursor + 1) % rows.length;
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef}>
        <ul className={styles.taskList} ref={listRef}>
          {TASKS.map(function (t) {
            return (
              <li key={t.label} data-state={t.state}>
                <button className={styles.marker} type="button" aria-label={"상태 전환: " + STATES[t.state]}>{STATES[t.state]}</button>
                <span className={styles.label}>{t.label}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
