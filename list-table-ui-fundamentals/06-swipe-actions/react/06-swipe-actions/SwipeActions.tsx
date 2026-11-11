// SwipeActions — vanilla 판(run/381/demo/06-swipe-actions/index.html)의 React 포트.
// 손을 뗄 때의 속도(velocity = 이동거리/경과시간)가 임계값을 넘으면 멈춘 위치와 무관하게
// 속도의 방향이 열림/닫힘을 결정한다 — 짧고 빠른 스와이프도 인식하는 실제 동작이다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./SwipeActions.module.scss";

export type SwipeActionsProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const LABELS = ["받은편지함 안내 1", "받은편지함 안내 2", "받은편지함 안내 3"];

export default function SwipeActions({
  duration = "220ms", // vanilla $duration: $dur-quick
  easing = "cubic-bezier(.2, .8, .2, 1)", // vanilla $easing: $ease-spring
  color = "#c2361a", // vanilla $color: $error
}: SwipeActionsProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const list = root.querySelector<HTMLUListElement>('[data-role="list"]');
    if (!list) return;
    const rows = Array.prototype.slice.call(list.querySelectorAll("[data-row]")) as HTMLLIElement[];

    const ACTION_WIDTH = 72; // 열렸을 때 드러나는 버튼 폭
    const VELOCITY_OPEN_THRESHOLD = 0.5; // px/ms — 이 속도를 넘기면 위치와 무관하게 방향이 결정된다
    const AUTO_CYCLE_MS = 2000;

    function clamp(v: number, lo: number, hi: number): number {
      return Math.min(hi, Math.max(lo, v));
    }

    function human(): void {
      if (root!.classList.contains("is-demo")) {
        root!.classList.remove("is-demo");
        if (timer) {
          window.clearInterval(timer);
          timer = null;
        }
      }
    }

    type RowApi = { open: (animate?: boolean) => void; close: (animate?: boolean) => void };
    const rowApis: RowApi[] = [];
    const cleanups: (() => void)[] = [];

    rows.forEach((row, idx) => {
      const content = row.querySelector<HTMLDivElement>('[data-role="content"]')!;
      const delBtn = row.querySelector<HTMLButtonElement>("[data-del]")!;

      let dragging = false;
      let startX = 0;
      let baseX = 0;
      let lastX = 0;
      let lastT = 0;
      let velocity = 0;

      function setX(x: number, animate: boolean): void {
        content.style.setProperty("--swipe-x", x.toFixed(1) + "px");
        content.classList.toggle("is-dragging", !animate);
      }

      function currentX(): number {
        const v = content.style.getPropertyValue("--swipe-x");
        return v ? parseFloat(v) : 0;
      }

      function openRow(animate?: boolean): void {
        setX(-ACTION_WIDTH, animate !== false);
        delBtn.tabIndex = 0;
      }
      function closeRow(animate?: boolean): void {
        setX(0, animate !== false);
        delBtn.tabIndex = -1;
      }
      closeRow(false);
      delBtn.tabIndex = -1;

      const rowApi: RowApi = { open: openRow, close: closeRow };
      rowApis.push(rowApi);

      function onPointerDown(e: PointerEvent): void {
        human();
        rowApis.forEach((api, otherIdx) => {
          if (otherIdx !== idx) api.close(true);
        });
        dragging = true;
        startX = e.clientX;
        baseX = currentX();
        lastX = e.clientX;
        lastT = performance.now();
        velocity = 0;
        content.setPointerCapture(e.pointerId);
      }
      function onPointerMove(e: PointerEvent): void {
        if (!dragging) return;
        const now = performance.now();
        const dt = Math.max(now - lastT, 1);
        velocity = (e.clientX - lastX) / dt; // px/ms, 음수 = 왼쪽으로 밀리는 중
        lastX = e.clientX;
        lastT = now;
        const raw = baseX + (e.clientX - startX);
        setX(clamp(raw, -ACTION_WIDTH, 0), false);
      }
      function onPointerUp(): void {
        if (!dragging) return;
        dragging = false;
        // 계산 겹: 손을 뗄 때의 속도가 임계값을 넘으면, 멈춘 위치와 무관하게
        // 속도의 방향이 열림/닫힘을 결정한다. 느리면 위치 절반 기준으로 결정한다.
        let openDecision: boolean;
        if (velocity < -VELOCITY_OPEN_THRESHOLD) {
          openDecision = true;
        } else if (velocity > VELOCITY_OPEN_THRESHOLD) {
          openDecision = false;
        } else {
          openDecision = currentX() < -ACTION_WIDTH / 2;
        }
        if (openDecision) openRow();
        else closeRow();
      }
      content.addEventListener("pointerdown", onPointerDown);
      content.addEventListener("pointermove", onPointerMove);
      content.addEventListener("pointerup", onPointerUp);

      function onDelClick(): void {
        human();
        row.classList.add("is-deleted");
      }
      delBtn.addEventListener("click", onDelClick);

      cleanups.push(() => {
        content.removeEventListener("pointerdown", onPointerDown);
        content.removeEventListener("pointermove", onPointerMove);
        content.removeEventListener("pointerup", onPointerUp);
        delBtn.removeEventListener("click", onDelClick);
      });
    });

    let timer: number | null = null;
    let start = 0;

    // 계산 겹: 2초 주기를 네 구간(진입 35%·유지 30%·복귀 20%·대기 15%)의 조각 선형 함수로 나눠
    // 첫 행이 실제 드래그처럼 열렸다 닫히는 것을 자동 재생으로 보여준다.
    function autoApply(): void {
      const elapsed = performance.now() - start;
      const phase = (elapsed % AUTO_CYCLE_MS) / AUTO_CYCLE_MS;
      let x: number;
      if (phase < 0.35) {
        x = -ACTION_WIDTH * (phase / 0.35);
      } else if (phase < 0.65) {
        x = -ACTION_WIDTH;
      } else if (phase < 0.85) {
        x = -ACTION_WIDTH * (1 - (phase - 0.65) / 0.2);
      } else {
        x = 0;
      }
      const content = rows[0]?.querySelector<HTMLDivElement>('[data-role="content"]');
      if (!content) return;
      content.classList.add("is-dragging");
      content.style.setProperty("--swipe-x", x.toFixed(1) + "px");
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      start = performance.now();
      timer = window.setInterval(autoApply, 40);
    }
    // reduce: 실사용 경로 적용 — 자동 스와이프 루프를 멈추고 닫힌 상태를 고정으로 보여준다

    return () => {
      cleanups.forEach((fn) => fn());
      if (timer) {
        window.clearInterval(timer);
      }
    };
  }, []);

  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  return (
    <main className={styles.stage}>
      <div className={`${styles.swa} is-demo`} ref={rootRef} style={vars}>
        <ul className={styles.swa__list} data-role="list">
          {LABELS.map((label, i) => (
            <li className={styles.swa__row} data-row={i} key={i}>
              <div className={styles.swa__actions}>
                <button type="button" data-del className={styles.swa__actionBtn}>
                  삭제
                </button>
              </div>
              <div className={styles.swa__content} data-role="content" tabIndex={0}>
                {label}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
