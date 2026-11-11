import { useRef, useState } from "react";
import styles from "./PanZoomCanvas.module.scss";

export type PanZoomCanvasProps = { duration?: number; easing?: string; color?: string };

// ambient 에 React 이벤트 제네릭이 없다 — 필요한 것만 로컬 타입으로 선언한다
type PointerEvt = { clientX: number; clientY: number; pointerId: number; target: any; preventDefault(): void };
type Box<T> = { current: T };

const NODES = [
  { key: "a", name: "수집", left: "22%", top: "26%", inPort: false, outPort: true },
  { key: "b", name: "정리", left: "46%", top: "50%", inPort: true, outPort: true },
  { key: "c", name: "전송", left: "70%", top: "20%", inPort: true, outPort: false },
];
const WIRES = ["M168,81 C196,81 156,134 184,134", "M264,134 C292,134 252,67 280,67"];

export default function PanZoomCanvas({ duration = 2000, easing = "ease-out", color = "#2f6df6" }: PanZoomCanvasProps) {
  const [demo, setDemo] = useState(true);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<any>(null) as Box<any>;
  const fromRef = useRef<{ x: number; y: number } | null>(null) as Box<{ x: number; y: number } | null>;

  const rootStyle = { "--ngDur": duration + "ms", "--ngEase": easing, "--ngColor": color } as { [k: string]: string };
  // 격자와 노드 레이어에 **같은 거리**를 준다. 한쪽만 움직이면 바닥이 노드 밑에서 미끄러져 보인다
  const gridStyle = demo ? undefined : { backgroundPosition: pan.x + "px " + pan.y + "px" };
  const worldStyle = demo ? undefined : { transform: "translate(" + pan.x + "px, " + pan.y + "px) scale(" + zoom + ")" };

  function step(next: number) {
    setDemo(false);
    setZoom(Math.min(2, Math.max(0.6, Math.round(next * 10) / 10)));
  }
  function onDown(e: PointerEvt) {
    if (e.target && e.target.closest && e.target.closest("button")) return;
    setDemo(false);
    fromRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    canvasRef.current.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function onMove(e: PointerEvt) {
    const f = fromRef.current;
    if (!f) return;
    setPan({ x: e.clientX - f.x, y: e.clientY - f.y });
  }
  function onUp() {
    fromRef.current = null;
  }

  return (
    <main className={styles.stage}>
      <div className={demo ? styles.ng + " " + styles.isDemo : styles.ng} style={rootStyle}>
        <div
          className={styles.canvas}
          ref={(el: any) => { canvasRef.current = el; }}
          style={gridStyle}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <div className={styles.world} style={worldStyle}>
            <svg className={styles.wires} viewBox="0 0 400 224" preserveAspectRatio="none" aria-hidden="true">
              {WIRES.map((d) => (
                <path key={d} className={styles.wire} d={d} />
              ))}
            </svg>
            {NODES.map((n) => (
              <div key={n.key} className={styles.node} style={{ left: n.left, top: n.top }}>
                {n.inPort ? <span className={styles.port + " " + styles.portIn} aria-hidden="true" /> : null}
                <span className={styles.name}>{n.name}</span>
                {n.outPort ? <span className={styles.port + " " + styles.portOut} aria-hidden="true" /> : null}
              </div>
            ))}
          </div>
          <span className={styles.chip}>격자 바닥</span>
          <div className={styles.tools}>
            <span className={styles.zoom} title="배율">
              <b className={styles.zoomNow}>{Math.round(zoom * 100) + "%"}</b>
              <b className={styles.zoomAlt} aria-hidden="true">120%</b>
            </span>
            <button type="button" className={styles.btn} aria-label="축소" onClick={() => step(zoom - 0.2)}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M192,112a80,80,0,1,1-80-80A80,80,0,0,1,192,112Z" opacity="0.2"/><path d="M229.66,218.34,179.6,168.28a88.21,88.21,0,1,0-11.32,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Zm112,0a8,8,0,0,1-8,8H80a8,8,0,0,1,0-16h64A8,8,0,0,1,152,112Z"/></svg>
            </button>
            <button type="button" className={styles.btn} aria-label="확대" onClick={() => step(zoom + 0.2)}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M192,112a80,80,0,1,1-80-80A80,80,0,0,1,192,112Z" opacity="0.2"/><path d="M229.66,218.34,179.6,168.28a88.21,88.21,0,1,0-11.32,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Zm112,0a8,8,0,0,1-8,8H120v24a8,8,0,0,1-16,0V120H80a8,8,0,0,1,0-16h24V80a8,8,0,0,1,16,0v24h24A8,8,0,0,1,152,112Z"/></svg>
            </button>
            <button
              type="button"
              className={styles.btn}
              aria-label="가운데로"
              onClick={() => { setDemo(false); setPan({ x: 0, y: 0 }); setZoom(1); }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M232,128,128,232,24,128,128,24Z" opacity="0.2"/><path d="M90.34,61.66a8,8,0,0,1,0-11.32l32-32a8,8,0,0,1,11.32,0l32,32a8,8,0,0,1-11.32,11.32L136,43.31V96a8,8,0,0,1-16,0V43.31L101.66,61.66A8,8,0,0,1,90.34,61.66Zm64,132.68L136,212.69V160a8,8,0,0,0-16,0v52.69l-18.34-18.35a8,8,0,0,0-11.32,11.32l32,32a8,8,0,0,0,11.32,0l32-32a8,8,0,0,0-11.32-11.32Zm83.32-72-32-32a8,8,0,0,0-11.32,11.32L212.69,120H160a8,8,0,0,0,0,16h52.69l-18.35,18.34a8,8,0,0,0,11.32,11.32l32-32A8,8,0,0,0,237.66,122.34ZM43.31,136H96a8,8,0,0,0,0-16H43.31l18.35-18.34A8,8,0,0,0,50.34,90.34l-32,32a8,8,0,0,0,0,11.32l32,32a8,8,0,0,0,11.32-11.32Z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
