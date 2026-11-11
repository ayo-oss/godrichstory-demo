import { useEffect, useRef } from "react";
import styles from "./TableRowExpandDetail.module.scss";

type Box<T> = { current: T };

export default function TableRowExpandDetail() {
  const rootRef = useRef(null) as unknown as Box<HTMLTableElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const rows = [0, 1, 2].map((i) => root.querySelector(`.${styles["row" + i]}`) as HTMLElement | null);
    const details = [0, 1, 2].map((i) => root.querySelector(`.${styles["detail" + i]}`) as HTMLElement | null);
    if (rows.some((el) => !el) || details.some((el) => !el)) return;

    // 상수: 상세 영역 진입 상한(px, 넉넉히 잡고 실측 scrollHeight 로 대체) · 보간 속도 · 자동 루프 간격
    const MAX_H = 80;
    const LERP = 0.22;
    const AUTO_TOGGLE_MS = 1100;

    const openIdx = [false, false, false];
    const h = [0, 0, 0];
    const target = [0, 0, 0];
    let stopped = false;
    let rafId = 0;
    let autoTimer = 0;

    function retarget(i: number) {
      const d = details[i]!;
      if (openIdx[i]) {
        d.style.height = "auto";
        const natural = Math.min(MAX_H, d.scrollHeight);
        d.style.height = h[i].toFixed(1) + "px";
        target[i] = natural;
      } else {
        target[i] = 0;
      }
    }

    function tick() {
      if (stopped) return;
      for (let i = 0; i < 3; i++) {
        h[i] += (target[i] - h[i]) * LERP;
        if (Math.abs(target[i] - h[i]) < 0.3) h[i] = target[i];
        details[i]!.style.height = h[i].toFixed(1) + "px";
        details[i]!.style.opacity = String(Math.min(1, h[i] / Math.max(1, target[i] || MAX_H)));
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    function toggle(i: number) {
      openIdx[i] = !openIdx[i];
      rows[i]!.classList.toggle(styles["row--open"], openIdx[i]);
      retarget(i);
    }

    const cleanups: Array<() => void> = [];
    rows.forEach((el, i) => {
      function onClick() {
        root!.classList.remove(styles["is-demo"]);
        toggle(i);
      }
      el!.addEventListener("click", onClick);
      cleanups.push(() => el!.removeEventListener("click", onClick));
    });

    let autoI = 0;
    function autoStep() {
      if (stopped) return;
      if (root!.classList.contains(styles["is-demo"])) {
        toggle(autoI % 3);
      }
      autoI++;
      autoTimer = window.setTimeout(autoStep, AUTO_TOGGLE_MS);
    }
    autoTimer = window.setTimeout(autoStep, AUTO_TOGGLE_MS);

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      window.clearTimeout(autoTimer);
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return (
    <table ref={rootRef} className={`${styles.stage} ${styles.tre} ${styles["is-demo"]}`}>
      <tbody>
        <tr className={`${styles.row} ${styles.row0}`}>
          <td className={styles.cell}>주문 A</td>
          <td className={`${styles.cell} ${styles.cellNum}`}>32,000</td>
        </tr>
        <tr className={styles.detailRow}>
          <td colSpan={2}>
            <div className={`${styles.detail} ${styles.detail0}`}>배송지 서울 · 결제 카드</div>
          </td>
        </tr>
        <tr className={`${styles.row} ${styles.row1}`}>
          <td className={styles.cell}>주문 B</td>
          <td className={`${styles.cell} ${styles.cellNum}`}>18,500</td>
        </tr>
        <tr className={styles.detailRow}>
          <td colSpan={2}>
            <div className={`${styles.detail} ${styles.detail1}`}>배송지 부산 · 결제 계좌</div>
          </td>
        </tr>
        <tr className={`${styles.row} ${styles.row2}`}>
          <td className={styles.cell}>주문 C</td>
          <td className={`${styles.cell} ${styles.cellNum}`}>7,200</td>
        </tr>
        <tr className={styles.detailRow}>
          <td colSpan={2}>
            <div className={`${styles.detail} ${styles.detail2}`}>배송지 대전 · 결제 카드</div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
