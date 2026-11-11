import { useState } from "react";
import styles from "./CutWire.module.scss";

export type CutWireProps = { duration?: number; easing?: string; color?: string };

/** ambient 에 React 이벤트 제네릭이 없다 — 파일 안에서 쓰는 만큼만 로컬 타입으로 선언한다 */
type KeyEvt = { key: string; preventDefault: () => void };

const SCISSORS = (
  <svg className={styles.cutico} x="-9" y="-9" width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
    <path d="M40.2,95.8a28,28,0,1,1,39.6,0A28,28,0,0,1,40.2,95.8Zm0,64.4a28,28,0,1,0,39.6,0A28,28,0,0,0,40.2,160.2Z" opacity="0.2" />
    <path d="M157.73,113.13A8,8,0,0,1,159.82,102L227.48,55.7a8,8,0,0,1,9,13.21l-67.67,46.3a7.92,7.92,0,0,1-4.51,1.4A8,8,0,0,1,157.73,113.13Zm80.87,85.09a8,8,0,0,1-11.12,2.08L136,137.7,93.49,166.78a36,36,0,1,1-9-13.19L121.83,128,84.44,102.41a35.86,35.86,0,1,1,9-13.19l143,97.87A8,8,0,0,1,238.6,198.22ZM80,180a20,20,0,1,0-5.86,14.14A19.85,19.85,0,0,0,80,180ZM74.14,90.13a20,20,0,1,0-28.28,0A19.85,19.85,0,0,0,74.14,90.13Z" />
  </svg>
);

/** 가운데(200, y)에서 노드 쪽으로 뻗는 반쪽 두 개 + 집는 영역이 되는 전체 곡선 */
const WIRES = [
  { id: "t", halfA: "M122,85 C149,85 174.5,73.25 200,61.5", halfB: "M278,38 C251,38 225.5,49.75 200,61.5", hit: "M122,85 C176,85 224,38 278,38", mid: "translate(200 61.5)" },
  { id: "b", halfA: "M122,85 C149,85 174.5,96.75 200,108.5", halfB: "M278,132 C251,132 225.5,120.25 200,108.5", hit: "M122,85 C176,85 224,132 278,132", mid: "translate(200 108.5)" },
];

export default function CutWire({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#fff7e6" }: CutWireProps) {
  const [demo, setDemo] = useState(true);
  const [cut, setCut] = useState<string[]>([]);

  const toggleWire = (id: string) => {
    setDemo(false);
    setCut((prev) => (prev.indexOf(id) >= 0 ? prev.filter((v) => v !== id) : prev.concat([id])));
  };

  return (
    <main className={styles.stage}>
      <div
        className={`${styles.ng} ${demo ? styles.isDemo : ""}`}
        style={{ "--ng-duration": `${duration}ms`, "--ng-easing": easing, "--ng-color": color }}
      >
        <svg className={styles.canvas} viewBox="0 0 400 170" role="group" aria-label="노드 세 개를 잇는 연결선 두 개">
          {WIRES.map((w) => {
            const isCut = cut.indexOf(w.id) >= 0;
            return (
              <g key={w.id} className={`${styles.wirewrap} ${w.id === "b" ? styles.wireB : ""} ${isCut ? styles.isCut : ""}`}>
                <path className={styles.wire} d={w.halfA} />
                <path className={styles.wire} d={w.halfB} />
                <path className={styles.hit} d={w.hit} />
                <g transform={w.mid}>
                  <g
                    className={styles.cut}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isCut}
                    aria-label={isCut ? "다시 잇기" : "연결 끊기"}
                    onClick={() => toggleWire(w.id)}
                    onKeyDown={(e: KeyEvt) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleWire(w.id); } }}
                  >
                    <circle className={styles.cutbg} r="15" />
                    {SCISSORS}
                  </g>
                </g>
              </g>
            );
          })}

          <g className={styles.node}>
            <rect className={styles.box} x="14" y="59" width="108" height="52" rx="12" />
            <svg className={styles.ico} x="58" y="68" width="20" height="20" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M96,240l16-80L48,136,160,16,144,96l64,24Z" opacity="0.2" /><path d="M215.79,118.17a8,8,0,0,0-5-5.66L153.18,90.9l14.66-73.33a8,8,0,0,0-13.69-7l-112,120a8,8,0,0,0,3,13l57.63,21.61L88.16,238.43a8,8,0,0,0,13.69,7l112-120A8,8,0,0,0,215.79,118.17ZM109.37,214l10.47-52.38a8,8,0,0,0-5-9.06L62,132.71l84.62-90.66L136.16,94.43a8,8,0,0,0,5,9.06l52.8,19.8Z" /></svg>
            <text className={styles.label} x="68" y="103" textAnchor="middle">웹훅</text>
            <circle className={styles.port} cx="122" cy="85" r="4.5" />
          </g>

          <g className={styles.node}>
            <rect className={styles.box} x="278" y="12" width="108" height="52" rx="12" />
            <svg className={styles.ico} x="322" y="21" width="20" height="20" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M223.69,42.18l-58.22,192a8,8,0,0,1-14.92,1.25L108,148,20.58,105.45a8,8,0,0,1,1.25-14.92l192-58.22A8,8,0,0,1,223.69,42.18Z" opacity="0.2" /><path d="M227.32,28.68a16,16,0,0,0-15.66-4.08l-.15,0L19.57,82.84a16,16,0,0,0-2.49,29.8L102,154l41.3,84.87A15.86,15.86,0,0,0,157.74,248q.69,0,1.38-.06a15.88,15.88,0,0,0,14-11.51l58.2-191.94c0-.05,0-.1,0-.15A16,16,0,0,0,227.32,28.68ZM157.83,231.85l-.05.14,0-.07-40.06-82.3,48-48a8,8,0,0,0-11.31-11.31l-48,48L24.08,98.25l-.07,0,.14,0L216,40Z" /></svg>
            <text className={styles.label} x="332" y="56" textAnchor="middle">메일 보내기</text>
            <circle className={styles.port} cx="278" cy="38" r="4.5" />
          </g>

          <g className={`${styles.node} ${styles.nodeC}`}>
            <rect className={styles.box} x="278" y="106" width="108" height="52" rx="12" />
            <svg className={styles.ico} x="322" y="115" width="20" height="20" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M216,80c0,26.51-39.4,48-88,48S40,106.51,40,80s39.4-48,88-48S216,53.49,216,80Z" opacity="0.2" /><path d="M128,24C74.17,24,32,48.6,32,80v96c0,31.4,42.17,56,96,56s96-24.6,96-56V80C224,48.6,181.83,24,128,24Zm80,104c0,9.62-7.88,19.43-21.61,26.92C170.93,163.35,150.19,168,128,168s-42.93-4.65-58.39-13.08C55.88,147.43,48,137.62,48,128V111.36c17.06,15,46.23,24.64,80,24.64s62.94-9.68,80-24.64ZM69.61,53.08C85.07,44.65,105.81,40,128,40s42.93,4.65,58.39,13.08C200.12,60.57,208,70.38,208,80s-7.88,19.43-21.61,26.92C170.93,115.35,150.19,120,128,120s-42.93-4.65-58.39-13.08C55.88,99.43,48,89.62,48,80S55.88,60.57,69.61,53.08ZM186.39,202.92C170.93,211.35,150.19,216,128,216s-42.93-4.65-58.39-13.08C55.88,195.43,48,185.62,48,176V159.36c17.06,15,46.23,24.64,80,24.64s62.94-9.68,80-24.64V176C208,185.62,200.12,195.43,186.39,202.92Z" /></svg>
            <text className={styles.label} x="332" y="150" textAnchor="middle">DB 저장</text>
            <circle className={styles.port} cx="278" cy="132" r="4.5" />
          </g>
        </svg>
      </div>
    </main>
  );
}
