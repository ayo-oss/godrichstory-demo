import { useEffect, useRef } from "react";
import styles from "./DownloadManagerExtractMorph.module.scss";

type Box<T> = { current: T };

export default function DownloadManagerExtractMorph() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const poly = root.querySelector(`.${styles.poly}`) as SVGPolygonElement | null;
    const pctEl = root.querySelector(`.${styles.pct}`) as HTMLElement | null;
    const fill = root.querySelector(`.${styles.fill}`) as HTMLElement | null;
    const btn = root.querySelector(`.${styles.btn}`) as HTMLElement | null;
    if (!poly || !pctEl || !fill || !btn) return;

    // 상수: 시작 형태(닫힌 상자, 8점) · 끝 형태(펼친 도형, 같은 8점 순서)
    const BOX: [number, number][] = [[30, 25], [70, 25], [70, 40], [70, 55], [70, 75], [30, 75], [30, 55], [30, 40]];
    const OPEN: [number, number][] = [[15, 30], [85, 20], [78, 45], [88, 60], [72, 82], [28, 88], [18, 58], [10, 42]];
    const DUR_MS = 2400;

    let start = performance.now();
    let pausedAt = 0;
    let paused = false;
    let stopped = false;
    let rafId = 0;

    // 계산 겹: 진행 값(0~1)으로 8개 점 좌표를 각각 선형보간(lerp) — 두 도형을 겹쳐 페이드하지 않는다
    function lerpPoints(t: number) {
      const out: string[] = [];
      for (let i = 0; i < BOX.length; i++) {
        const x = BOX[i][0] + (OPEN[i][0] - BOX[i][0]) * t;
        const y = BOX[i][1] + (OPEN[i][1] - BOX[i][1]) * t;
        out.push(x.toFixed(1) + "," + y.toFixed(1));
      }
      return out.join(" ");
    }

    function paint(t: number) {
      poly!.setAttribute("points", lerpPoints(t));
      fill!.style.transform = "scaleX(" + t.toFixed(3) + ")";
      pctEl!.textContent = Math.round(t * 100) + "%";
    }

    function frame(now: number) {
      if (stopped) return;
      if (!paused) {
        const e = (now - start) % DUR_MS;
        pausedAt = e / DUR_MS;
        paint(pausedAt);
      }
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);

    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      paused = !paused;
      btn!.textContent = paused ? "재개" : "일시정지";
      if (!paused) start = performance.now() - pausedAt * DUR_MS;
    }
    btn.addEventListener("click", onClick);

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.dem} ${styles["is-demo"]}`}>
      <svg className={styles.shape} viewBox="0 0 100 100">
        <polygon className={styles.poly} points="" />
      </svg>
      <div className={styles.row}>
        <span className={styles.label}>압축 해제</span>
        <span className={styles.pct}>0%</span>
      </div>
      <div className={styles.track}><div className={styles.fill} /></div>
      <button className={styles.btn} type="button">일시정지</button>
    </div>
  );
}
