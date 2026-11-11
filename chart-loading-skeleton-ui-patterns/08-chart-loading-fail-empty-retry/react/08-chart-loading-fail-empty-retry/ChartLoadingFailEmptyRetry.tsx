import { useEffect, useRef } from 'react';
import styles from './ChartLoadingFailEmptyRetry.module.scss';

type StateName = 'loading' | 'fail' | 'empty' | 'success';

const STATE_MS: Record<StateName, number> = { loading: 420, fail: 420, empty: 420, success: 420 };
const AUTO_ORDER: StateName[] = ['loading', 'fail', 'empty', 'success'];
const BASE_BACKOFF_MS = 240;
const BACKOFF_FACTOR = 1.6;
const RETRY_OUTCOMES: StateName[] = ['fail', 'empty', 'success'];

export default function ChartLoadingFailEmptyRetry() {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  const stateRefs = useRef<Record<StateName, HTMLDivElement | null>>({ loading: null, fail: null, empty: null, success: null });

  useEffect(() => {
    const root = rootRef.current;
    const panel = panelRef.current;
    const retry = retryRef.current;
    if (!root || !panel || !retry) return undefined;

    let autoTimers: number[] = [];
    let attempt = 0;

    function reduceMotion() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

    // 계산 겹: 재시도 횟수(attempt)로 지수 백오프 대기 시간을 계산한다 — 실패가 반복될수록 다음 시도까지 더 오래 기다린다
    function backoffDelay(n: number) { return Math.round(BASE_BACKOFF_MS * Math.pow(BACKOFF_FACTOR, n)); }

    function showState(name: StateName) {
      const refs = stateRefs.current!;
      (Object.keys(refs) as StateName[]).forEach((key) => {
        const el = refs[key];
        if (el) el.classList.toggle(styles.isActive, key === name);
      });
      panel!.setAttribute('aria-busy', name === 'loading' ? 'true' : 'false');
    }

    function clearAutoTimers() {
      autoTimers.forEach((id) => window.clearTimeout(id));
      autoTimers = [];
    }

    function runAutoCycle() {
      if (!root!.classList.contains(styles['is-demo']) || reduceMotion()) { return; }
      clearAutoTimers();
      let t = 0;
      AUTO_ORDER.forEach((name) => {
        autoTimers.push(window.setTimeout(() => { showState(name); }, t));
        t += STATE_MS[name];
      });
    }

    runAutoCycle();

    const humanTimers: number[] = [];
    function human() {
      if (root!.classList.contains(styles['is-demo'])) {
        root!.classList.remove(styles['is-demo']);
        clearAutoTimers();
      }
      attempt += 1;
      showState('loading');
      const wait = backoffDelay(attempt);
      humanTimers.push(window.setTimeout(() => {
        const outcome = RETRY_OUTCOMES[(attempt - 1) % RETRY_OUTCOMES.length];
        showState(outcome);
      }, wait));
    }

    function onClick() { human(); }
    function onKey(e: KeyboardEvent) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); human(); } }
    retry.addEventListener('click', onClick);
    retry.addEventListener('keydown', onKey);

    return () => {
      retry.removeEventListener('click', onClick);
      retry.removeEventListener('keydown', onKey);
      clearAutoTimers();
      humanTimers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.cx + ' ' + styles['is-demo']} ref={rootRef}>
        <div className={styles.cxPanel} ref={panelRef} aria-live="polite" aria-busy="true">
          <div
            className={styles.cxState + ' ' + styles.isActive}
            data-state="loading"
            ref={(el: HTMLDivElement | null) => { stateRefs.current!.loading = el; }}
          >
            <div className={styles.cxSkbar} />
            <div className={styles.cxSkbar} />
            <div className={styles.cxSkbar} />
          </div>
          <div
            className={styles.cxState}
            data-state="fail"
            ref={(el: HTMLDivElement | null) => { stateRefs.current!.fail = el; }}
          >
            <span className={styles.cxIcon + ' ' + styles.cxIconFail} aria-hidden="true" />
            <p className={styles.cxMsg}>그래프를 불러오지 못했습니다</p>
          </div>
          <div
            className={styles.cxState}
            data-state="empty"
            ref={(el: HTMLDivElement | null) => { stateRefs.current!.empty = el; }}
          >
            <span className={styles.cxIcon + ' ' + styles.cxIconEmpty} aria-hidden="true" />
            <p className={styles.cxMsg}>표시할 데이터가 없습니다</p>
          </div>
          <div
            className={styles.cxState}
            data-state="success"
            ref={(el: HTMLDivElement | null) => { stateRefs.current!.success = el; }}
          >
            <div className={styles.cxBar + ' ' + styles.cxBarA} />
            <div className={styles.cxBar + ' ' + styles.cxBarB} />
            <div className={styles.cxBar + ' ' + styles.cxBarC} />
          </div>
        </div>
        <button type="button" className={styles.cxRetry} ref={retryRef}>다시 시도</button>
      </div>
    </main>
  );
}
