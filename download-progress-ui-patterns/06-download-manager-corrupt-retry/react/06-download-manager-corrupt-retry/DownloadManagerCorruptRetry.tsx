import { useEffect, useRef } from "react";
import styles from "./DownloadManagerCorruptRetry.module.scss";

type Box<T> = { current: T };

export default function DownloadManagerCorruptRetry() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const state = root.querySelector(`.${styles.state}`) as HTMLElement | null;
    const retryEl = root.querySelector(`.${styles.retry}`) as HTMLElement | null;
    const fill = root.querySelector(`.${styles.fill}`) as HTMLElement | null;
    const btn = root.querySelector(`.${styles.btn}`) as HTMLElement | null;
    if (!state || !retryEl || !fill || !btn) return;

    // 시드 고정: 회차별 검증 결과(참=검증 통과). 0·1회차는 손상, 2회차부터 통과
    const VERIFY_SEED = [false, false, true, true, true];
    const TICK_MS = 90;
    const BASE_BACKOFF_MS = 260;
    const BACKOFF_MULT = 2;
    const MAX_PCT = 100;

    let pct = 0;
    let retry = 0;
    let timer = 0;
    let stopped = false;

    // 계산 겹: 재시도 대기 = 기저값 × 배수^재시도횟수(지수 백오프) — 매 실패마다 대기가 길어진다
    function backoffMs() {
      return BASE_BACKOFF_MS * Math.pow(BACKOFF_MULT, Math.min(retry, 4));
    }

    function paint() {
      fill!.style.transform = "scaleX(" + (pct / MAX_PCT).toFixed(3) + ")";
      retryEl!.textContent = "재시도 " + retry;
    }

    function verify() {
      const ok = VERIFY_SEED[retry % VERIFY_SEED.length];
      if (ok) {
        state!.textContent = "완료";
        root!.classList.add(styles["dcr--ok"]);
        timer = window.setTimeout(reset, 900);
      } else {
        state!.textContent = "손상";
        root!.classList.add(styles["dcr--bad"]);
        retry++;
        pct = 0;
        paint();
        const wait = backoffMs();
        timer = window.setTimeout(() => {
          root!.classList.remove(styles["dcr--bad"]);
          state!.textContent = "받는 중";
          download();
        }, wait);
      }
    }

    function download() {
      if (stopped) return;
      if (pct >= MAX_PCT) { verify(); return; }
      pct = Math.min(MAX_PCT, pct + 9);
      paint();
      timer = window.setTimeout(download, TICK_MS);
    }

    function reset() {
      root!.classList.remove(styles["dcr--ok"], styles["dcr--bad"]);
      pct = 0; retry = 0; state!.textContent = "받는 중";
      paint();
      download();
    }

    download();

    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      window.clearTimeout(timer);
      reset();
    }
    btn.addEventListener("click", onClick);

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.dcr} ${styles["is-demo"]}`}>
      <div className={styles.head}>
        <span className={styles.state}>받는 중</span>
        <span className={styles.retry}>재시도 0</span>
      </div>
      <div className={styles.track}><div className={styles.fill} /></div>
      <button className={styles.btn} type="button">지금 재시도</button>
    </div>
  );
}
