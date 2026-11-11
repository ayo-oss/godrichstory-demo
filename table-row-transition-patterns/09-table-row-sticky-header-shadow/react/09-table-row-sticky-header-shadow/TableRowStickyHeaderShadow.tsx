import { useEffect, useRef } from "react";
import styles from "./TableRowStickyHeaderShadow.module.scss";

type Box<T> = { current: T };

export default function TableRowStickyHeaderShadow() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;
  const viewportRef = useRef(null) as unknown as Box<HTMLDivElement | null>;
  const headRef = useRef(null) as unknown as Box<HTMLTableSectionElement | null>;
  const bodyRef = useRef(null) as unknown as Box<HTMLTableSectionElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    const viewport = viewportRef.current;
    const head = headRef.current;
    const body = bodyRef.current;
    if (!root || !viewport || !head || !body) return;

    // 상수: 표시할 행 수 · 그림자 보간 속도 · 자동 스크롤 속도(px/초)
    const N_ROWS = 10;
    const LERP = 0.18;
    const AUTO_SPEED = 46;

    const names: string[] = [];
    for (let ni = 1; ni <= N_ROWS; ni++) names.push("작업 " + ni);
    for (let i = 0; i < N_ROWS; i++) {
      const tr = document.createElement("tr");
      const tdName = document.createElement("td");
      tdName.className = styles.td;
      tdName.textContent = names[i];
      const tdVal = document.createElement("td");
      tdVal.className = `${styles.td} ${styles.tdNum}`;
      tdVal.textContent = String(((i * 7) % 12 + 2) * 10);
      tr.appendChild(tdName);
      tr.appendChild(tdVal);
      body!.appendChild(tr);
    }

    let shadow = 0; // 그림자 값(0~1) — 스크롤 위치에 반응해 보간된다
    let maxScroll = 1;

    function measure() {
      maxScroll = Math.max(1, viewport!.scrollHeight - viewport!.clientHeight);
    }
    measure();

    // 계산 겹: 스크롤 위치 값(scrollTop / maxScroll)에서 0.18~0.5 구간만 걸러 머리글 고정 값(pin)을
    // 만들고, 그 값으로 그림자 번짐·내림을 매 프레임 남은 거리의 18%씩 보간한다
    function tick() {
      measure();
      const ratio = viewport!.scrollTop / maxScroll;
      const pinTarget = ratio < 0.18 ? 0 : ratio > 0.5 ? 1 : (ratio - 0.18) / 0.32;
      shadow += (pinTarget - shadow) * LERP;
      const blur = (shadow * 14).toFixed(1);
      const drop = (shadow * 6).toFixed(1);
      const alpha = (shadow * 0.5).toFixed(2);
      head!.style.boxShadow = "0 " + drop + "px " + blur + "px rgba(10, 15, 30, " + alpha + ")";
      head!.style.backgroundColor = "rgba(35, 31, 40, " + (0.94 + shadow * 0.06).toFixed(2) + ")";
      rafId = requestAnimationFrame(tick);
    }
    let rafId = requestAnimationFrame(tick);

    // 자동 루프가 viewport.scrollTop 을 바꿀 때도 scroll 이벤트는 발생한다(비동기 디스패치).
    // 자동 스크롤 프레임마다 가드 스탬프(autoUntil)를 찍고, 이벤트가 그 짧은 창 안에서 오면
    // 무시한다 — 사용자 스크롤만 is-demo 를 끊는다
    let autoUntil = 0;
    function onScroll() {
      if (performance.now() < autoUntil) return;
      root!.classList.remove(styles["is-demo"]);
    }
    viewport!.addEventListener("scroll", onScroll);

    // 자동 루프: 사용자가 손을 대기 전까지 왕복 스크롤로 고정→해제를 반복한다
    let dir = 1;
    let lastT = performance.now();
    function autoTick(now: number) {
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      if (root!.classList.contains(styles["is-demo"])) {
        autoUntil = now + 80;
        viewport!.scrollTop += AUTO_SPEED * dt * dir;
        if (viewport!.scrollTop >= maxScroll - 1) dir = -1;
        if (viewport!.scrollTop <= 1) dir = 1;
      }
      rafId = requestAnimationFrame(autoTick);
    }
    rafId = requestAnimationFrame(autoTick);

    return () => {
      cancelAnimationFrame(rafId);
      viewport!.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className={styles.stage}>
      <div ref={rootRef} className={`${styles.tss} ${styles["is-demo"]}`}>
        <div ref={viewportRef} className={styles.viewport}>
          <table className={styles.table}>
            <thead ref={headRef} className={styles.head}>
              <tr>
                <th className={styles.th}>항목</th>
                <th className={`${styles.th} ${styles.thNum}`}>수치</th>
              </tr>
            </thead>
            <tbody ref={bodyRef} />
          </table>
        </div>
        <p className={styles.hint}>마우스 휠이나 터치로 스크롤해 보세요</p>
      </div>
    </div>
  );
}
