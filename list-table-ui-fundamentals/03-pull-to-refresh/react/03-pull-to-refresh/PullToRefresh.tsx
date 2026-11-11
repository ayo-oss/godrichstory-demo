// PullToRefresh — vanilla 판(run/381/demo/03-pull-to-refresh/index.html)의 React 포트.
// 원시 당김량(raw)을 지수 감쇠 저항 곡선으로 눌러 표시량을 만들고, 놓았을 때 새로고침되면
// computeChanged() 로 실제 값이 달라진 행만 골라 훑는다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./PullToRefresh.module.scss";

export type PullToRefreshProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const LABELS = ["품목 A 재고", "품목 B 재고", "품목 C 재고", "품목 D 재고", "품목 E 재고"];
const SET_A = [128, 54, 302, 19, 77];

export default function PullToRefresh({
  duration = "600ms", // vanilla $duration: $dur-enter
  easing = "cubic-bezier(.2, .8, .2, 1)", // vanilla $easing: $ease-spring
  color = "#b9a0ff", // vanilla $color: $subject-lilac
}: PullToRefreshProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const view = root.querySelector<HTMLDivElement>('[data-role="view"]');
    const zone = root.querySelector<HTMLDivElement>('[data-role="zone"]');
    const indicator = root.querySelector<HTMLDivElement>('[data-role="indicator"]');
    const spinner = root.querySelector<HTMLSpanElement>('[data-role="spinner"]');
    const list = root.querySelector<HTMLUListElement>('[data-role="list"]');
    const hint = root.querySelector<HTMLParagraphElement>('[data-role="hint"]');
    if (!view || !zone || !indicator || !spinner || !list || !hint) return;
    const rows = Array.prototype.slice.call(list.querySelectorAll("[data-row]")) as HTMLLIElement[];

    const MAX_PULL_PX = 64; // 당김 표시량 상한
    const DAMPING = 90; // 저항 곡선 상수 — 클수록 손가락 이동량이 그대로 반영된다
    const RELEASE_THRESHOLD_PX = 46; // 이 표시량을 넘기고 놓으면 새로고침
    const AUTO_TICK_MS = 40;
    const AUTO_PULL_STEP = 6;
    const AUTO_HOLD_MS = 160;
    const AUTO_WAIT_MS = 900;
    const SWEEP_STAGGER_MS = 90;

    const SET_B = [128, 61, 302, 24, 77];

    let values = SET_A.slice();
    let currentIsA = true;
    let lastDisplayed = 0;

    function renderValues(): void {
      values.forEach((v, i) => {
        const cell = rows[i].querySelector<HTMLSpanElement>("[data-value]");
        if (cell) cell.textContent = String(v);
      });
    }
    renderValues();

    // 계산 겹: 원시 당김량(raw)을 지수 감쇠 저항 곡선으로 눌러 표시량을 만든다 —
    // 처음엔 손가락을 따라오다가 당길수록 점점 덜 늘어난다.
    function applyPull(raw: number): number {
      const displayed = MAX_PULL_PX * (1 - Math.exp(-raw / DAMPING));
      zone!.style.setProperty("--pull-px", displayed.toFixed(1) + "px");
      spinner!.style.setProperty("--spin-deg", ((displayed / MAX_PULL_PX) * 320).toFixed(1) + "deg");
      indicator!.style.opacity = Math.min(1, displayed / (RELEASE_THRESHOLD_PX * 0.7)).toFixed(2);
      lastDisplayed = displayed;
      return displayed;
    }

    function computeChanged(oldVals: number[], newVals: number[]): number[] {
      const idx: number[] = [];
      for (let i = 0; i < oldVals.length; i += 1) {
        if (oldVals[i] !== newVals[i]) {
          idx.push(i);
        }
      }
      return idx;
    }

    function sweepRow(row: HTMLLIElement, delayMs: number): void {
      row.classList.remove("is-swept");
      void row.offsetWidth; // 리플로우 강제 — 클래스를 다시 붙여도 애니메이션이 처음부터 재생되게
      row.style.animationDelay = delayMs + "ms";
      row.classList.add("is-swept");
    }

    function refresh(): void {
      const next = currentIsA ? SET_B : SET_A;
      const changed = computeChanged(values, next);
      values = next.slice();
      currentIsA = !currentIsA;
      renderValues();
      hint!.textContent = changed.length ? "값이 바뀐 행만 훑습니다" : "변경된 행이 없습니다";
      changed.forEach((idx, order) => {
        sweepRow(rows[idx], order * SWEEP_STAGGER_MS);
      });
    }

    let dragging = false;
    let startY = 0;

    function human(): void {
      if (root!.classList.contains("is-demo")) {
        root!.classList.remove("is-demo");
        if (timer) {
          window.clearInterval(timer);
          timer = null;
        }
      }
    }

    function onPointerDown(e: PointerEvent): void {
      human();
      if (view!.scrollTop > 0) return;
      dragging = true;
      startY = e.clientY;
      zone!.classList.add("is-dragging");
    }
    function onPointerMove(e: PointerEvent): void {
      if (!dragging) return;
      const raw = Math.max(0, e.clientY - startY);
      applyPull(raw);
    }
    function onPointerUp(): void {
      if (!dragging) return;
      dragging = false;
      zone!.classList.remove("is-dragging");
      const wasEnough = lastDisplayed >= RELEASE_THRESHOLD_PX;
      applyPull(0);
      if (wasEnough) refresh();
    }
    view.addEventListener("pointerdown", onPointerDown);
    view.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    let timer: number | null = null;
    let raw = 0;
    let phase: "pull" | "hold" | "wait" = "pull";

    function autoTick(): void {
      if (phase === "pull") {
        raw += AUTO_PULL_STEP;
        const displayed = applyPull(raw);
        if (displayed >= RELEASE_THRESHOLD_PX) {
          phase = "hold";
          window.setTimeout(() => {
            refresh();
            applyPull(0);
            phase = "wait";
            window.setTimeout(() => {
              raw = 0;
              phase = "pull";
            }, AUTO_WAIT_MS);
          }, AUTO_HOLD_MS);
        }
      }
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      timer = window.setInterval(autoTick, AUTO_TICK_MS);
    } else {
      // reduce: 실사용 경로 적용 — 자동 당김 루프와 스침 애니메이션을 멈추고 최신 값만 보여준다
      hint.textContent = "아래로 당겨서 새로고침";
    }

    return () => {
      view.removeEventListener("pointerdown", onPointerDown);
      view.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      if (timer) {
        window.clearInterval(timer);
      }
    };
  }, []);

  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  return (
    <main className={styles.stage}>
      <div className={`${styles.ptr} is-demo`} ref={rootRef} style={vars}>
        <div className={styles.ptr__view} data-role="view">
          <div className={styles.ptr__zone} data-role="zone">
            <div className={styles.ptr__indicator} data-role="indicator" aria-hidden="true">
              <span className={styles.ptr__spinner} data-role="spinner" />
            </div>
            <ul className={styles.ptr__list} data-role="list">
              {LABELS.map((label, i) => (
                <li className={styles.ptr__row} data-row={i} key={i}>
                  <span className={styles.ptr__label}>{label}</span>
                  <span className={styles.ptr__value} data-value>
                    {SET_A[i]}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className={styles.ptr__hint} data-role="hint" aria-live="polite">
          아래로 당겨서 새로고침
        </p>
      </div>
    </main>
  );
}
