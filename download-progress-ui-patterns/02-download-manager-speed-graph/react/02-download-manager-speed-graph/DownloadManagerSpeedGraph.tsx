import { useEffect, useRef } from "react";
import styles from "./DownloadManagerSpeedGraph.module.scss";

type Box<T> = { current: T };

export default function DownloadManagerSpeedGraph() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const val = root.querySelector(`.${styles.val}`) as HTMLElement | null;
    const rawLine = root.querySelector(`.${styles.raw}`) as SVGPolylineElement | null;
    const avgLine = root.querySelector(`.${styles.avg}`) as SVGPolylineElement | null;
    const btn = root.querySelector(`.${styles.btn}`) as HTMLElement | null;
    if (!val || !rawLine || !avgLine || !btn) return;

    // 시드 고정: 초당 전송량 원시 표본(MB/s ×10, 정수). 실 네트워크 측정 0
    const SAMPLES = [12, 18, 15, 26, 32, 28, 40, 36, 44, 52, 48, 58, 54, 62, 46, 38, 44, 50, 42, 34, 28, 22, 16, 20];
    const N = 5;
    const W = 220, H = 80, MAXV = 65;
    const TICK_MS = 160;

    let buf: number[] = [];
    let i = 0;
    let paused = false;
    let timer = 0;
    let stopped = false;

    function pt(idx: number, v: number, count: number) {
      const x = count <= 1 ? W : (idx / (count - 1)) * W;
      const y = H - (v / MAXV) * H;
      return x.toFixed(1) + "," + y.toFixed(1);
    }

    // 계산 겹: 최근 N개 원시 표본의 이동평균 — 그래프 선은 이 평균값을 잇는다(원시값 자체가 아님)
    function movingAvg(arr: number[]) {
      const out: number[] = [];
      for (let k = 0; k < arr.length; k++) {
        const s = Math.max(0, k - N + 1);
        let sum = 0, c = 0;
        for (let j = s; j <= k; j++) { sum += arr[j]; c++; }
        out.push(sum / c);
      }
      return out;
    }

    function paint() {
      const avg = movingAvg(buf);
      const rawPts: string[] = [], avgPts: string[] = [];
      for (let k = 0; k < buf.length; k++) {
        rawPts.push(pt(k, buf[k], buf.length));
        avgPts.push(pt(k, avg[k], buf.length));
      }
      rawLine!.setAttribute("points", rawPts.join(" "));
      avgLine!.setAttribute("points", avgPts.join(" "));
      const last = avg.length ? avg[avg.length - 1] : 0;
      val!.textContent = (last / 10).toFixed(1) + "MB/s";
    }

    function tick() {
      if (paused || stopped) return;
      buf.push(SAMPLES[i % SAMPLES.length]);
      if (buf.length > 14) buf.shift();
      i++;
      paint();
      timer = window.setTimeout(tick, TICK_MS);
    }

    tick();

    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      paused = !paused;
      btn!.textContent = paused ? "재개" : "일시정지";
      if (!paused) tick();
      else window.clearTimeout(timer);
    }
    btn.addEventListener("click", onClick);

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.dsg} ${styles["is-demo"]}`}>
      <div className={styles.head}>
        <span className={styles.label}>전송 속도</span>
        <span className={styles.val}>0MB/s</span>
      </div>
      <svg className={styles.graph} viewBox="0 0 220 80" preserveAspectRatio="none">
        <polyline className={styles.raw} points="" />
        <polyline className={styles.avg} points="" />
      </svg>
      <button className={styles.btn} type="button">일시정지</button>
    </div>
  );
}
