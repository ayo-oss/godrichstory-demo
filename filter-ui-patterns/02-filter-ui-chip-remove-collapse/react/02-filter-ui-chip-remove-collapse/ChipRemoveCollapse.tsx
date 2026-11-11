import { useEffect, useRef } from "react";
import styles from "./ChipRemoveCollapse.module.scss";

// 칩 하나를 지우면 남은 칩들의 실측 폭(getBoundingClientRect)과 사이 간격(gap)을 다시 더해 컨테이너 폭을 그 값으로 옮긴다(transition).
// 실사용 클릭 리스너 있음 + 같은 제거·추가 함수를 2초 주기로 되풀이하는 자동 시연을 함께 돈다.
const GAP_PX = 8;
const X_ICON_SVG =
  '<svg viewBox="0 0 256 256" width="12" height="12" aria-hidden="true"><g fill="currentColor"><path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128L50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z"/></g></svg>';

export default function ChipRemoveCollapse() {
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;

    let alive = true;

    function recompute() {
      const chips = row!.querySelectorAll<HTMLElement>("." + styles.chip);
      let total = 0;
      chips.forEach((chip, i) => {
        total += chip.getBoundingClientRect().width;
        if (i > 0) total += GAP_PX;
      });
      row!.style.width = total + "px";
    }

    function buildChip(label: string) {
      const chip = document.createElement("span");
      chip.className = styles.chip;
      chip.setAttribute("role", "listitem");
      chip.dataset.label = label;
      const text = document.createElement("span");
      text.className = styles.chip__label;
      text.textContent = label;
      const btn = document.createElement("button");
      btn.className = styles.chip__x;
      btn.type = "button";
      btn.setAttribute("aria-label", label + " 필터 제거");
      btn.innerHTML = X_ICON_SVG;
      chip.appendChild(text);
      chip.appendChild(btn);
      return chip;
    }

    function removeChip(chip: HTMLElement | null) {
      if (!chip) return null;
      const label = chip.dataset.label || "";
      chip.remove();
      recompute();
      return label;
    }

    function addChip(label: string) {
      const chip = buildChip(label);
      row!.appendChild(chip);
      recompute();
    }

    function onClick(e: MouseEvent) {
      const target = e.target as Element | null;
      if (!target) return;
      const btn = target.closest<HTMLElement>("." + styles.chip__x);
      if (!btn) return;
      removeChip(btn.closest<HTMLElement>("." + styles.chip));
    }

    row.addEventListener("click", onClick);
    const rafId = requestAnimationFrame(recompute);

    const timers: number[] = [];
    (function loop() {
      const t1 = window.setTimeout(() => {
        if (!alive) return;
        const last = row!.querySelector<HTMLElement>("." + styles.chip + ":last-child");
        const label = removeChip(last);
        const t2 = window.setTimeout(() => {
          if (!alive) return;
          if (label) addChip(label);
          const t3 = window.setTimeout(loop, 700);
          timers.push(t3);
        }, 650);
        timers.push(t2);
      }, 350);
      timers.push(t1);
    })();

    return () => {
      alive = false;
      row.removeEventListener("click", onClick);
      cancelAnimationFrame(rafId);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div ref={rowRef} className={styles.chips} role="list" aria-label="적용된 필터">
        <span className={styles.chip} role="listitem" data-label="여성">
          <span className={styles.chip__label}>여성</span>
          <button className={styles.chip__x} type="button" aria-label="여성 필터 제거">
            <svg viewBox="0 0 256 256" width="12" height="12" aria-hidden="true">
              <g fill="currentColor">
                <path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128L50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z" />
              </g>
            </svg>
          </button>
        </span>
        <span className={styles.chip} role="listitem" data-label="블루">
          <span className={styles.chip__label}>블루</span>
          <button className={styles.chip__x} type="button" aria-label="블루 필터 제거">
            <svg viewBox="0 0 256 256" width="12" height="12" aria-hidden="true">
              <g fill="currentColor">
                <path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128L50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z" />
              </g>
            </svg>
          </button>
        </span>
        <span className={styles.chip} role="listitem" data-label="M">
          <span className={styles.chip__label}>M</span>
          <button className={styles.chip__x} type="button" aria-label="M 필터 제거">
            <svg viewBox="0 0 256 256" width="12" height="12" aria-hidden="true">
              <g fill="currentColor">
                <path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128L50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z" />
              </g>
            </svg>
          </button>
        </span>
        <span className={styles.chip} role="listitem" data-label="세일">
          <span className={styles.chip__label}>세일</span>
          <button className={styles.chip__x} type="button" aria-label="세일 필터 제거">
            <svg viewBox="0 0 256 256" width="12" height="12" aria-hidden="true">
              <g fill="currentColor">
                <path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128L50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z" />
              </g>
            </svg>
          </button>
        </span>
      </div>
    </main>
  );
}
