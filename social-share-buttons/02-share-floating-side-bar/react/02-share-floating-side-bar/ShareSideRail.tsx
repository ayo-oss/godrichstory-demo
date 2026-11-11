import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./ShareSideRail.module.scss";

/* ambient 에 React 의 이벤트 제네릭이 없어 필요한 것만 로컬로 선언한다 */
type ClickEvt = { preventDefault(): void };

export type ShareSideRailProps = {
  /** 바에 서는 공유 방법 이름 */
  labels?: string[];
  /** 넷이 차례로 라벨을 펼치는 한 바퀴(ms) */
  duration?: number;
  easing?: string;
  /** 펼쳐진 라벨 면 색 */
  color?: string;
  autoPlay?: boolean;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/* Phosphor Duotone (MIT) — 사슬 · 봉투 · 말풍선 · 공유 */
const ICONS: ReactNode[] = [
  <svg width="20" height="20" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M218.34,119.6,183.6,154.34a46.58,46.58,0,0,1-44.31,12.26c-.31.34-.62.67-.95,1L103.6,202.34A46.63,46.63,0,1,1,37.66,136.4L72.4,101.66A46.6,46.6,0,0,1,116.71,89.4c.31-.34.62-.67,1-1L152.4,53.66a46.63,46.63,0,0,1,65.94,65.94Z" opacity="0.2"/><path d="M240,88.23a54.43,54.43,0,0,1-16,37L189.25,160a54.27,54.27,0,0,1-38.63,16h-.05A54.63,54.63,0,0,1,96,119.84a8,8,0,0,1,16,.45A38.62,38.62,0,0,0,150.58,160h0a38.39,38.39,0,0,0,27.31-11.31l34.75-34.75a38.63,38.63,0,0,0-54.63-54.63l-11,11A8,8,0,0,1,135.7,59l11-11A54.65,54.65,0,0,1,224,48,54.86,54.86,0,0,1,240,88.23ZM109,185.66l-11,11A38.41,38.41,0,0,1,70.6,208h0a38.63,38.63,0,0,1-27.29-65.94L78,107.31A38.63,38.63,0,0,1,144,135.71a8,8,0,0,0,7.78,8.22H152a8,8,0,0,0,8-7.78A54.86,54.86,0,0,0,144,96a54.65,54.65,0,0,0-77.27,0L32,130.75A54.62,54.62,0,0,0,70.56,224h0a54.28,54.28,0,0,0,38.64-16l11-11A8,8,0,0,0,109,185.66Z"/></svg>,
  <svg width="20" height="20" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M224,56l-96,88L32,56Z" opacity="0.2"/><path d="M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48ZM203.43,64,128,133.15,52.57,64ZM216,192H40V74.19l82.59,75.71a8,8,0,0,0,10.82,0L216,74.19V192Z"/></svg>,
  <svg width="20" height="20" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M224,128A96,96,0,0,1,79.93,211.11h0L42.54,223.58a8,8,0,0,1-10.12-10.12l12.47-37.39h0A96,96,0,1,1,224,128Z" opacity="0.2"/><path d="M128,24A104,104,0,0,0,36.18,176.88L24.83,210.93a16,16,0,0,0,20.24,20.24l34.05-11.35A104,104,0,1,0,128,24Zm0,192a87.87,87.87,0,0,1-44.06-11.81,8,8,0,0,0-4-1.08,7.85,7.85,0,0,0-2.53.42L40,216,52.47,178.6a8,8,0,0,0-.66-6.54A88,88,0,1,1,128,216Zm12-88a12,12,0,1,1-12-12A12,12,0,0,1,140,128Zm-44,0a12,12,0,1,1-12-12A12,12,0,0,1,96,128Zm88,0a12,12,0,1,1-12-12A12,12,0,0,1,184,128Z"/></svg>,
  <svg width="20" height="20" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M208,200a32,32,0,1,1-32-32A32,32,0,0,1,208,200ZM176,88a32,32,0,1,0-32-32A32,32,0,0,0,176,88Z" opacity="0.2"/><path d="M176,160a39.89,39.89,0,0,0-28.62,12.09l-46.1-29.63a39.8,39.8,0,0,0,0-28.92l46.1-29.63a40,40,0,1,0-8.66-13.45l-46.1,29.63a40,40,0,1,0,0,55.82l46.1,29.63A40,40,0,1,0,176,160Zm0-128a24,24,0,1,1-24,24A24,24,0,0,1,176,32ZM64,152a24,24,0,1,1,24-24A24,24,0,0,1,64,152Zm112,72a24,24,0,1,1,24-24A24,24,0,0,1,176,224Z"/></svg>,
];

const ROWS = ["rowFull", "rowWide", "rowMid", "rowFull", "rowWide", "rowShort", "rowFull", "rowMid"];

export default function ShareSideRail({
  labels = ["링크 복사", "메일 보내기", "메시지", "더 보기"],
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#7fd4f5",
  autoPlay = true,
}: ShareSideRailProps) {
  const [demo, setDemo] = useState(autoPlay);

  /* 사람이 손을 대면 자동 재생을 끈다 */
  function stopDemo() {
    setDemo(false);
  }

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };

  return (
    <div className={styles.stage + (demo ? " " + styles.isDemo : "")} style={vars}>
      <div className={styles.wrap}>
        <div className={styles.view} onScroll={stopDemo}>
          <div className={styles.doc}>
            <nav className={styles.rail} aria-label="공유 바">
              {labels.map((name, i) => (
                <a
                  key={name}
                  className={styles.link}
                  href="#"
                  onClick={(e: ClickEvt) => {
                    e.preventDefault();
                    stopDemo();
                  }}
                  onPointerDown={stopDemo}
                  onFocus={stopDemo}
                >
                  <span className={styles.ic}>{ICONS[i]}</span>
                  <span className={styles.name}>{name}</span>
                </a>
              ))}
            </nav>

            <article className={styles.body}>
              <h2 className={styles.title}>긴 글은 옆에서 공유한다</h2>
              {ROWS.map((cls, i) => (
                <span key={i} className={styles.row + " " + styles[cls]} aria-hidden="true" />
              ))}
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}
