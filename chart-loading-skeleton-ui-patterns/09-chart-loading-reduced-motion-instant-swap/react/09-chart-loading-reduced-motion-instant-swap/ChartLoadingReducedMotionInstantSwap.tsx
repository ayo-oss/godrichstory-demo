import { useEffect, useRef } from 'react';
import styles from './ChartLoadingReducedMotionInstantSwap.module.scss';

const VALUES = [64, 88, 42, 76];
const STAGGER_MS = 80;
// 시뮬레이션 상태만 표시하는 내부 플래그 클래스 — CSS 규칙이 없어 스타일 모듈 맵을 거치지 않는다(vanilla 와 동일)
const REDUCED_SIM_CLASS = 'crReducedSim';

export default function ChartLoadingReducedMotionInstantSwap() {
  const rootRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const normalRefs = useRef<HTMLDivElement[]>([]);
  const reducedRefs = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    const status = statusRef.current;
    const toggle = toggleRef.current;
    if (!root || !status || !toggle) return undefined;
    const normalBars = normalRefs.current!;
    const reducedBars = reducedRefs.current!;
    if (!normalBars || !reducedBars) return undefined;

    // 계산 겹: 같은 공식에 감쇠 계수(reduced)를 곱한다 — 줄인 모션이면 지연이 전부 0 으로 접힌다
    function barDelay(i: number, reduced: boolean) { return reduced ? 0 : i * STAGGER_MS; }

    normalBars.forEach((bar, i) => {
      bar.style.setProperty('--real', String(VALUES[i] / 100));
      bar.style.setProperty('--phase', barDelay(i, false) + 'ms');
    });
    reducedBars.forEach((bar, i) => {
      bar.style.setProperty('--real', String(VALUES[i] / 100));
      bar.style.setProperty('--phase', barDelay(i, true) + 'ms');
    });

    // 실사용 경로: 브라우저의 실제 설정을 읽는다(시뮬레이션이 아니다)
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');

    function updateStatus() {
      const real = mql.matches;
      const sim = root!.classList.contains(REDUCED_SIM_CLASS);
      const forced = real || sim;
      root!.classList.toggle(styles.crForceInstant, forced);
      if (real) {
        status!.textContent = '설정: 브라우저의 애니메이션 줄이기가 켜져 있습니다';
      } else if (sim) {
        status!.textContent = '설정: 접근성 모드 미리보기 중(시뮬레이션)';
      } else {
        status!.textContent = '설정: 애니메이션 보통';
      }
    }

    type LegacyMql = MediaQueryList & { addListener?: (cb: () => void) => void; removeListener?: (cb: () => void) => void };
    const legacyMql = mql as LegacyMql;
    if (mql.addEventListener) {
      mql.addEventListener('change', updateStatus);
    } else if (legacyMql.addListener) {
      legacyMql.addListener(updateStatus);
    }
    updateStatus();

    // 데모용 시뮬레이션 토글: 실제 OS 설정을 바꾸지 않고도 차이를 미리 보여준다
    function human() {
      root!.classList.remove(styles['is-demo']);
      const next = !root!.classList.contains(REDUCED_SIM_CLASS);
      root!.classList.toggle(REDUCED_SIM_CLASS, next);
      toggle!.setAttribute('aria-pressed', String(next));
      updateStatus();
    }

    function onClick() { human(); }
    function onKey(e: KeyboardEvent) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); human(); } }
    toggle.addEventListener('click', onClick);
    toggle.addEventListener('keydown', onKey);

    return () => {
      toggle.removeEventListener('click', onClick);
      toggle.removeEventListener('keydown', onKey);
      if (mql.removeEventListener) {
        mql.removeEventListener('change', updateStatus);
      } else if (legacyMql.removeListener) {
        legacyMql.removeListener(updateStatus);
      }
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.cr + ' ' + styles['is-demo']} ref={rootRef}>
        <p className={styles.crStatus} ref={statusRef} aria-live="polite">설정: 애니메이션 보통</p>
        <div className={styles.crRow}>
          <div className={styles.crCol}>
            <span className={styles.crLabel}>일반 전환</span>
            <div className={styles.crChart} role="img" aria-label="일반 전환 막대 그래프" aria-busy="true">
              {VALUES.map((_v, i) => (
                <div
                  key={i}
                  className={styles.crBar + ' ' + styles.crBarNormal}
                  ref={(el: HTMLDivElement | null) => { if (el) normalRefs.current![i] = el; }}
                />
              ))}
            </div>
          </div>
          <div className={styles.crCol}>
            <span className={styles.crLabel}>줄인 모션(참고)</span>
            <div className={styles.crChart} role="img" aria-label="줄인 모션 막대 그래프" aria-busy="true">
              {VALUES.map((_v, i) => (
                <div
                  key={i}
                  className={styles.crBar + ' ' + styles.crBarReduced}
                  ref={(el: HTMLDivElement | null) => { if (el) reducedRefs.current![i] = el; }}
                />
              ))}
            </div>
          </div>
        </div>
        <button type="button" className={styles.crToggle} ref={toggleRef} aria-pressed="false">접근성 모드로 미리보기</button>
      </div>
    </main>
  );
}
