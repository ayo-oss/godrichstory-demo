// ImageWarp — vanilla 판(run/079/demo/09-follow-image-warp/index.html) 의 React 포트.
// 커서의 매 프레임 이동량을 재 skewX 로 방향별로 비틀고 scale 로 늘렸다가,
// 속도가 죽으면 lerp 로 0으로 되돌아간다. 왜곡은 그림 안쪽에만 두고 테두리는 그대로 둔다.
// 계수·상한(±11deg · 1.14)은 vanilla 와 같은 값이다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ImageWarp.module.scss";

export type ImageWarpProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// 전역 DOM 타입에 기대지 않는다 — 포인터 이벤트에서 실제로 읽는 것만 적는다
type PtrEvt = { clientX: number; clientY: number };

const FIELD_LABEL = "새벽 풍경 그림이 커서 속도에 따라 늘어났다 되돌아오는 그림";
const HINT = "마우스를 빠르게 움직이면 그림이 늘어났다 돌아옵니다";

// lerp: 매 프레임 남은 거리의 일부만 더 가는 선형 보간
function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

export default function ImageWarp({
  duration = 2000,
  easing = "ease-out",
  color = "#fff7e6",
}: ImageWarpProps) {
  const artRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement>;
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    const art = artRef.current;
    if (!art) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 커서의 매 프레임 이동량(속도)을 부드럽게 쌓는다 — 멈추면 0으로 꺼진다
    let vx = 0;
    let vy = 0;
    let sx = 0;
    let sy = 0;
    let last: { x: number; y: number } | null = null;

    function setFromPointer(cx: number, cy: number): void {
      if (last) {
        vx = cx - last.x;
        vy = cy - last.y;
      }
      last = { x: cx, y: cy };
    }

    function tick(): void {
      // 속도를 매 프레임 12%씩만 남긴다 — 커서가 멈추면 왜곡이 스르르 풀린다
      sx = lerp(sx, vx, 0.24);
      sy = lerp(sy, vy, 0.24);
      vx = lerp(vx, 0, 0.12);
      vy = lerp(vy, 0, 0.12);
      const skew = Math.max(-11, Math.min(11, sx * 0.32));
      const stretch = 1 + Math.min(0.14, Math.abs(sx) * 0.011 + Math.abs(sy) * 0.009);
      art.style.transform = "skewX(" + skew.toFixed(2) + "deg) scale(" + stretch.toFixed(3) + ")";
      raf = requestAnimationFrame(tick);
    }

    function onMove(event: PtrEvt): void {
      setDemo(false);
      setFromPointer(event.clientX, event.clientY);
    }
    function onDown(event: PtrEvt): void {
      setDemo(false);
      last = null;
      setFromPointer(event.clientX, event.clientY);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);

    let raf = 0;
    if (reduce) {
      // reduce 에서는 왜곡 없이 원본 비율로 보인다
      art.style.transform = "skewX(0deg) scale(1)";
    } else {
      raf = requestAnimationFrame(tick);
    }
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.root + (demo ? " " + styles.isDemo : "")} style={vars}>
        <div className={styles.field} role="img" aria-label={FIELD_LABEL}>
          <div className={styles.frame}>
            <div className={styles.art} ref={artRef}>
              <span className={styles.sun} aria-hidden="true"></span>
              <span className={styles.ridge + " " + styles.ridgeFar} aria-hidden="true"></span>
              <span className={styles.ridge + " " + styles.ridgeNear} aria-hidden="true"></span>
            </div>
          </div>
        </div>
        <p className={styles.hint}>{HINT}</p>
      </div>
    </main>
  );
}
