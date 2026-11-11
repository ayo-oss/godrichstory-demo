// PlatformKeycap — vanilla 판(run/288/demo/02-kbd-platform-switch/index.html) 의 React 포트.
// userAgentData.platform 을 먼저 보고, 없는 브라우저에서는 예전 navigator.platform 으로 내려간다.
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PlatformKeycap.module.scss";

export type PlatformKeycapProps = {
  /** 격자 미리보기용 2초 자동 루프. 사람이 토글을 누르면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** navigator.userAgentData 는 아직 타입이 없는 브라우저가 있어 여기서 직접 좁혀 쓴다 */
type UaData = { platform?: string };

const ROWS: { action: string; letter: string }[] = [
  { action: "저장하기", letter: "S" },
  { action: "되돌리기", letter: "Z" },
  { action: "새 창 열기", letter: "N" },
];

function detectPlatform(): string {
  const data = (navigator as unknown as { userAgentData?: UaData }).userAgentData;
  const name = (data && data.platform) || navigator.platform || "";
  return /mac|iphone|ipad|ipod/i.test(name) ? "mac" : "win";
}

export default function PlatformKeycap({
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#17141a",
}: PlatformKeycapProps) {
  const [live, setLive] = useState(demo);
  const [platform, setPlatform] = useState("win");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  function applyPlatform(os: string) {
    setLive(false);
    setPlatform(os);
  }

  const cls = [styles.root, live ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage} style={vars}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="command" viewBox="0 0 256 256" fill="currentColor">
            <path d="M208,76h0a28,28,0,0,1-28,28H152V76a28,28,0,0,1,28-28h0A28,28,0,0,1,208,76ZM76,48h0A28,28,0,0,0,48,76h0a28,28,0,0,0,28,28h28V76A28,28,0,0,0,76,48ZM180,152H152v28a28,28,0,0,0,28,28h0a28,28,0,0,0,28-28h0A28,28,0,0,0,180,152ZM48,180h0a28,28,0,0,0,28,28h0a28,28,0,0,0,28-28V152H76A28,28,0,0,0,48,180Z" opacity="0.2" />
            <path d="M180,144H160V112h20a36,36,0,1,0-36-36V96H112V76a36,36,0,1,0-36,36H96v32H76a36,36,0,1,0,36,36V160h32v20a36,36,0,1,0,36-36ZM160,76a20,20,0,1,1,20,20H160ZM56,76a20,20,0,0,1,40,0V96H76A20,20,0,0,1,56,76ZM96,180a20,20,0,1,1-20-20H96Zm16-68h32v32H112Zm68,88a20,20,0,0,1-20-20V160h20a20,20,0,0,1,0,40Z" />
          </symbol>
        </defs>
      </svg>
      <div className={cls} data-platform={platform}>
        <div className={styles.head}>
          <p className={styles.title}>
            <svg className={styles.ico} aria-hidden="true"><use href="#command" /></svg>
            <span>표기가 OS 를 따라갑니다</span>
          </p>
          <div className={styles.switch} role="group" aria-label="표기할 운영체제">
            <button type="button" className={styles.opt} data-os="mac" aria-pressed={platform === "mac"} onClick={() => applyPlatform("mac")}>
              macOS
            </button>
            <button type="button" className={styles.opt} data-os="win" aria-pressed={platform === "win"} onClick={() => applyPlatform("win")}>
              Windows
            </button>
          </div>
        </div>
        <ul className={styles.list}>
          {ROWS.map((row) => (
            <li className={styles.row} key={row.letter}>
              <span className={styles.act}>{row.action}</span>
              <span className={styles.keys}>
                <kbd className={styles.mod}>
                  <span className={styles.mac}>{"⌘"}</span>
                  <span className={styles.win}>Ctrl</span>
                </kbd>
                <kbd className={styles.key}>{row.letter}</kbd>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
