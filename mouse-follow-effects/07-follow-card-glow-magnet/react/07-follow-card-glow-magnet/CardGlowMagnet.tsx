// CardGlowMagnet — vanilla 판(run/079/demo/07-follow-card-glow-magnet/index.html) 의 React 포트.
// radial-gradient 글로우 링이 var(--gx)/var(--gy) 로 커서를 쫓고(lerp 0.14),
// 카드는 translate3d 만으로 커서 쪽에 최대 7px 붙는다 (3D 기울임 rotateX/rotateY 는 쓰지 않는다).
// --gx/--gy 는 링 '자신'에게 설정한다 (부모에 두면 상속 규칙에 걸린다). 값은 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CardGlowMagnet.module.scss";

export type CardGlowMagnetProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// 전역 DOM 타입에 기대지 않는다 — 포인터 이벤트에서 실제로 읽는 것만 적는다
type PtrEvt = { clientX: number; clientY: number };

const WRAP_LABEL = "카드 안에서 빛 고리가 커서를 쫓고 카드가 커서 쪽으로 살짝 붙는 그림";
const TITLE = "따라오는 카드";
const DESC = "빛 고리가 커서를 쫓고 카드가 붙는다";
const HINT = "카드 위에서 마우스를 움직여 보세요";

// lerp: 매 프레임 남은 거리의 일부만 더 가는 선형 보간
function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

export default function CardGlowMagnet({
  duration = 2000,
  easing = "ease-out",
  color = "#17141a",
}: CardGlowMagnetProps) {
  const cardRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement>;
  const ringRef = useRef<HTMLSpanElement | null>(null);
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 링의 목표(카드 안 좌표)와 지금 위치, 카드가 붙을 방향
    const t = { x: 0, y: 0 };
    const p = { x: 0, y: 0 };
    const pull = { x: 0, y: 0 };
    const pullNow = { x: 0, y: 0 };

    function setTarget(cx: number, cy: number): void {
      const r = card.getBoundingClientRect();
      t.x = Math.min(r.width, Math.max(0, cx - r.left));
      t.y = Math.min(r.height, Math.max(0, cy - r.top));
      // 카드 중심에서 커서 쪽으로 최대 7px 만 붙는다 (3D 기울임 없이 이동만)
      pull.x = Math.max(-7, Math.min(7, (t.x - r.width / 2) * 0.09));
      pull.y = Math.max(-7, Math.min(7, (t.y - r.height / 2) * 0.12));
    }

    function draw(): void {
      const ring = ringRef.current;
      if (ring) {
        // --gx/--gy 는 링 '자신'에게 설정한다 (부모에 두면 상속 규칙에 걸린다)
        ring.style.setProperty("--gx", p.x.toFixed(1));
        ring.style.setProperty("--gy", p.y.toFixed(1));
      }
      card.style.transform = "translate3d(" + pullNow.x.toFixed(1) + "px," + pullNow.y.toFixed(1) + "px,0)";
    }

    function tick(): void {
      p.x = lerp(p.x, t.x, 0.14);
      p.y = lerp(p.y, t.y, 0.14);
      pullNow.x = lerp(pullNow.x, pull.x, 0.1);
      pullNow.y = lerp(pullNow.y, pull.y, 0.1);
      draw();
      raf = requestAnimationFrame(tick);
    }

    function home(): void {
      const r = card.getBoundingClientRect();
      t.x = r.width * 0.5;
      t.y = r.height * 0.5;
      p.x = r.width * 0.5;
      p.y = r.height * 0.5;
      pull.x = 0;
      pull.y = 0;
      pullNow.x = 0;
      pullNow.y = 0;
    }

    function onMove(event: PtrEvt): void {
      setDemo(false);
      setTarget(event.clientX, event.clientY);
      if (reduce) {
        // reduce 에서는 고리가 카드 한가운데에 머물고 카드는 움직이지 않는다
        p.x = t.x;
        p.y = t.y;
        pull.x = 0;
        pull.y = 0;
        pullNow.x = 0;
        pullNow.y = 0;
        draw();
      }
    }
    function onDown(event: PtrEvt): void {
      setDemo(false);
      setTarget(event.clientX, event.clientY);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);

    let raf = 0;
    home();
    draw();
    if (!reduce) raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.root + (demo ? " " + styles.isDemo : "")} style={vars}>
        <div className={styles.wrap} role="img" aria-label={WRAP_LABEL}>
          <div className={styles.card} ref={cardRef}>
            <span className={styles.ring} aria-hidden="true" ref={ringRef}></span>
            <p className={styles.title}>{TITLE}</p>
            <p className={styles.desc}>{DESC}</p>
            <span className={styles.dots} aria-hidden="true"><i></i><i></i><i></i></span>
          </div>
        </div>
        <p className={styles.hint}>{HINT}</p>
      </div>
    </main>
  );
}
