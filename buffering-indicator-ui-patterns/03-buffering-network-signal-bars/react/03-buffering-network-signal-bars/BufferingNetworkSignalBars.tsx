import { useEffect, useRef } from 'react';
import styles from './BufferingNetworkSignalBars.module.scss';

const BAR_COUNT = 5;
const TICK_MS = 90; // 신호 재측정 간격
const CHANGE_MARGIN = 0.6; // 히스테리시스 — 표시 레벨을 바꾸려면 이만큼은 벌어져야 한다(레벨 단위)
const HOLD_TICKS = 3; // 새 레벨이 이 틱 수만큼 계속 유지돼야 실제로 바뀐다
const LABELS = ['신호 약함', '신호 약함', '신호 보통', '신호 양호', '신호 강함'];

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

export default function BufferingNetworkSignalBars() {
  const meterRef = useRef<HTMLDivElement>(null);
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const readoutRef = useRef<HTMLParagraphElement>(null);
  const pinBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const meter = meterRef.current;
    const readout = readoutRef.current;
    const pinBtn = pinBtnRef.current;
    const bars = barRefs.current;
    if (!meter || !readout || !pinBtn || !bars) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let displayLevel = 2;
    let pendingLevel = 2;
    let pendingCount = 0;
    let pinned: number | null = null;

    // 결정론적 합성파로 "속도"를 흉내내고, 그 값을 0~5 레벨로 양자화한 뒤 히스테리시스를 거친다
    function rawSpeed(ms: number) {
      const w = 0.5 + 0.5 * Math.sin(ms / 700) + 0.25 * Math.sin(ms / 233) + 0.15 * Math.sin(ms / 97);
      return clamp(w, 0, 1.35);
    }

    function paint(level: number) {
      bars!.forEach((b, i) => {
        if (b) b.style.setProperty('--bar-level', i < level ? '1' : '.22');
      });
      if (readout) readout.textContent = LABELS[clamp(level, 0, 4)];
      if (meter) meter.setAttribute('aria-label', '네트워크 신호 세기 ' + level + ' / ' + BAR_COUNT);
    }

    function tick(ms: number) {
      if (pinned !== null) return;
      const raw = rawSpeed(ms) * BAR_COUNT;
      const targetLevel = clamp(Math.round(raw), 0, BAR_COUNT);
      if (targetLevel !== displayLevel && Math.abs(raw - displayLevel) > CHANGE_MARGIN) {
        if (targetLevel === pendingLevel) {
          pendingCount++;
        } else {
          pendingLevel = targetLevel;
          pendingCount = 1;
        }
        if (pendingCount >= HOLD_TICKS) {
          displayLevel = pendingLevel;
          pendingCount = 0;
        }
      } else {
        pendingCount = 0;
        pendingLevel = displayLevel;
      }
      paint(displayLevel);
    }

    let timer: ReturnType<typeof window.setInterval> | null = null;
    let start = 0;
    function loop() {
      tick(performance.now() - start);
    }

    function human() {
      if (meter && meter.classList.contains(styles['is-demo'])) {
        meter.classList.remove(styles['is-demo']);
        if (timer !== null) window.clearInterval(timer);
        timer = null;
      }
    }

    function onPin() {
      human();
      if (!pinBtn) return;
      if (pinned === null) {
        pinned = displayLevel;
        pinBtn.setAttribute('aria-pressed', 'true');
        pinBtn.textContent = '고정 풀기';
      } else {
        pinned = null;
        pinBtn.setAttribute('aria-pressed', 'false');
        pinBtn.textContent = '이 세기로 고정';
      }
    }
    pinBtn.addEventListener('click', onPin);

    if (!reduce) {
      start = performance.now();
      tick(0);
      timer = window.setInterval(loop, TICK_MS);
    } else {
      // reduce: 실사용 경로 — 막대 높이 전환은 멈추고 마지막 측정 레벨 하나로 고정해 보여준다
      paint(3);
    }

    return () => {
      if (timer !== null) window.clearInterval(timer);
      pinBtn.removeEventListener('click', onPin);
    };
  }, []);

  return (
    <>
      <div className={`${styles.meter} ${styles['is-demo']}`} ref={meterRef} role="img" aria-label="네트워크 신호 세기">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={styles.bar} ref={(el: HTMLSpanElement | null) => { if (barRefs.current) barRefs.current[i] = el; }} />
        ))}
      </div>
      <p className={styles.readout} ref={readoutRef}>신호 보통</p>
      <button className={styles.pinBtn} ref={pinBtnRef} type="button" aria-pressed="false">이 세기로 고정</button>
    </>
  );
}
