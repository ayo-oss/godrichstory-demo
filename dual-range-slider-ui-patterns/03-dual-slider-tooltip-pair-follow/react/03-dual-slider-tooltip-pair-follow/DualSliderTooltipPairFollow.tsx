import { useEffect, useRef } from 'react';
import styles from './DualSliderTooltipPairFollow.module.scss';

const MIN = 0;
const MAX = 100;
const MERGE_PX = 46;
const TICK_MS = 480;
const PRESETS: [number, number][] = [[44, 52], [10, 90], [38, 44], [15, 70], [58, 63]];

export default function DualSliderTooltipPairFollow() {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const loRef = useRef<HTMLButtonElement>(null);
  const hiRef = useRef<HTMLButtonElement>(null);
  const bLoRef = useRef<HTMLDivElement>(null);
  const bHiRef = useRef<HTMLDivElement>(null);
  const bMergedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const fill = fillRef.current;
    const lo = loRef.current;
    const hi = hiRef.current;
    const bLo = bLoRef.current;
    const bHi = bHiRef.current;
    const bMerged = bMergedRef.current;
    if (!root || !track || !fill || !lo || !hi || !bLo || !bHi || !bMerged) return undefined;

    const v = { lo: 20, hi: 76 };

    // 계산 겹: 두 값 풍선의 실제 화면 간격(px)을 트랙 실측 폭으로 구해 MERGE_PX 보다 좁으면 하나로 합친다.
    function paint() {
      lo!.style.left = v.lo + '%'; hi!.style.left = v.hi + '%';
      fill!.style.left = v.lo + '%'; fill!.style.width = (v.hi - v.lo) + '%';
      bLo!.style.left = v.lo + '%'; bHi!.style.left = v.hi + '%';
      bMerged!.style.left = (v.lo + v.hi) / 2 + '%';
      lo!.setAttribute('aria-valuenow', String(v.lo)); hi!.setAttribute('aria-valuenow', String(v.hi));
      lo!.setAttribute('aria-valuetext', String(v.lo)); hi!.setAttribute('aria-valuetext', String(v.hi));
      bLo!.textContent = String(v.lo); bHi!.textContent = String(v.hi);
      bMerged!.textContent = v.lo + ' – ' + v.hi;
      const r = track!.getBoundingClientRect();
      const gapPx = r.width * (v.hi - v.lo) / 100;
      const merged = gapPx < MERGE_PX;
      root!.classList.toggle(styles['is-merged'], merged);
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
      <div className={styles.ds + ' ' + styles['is-demo']} ref={rootRef}>
        <div className={styles.dsTrack} ref={trackRef}>
          <div className={styles.dsFill} ref={fillRef} />
          <div className={styles.dsBubble + ' ' + styles.dsBubbleLo} ref={bLoRef}>20</div>
          <div className={styles.dsBubble + ' ' + styles.dsBubbleHi} ref={bHiRef}>76</div>
          <div className={styles.dsBubble + ' ' + styles.dsBubbleMerged} ref={bMergedRef}>20 – 76</div>
          <button type="button" className={styles.dsThumb + ' ' + styles.dsThumbLo} ref={loRef} role="slider"
            aria-label="최소값" aria-valuemin={0} aria-valuemax={100} aria-valuenow={20} aria-valuetext="20" tabIndex={0} />
          <button type="button" className={styles.dsThumb + ' ' + styles.dsThumbHi} ref={hiRef} role="slider"
            aria-label="최대값" aria-valuemin={0} aria-valuemax={100} aria-valuenow={76} aria-valuetext="76" tabIndex={0} />
        </div>
      </div>
    </main>
  );
}
