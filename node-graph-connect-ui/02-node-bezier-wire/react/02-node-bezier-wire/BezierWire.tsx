import { useEffect, useRef, useState } from "react";
import styles from "./BezierWire.module.scss";

export type BezierWireProps = { duration?: number; easing?: string; color?: string };

const OUT = { x: 140, y: 46 };        // 보내는 점
const BASE_IN = { x: 196, y: 124 };   // 뒤 노드가 「가깝게」 자리에 있을 때의 받는 점
const SHIFT = { near: 0, far: 66 };   // 뒤 노드를 오른쪽으로 미는 거리

// 3차 베지어 — 손잡이는 두 점의 가로 거리의 절반, 최소 40.
// 손잡이가 두 점에서 수평으로 뻗으므로 선은 항상 포트 옆구리로 빠진다.
function wirePath(x1: number, y1: number, x2: number, y2: number): { d: string; handle: number } {
  const h = Math.max(40, Math.abs(x2 - x1) * 0.5);
  return { d: `M${x1},${y1} C${x1 + h},${y1} ${x2 - h},${y2} ${x2},${y2}`, handle: h };
}

export default function BezierWire({
  duration = 2000,
  easing = "ease-out",
  color = "#ffd23f",
}: BezierWireProps) {
  const [demo, setDemo] = useState(true);
  const [kind, setKind] = useState("far");
  const [len, setLen] = useState(0);
  const wireRef = useRef<SVGPathElement>(null);

  const shift = kind === "far" ? SHIFT.far : SHIFT.near;
  const inX = BASE_IN.x + shift;
  const wire = wirePath(OUT.x, OUT.y, inX, BASE_IN.y);

  useEffect(() => {
    const el = wireRef.current;
    if (el) setLen(el.getTotalLength());   // 선 길이를 재서 점선 한 칸으로 만든다
  }, [wire.d]);

  const pick = (next: string) => { setDemo(false); setKind(next); };

  return (
    <main className={styles.stage}>
      <div className={styles.ng}>
        <svg className={styles.svg} viewBox="0 0 400 180" role="group" aria-label="두 노드를 잇는 곡선 한 줄">

          <path
            ref={wireRef}
            className={styles.wire}
            fill="none"
            d={wire.d}
            style={{
              stroke: color,
              "--len": len,
              ...(demo
                ? {
                    animationName: "ngWireDraw",
                    animationDuration: `${duration}ms`,
                    animationTimingFunction: easing,
                    animationIterationCount: "infinite",
                    animationFillMode: "backwards",
                  }
                : {}),
            }}
          />

          <g className={styles.node}>
            <rect x="12" y="20" width="128" height="52" rx="12"/>
            <svg x="26" y="36" width="20" height="20" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M216,80c0,26.51-39.4,48-88,48S40,106.51,40,80s39.4-48,88-48S216,53.49,216,80Z" opacity="0.2"/><path d="M128,24C74.17,24,32,48.6,32,80v96c0,31.4,42.17,56,96,56s96-24.6,96-56V80C224,48.6,181.83,24,128,24Zm80,104c0,9.62-7.88,19.43-21.61,26.92C170.93,163.35,150.19,168,128,168s-42.93-4.65-58.39-13.08C55.88,147.43,48,137.62,48,128V111.36c17.06,15,46.23,24.64,80,24.64s62.94-9.68,80-24.64ZM69.61,53.08C85.07,44.65,105.81,40,128,40s42.93,4.65,58.39,13.08C200.12,60.57,208,70.38,208,80s-7.88,19.43-21.61,26.92C170.93,115.35,150.19,120,128,120s-42.93-4.65-58.39-13.08C55.88,99.43,48,89.62,48,80S55.88,60.57,69.61,53.08ZM186.39,202.92C170.93,211.35,150.19,216,128,216s-42.93-4.65-58.39-13.08C55.88,195.43,48,185.62,48,176V159.36c17.06,15,46.23,24.64,80,24.64s62.94-9.68,80-24.64V176C208,185.62,200.12,195.43,186.39,202.92Z"/></svg>
            <text className={styles.nm} x="54" y="46">고객 목록</text>
            <circle className={styles.portOut} cx="140" cy="46" r="6"/>
          </g>

          <g className={styles.node} transform={`translate(${shift},0)`}>
            <rect x="196" y="98" width="120" height="52" rx="12"/>
            <svg x="210" y="114" width="20" height="20" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M223.69,42.18l-58.22,192a8,8,0,0,1-14.92,1.25L108,148,20.58,105.45a8,8,0,0,1,1.25-14.92l192-58.22A8,8,0,0,1,223.69,42.18Z" opacity="0.2"/><path d="M227.32,28.68a16,16,0,0,0-15.66-4.08l-.15,0L19.57,82.84a16,16,0,0,0-2.49,29.8L102,154l41.3,84.87A15.86,15.86,0,0,0,157.74,248q.69,0,1.38-.06a15.88,15.88,0,0,0,14-11.51l58.2-191.94c0-.05,0-.1,0-.15A16,16,0,0,0,227.32,28.68ZM157.83,231.85l-.05.14,0-.07-40.06-82.3,48-48a8,8,0,0,0-11.31-11.31l-48,48L24.08,98.25l-.07,0,.14,0L216,40Z"/></svg>
            <text className={styles.nm} x="238" y="124">메일 보내기</text>
            <circle className={styles.portIn} cx="196" cy="124" r="6"/>
          </g>

          <text className={styles.cap} x="14" y="170">
            <tspan className={styles.capk}>가로 거리</tspan>
            <tspan className={styles.capv} dx="8">{inX - OUT.x}</tspan>
            <tspan className={styles.capk} dx="14">손잡이</tspan>
            <tspan className={styles.capv} dx="8">{Math.round(wire.handle)}</tspan>
          </text>
        </svg>

        <div className={styles.bar}>
          <button
            type="button"
            className={`${styles.btn} ${kind === "near" ? styles.isOn : ""}`}
            aria-pressed={kind === "near"}
            onClick={() => pick("near")}
          >가깝게</button>
          <button
            type="button"
            className={`${styles.btn} ${kind === "far" ? styles.isOn : ""}`}
            aria-pressed={kind === "far"}
            onClick={() => pick("far")}
          >멀게</button>
        </div>
      </div>
    </main>
  );
}
