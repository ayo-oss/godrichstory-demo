// PhaseWaveMarker — vanilla 판(run/373/demo/03-list-style-marker-wave-phase/index.html) 의 React 포트.
// ::marker 는 transform(translateY) 을 지원하지 않아 물결을 만들 수 없다 — list-style:none 으로 지우고
// ::before 로 대체한 불릿에 커스텀 프로퍼티 --y 를 실어 사인 위상차로 세로로 흔든다.
import { useEffect, useRef } from "react";
import styles from "./PhaseWaveMarker.module.scss";

type Box<T> = { current: T };

const WAVE_PHASE_DEG = 40; // 인접 항목 사이 위상 간격 — 변형 03 목표: 40 → 80
const AMPLITUDE_PX = 6; // 물결 진폭 상한(px)
const SPEEDS = [1, 2, 0.5]; // 속도 프리셋 — 버튼으로 순환한다 (Math.random 금지, 결정적 배열)

const TRACKS = ["트랙 01 · 새벽 산책", "트랙 02 · 창가 자리", "트랙 03 · 늦은 우산", "트랙 04 · 첫눈", "트랙 05 · 정거장"];

export default function PhaseWaveMarker() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const listRef = useRef(null) as unknown as Box<HTMLUListElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const root = rootRef.current;
    const list = listRef.current;
    if (!root || !list) return;

    const items = Array.prototype.slice.call(list.querySelectorAll("li"));
    const PHASE_RAD = (WAVE_PHASE_DEG * Math.PI) / 180;
    let speedIdx = 0;
    let isDemo = true;

    // 계산 겹: 항목 i 의 불릿 위치는 sin(t * speed + i * phase) 로 계산한다 — 같은 시각에 항목마다 위상이 달라
    // 줄 전체가 하나의 파동으로 보인다. CSS transition 이 아니라 프레임마다 계산되는 값이다.
    function apply(t: number) {
      items.forEach(function (el: HTMLElement, i: number) {
        const y = AMPLITUDE_PX * Math.sin(t * SPEEDS[speedIdx] + i * PHASE_RAD);
        el.style.setProperty("--y", y.toFixed(2) + "px");
      });
    }

    function human() { if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; } }

    function onClick() {
      human();
      speedIdx = (speedIdx + 1) % SPEEDS.length;
    }
    root!.addEventListener("click", onClick);

    let last = 0;
    function loop(ts: number) {
      if (!last) last = ts;
      if (isDemo && !reduce) apply((ts - last) / 1000);
      else if (reduce) apply(1.57); // 계산은 유지, 시간 축소 대신 파도 꼭대기 위상(π/2) 으로 즉시 고정
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
        <ul className={styles.waveList} ref={listRef}>
          {TRACKS.map(function (t) { return <li key={t}>{t}</li>; })}
        </ul>
        <button className={styles.speed} type="button">물결 속도 전환</button>
      </div>
    </main>
  );
}
