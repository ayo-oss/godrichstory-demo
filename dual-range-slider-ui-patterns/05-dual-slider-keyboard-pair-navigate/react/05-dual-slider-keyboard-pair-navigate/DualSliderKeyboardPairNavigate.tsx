import { useEffect, useRef } from 'react';
import styles from './DualSliderKeyboardPairNavigate.module.scss';

const MIN = 0;
const MAX = 100;
const TICK_MS = 480;
const SEQ: { which: 'lo' | 'hi'; to: number }[] = [
  { which: 'lo', to: 55 },
  { which: 'hi', to: 60 },
  { which: 'lo', to: 8 },
  { which: 'hi', to: 94 },
  { which: 'lo', to: 24 }
];

export default function DualSliderKeyboardPairNavigate() {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const loRef = useRef<HTMLButtonElement>(null);
  const hiRef = useRef<HTMLButtonElement>(null);
  const loOutRef = useRef<HTMLSpanElement>(null);
  const hiOutRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const fill = fillRef.current;
    const lo = loRef.current;
    const hi = hiRef.current;
    const loOut = loOutRef.current;
    const hiOut = hiOutRef.current;
    const status = statusRef.current;
    if (!root || !track || !fill || !lo || !hi || !loOut || !hiOut || !status) return undefined;

    const v = { lo: 24, hi: 66 };

    function paint() {
      lo!.style.left = v.lo + '%'; hi!.style.left = v.hi + '%';
      fill!.style.left = v.lo + '%'; fill!.style.width = (v.hi - v.lo) + '%';
      lo!.setAttribute('aria-valuenow', String(v.lo)); hi!.setAttribute('aria-valuenow', String(v.hi));
      lo!.setAttribute('aria-valuetext', String(v.lo)); hi!.setAttribute('aria-valuetext', String(v.hi));
      loOut!.textContent = String(v.lo); hiOut!.textContent = String(v.hi);
    }
    function setLo(n: number) { v.lo = Math.max(MIN, Math.min(n, v.hi)); paint(); }
    function setHi(n: number) { v.hi = Math.min(MAX, Math.max(n, v.lo)); paint(); }
    function pctFromX(x: number) {
      const r = track!.getBoundingClientRect();
      return Math.round(Math.max(0, Math.min(100, ((x - r.left) / r.width) * 100)));
    }
    // 계산 겹: focusin/focusout 으로 지금 초점이 어느 핸들인지 추적해 그 핸들만 방향키로 움직인다.
    function setActive(which: 'lo' | 'hi') {
      root!.classList.toggle(styles['is-active-lo'], which === 'lo');
      root!.classList.toggle(styles['is-active-hi'], which === 'hi');
      status!.textContent = which === 'lo' ? 'Tab · 최소값 초점' : 'Tab · 최대값 초점';
    }
    function onFocusLo() { setActive('lo'); }
    function onFocusHi() { setActive('hi'); }
    lo.addEventListener('focusin', onFocusLo);
    hi.addEventListener('focusin', onFocusHi);

    let timer = 0;
    function human() { root!.classList.remove(styles['is-demo']); window.clearInterval(timer); }

    function bindDrag(thumb: HTMLButtonElement, setter: (n: number) => void, isLo: boolean) {
      function onDown(e: PointerEvent) {
        human(); thumb.setPointerCapture(e.pointerId);
        function move(ev: PointerEvent) { setter(pctFromX(ev.clientX)); }
        function up() { thumb.removeEventListener('pointermove', move); thumb.removeEventListener('pointerup', up); }
        thumb.addEventListener('pointermove', move); thumb.addEventListener('pointerup', up);
      }
      function onKey(e: KeyboardEvent) {
        const step = ({ ArrowRight: 1, ArrowLeft: -1, ArrowUp: 1, ArrowDown: -1 } as Record<string, number>)[e.key];
        if (step !== undefined) { e.preventDefault(); human(); setter((isLo ? v.lo : v.hi) + step); }
        else if (e.key === 'Home') { e.preventDefault(); human(); setter(isLo ? MIN : v.lo); }
        else if (e.key === 'End') { e.preventDefault(); human(); setter(isLo ? v.hi : MAX); }
      }
      thumb.addEventListener('pointerdown', onDown);
      thumb.addEventListener('keydown', onKey);
      return () => { thumb.removeEventListener('pointerdown', onDown); thumb.removeEventListener('keydown', onKey); };
    }
    const offLo = bindDrag(lo, setLo, true);
    const offHi = bindDrag(hi, setHi, false);

    let si = 0;
    function tick() {
      const step = SEQ[si % SEQ.length]; si++;
      const el = step.which === 'lo' ? lo! : hi!;
      el.focus({ preventScroll: true });
      setActive(step.which);
      if (step.which === 'lo') setLo(step.to); else setHi(step.to);
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) timer = window.setInterval(tick, TICK_MS);
    paint();

    return () => {
      offLo(); offHi();
      lo!.removeEventListener('focusin', onFocusLo); hi!.removeEventListener('focusin', onFocusHi);
      window.clearInterval(timer);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.ds + ' ' + styles['is-demo']} ref={rootRef}>
        <div className={styles.dsTrack} ref={trackRef}>
          <div className={styles.dsFill} ref={fillRef} />
          <button type="button" className={styles.dsThumb + ' ' + styles.dsThumbLo} ref={loRef} role="slider"
            aria-label="최소값" aria-valuemin={0} aria-valuemax={100} aria-valuenow={24} aria-valuetext="24" tabIndex={0} />
          <button type="button" className={styles.dsThumb + ' ' + styles.dsThumbHi} ref={hiRef} role="slider"
            aria-label="최대값" aria-valuemin={0} aria-valuemax={100} aria-valuenow={66} aria-valuetext="66" tabIndex={0} />
        </div>
        <p className={styles.dsReadout}><span ref={loOutRef}>24</span> – <span ref={hiOutRef}>66</span></p>
        <p className={styles.dsStatus} ref={statusRef} role="status" aria-live="polite">Tab · 최소값 초점</p>
      </div>
    </main>
  );
}
