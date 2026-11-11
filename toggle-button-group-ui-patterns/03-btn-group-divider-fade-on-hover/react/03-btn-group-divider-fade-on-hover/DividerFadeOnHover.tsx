// DividerFadeOnHover — vanilla 판(run/369/demo/03-btn-group-divider-fade-on-hover/index.html) 의 React 포트.
// 포인터(x) 와 각 구분선의 실측 중점 사이 거리 값을 매 프레임 재고, smoothstep falloff 로 목표
// 투명도를 구한 뒤 지수 완화(lerp)로 순간이동 없이 따라가게 한다.
import { useEffect, useRef } from "react";
import styles from "./DividerFadeOnHover.module.scss";

type Box<T> = { current: T };

export default function DividerFadeOnHover() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const seamRefs = useRef([]) as unknown as Box<HTMLSpanElement[]>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const FALLOFF_PX = 46; // 계산 겹 상수: 포인터 거리 값이 이 px 안이면 구분선 투명도가 낮아지기 시작한다
    const SMOOTH = 0.22; // 계산 겹 상수: 지수 완화(lerp) 비율
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const root = rootRef.current;
    const seams = seamRefs.current;
    if (!root || seams.length === 0) return;

    let isDemo = true;
    let pointerX: number | null = null;
    const opac = [1, 1];

    function seamCenters() {
      const rootRect = root!.getBoundingClientRect();
      return seams.map((s) => {
        const r = s.getBoundingClientRect();
        return r.left + r.width / 2 - rootRect.left;
      });
    }

    function targetOpacity(dist: number) {
      const t = Math.min(1, Math.max(0, dist / FALLOFF_PX));
      return t * t * (3 - 2 * t);
    }

    function human() { if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; } }

    function onMove(e: PointerEvent) { human(); pointerX = e.clientX - root!.getBoundingClientRect().left; }
    function onLeave() { pointerX = null; }
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);

    let demoStart = 0;
    function demoPointerX(ts: number, width: number) {
      const t = (ts - demoStart) / 1000;
      return width / 2 + Math.sin(t * 1.1) * (width / 2 - 10);
    }

    function loop(ts: number) {
      if (!demoStart) demoStart = ts;
      const rect = root!.getBoundingClientRect();
      const px = isDemo && !reduce ? demoPointerX(ts, rect.width) : pointerX;
      const centers = seamCenters();

      for (let i = 0; i < seams.length; i++) {
        const target = px == null ? 1 : targetOpacity(Math.abs(px - centers[i]));
        opac[i] += (target - opac[i]) * (reduce ? 1 : SMOOTH);
        seams[i].style.opacity = opac[i].toFixed(3);
      }

      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.dfh + " " + styles.isDemo} ref={rootRef} role="group" aria-label="보기 전환">
        <button className={styles.btn}>그리드</button>
        <span className={styles.seam} ref={(el: HTMLSpanElement | null) => { if (el) seamRefs.current[0] = el; }} aria-hidden="true" />
        <button className={styles.btn}>리스트</button>
        <span className={styles.seam} ref={(el: HTMLSpanElement | null) => { if (el) seamRefs.current[1] = el; }} aria-hidden="true" />
        <button className={styles.btn}>카드</button>
      </div>
    </main>
  );
}
