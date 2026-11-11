import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./ShareCountBadge.module.scss";

export type ShareCountBadgeProps = {
  /** 버튼 이름과 공유 수 */
  items?: { name: string; label: string; count: number }[];
  /** 세 배지가 0 에서 목표까지 오르는 한 바퀴(ms) */
  duration?: number;
  easing?: string;
  /** 배지 면 색 */
  color?: string;
  autoPlay?: boolean;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type BadgeVars = CSSProperties & { "--shareCount"?: number };

/* Phosphor Duotone (MIT) — 사슬 · 봉투 · 말풍선 */
const ICONS: ReactNode[] = [
  <svg width="20" height="20" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M218.34,119.6,183.6,154.34a46.58,46.58,0,0,1-44.31,12.26c-.31.34-.62.67-.95,1L103.6,202.34A46.63,46.63,0,1,1,37.66,136.4L72.4,101.66A46.6,46.6,0,0,1,116.71,89.4c.31-.34.62-.67,1-1L152.4,53.66a46.63,46.63,0,0,1,65.94,65.94Z" opacity="0.2"/><path d="M240,88.23a54.43,54.43,0,0,1-16,37L189.25,160a54.27,54.27,0,0,1-38.63,16h-.05A54.63,54.63,0,0,1,96,119.84a8,8,0,0,1,16,.45A38.62,38.62,0,0,0,150.58,160h0a38.39,38.39,0,0,0,27.31-11.31l34.75-34.75a38.63,38.63,0,0,0-54.63-54.63l-11,11A8,8,0,0,1,135.7,59l11-11A54.65,54.65,0,0,1,224,48,54.86,54.86,0,0,1,240,88.23ZM109,185.66l-11,11A38.41,38.41,0,0,1,70.6,208h0a38.63,38.63,0,0,1-27.29-65.94L78,107.31A38.63,38.63,0,0,1,144,135.71a8,8,0,0,0,7.78,8.22H152a8,8,0,0,0,8-7.78A54.86,54.86,0,0,0,144,96a54.65,54.65,0,0,0-77.27,0L32,130.75A54.62,54.62,0,0,0,70.56,224h0a54.28,54.28,0,0,0,38.64-16l11-11A8,8,0,0,0,109,185.66Z"/></svg>,
  <svg width="20" height="20" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M224,56l-96,88L32,56Z" opacity="0.2"/><path d="M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48ZM203.43,64,128,133.15,52.57,64ZM216,192H40V74.19l82.59,75.71a8,8,0,0,0,10.82,0L216,74.19V192Z"/></svg>,
  <svg width="20" height="20" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M224,128A96,96,0,0,1,79.93,211.11h0L42.54,223.58a8,8,0,0,1-10.12-10.12l12.47-37.39h0A96,96,0,1,1,224,128Z" opacity="0.2"/><path d="M128,24A104,104,0,0,0,36.18,176.88L24.83,210.93a16,16,0,0,0,20.24,20.24l34.05-11.35A104,104,0,1,0,128,24Zm0,192a87.87,87.87,0,0,1-44.06-11.81,8,8,0,0,0-4-1.08,7.85,7.85,0,0,0-2.53.42L40,216,52.47,178.6a8,8,0,0,0-.66-6.54A88,88,0,1,1,128,216Zm12-88a12,12,0,1,1-12-12A12,12,0,0,1,140,128Zm-44,0a12,12,0,1,1-12-12A12,12,0,0,1,96,128Zm88,0a12,12,0,1,1-12-12A12,12,0,0,1,184,128Z"/></svg>,
];

const BADGE = ["badgeA", "badgeB", "badgeC"];

export default function ShareCountBadge({
  items = [
    { name: "링크", label: "링크 복사", count: 128 },
    { name: "메일", label: "메일로 보내기", count: 64 },
    { name: "메시지", label: "메시지로 보내기", count: 39 },
  ],
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#15131a",
  autoPlay = true,
}: ShareCountBadgeProps) {
  const [demo, setDemo] = useState(autoPlay);

  /* 사람이 손을 대면 자동 재생을 끈다 */
  function stopDemo() {
    setDemo(false);
  }

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };

  return (
    <div className={styles.stage + (demo ? " " + styles.isDemo : "")} style={vars}>
      <section className={styles.count} aria-label="공유 수">
        <p className={styles.title}>이번 주 많이 나간 글</p>

        <div className={styles.btns}>
          {items.map((item, i) => (
            <button
              key={item.name}
              className={styles.btn}
              type="button"
              aria-label={item.label + ", 공유 " + item.count + "회"}
              onClick={stopDemo}
              onPointerDown={stopDemo}
              onFocus={stopDemo}
            >
              <span className={styles.ic}>{ICONS[i]}</span>
              <span className={styles.name}>{item.name}</span>
              {/* 숫자는 등록한 사용자 지정 속성을 그 요소 자신이 받아 counter 로 읽는다 */}
              <span
                className={styles.badge + " " + styles[BADGE[i]]}
                aria-hidden="true"
                style={{ "--shareCount": item.count } as BadgeVars}
              />
            </button>
          ))}
        </div>

        <p className={styles.total}>
          <span className={styles.totalIc} aria-hidden="true"><svg width="16" height="16" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M232,56v64L168,56Z" opacity="0.2"/><path d="M232,48H168a8,8,0,0,0-5.66,13.66L188.69,88,136,140.69l-34.34-34.35a8,8,0,0,0-11.32,0l-72,72a8,8,0,0,0,11.32,11.32L96,123.31l34.34,34.35a8,8,0,0,0,11.32,0L200,99.31l26.34,26.35A8,8,0,0,0,240,120V56A8,8,0,0,0,232,48Zm-8,52.69L187.31,64H224Z"/></svg></span>
          <span>지난주보다 231회 더 나갔습니다</span>
        </p>
      </section>
    </div>
  );
}
