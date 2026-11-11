import { useEffect, useRef } from 'react';
import styles from './ReducedMotionInstant.module.scss';

const OPEN_MS = 420;
const CLOSE_MS = 320;
const HOLD_MS = 380;
const LOOP_MS = 2000;

export default function ReducedMotionInstant() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene0 = sceneRef.current;
    if (!scene0) return undefined;
    const backdrop0 = scene0.querySelector<HTMLDivElement>('.' + styles.backdrop);
    const lightbox0 = scene0.querySelector<HTMLDivElement>('.' + styles.lightbox);
    const fullImg0 = scene0.querySelector<HTMLSpanElement>('.' + styles.fullImg);
    const modeNote0 = scene0.querySelector<HTMLParagraphElement>('.' + styles.modeNote);
    const closeBtn0 = scene0.querySelector<HTMLButtonElement>('.' + styles.closeBtn);
    const thumb0 = scene0.querySelector<HTMLButtonElement>('.' + styles.thumb);
    const switchBtn0 = scene0.querySelector<HTMLButtonElement>('.' + styles.switch);
    const switchLabel0 = scene0.querySelector<HTMLParagraphElement>('.' + styles.switchLabel);
    if (!backdrop0 || !lightbox0 || !fullImg0 || !modeNote0 || !closeBtn0 || !thumb0 || !switchBtn0 || !switchLabel0) return undefined;
    const scene = scene0;
    const backdrop = backdrop0;
    const lightbox = lightbox0;
    const fullImg = fullImg0;
    const modeNote = modeNote0;
    const closeBtn = closeBtn0;
    const thumb = thumb0;
    const switchBtn = switchBtn0;
    const switchLabel = switchLabel0;

    // 실제 OS/브라우저 설정 — 이 값이 true 면 시뮬레이션 스위치와 무관하게 항상 즉시 전환한다
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    let realReduce = mql.matches;
    // 시연용 시뮬레이션 스위치 — 실제 설정이 "보통"이어도 이 편의 라이트박스만 강제로 즉시 전환해 차이를 비교한다
    let simulateReduce = false;

    function effectiveReduce() { return realReduce || simulateReduce; }

    let open = false;
    let timers: number[] = [];

    function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }
    function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

    function animate(duration: number, onFrame: (e: number) => void, onDone?: () => void) {
      if (effectiveReduce()) { onFrame(1); if (onDone) onDone(); return; }
      const start = performance.now();
      function frame(now: number) {
        const p = clamp((now - start) / duration, 0, 1);
        onFrame(easeOutCubic(p));
        if (p < 1) requestAnimationFrame(frame);
        else if (onDone) onDone();
      }
      requestAnimationFrame(frame);
    }

    function updateSwitchUI() {
      switchBtn.setAttribute('aria-checked', simulateReduce ? 'true' : 'false');
      switchBtn.classList.toggle(styles['is-on'], simulateReduce);
      if (realReduce) {
        switchLabel.textContent = '실제 설정: 모션 줄이기 켜짐';
      } else {
        switchLabel.textContent = simulateReduce ? '모션 줄이기 시뮬레이션 켜짐' : '모션 보통';
      }
    }

    function setSimulate(on: boolean) {
      simulateReduce = on;
      updateSwitchUI();
    }

    function openFrom() {
      if (open) return;
      open = true;
      const reduceNow = effectiveReduce();
      modeNote.textContent = reduceNow ? '즉시 전환 (모션 줄이기)' : '보통 모션으로 열림';
      fullImg.style.transform = 'scale(.82)';
      fullImg.style.opacity = '0';
      lightbox.style.visibility = 'visible';
      lightbox.setAttribute('aria-hidden', 'false');
      backdrop.style.visibility = 'visible';
      animate(OPEN_MS, (e) => {
        fullImg.style.transform = 'scale(' + (0.82 + 0.18 * e).toFixed(4) + ')';
        fullImg.style.opacity = e.toFixed(3);
        backdrop.style.opacity = (0.74 * e).toFixed(3);
      }, () => {
        closeBtn.focus({ preventScroll: true });
      });
    }

    function closeLightbox() {
      if (!open) return;
      animate(CLOSE_MS, (e) => {
        fullImg.style.opacity = (1 - e).toFixed(3);
        backdrop.style.opacity = (0.74 * (1 - e)).toFixed(3);
      }, () => {
        lightbox.style.visibility = 'hidden';
        lightbox.setAttribute('aria-hidden', 'true');
        backdrop.style.visibility = 'hidden';
        open = false;
        thumb.focus({ preventScroll: true });
      });
    }

    function human() {
      if (scene.classList.contains(styles['is-demo'])) {
        scene.classList.remove(styles['is-demo']);
        timers.forEach((id) => { window.clearTimeout(id); window.clearInterval(id); });
        timers = [];
      }
    }

    function onThumbClick() { human(); openFrom(); }
    function onCloseClick() { human(); closeLightbox(); }
    function onBackdropClick() { human(); closeLightbox(); }
    function onSwitchClick() { human(); setSimulate(!simulateReduce); }
    function onKeydown(e: KeyboardEvent) {
      if (open && e.key === 'Escape') { human(); closeLightbox(); }
    }
    thumb.addEventListener('click', onThumbClick);
    closeBtn.addEventListener('click', onCloseClick);
    backdrop.addEventListener('click', onBackdropClick);
    switchBtn.addEventListener('click', onSwitchClick);
    document.addEventListener('keydown', onKeydown);

    // 실제 설정이 바뀌면(운영체제·브라우저 쪽) 즉시 반영한다 — 시뮬레이션과 별개의 진짜 경로
    function onRealChange(e: MediaQueryListEvent) {
      realReduce = e.matches;
      updateSwitchUI();
    }
    if (mql.addEventListener) mql.addEventListener('change', onRealChange);

    function cycle() {
      setSimulate(false);
      openFrom();
      timers.push(window.setTimeout(closeLightbox, OPEN_MS + HOLD_MS));
      timers.push(window.setTimeout(() => {
        setSimulate(true);
        openFrom();
      }, OPEN_MS + HOLD_MS + CLOSE_MS + 160));
      timers.push(window.setTimeout(closeLightbox, OPEN_MS + HOLD_MS + CLOSE_MS + 160 + HOLD_MS));
    }

    updateSwitchUI();
    if (!realReduce) {
      cycle();
      timers.push(window.setInterval(() => {
        if (scene.classList.contains(styles['is-demo'])) cycle();
      }, LOOP_MS));
    } else {
      // 실제 설정이 이미 줄이기라면 루프를 돌리지 않고 정적 상태로 둔다 — 실사용 경로 그대로
      modeNote.textContent = '즉시 전환 (모션 줄이기)';
    }

    return () => {
      timers.forEach((id) => { window.clearTimeout(id); window.clearInterval(id); });
      thumb.removeEventListener('click', onThumbClick);
      closeBtn.removeEventListener('click', onCloseClick);
      backdrop.removeEventListener('click', onBackdropClick);
      switchBtn.removeEventListener('click', onSwitchClick);
      document.removeEventListener('keydown', onKeydown);
      if (mql.removeEventListener) mql.removeEventListener('change', onRealChange);
    };
  }, []);

  return (
    <div className={`${styles.scene} ${styles['is-demo']}`} ref={sceneRef}>
      <div className={styles.switchRow}>
        <button className={styles.switch} type="button" role="switch" aria-checked="false" aria-label="모션 줄이기 시뮬레이션">
          <span className={styles.switchKnob} />
        </button>
        <p className={styles.switchLabel}>모션 보통</p>
      </div>
      <ul className={styles.grid}>
        <li><button className={styles.thumb} type="button" aria-haspopup="dialog"><span className={styles.thumbImg} /></button></li>
      </ul>
      <div className={styles.backdrop} />
      <div className={styles.lightbox} role="dialog" aria-modal="true" aria-hidden="true" aria-label="모션 줄이기 비교">
        <span className={styles.fullImg} />
        <p className={styles.modeNote}>보통 모션으로 열림</p>
        <button className={styles.closeBtn} type="button">닫기</button>
      </div>
    </div>
  );
}
