import { useEffect, useRef } from "react";
import styles from "./CommentThreadDeleteCollapseShift.module.scss";

// 기법: 삭제 대상 행의 offsetHeight 를 실측해 그 픽셀값만큼 height 를 0 으로 접으며 사라지게
// 하고, 아래 행들은 First(삭제 전)-Last(삭제 후) 차이를 계산해 그 거리만큼 스프링 이징으로
// transform 이동 뒤 0 으로 멎는다(FLIP + 스프링 감쇠).
// 스프링 강성 DELETE_SHIFT_SPRING_STIFFNESS 가 낮을수록 이동 시간이 길어진다.
const DELETE_SHIFT_SPRING_STIFFNESS = 220;

// $ease-lerp-settle 곡선(site/static/demo-tokens.scss)과 같은 샘플 — 1 을 넘겼다가(최대 1.126) 되독아온다.
const SPRING_SETTLE_EASING =
  "linear(0.0, 0.051, 0.176, 0.341, 0.518, 0.685, 0.831, 0.947, 1.032, 1.087, 1.117, 1.126, 1.121, 1.105, 1.085, 1.062, 1.041, 1.022, 1.008, 0.997, 1)";

export default function CommentThreadDeleteCollapseShift() {
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const resetRef = useRef<HTMLButtonElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const list = listRef.current;
    const btn = btnRef.current;
    const reset = resetRef.current;
    const status = statusRef.current;
    if (!root || !list || !btn || !reset || !status) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) root.classList.remove("is-demo");

    function shiftDuration(gapPx: number): number {
      return Math.round(60 + 100000 / DELETE_SHIFT_SPRING_STIFFNESS + Math.min(240, gapPx * 0.55));
    }

    function itemsAfter(id: string): HTMLElement[] {
      const all = Array.from(list!.querySelectorAll<HTMLElement>(".del__item"));
      const seen = all.findIndex((el) => el.getAttribute("data-id") === id);
      return all.slice(seen + 1).filter((el) => el.getBoundingClientRect().height > 0);
    }

    function removeRow(id: string, animate: boolean, delayMs: number) {
      const row = list!.querySelector<HTMLElement>(`.del__item[data-id="${id}"]`);
      if (!row || row.getBoundingClientRect().height === 0) return;
      const delBtn = row.querySelector<HTMLButtonElement>(".del__delBtn");

      const below = itemsAfter(id);
      const before = below.map((el) => el.getBoundingClientRect().top);

      const gap = row.offsetHeight + 8;

      if (!animate || reduce) {
        row.style.display = "none";
        status!.textContent = "댓글을 삭제했습니다.";
        return;
      }

      const h = row.offsetHeight;
      row.style.height = h + "px";
      row.style.overflow = "hidden";
      row.style.boxSizing = "border-box";
      row.style.marginTop = "0px";
      row.style.marginBottom = "0px";
      const collapse = row.animate(
        [{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0 }],
        { duration: 240, delay: delayMs, easing: "ease-in", fill: "forwards" }
      );
      collapse.onfinish = () => { row.style.display = "none"; };

      const dur = shiftDuration(gap);
      below.forEach((el, i) => {
        el.animate(
          [
            { transform: "translateY(0px)" },
            { transform: `translateY(${gap}px)` },
            { transform: "translateY(0px)" },
          ],
          { duration: dur, delay: delayMs + 240, easing: SPRING_SETTLE_EASING, fill: "both" }
        );
      });

      status!.textContent = "댓글을 삭제했습니다.";
      if (delBtn) delBtn.disabled = true;
    }

    function restoreRows() {
      const rows = list!.querySelectorAll<HTMLElement>(".del__item");
      rows.forEach((row) => {
        row.getAnimations().forEach((a) => a.cancel());
        row.style.display = "";
        row.style.height = "";
        row.style.overflow = "";
        row.style.marginTop = "";
        row.style.marginBottom = "";
        const b = row.querySelector<HTMLButtonElement>(".del__delBtn");
        if (b) b.disabled = false;
      });
      status!.textContent = "삭제한 댓글을 되돌렸습니다.";
    }

    const onActivate = () => { root.classList.remove("is-demo"); removeRow("d1", true, 0); };
    btn.addEventListener("click", onActivate);
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onActivate(); }
    });
    const onReset = () => { root.classList.remove("is-demo"); restoreRows(); };
    reset.addEventListener("click", onReset);
    reset.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onReset(); }
    });

    if (!reduce) removeRow("d1", true, 220);
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.del} is-demo`} ref={rootRef}>
        <ul className={styles.del__list} role="list" ref={listRef}>
          <li className={`del__item ${styles.del__item}`} data-id="d1">
            <span className={styles.del__avatar} aria-hidden="true" />
            <div className={styles.del__body}>
              <p className={styles.del__meta}>
                <strong className={styles.del__name}>청록지도</strong>
                <span className={styles.del__time}>8분 전</span>
              </p>
              <p className={styles.del__text}>첫 번째 댓글이에요. 이걸 지워보세요.</p>
            </div>
            <button type="button" className={`del__delBtn ${styles.del__delBtn}`} ref={btnRef} data-target="d1" aria-label="댓글 삭제">
              <svg className={styles.del__icon} viewBox="0 0 256 256" aria-hidden="true">
                <g fill="currentColor">
                  <path d="M200 56v152a8 8 0 0 1-8 8H64a8 8 0 0 1-8-8V56Z" opacity=".2" />
                  <path d="M216 48h-40v-8a24 24 0 0 0-24-24h-48a24 24 0 0 0-24 24v8H40a8 8 0 0 0 0 16h8v144a16 16 0 0 0 16 16h128a16 16 0 0 0 16-16V64h8a8 8 0 0 0 0-16M96 40a8 8 0 0 1 8-8h48a8 8 0 0 1 8 8v8H96Zm96 168H64V64h128Zm-80-104v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0m48 0v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0" />
                </g>
              </svg>
            </button>
          </li>
          <li className={`del__item ${styles.del__item}`} data-id="d2">
            <span className={styles.del__avatar} aria-hidden="true" />
            <div className={styles.del__body}>
              <p className={styles.del__meta}>
                <strong className={styles.del__name}>모래언덕</strong>
                <span className={styles.del__time}>25분 전</span>
              </p>
              <p className={styles.del__text}>두 번째 댓글 — 아래로 갈수록 밀리는 폭이 커요.</p>
            </div>
          </li>
          <li className={`del__item ${styles.del__item}`} data-id="d3">
            <span className={styles.del__avatar} aria-hidden="true" />
            <div className={styles.del__body}>
              <p className={styles.del__meta}>
                <strong className={styles.del__name}>파도소리</strong>
                <span className={styles.del__time}>46분 전</span>
              </p>
              <p className={styles.del__text}>세 번째 댓글 — 스프링 감쇠로 멎는 걸 보세요.</p>
            </div>
          </li>
          <li className={`del__item ${styles.del__item}`} data-id="d4">
            <span className={styles.del__avatar} aria-hidden="true" />
            <div className={styles.del__body}>
              <p className={styles.del__meta}>
                <strong className={styles.del__name}>이끼정원</strong>
                <span className={styles.del__time}>1시간 전</span>
              </p>
              <p className={styles.del__text}>네 번째 댓글 — 마지막까지 밀린 거리만큼 올라옵니다.</p>
            </div>
          </li>
        </ul>
        <button type="button" className={styles.del__resetBtn} ref={resetRef}>되돌리기</button>
        <p className={styles.del__sr} ref={statusRef} aria-live="polite" />
      </div>
    </main>
  );
}
