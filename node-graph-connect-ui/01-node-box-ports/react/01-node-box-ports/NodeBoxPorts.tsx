import { useState } from "react";
import styles from "./NodeBoxPorts.module.scss";

export type NodeBoxPortsProps = { duration?: number; easing?: string; color?: string };

type NodeSpec = { name: string; body: string; icon: string };
type PortSpec = { kind: string; label: string; hintId: string };

const NODES: NodeSpec[] = [
  { name: "주문 불러오기", body: "새 주문이 들어오면 목록을 가져옵니다", icon: "database" },
  { name: "금액 거르기", body: "1만 원이 넘는 주문만 통과시킵니다", icon: "funnel" },
];

const PORTS: PortSpec[] = [
  { kind: "in", label: "받는 점", hintId: "ngHintIn" },
  { kind: "out", label: "보내는 점", hintId: "ngHintOut" },
];

const OUT_COLOR = "#ff4d1f";

function glyph(kind: string) {
  if (kind === "database") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M216,80c0,26.51-39.4,48-88,48S40,106.51,40,80s39.4-48,88-48S216,53.49,216,80Z" opacity="0.2"/><path d="M128,24C74.17,24,32,48.6,32,80v96c0,31.4,42.17,56,96,56s96-24.6,96-56V80C224,48.6,181.83,24,128,24Zm80,104c0,9.62-7.88,19.43-21.61,26.92C170.93,163.35,150.19,168,128,168s-42.93-4.65-58.39-13.08C55.88,147.43,48,137.62,48,128V111.36c17.06,15,46.23,24.64,80,24.64s62.94-9.68,80-24.64ZM69.61,53.08C85.07,44.65,105.81,40,128,40s42.93,4.65,58.39,13.08C200.12,60.57,208,70.38,208,80s-7.88,19.43-21.61,26.92C170.93,115.35,150.19,120,128,120s-42.93-4.65-58.39-13.08C55.88,99.43,48,89.62,48,80S55.88,60.57,69.61,53.08ZM186.39,202.92C170.93,211.35,150.19,216,128,216s-42.93-4.65-58.39-13.08C55.88,195.43,48,185.62,48,176V159.36c17.06,15,46.23,24.64,80,24.64s62.94-9.68,80-24.64V176C208,185.62,200.12,195.43,186.39,202.92Z"/></svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M221.9,61.38,152,136v58.65a8,8,0,0,1-3.56,6.66l-32,21.33A8,8,0,0,1,104,216V136L34.1,61.38A8,8,0,0,1,40,48H216A8,8,0,0,1,221.9,61.38Z" opacity="0.2"/><path d="M230.6,49.53A15.81,15.81,0,0,0,216,40H40A16,16,0,0,0,28.19,66.76l.08.09L96,139.17V216a16,16,0,0,0,24.87,13.32l32-21.34A16,16,0,0,0,160,194.66V139.17l67.74-72.32.08-.09A15.8,15.8,0,0,0,230.6,49.53ZM40,56h0Zm106.18,74.58A8,8,0,0,0,144,136v58.66L112,216V136a8,8,0,0,0-2.16-5.47L40,56H216Z"/></svg>
  );
}

export default function NodeBoxPorts({
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: NodeBoxPortsProps) {
  const [demo, setDemo] = useState(true);
  const wake = () => setDemo(false);

  return (
    <main className={styles.stage}>
      <div className={styles.ng}>
        <div className={styles.canvas}>
          {NODES.map((n, i) => (
            <div className={styles.node} key={n.name}>
              <div className={styles.head}>
                <span className={styles.ico} aria-hidden="true" style={{ background: color }}>{glyph(n.icon)}</span>
                <span className={styles.name}>{n.name}</span>
              </div>
              <p className={styles.body}>{n.body}</p>
              {PORTS.map((p, j) => (
                <button
                  key={p.kind}
                  type="button"
                  className={`${styles.port} ${p.kind === "in" ? styles.portIn : styles.portOut}`}
                  aria-label={p.label}
                  aria-describedby={p.hintId}
                  style={{
                    background: p.kind === "in" ? color : OUT_COLOR,
                    ...(demo
                      ? {
                          animationName: "ngPortPulse",
                          animationDuration: `${duration}ms`,
                          animationTimingFunction: easing,
                          animationIterationCount: "infinite",
                          animationFillMode: "backwards",
                          animationDelay: `${(i * 2 + j) * 200}ms`,
                        }
                      : {}),
                  }}
                  onPointerEnter={wake}
                  onFocus={wake}
                  onClick={wake}
                />
              ))}
            </div>
          ))}
        </div>

        <ul className={styles.legend}>
          <li className={styles.hint} id="ngHintIn">
            <i className={styles.dot} style={{ background: color }} aria-hidden="true" />받는 점 — 앞 단계의 결과가 들어옵니다
          </li>
          <li className={styles.hint} id="ngHintOut">
            <i className={styles.dot} style={{ background: OUT_COLOR }} aria-hidden="true" />보내는 점 — 이 단계의 결과가 나갑니다
          </li>
        </ul>
      </div>
    </main>
  );
}
