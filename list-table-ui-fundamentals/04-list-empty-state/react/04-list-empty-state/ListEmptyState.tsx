// ListEmptyState — vanilla 판(run/381/demo/04-list-empty-state/index.html)의 React 포트.
// 목표 높이(0 또는 EMPTY_HEIGHT)로 매 프레임 지수 감쇠(lerp)해 다가가며 문구 영역 높이를
// 다시 계산한다 — 행이 0개가 되는 순간 즉시 뚝 나타나지 않고 남은 공간을 따라 커진다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./ListEmptyState.module.scss";

export type ListEmptyStateProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const ROWS = ["작업 A 검토", "작업 B 검토", "작업 C 검토", "작업 D 검토"];

export default function ListEmptyState({
  duration = "300ms", // vanilla $duration: $dur-base
  easing = "ease-out", // vanilla $easing: $ease-out
  color = "#ff9ebb", // vanilla $color: $subject-pink
}: ListEmptyStateProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const list = root.querySelector<HTMLUListElement>('[data-role="list"]');
    const empty = root.querySelector<HTMLDivElement>('[data-role="empty"]');
    if (!list || !empty) return;

    const EMPTY_HEIGHT = 120; // 목록이 다 비었을 때의 최종 높이
    const LERP_RATE = 0.18; // 목표 높이로 매 프레임 다가가는 비율(지수 감쇠)
    const AUTO_STEP_MS = 380;
    const AUTO_RESET_DELAY_MS = 700;

    function addRow(label: string): HTMLLIElement {
      const li = document.createElement("li");
      li.className = styles.les__row;
      const span = document.createElement("span");
      span.className = styles.les__label;
      span.textContent = label;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = styles.les__del;
      btn.setAttribute("aria-label", label + " 지우기");
      btn.textContent = "지우기";
      li.appendChild(span);
      li.appendChild(btn);
      list!.appendChild(li);
      return li;
    }

    function resetRows(): void {
      list!.innerHTML = "";
      ROWS.forEach((label) => addRow(label));
    }
    resetRows();

    // 계산 겹: 목표 높이(0 또는 EMPTY_HEIGHT)로 매 프레임 지수 감쇠(lerp)해 다가간다.
    let currentHeight = 0;
    let targetHeight = 0;
    let rafId: number | null = null;

    function computeTarget(): number {
      return list!.children.length === 0 ? EMPTY_HEIGHT : 0;
    }

    function step(): void {
      const diff = targetHeight - currentHeight;
      if (Math.abs(diff) < 0.5) {
        currentHeight = targetHeight;
        empty!.style.height = currentHeight + "px";
        empty!.style.opacity = (currentHeight / EMPTY_HEIGHT).toFixed(2);
        rafId = null;
        return;
      }
      currentHeight += diff * LERP_RATE;
      empty!.style.height = currentHeight + "px";
      empty!.style.opacity = Math.min(1, currentHeight / EMPTY_HEIGHT).toFixed(2);
      rafId = window.requestAnimationFrame(step);
    }

    function startLoop(): void {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(step);
      }
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

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function removeRow(li: HTMLLIElement | null): void {
      if (!li || li.classList.contains("is-removing")) return;
      li.classList.add("is-removing");
      if (reduce) {
        // reduce: 실사용 경로 — 퇴장 트윈 없이 즉시 제거. animationend 를 기다리지 않는다
        li.remove();
        targetHeight = computeTarget();
        startLoop();
        return;
      }
      li.addEventListener(
        "animationend",
        () => {
          li.remove();
          targetHeight = computeTarget();
          startLoop();
        },
        { once: true }
      );
    }

    function onListClick(e: MouseEvent): void {
      const target2 = e.target as HTMLElement;
      const btn = target2.closest<HTMLButtonElement>("button." + styles.les__del);
      if (!btn) return;
      human();
      removeRow(btn.closest("li"));
    }
    list.addEventListener("click", onListClick);

    let timer: number | null = null;

    function autoTick(): void {
      const first = list!.querySelector<HTMLLIElement>(
        "." + styles.les__row + ":not(.is-removing)"
      );
      if (first) {
        removeRow(first);
      } else {
        if (timer) {
          window.clearInterval(timer);
          timer = null;
        }
        window.setTimeout(() => {
          resetRows();
          targetHeight = computeTarget();
          startLoop();
          timer = window.setInterval(autoTick, AUTO_STEP_MS);
        }, AUTO_RESET_DELAY_MS);
      }
    }

    if (!reduce) {
      timer = window.setInterval(autoTick, AUTO_STEP_MS);
    }
    // reduce: 실사용 경로 적용 — 자동 삭제 루프와 등장 트윈을 멈추고 목록이 있는 상태를 고정으로 보여준다

    return () => {
      list.removeEventListener("click", onListClick);
      if (timer) {
        window.clearInterval(timer);
      }
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  return (
    <main className={styles.stage}>
      <div className={`${styles.les} is-demo`} ref={rootRef} style={vars}>
        <ul className={styles.les__list} data-role="list" />
        <div className={styles.les__empty} data-role="empty" aria-live="polite">
          <p className={styles.les__emptyText}>할 일이 모두 없습니다</p>
        </div>
      </div>
    </main>
  );
}
