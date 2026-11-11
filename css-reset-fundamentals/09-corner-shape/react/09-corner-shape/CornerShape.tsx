// CornerShape — vanilla 판(run/376/demo/09-corner-shape/index.html) 의 React 포트.
// 클릭·자동 루프가 같은 반경 값을 두 카드에 동시에 넣고 getComputedStyle 로 실제 렌더 결과를
// 다시 읽는다. corner-shape 지원 여부는 CSS.supports 로 실측하고(추측 금지), 미지원 환경은
// @supports 블록이 자동으로 원호 폴백을 남긴다.
import { useEffect, useRef } from "react";
import styles from "./CornerShape.module.scss";

type Box<T> = { current: T };

const STEP_MS = 900;
const MIN_R = 10;
const MAX_R = 34;

export default function CornerShape() {
  const wrapRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const supportBadgeRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const cardRadiusRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const cardShapeRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const readoutRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wrap = wrapRef.current;
    const supportBadge = supportBadgeRef.current;
    const cardRadius = cardRadiusRef.current;
    const cardShape = cardShapeRef.current;
    const readout = readoutRef.current;
    if (!wrap || !supportBadge || !cardRadius || !cardShape || !readout) return;

    const supported =
      typeof CSS !== "undefined" && !!CSS.supports && CSS.supports("corner-shape", "squircle");

    let isDemo = true;
    let r = MIN_R;

    supportBadge.textContent = supported ? "corner-shape 지원" : "미지원 환경 — 오른쪽은 원호로 자동 대체";
    supportBadge.classList.toggle(styles.fallback, !supported);

    function apply() {
      const px = Math.round(r) + "px";
      cardRadius!.style.borderRadius = px;
      cardShape!.style.borderRadius = px;
      const rendered = getComputedStyle(cardRadius!).borderTopLeftRadius;
      readout!.textContent = "반경 " + rendered + " · corner-shape " + (supported ? "적용됨" : "미지원(폴백)");
    }

    function human() { if (isDemo) { wrap!.classList.remove(styles.isDemo); isDemo = false; } }
    function onCardClick() { human(); r = r === MIN_R ? MAX_R : MIN_R; apply(); }
    cardRadius.addEventListener("click", onCardClick);
    cardShape.addEventListener("click", onCardClick);

    let last = 0;
    function loop(ts: number) {
      if (!last) last = ts;
      if (isDemo && !reduce && ts - last >= STEP_MS) {
        last = ts;
        r = r === MIN_R ? MAX_R : MIN_R;
        apply();
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    apply();
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cardRadius!.removeEventListener("click", onCardClick);
      cardShape!.removeEventListener("click", onCardClick);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={wrapRef}>
        <span className={styles.supportBadge} ref={supportBadgeRef}>확인 중</span>
        <div className={styles.cards}>
          <div className={styles.cardCol}>
            <span className={styles.colLabel}>border-radius 기본 원호</span>
            <div className={styles.card + " " + styles.cardRadius} ref={cardRadiusRef}></div>
          </div>
          <div className={styles.cardCol}>
            <span className={styles.colLabel}>corner-shape 한 줄 추가</span>
            <div className={styles.card + " " + styles.cardShape} ref={cardShapeRef}></div>
          </div>
        </div>
        <div className={styles.readout} ref={readoutRef}>반경 —px</div>
      </div>
    </main>
  );
}
