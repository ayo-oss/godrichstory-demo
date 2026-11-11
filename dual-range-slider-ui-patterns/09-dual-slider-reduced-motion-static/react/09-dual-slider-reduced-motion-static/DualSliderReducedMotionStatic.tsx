import { useEffect, useRef } from 'react';
import styles from './DualSliderReducedMotionStatic.module.scss';

const MIN = 0;
const MAX = 100;
const TICK_MS = 480;
const PRESETS: [number, number][] = [[10, 40], [55, 95], [20, 30], [5, 85], [45, 60]];

export default function DualSliderReducedMotionStatic() {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillARef = useRef<HTMLDivElement>(null);
  const fillBRef = useRef<HTMLDivElement>(null);
  const loRef = useRef<HTMLButtonElement>(null);
  const hiRef = useRef<HTMLButtonElement>(null);
  const loBRef = useRef<HTMLSpanElement>(null);
  const hiBRef = useRef<HTMLSpanElement>(null);
  const loOutARef = useRef<HTMLSpanElement>(null);
  const hiOutARef = useRef<HTMLSpanElement>(null);
  const loOutBRef = useRef<HTMLSpanElement>(null);
  const hiOutBRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const fillA = fillARef.current;
    const fillB = fillBRef.current;
    const lo = loRef.current;
    const hi = hiRef.current;
    const loB = loBRef.current;
    const hiB = hiBRef.current;
    const loOutA = loOutARef.current; const hiOutA = hiOutARef.current;
    const loOutB = loOutBRef.current; const hiOutB = hiOutBRef.current;
    if (!root || !track || !fillA || !fillB || !lo || !hi || !loB || !hiB || !loOutA || !hiOutA || !loOutB || !hiOutB) return undefined;

    const v = { lo: 25, hi: 70 };

    // 계산 겹: 같은 상태값 하나를 두 패널에 동시에 그리되, 오른쪽 미리보기는 transition 을 원천적으로 갖지 않아
    // "모션 줄임" 사용자가 보는 즉시-이동 결과를 항상 함께 보여준다 (실제 OS 설정과 무관한 비교용).
    function paint() {
      lo!.style.left = v.lo + '%'; hi!.style.left = v.hi + '%';
      fillA!.style.left = v.lo + '%'; fillA!.style.width = (v.hi - v.lo) + '%';
      loB!.style.left = v.lo + '%'; hiB!.style.left = v.hi + '%';
      fillB!.style.left = v.lo + '%'; fillB!.style.width = (v.hi - v.lo) + '%';
      lo!.setAttribute('aria-valuenow', String(v.lo)); hi!.setAttribute('aria-valuenow', String(v.hi));
      lo!.setAttribute('aria-valuetext', String(v.lo)); hi!.setAttribute('aria-valuetext', String(v.hi));
      loOutA!.textContent = String(v.lo); hiOutA!.textContent = String(v.hi);
      loOutB!.textContent = String(v.lo); hiOutB!.textContent = String(v.hi);
    }
    function setLo(n: number) { v.lo = Math.max(MIN, Math.min(n, v.hi)); paint(); }
    function setHi(n: number) { v.hi = Math.min(MAX, Math.max(n, v.lo)); paint(); }
    function pctFromX(x: number) {
      const r = track!.getBoundingClientRect();
      return Math.round(Math.max(0, Math.min(100, ((x - r.left) / r.width) * 100)));
    }
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

    let pi = 0;
    function tick() {
      const p = PRESETS[pi % PRESETS.length]; pi++;
      v.lo = p[0]; v.hi = p[1]; paint();
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) timer = window.setInterval(tick, TICK_MS);
    paint();

    return () => { offLo(); offHi(); window.clearInterval(timer); };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.cmp}>
        <div className={styles.cmpPanel}>
          <p className={styles.cmpLabel}>일반 모션</p>
          <div className={styles.ds + ' ' + styles['is-demo']} ref={rootRef}>
            <div className={styles.dsTrack} ref={trackRef}>
              <div className={styles.dsFill} ref={fillARef} />
              <button type="button" className={styles.dsThumb + ' ' + styles.dsThumbLo} ref={loRef} role="slider"
                aria-label="최소값" aria-valuemin={0} aria-valuemax={100} aria-valuenow={25} aria-valuetext="25" tabIndex={0} />
              <button type="button" className={styles.dsThumb + ' ' + styles.dsThumbHi} ref={hiRef} role="slider"
                aria-label="최대값" aria-valuemin={0} aria-valuemax={100} aria-valuenow={70} aria-valuetext="70" tabIndex={0} />
            </div>
            <p className={styles.dsReadout}><span ref={loOutARef}>25</span> – <span ref={hiOutARef}>70</span></p>
          </div>
        </div>
        <div className={styles.cmpPanel}>
          <p className={styles.cmpLabel}>축소 모션 미리보기</p>
          <div className={styles.ds + ' ' + styles.dsMirror} aria-hidden="true">
            <div className={styles.dsTrack}>
              <div className={styles.dsFill} ref={fillBRef} />
              <span className={styles.dsThumb + ' ' + styles.dsThumbLo} ref={loBRef} />
              <span className={styles.dsThumb + ' ' + styles.dsThumbHi} ref={hiBRef} />
            </div>
            <p className={styles.dsReadout}><span ref={loOutBRef}>25</span> – <span ref={hiOutBRef}>70</span></p>
          </div>
        </div>
      </div>
    </main>
  );
}
