import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./ShareMobileSheet.module.scss";

/* ambient 에 React 의 이벤트 제네릭이 없어 필요한 것만 로컬로 선언한다 */
type KeyEvt = { key: string; shiftKey: boolean; preventDefault(): void };
type FocusBox = { focus(opts: { preventScroll: boolean }): void };
type SheetEl = { querySelectorAll(sel: string): FocusBox[] };

export type ShareMobileSheetProps = {
  /** 시트 안 칸 이름 */
  picks?: string[];
  /** 열림 → 머무름 한 바퀴(ms) */
  duration?: number;
  easing?: string;
  /** 고른 칸 강조 색 */
  color?: string;
  autoPlay?: boolean;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/* Phosphor Duotone (MIT) — 사슬 · 봉투 · 말풍선 · QR */
const ICONS: ReactNode[] = [
  <svg width="20" height="20" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M218.34,119.6,183.6,154.34a46.58,46.58,0,0,1-44.31,12.26c-.31.34-.62.67-.95,1L103.6,202.34A46.63,46.63,0,1,1,37.66,136.4L72.4,101.66A46.6,46.6,0,0,1,116.71,89.4c.31-.34.62-.67,1-1L152.4,53.66a46.63,46.63,0,0,1,65.94,65.94Z" opacity="0.2"/><path d="M240,88.23a54.43,54.43,0,0,1-16,37L189.25,160a54.27,54.27,0,0,1-38.63,16h-.05A54.63,54.63,0,0,1,96,119.84a8,8,0,0,1,16,.45A38.62,38.62,0,0,0,150.58,160h0a38.39,38.39,0,0,0,27.31-11.31l34.75-34.75a38.63,38.63,0,0,0-54.63-54.63l-11,11A8,8,0,0,1,135.7,59l11-11A54.65,54.65,0,0,1,224,48,54.86,54.86,0,0,1,240,88.23ZM109,185.66l-11,11A38.41,38.41,0,0,1,70.6,208h0a38.63,38.63,0,0,1-27.29-65.94L78,107.31A38.63,38.63,0,0,1,144,135.71a8,8,0,0,0,7.78,8.22H152a8,8,0,0,0,8-7.78A54.86,54.86,0,0,0,144,96a54.65,54.65,0,0,0-77.27,0L32,130.75A54.62,54.62,0,0,0,70.56,224h0a54.28,54.28,0,0,0,38.64-16l11-11A8,8,0,0,0,109,185.66Z"/></svg>,
  <svg width="20" height="20" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M224,56l-96,88L32,56Z" opacity="0.2"/><path d="M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48ZM203.43,64,128,133.15,52.57,64ZM216,192H40V74.19l82.59,75.71a8,8,0,0,0,10.82,0L216,74.19V192Z"/></svg>,
  <svg width="20" height="20" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M224,128A96,96,0,0,1,79.93,211.11h0L42.54,223.58a8,8,0,0,1-10.12-10.12l12.47-37.39h0A96,96,0,1,1,224,128Z" opacity="0.2"/><path d="M128,24A104,104,0,0,0,36.18,176.88L24.83,210.93a16,16,0,0,0,20.24,20.24l34.05-11.35A104,104,0,1,0,128,24Zm0,192a87.87,87.87,0,0,1-44.06-11.81,8,8,0,0,0-4-1.08,7.85,7.85,0,0,0-2.53.42L40,216,52.47,178.6a8,8,0,0,0-.66-6.54A88,88,0,1,1,128,216Zm12-88a12,12,0,1,1-12-12A12,12,0,0,1,140,128Zm-44,0a12,12,0,1,1-12-12A12,12,0,0,1,96,128Zm88,0a12,12,0,1,1-12-12A12,12,0,0,1,184,128Z"/></svg>,
  <svg width="20" height="20" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M112,56v48a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8V56a8,8,0,0,1,8-8h48A8,8,0,0,1,112,56Zm-8,88H56a8,8,0,0,0-8,8v48a8,8,0,0,0,8,8h48a8,8,0,0,0,8-8V152A8,8,0,0,0,104,144Zm96-96H152a8,8,0,0,0-8,8v48a8,8,0,0,0,8,8h48a8,8,0,0,0,8-8V56A8,8,0,0,0,200,48Z" opacity="0.2"/><path d="M104,40H56A16,16,0,0,0,40,56v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,104,40Zm0,64H56V56h48v48Zm0,32H56a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,104,136Zm0,64H56V152h48v48ZM200,40H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40Zm0,64H152V56h48v48Zm-64,72V144a8,8,0,0,1,16,0v32a8,8,0,0,1-16,0Zm80-16a8,8,0,0,1-8,8H184v40a8,8,0,0,1-8,8H144a8,8,0,0,1,0-16h24V144a8,8,0,0,1,16,0v8h24A8,8,0,0,1,216,160Zm0,32v16a8,8,0,0,1-16,0V192a8,8,0,0,1,16,0Z"/></svg>,
];

export default function ShareMobileSheet({
  picks = ["링크 복사", "메일", "메시지", "QR 코드"],
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#0f5f8a",
  autoPlay = true,
}: ShareMobileSheetProps) {
  const [demo, setDemo] = useState(autoPlay);
  const [open, setOpen] = useState(false);
  const sheetRef = useRef<SheetEl>(null) as { current: SheetEl | null };
  const openRef = useRef<FocusBox>(null) as { current: FocusBox | null };

  /* 사람이 손을 대면 자동 재생을 끈다 */
  function stopDemo() {
    setDemo(false);
  }

  function applyOpen(on: boolean) {
    stopDemo();
    setOpen(on);
    const list = sheetRef.current ? sheetRef.current.querySelectorAll("button") : [];
    if (on && list.length) list[0].focus({ preventScroll: true });
    if (!on && openRef.current) openRef.current.focus({ preventScroll: true });
  }

  /* 초점 가두기 — 시트가 열려 있는 동안 Tab 은 시트 안을 돈다 */
  function applyKey(e: KeyEvt) {
    if (e.key === "Escape") {
      applyOpen(false);
      return;
    }
    if (e.key !== "Tab" || !sheetRef.current) return;
    const list = sheetRef.current.querySelectorAll("button");
    const last = list.length - 1;
    const at = list.indexOf(document.activeElement as unknown as FocusBox);
    if (e.shiftKey && at <= 0) {
      e.preventDefault();
      list[last].focus({ preventScroll: true });
    } else if (!e.shiftKey && at === last) {
      e.preventDefault();
      list[0].focus({ preventScroll: true });
    }
  }

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };

  return (
    <div className={styles.stage + (demo ? " " + styles.isDemo : "")} style={vars}>
      <div className={styles.phone + (open ? " " + styles.isOpen : "")}>
        <div className={styles.screen}>
          <p className={styles.title}>오늘의 기록</p>
          <span className={styles.row + " " + styles.rowFull} aria-hidden="true" />
          <span className={styles.row + " " + styles.rowWide} aria-hidden="true" />
          <span className={styles.row + " " + styles.rowMid} aria-hidden="true" />
          <button
            className={styles.open}
            type="button"
            onClick={() => applyOpen(true)}
            onPointerDown={stopDemo}
            onFocus={stopDemo}
            ref={openRef as unknown as never}
          >
            <span className={styles.ic}><svg width="18" height="18" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M152,192V144c-61.4,0-104.61,37.19-121.07,54.72a4,4,0,0,1-6.9-3.18C31.51,130.45,99.19,80,152,80V32l80,80Z" opacity="0.2"/><path d="M237.66,106.35l-80-80A8,8,0,0,0,144,32V72.35c-25.94,2.22-54.59,14.92-78.16,34.91-28.38,24.08-46.05,55.11-49.76,87.37a12,12,0,0,0,20.68,9.58h0c11-11.71,50.14-48.74,107.24-52V192a8,8,0,0,0,13.66,5.65l80-80A8,8,0,0,0,237.66,106.35ZM160,172.69V144a8,8,0,0,0-8-8c-28.08,0-55.43,7.33-81.29,21.8a196.17,196.17,0,0,0-36.57,26.52c5.8-23.84,20.42-46.51,42.05-64.86C99.41,99.77,127.75,88,152,88a8,8,0,0,0,8-8V51.32L220.69,112Z"/></svg></span>
            <span>공유</span>
          </button>
        </div>

        <div className={styles.scrim} aria-hidden="true" onClick={() => applyOpen(false)} />

        <div
          className={styles.sheet}
          role="dialog"
          aria-modal="true"
          aria-label="공유 방법 고르기"
          aria-hidden={!open}
          onKeyDown={applyKey}
          ref={sheetRef as unknown as never}
        >
          <span className={styles.grip} aria-hidden="true" />
          <div className={styles.grid}>
            {picks.map((name, i) => (
              <button key={name} className={styles.pick} type="button" tabIndex={open ? 0 : -1}>
                <span className={styles.pickIc}>{ICONS[i]}</span>
                <span className={styles.pickName}>{name}</span>
              </button>
            ))}
          </div>
          <button
            className={styles.close}
            type="button"
            tabIndex={open ? 0 : -1}
            onClick={() => applyOpen(false)}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
