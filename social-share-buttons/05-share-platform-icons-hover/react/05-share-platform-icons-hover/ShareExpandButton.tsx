import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./ShareExpandButton.module.scss";

/* ambient 에 React 의 이벤트 제네릭이 없어 필요한 것만 로컬로 선언한다 */
type ClickEvt = { preventDefault(): void };
type KeyEvt = { key: string };
type FocusBox = { focus(opts: { preventScroll: boolean }): void };

export type ShareExpandButtonProps = {
  /** 펼쳐지는 버튼 넷의 접근성 이름 */
  labels?: string[];
  /** 펼침 → 머무름 → 접힘 한 바퀴(ms) */
  duration?: number;
  easing?: string;
  /** 펼침 버튼 면 색 */
  color?: string;
  autoPlay?: boolean;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/* Phosphor Duotone (MIT) — 사슬 · 봉투 · 말풍선 · 새 창 */
const ICONS: ReactNode[] = [
  <svg width="20" height="20" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M218.34,119.6,183.6,154.34a46.58,46.58,0,0,1-44.31,12.26c-.31.34-.62.67-.95,1L103.6,202.34A46.63,46.63,0,1,1,37.66,136.4L72.4,101.66A46.6,46.6,0,0,1,116.71,89.4c.31-.34.62-.67,1-1L152.4,53.66a46.63,46.63,0,0,1,65.94,65.94Z" opacity="0.2"/><path d="M240,88.23a54.43,54.43,0,0,1-16,37L189.25,160a54.27,54.27,0,0,1-38.63,16h-.05A54.63,54.63,0,0,1,96,119.84a8,8,0,0,1,16,.45A38.62,38.62,0,0,0,150.58,160h0a38.39,38.39,0,0,0,27.31-11.31l34.75-34.75a38.63,38.63,0,0,0-54.63-54.63l-11,11A8,8,0,0,1,135.7,59l11-11A54.65,54.65,0,0,1,224,48,54.86,54.86,0,0,1,240,88.23ZM109,185.66l-11,11A38.41,38.41,0,0,1,70.6,208h0a38.63,38.63,0,0,1-27.29-65.94L78,107.31A38.63,38.63,0,0,1,144,135.71a8,8,0,0,0,7.78,8.22H152a8,8,0,0,0,8-7.78A54.86,54.86,0,0,0,144,96a54.65,54.65,0,0,0-77.27,0L32,130.75A54.62,54.62,0,0,0,70.56,224h0a54.28,54.28,0,0,0,38.64-16l11-11A8,8,0,0,0,109,185.66Z"/></svg>,
  <svg width="20" height="20" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M224,56l-96,88L32,56Z" opacity="0.2"/><path d="M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48ZM203.43,64,128,133.15,52.57,64ZM216,192H40V74.19l82.59,75.71a8,8,0,0,0,10.82,0L216,74.19V192Z"/></svg>,
  <svg width="20" height="20" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M224,128A96,96,0,0,1,79.93,211.11h0L42.54,223.58a8,8,0,0,1-10.12-10.12l12.47-37.39h0A96,96,0,1,1,224,128Z" opacity="0.2"/><path d="M128,24A104,104,0,0,0,36.18,176.88L24.83,210.93a16,16,0,0,0,20.24,20.24l34.05-11.35A104,104,0,1,0,128,24Zm0,192a87.87,87.87,0,0,1-44.06-11.81,8,8,0,0,0-4-1.08,7.85,7.85,0,0,0-2.53.42L40,216,52.47,178.6a8,8,0,0,0-.66-6.54A88,88,0,1,1,128,216Zm12-88a12,12,0,1,1-12-12A12,12,0,0,1,140,128Zm-44,0a12,12,0,1,1-12-12A12,12,0,0,1,96,128Zm88,0a12,12,0,1,1-12-12A12,12,0,0,1,184,128Z"/></svg>,
  <svg width="20" height="20" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M184,80V208a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V80a8,8,0,0,1,8-8H176A8,8,0,0,1,184,80Z" opacity="0.2"/><path d="M224,104a8,8,0,0,1-16,0V59.32l-66.33,66.34a8,8,0,0,1-11.32-11.32L196.68,48H152a8,8,0,0,1,0-16h64a8,8,0,0,1,8,8Zm-40,24a8,8,0,0,0-8,8v72H48V80h72a8,8,0,0,0,0-16H48A16,16,0,0,0,32,80V208a16,16,0,0,0,16,16H176a16,16,0,0,0,16-16V136A8,8,0,0,0,184,128Z"/></svg>,
];

export default function ShareExpandButton({
  labels = ["링크 복사", "메일로 보내기", "메시지로 보내기", "새 창으로 열기"],
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#7fd4f5",
  autoPlay = true,
}: ShareExpandButtonProps) {
  const [demo, setDemo] = useState(autoPlay);
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<FocusBox>(null) as { current: FocusBox | null };

  /* 사람이 손을 대면 자동 재생을 끈다 */
  function stopDemo() {
    setDemo(false);
  }

  function applyToggle() {
    stopDemo();
    setOpen((prev) => !prev);
  }

  function applyKey(e: KeyEvt) {
    if (e.key !== "Escape") return;
    stopDemo();
    setOpen(false);
    if (toggleRef.current) toggleRef.current.focus({ preventScroll: true });
  }

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };

  return (
    <div className={styles.stage + (demo ? " " + styles.isDemo : "")} style={vars}>
      <section
        className={styles.expand + (open ? " " + styles.isOpen : "")}
        aria-label="공유 펼치기"
        onKeyDown={applyKey}
      >
        <div className={styles.bar}>
          <button
            className={styles.toggle}
            type="button"
            aria-expanded={open}
            onClick={applyToggle}
            onPointerDown={stopDemo}
            onFocus={stopDemo}
            ref={toggleRef as unknown as never}
          >
            <span className={styles.ic}><svg width="20" height="20" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M152,192V144c-61.4,0-104.61,37.19-121.07,54.72a4,4,0,0,1-6.9-3.18C31.51,130.45,99.19,80,152,80V32l80,80Z" opacity="0.2"/><path d="M237.66,106.35l-80-80A8,8,0,0,0,144,32V72.35c-25.94,2.22-54.59,14.92-78.16,34.91-28.38,24.08-46.05,55.11-49.76,87.37a12,12,0,0,0,20.68,9.58h0c11-11.71,50.14-48.74,107.24-52V192a8,8,0,0,0,13.66,5.65l80-80A8,8,0,0,0,237.66,106.35ZM160,172.69V144a8,8,0,0,0-8-8c-28.08,0-55.43,7.33-81.29,21.8a196.17,196.17,0,0,0-36.57,26.52c5.8-23.84,20.42-46.51,42.05-64.86C99.41,99.77,127.75,88,152,88a8,8,0,0,0,8-8V51.32L220.69,112Z"/></svg></span>
            <span className={styles.toggleLabel}>공유</span>
          </button>

          <div className={styles.list}>
            {labels.map((name, i) => (
              <a
                key={name}
                className={styles.item}
                href="#"
                aria-label={name}
                tabIndex={open ? 0 : -1}
                onClick={(e: ClickEvt) => {
                  e.preventDefault();
                  stopDemo();
                }}
              >
                {ICONS[i]}
              </a>
            ))}
          </div>
        </div>

        <p className={styles.hint}>좁은 자리에서는 버튼 하나만 둡니다</p>
      </section>
    </div>
  );
}
