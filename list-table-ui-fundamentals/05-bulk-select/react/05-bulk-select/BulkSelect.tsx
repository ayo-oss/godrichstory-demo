// BulkSelect — vanilla 판(run/381/demo/05-bulk-select/index.html)의 React 포트.
// Shift 클릭 구간 선택은 마지막으로 다룬 인덱스와 이번 인덱스 사이를 산술로 구해
// 그 구간 전체를 클릭된 체크박스의 결과 상태로 한 번에 맞춘다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./BulkSelect.module.scss";

export type BulkSelectProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const LABELS = ["보고서 초안", "회의록 정리", "예산안 검토", "디자인 초안", "계약서 검토"];

type AutoStep = { idx: number; shift: boolean };
const AUTO_SEQ: AutoStep[] = [
  { idx: 0, shift: false },
  { idx: 3, shift: true },
  { idx: 1, shift: false },
];

export default function BulkSelect({
  duration = "220ms", // vanilla $duration: $dur-quick
  easing = "cubic-bezier(.2, 1.4, .4, 1)", // vanilla $easing: $ease-pop
  color = "#6ec8ff", // vanilla $color: $subject-sky
}: BulkSelectProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const list = root.querySelector<HTMLUListElement>('[data-role="list"]');
    const badge = root.querySelector<HTMLSpanElement>('[data-role="badge"]');
    if (!list || !badge) return;
    const rows = Array.prototype.slice.call(list.querySelectorAll("[data-row]")) as HTMLLIElement[];
    const checkboxes = rows.map((row) => row.querySelector<HTMLInputElement>("input")!);

    const AUTO_STEP_MS = 550;
    const AUTO_RESET_DELAY_MS = 900;

    let lastIndex: number | null = null;

    function setChecked(cb: HTMLInputElement, checked: boolean): void {
      cb.checked = checked;
      cb.setAttribute("aria-checked", checked ? "true" : "false");
    }

    function updateBadge(): void {
      const n = checkboxes.filter((cb) => cb.checked).length;
      badge!.hidden = n === 0;
      badge!.textContent = n + "개 선택";
      badge!.classList.remove("is-pop");
      void badge!.offsetWidth; // 리플로우 강제 — 연속 클릭에도 팝 애니메이션이 매번 재생되게
      badge!.classList.add("is-pop");
    }

    // 계산 겹: 마지막으로 다룬 인덱스와 이번 인덱스 사이 범위를 산술로 구해
    // 그 구간 전체를 한 번에 같은 상태로 맞춘다 — 하나씩 누르지 않아도 된다.
    function applyRange(fromIdx: number, toIdx: number, checked: boolean): void {
      const lo = Math.min(fromIdx, toIdx);
      const hi = Math.max(fromIdx, toIdx);
      for (let i = lo; i <= hi; i += 1) {
        setChecked(checkboxes[i], checked);
      }
    }

    function clearAll(): void {
      checkboxes.forEach((cb) => setChecked(cb, false));
      lastIndex = null;
      updateBadge();
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

    const clickHandlers: ((e: MouseEvent) => void)[] = [];
    checkboxes.forEach((cb, idx) => {
      const onClick = (e: MouseEvent) => {
        human();
        if (e.shiftKey && lastIndex !== null) {
          applyRange(lastIndex, idx, cb.checked);
        }
        lastIndex = idx;
        updateBadge();
      };
      cb.addEventListener("click", onClick);
      clickHandlers.push(onClick);
    });

    let timer: number | null = null;
    let seqPos = 0;

    function autoTick(): void {
      if (seqPos >= AUTO_SEQ.length) {
        if (timer) {
          window.clearInterval(timer);
          timer = null;
        }
        window.setTimeout(() => {
          clearAll();
          seqPos = 0;
          timer = window.setInterval(autoTick, AUTO_STEP_MS);
        }, AUTO_RESET_DELAY_MS);
        return;
      }
      const step = AUTO_SEQ[seqPos];
      const cb = checkboxes[step.idx];
      const nextChecked = !cb.checked;
      if (step.shift && lastIndex !== null) {
        applyRange(lastIndex, step.idx, nextChecked);
      } else {
        setChecked(cb, nextChecked);
      }
      lastIndex = step.idx;
      updateBadge();
      seqPos += 1;
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      timer = window.setInterval(autoTick, AUTO_STEP_MS);
    }
    // reduce: 실사용 경로 적용 — 자동 선택 루프와 배지 팝 트윈을 멈춘다. 클릭·범위 선택 계산은 그대로 동작

    return () => {
      checkboxes.forEach((cb, idx) => {
        cb.removeEventListener("click", clickHandlers[idx]);
      });
      if (timer) {
        window.clearInterval(timer);
      }
    };
  }, []);

  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  return (
    <main className={styles.stage}>
      <div className={`${styles.bks} is-demo`} ref={rootRef} style={vars}>
        <div className={styles.bks__header}>
          <span className={styles.bks__title}>문서함</span>
          <span className={styles.bks__badge} data-role="badge" aria-live="polite" hidden>
            0개 선택
          </span>
        </div>
        <ul className={styles.bks__list} data-role="list">
          {LABELS.map((label, i) => (
            <li className={styles.bks__row} data-row={i} key={i}>
              <input
                type="checkbox"
                id={`bksCb${i}`}
                className={styles.bks__checkbox}
                aria-checked="false"
                readOnly
              />
              <label htmlFor={`bksCb${i}`} className={styles.bks__label}>
                {label}
              </label>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
