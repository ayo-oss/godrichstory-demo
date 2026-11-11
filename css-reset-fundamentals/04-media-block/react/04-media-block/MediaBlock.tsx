// MediaBlock — vanilla 판(run/376/demo/04-media-block/index.html) 의 React 포트.
// 틀 너비를 핸들로 끌면 두 이미지의 실제 렌더 폭(getBoundingClientRect)을 다시 재
// "그대로 이미지" 는 자연 폭을 지키다 넘치고 "맞춤 이미지" 는 max-width:100% 로 줄어드는
// 차이를 초과 px 문구로 보여준다.
import { useEffect, useRef } from "react";
import styles from "./MediaBlock.module.scss";

type Box<T> = { current: T };

const MIN_FRAME_PX = 130;
const MAX_FRAME_PX = 230;
const SAMPLE_SVG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='64'><rect width='220' height='64' fill='%23ffd23f'/><circle cx='186' cy='16' r='11' fill='%23ff9ebb'/><polygon points='0,64 52,22 104,64' fill='%23c93000'/><polygon points='62,64 138,16 214,64' fill='%2317141a'/><rect y='56' width='220' height='8' fill='%232f6df6'/></svg>";

export default function MediaBlock() {
  const wrapRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const rawFrameRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const rawImgRef = useRef(null) as unknown as Box<HTMLImageElement>;
  const fitFrameRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const fitImgRef = useRef(null) as unknown as Box<HTMLImageElement>;
  const handleRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const readoutRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wrap = wrapRef.current;
    const rawFrame = rawFrameRef.current;
    const rawImg = rawImgRef.current;
    const fitFrame = fitFrameRef.current;
    const fitImg = fitImgRef.current;
    const handle = handleRef.current;
    const readout = readoutRef.current;
    if (!wrap || !rawFrame || !rawImg || !fitFrame || !fitImg || !handle || !readout) return;

    let isDemo = true;
    let frameW = 180;

    function apply() {
      rawFrame!.style.width = frameW + "px";
      fitFrame!.style.width = frameW + "px";
      const fitW = fitImg!.getBoundingClientRect().width;
      const rawW = rawImg!.getBoundingClientRect().width;
      const over = Math.max(0, Math.round(rawW - frameW));
      readout!.textContent = "틀 " + Math.round(frameW) + "px · 그대로 " + Math.round(rawW) +
        "px (초과 " + over + "px) · 맞춤 " + Math.round(fitW) + "px";
    }

    let start = 0;
    function loop(ts: number) {
      if (!start) start = ts;
      if (isDemo && !reduce) { frameW = 180 + 50 * Math.sin((ts - start) / 900); }
      apply();
      rafRef.current = requestAnimationFrame(loop);
    }

    function human() { if (isDemo) { wrap!.classList.remove(styles.isDemo); isDemo = false; } }

    function onMove(e: PointerEvent) {
      const rect = fitFrame!.getBoundingClientRect();
      frameW = Math.min(MAX_FRAME_PX, Math.max(MIN_FRAME_PX, e.clientX - rect.left));
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    function onDown(e: PointerEvent) {
      human();
      e.preventDefault();
      onMove(e);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    }
    handle.addEventListener("pointerdown", onDown as unknown as EventListener);

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      handle!.removeEventListener("pointerdown", onDown as unknown as EventListener);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={wrapRef}>
        <div className={styles.row}>
          <span className={styles.rowLabel}>그대로 이미지</span>
          <div className={styles.frame + " " + styles.rawFrame} ref={rawFrameRef}>
            <img className={styles.rawImg} ref={rawImgRef} alt="풍경 샘플 이미지" src={SAMPLE_SVG} />
          </div>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>맞춤 이미지</span>
          <div className={styles.frame + " " + styles.fitFrame} ref={fitFrameRef}>
            <img className={styles.fitImg} ref={fitImgRef} alt="풍경 샘플 이미지" src={SAMPLE_SVG} />
            <div className={styles.handle} ref={handleRef} role="separator" aria-label="틀 너비 조절"></div>
          </div>
        </div>
        <div className={styles.readout} ref={readoutRef}>틀 —px</div>
      </div>
    </main>
  );
}
