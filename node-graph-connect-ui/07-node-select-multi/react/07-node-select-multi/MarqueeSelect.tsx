import { useRef, useState } from "react";
import styles from "./MarqueeSelect.module.scss";

export type MarqueeSelectProps = { duration?: number; easing?: string; color?: string };

// ambient 에 React 이벤트 제네릭이 없다 — 필요한 것만 로컬 타입으로 선언한다
type PointerEvt = { clientX: number; clientY: number; pointerId: number; target: any; preventDefault(): void };
type Box<T> = { current: T };
type Rect = { x: number; y: number; w: number; h: number };

const VIEW_W = 400;
const VIEW_H = 196;
const DIGIT_H = 12;
const NODES = [
  { key: "a", name: "받기", left: "20%", top: "16%" },
  { key: "b", name: "거르기", left: "56%", top: "20%" },
  { key: "c", name: "보내기", left: "24%", top: "60%" },
  { key: "d", name: "저장", left: "70%", top: "62%" },
];
const COUNTS = ["0개 선택", "1개 선택", "2개 선택", "3개 선택", "4개 선택"];
const LIVE = ["노드 0개 선택", "노드 1개 선택", "노드 2개 선택", "노드 3개 선택", "노드 4개 선택"];

export default function MarqueeSelect({ duration = 2000, easing = "ease-out", color = "#2f6df6" }: MarqueeSelectProps) {
  const [demo, setDemo] = useState(true);
  const [picked, setPicked] = useState<boolean[]>([false, false, false, false]);
  const [rect, setRect] = useState<Rect | null>(null);
  const canvasRef = useRef<any>(null) as Box<any>;
  const nodeRefs = useRef<any[]>([]) as Box<any[]>;
  const startRef = useRef<{ x: number; y: number } | null>(null) as Box<{ x: number; y: number } | null>;

  const count = picked.filter(Boolean).length;
  const rootStyle = { "--ngDur": duration + "ms", "--ngEase": easing, "--ngColor": color } as { [k: string]: string };

  function onDown(e: PointerEvt) {
    if (e.target && e.target.closest && e.target.closest("[data-node]")) return;   // 빈 바닥에서만 시작
    setDemo(false);
    const c = canvasRef.current.getBoundingClientRect();
    startRef.current = { x: e.clientX - c.left, y: e.clientY - c.top };
    canvasRef.current.setPointerCapture(e.pointerId);
    setRect({ x: (startRef.current.x / c.width) * VIEW_W, y: (startRef.current.y / c.height) * VIEW_H, w: 0, h: 0 });
    e.preventDefault();
  }
  function onMove(e: PointerEvt) {
    const s = startRef.current;
    if (!s) return;
    const c = canvasRef.current.getBoundingClientRect();
    const cx = e.clientX - c.left;
    const cy = e.clientY - c.top;
    // 어느 방향으로 끌어도 되게 정규화한다 — 두 점 중 작은 쪽이 좌상단, 차의 절댓값이 크기다
    const x = Math.min(s.x, cx);
    const y = Math.min(s.y, cy);
    const w = Math.abs(cx - s.x);
    const h = Math.abs(cy - s.y);
    setRect({ x: (x / c.width) * VIEW_W, y: (y / c.height) * VIEW_H, w: (w / c.width) * VIEW_W, h: (h / c.height) * VIEW_H });
    setPicked(
      nodeRefs.current.map(function (el: any) {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.left - c.left < x + w && r.right - c.left > x && r.top - c.top < y + h && r.bottom - c.top > y;
      })
    );
  }
  function onUp() {
    startRef.current = null;
    setRect(null);
  }

  return (
    <main className={styles.stage}>
      <div className={demo ? styles.ng + " " + styles.isDemo : styles.ng} style={rootStyle}>
        <div className={styles.bar}>
          <span className={styles.title}>노드 고르기</span>
          <span className={styles.badge}>
            <span className={styles.num} aria-hidden="true">
              <span
                className={styles.digits}
                style={demo ? undefined : { transform: "translateY(" + -DIGIT_H * count + "px)" }}
              >
                {COUNTS.map((c) => (
                  <i key={c}>{c}</i>
                ))}
              </span>
            </span>
          </span>
        </div>
        <div
          className={styles.canvas}
          ref={(el: any) => { canvasRef.current = el; }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <svg className={styles.layer} viewBox={"0 0 " + VIEW_W + " " + VIEW_H} preserveAspectRatio="none" aria-hidden="true">
            <rect
              className={rect ? styles.marquee + " " + styles.isOn : styles.marquee}
              x={rect ? rect.x : 56}
              y={rect ? rect.y : 20}
              width={rect ? rect.w : 208}
              height={rect ? rect.h : 161}
            />
          </svg>
          {NODES.map((n, i) => (
            <div
              key={n.key}
              data-node={n.key}
              ref={(el: any) => { nodeRefs.current[i] = el; }}
              className={[styles.node, styles["node_" + n.key], picked[i] ? styles.isPicked : ""].join(" ")}
              style={{ left: n.left, top: n.top }}
            >
              <span className={styles.port + " " + styles.portIn} aria-hidden="true" />
              <span className={styles.name}>{n.name}</span>
              <span className={styles.port + " " + styles.portOut} aria-hidden="true" />
              <span className={styles.ring} aria-hidden="true" />
            </div>
          ))}
        </div>
        <p className={styles.sr} aria-live="polite">{LIVE[count]}</p>
      </div>
    </main>
  );
}
