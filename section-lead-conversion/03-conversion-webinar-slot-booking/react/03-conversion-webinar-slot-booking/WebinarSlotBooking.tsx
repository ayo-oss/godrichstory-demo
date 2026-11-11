import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./WebinarSlotBooking.module.scss";

export type WebinarSlotBookingProps = {
  /** 격자 미리보기용 루프 길이(ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type DigitVars = CSSProperties & { "--d"?: number };
type KeyEvt = { key: string; preventDefault(): void };
type Box<T> = { current: T };

const sessions = [
  { day: "목 20:00", seats: "8석 남음", closed: false },
  { day: "금 11:00", seats: "24석", closed: false },
  { day: "금 20:00", seats: "마감", closed: true },
];

function CalendarBlank() {
  return (
    <svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true">
      <g fill="currentColor">
        <path d="M216 48v40H40V48a8 8 0 0 1 8-8h160a8 8 0 0 1 8 8" opacity=".2" />
        <path d="M208 32h-24v-8a8 8 0 0 0-16 0v8H88v-8a8 8 0 0 0-16 0v8H48a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16M72 48v8a8 8 0 0 0 16 0v-8h80v8a8 8 0 0 0 16 0v-8h24v32H48V48Zm136 160H48V96h160z" />
      </g>
    </svg>
  );
}

function Clock() {
  return (
    <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true">
      <g fill="currentColor">
        <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
        <path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24m0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88m64-88a8 8 0 0 1-8 8h-56a8 8 0 0 1-8-8V72a8 8 0 0 1 16 0v48h48a8 8 0 0 1 8 8" />
      </g>
    </svg>
  );
}

function Digit({ value, strip }: { value: number; strip?: boolean }) {
  const v: DigitVars = { "--d": value };
  return (
    <span className={[styles.wb__d, strip ? styles["wb__d--s1"] : ""].filter(Boolean).join(" ")} style={v}>
      <span className={styles.wb__strip}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <b key={d}>{d}</b>
        ))}
      </span>
    </span>
  );
}

export default function WebinarSlotBooking({
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: WebinarSlotBookingProps) {
  const [picked, setPicked] = useState(0);
  const [confirmed, setConfirmed] = useState(-1);
  const [remain, setRemain] = useState(14 * 60 + 32);
  const [msg, setMsg] = useState("회차를 고르면 자리를 잡아 둬요");
  const [loop, setLoop] = useState(true);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]) as Box<(HTMLButtonElement | null)[]>;

  // setInterval 이 1초마다 남은 시간을 줄이고, 그 값이 숫자 띠의 --d 로 들어간다
  useEffect(() => {
    const id = setInterval(() => setRemain((p) => (p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  function select(i: number) {
    setLoop(false);
    setPicked(i);
    const el = cellRefs.current[i];
    if (el) el.focus({ preventScroll: true });
  }

  function onKey(e: KeyEvt) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const step = e.key === "ArrowRight" ? 1 : sessions.length - 1;
    let n = picked;
    do {
      n = (n + step) % sessions.length;
    } while (sessions[n].closed && n !== picked);
    select(n);
  }

  function book() {
    setLoop(false);
    if (confirmed === picked) {
      setMsg("이미 예약한 회차예요");
      return;
    }
    setConfirmed(picked);
    setMsg(`${sessions[picked].day} 회차로 예약했습니다. 확인 메일을 보냈어요`);
  }

  const m = Math.floor(remain / 60);
  const s = remain % 60;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = [styles.wb, loop ? styles["is-demo"] : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars}>
      <p className={styles.wb__title}>
        <span className={styles["wb__title-ic"]} aria-hidden="true"><CalendarBlank /></span>
        웨비나 회차 고르기
      </p>
      <div className={styles.wb__slots} role="radiogroup" aria-label="웨비나 회차" onKeyDown={onKey}>
        {sessions.map((se, i) => (
          <button
            key={se.day}
            ref={(el: HTMLButtonElement | null) => {
              cellRefs.current[i] = el;
            }}
            className={[styles.wb__slot, confirmed === i ? styles["is-ok"] : ""].filter(Boolean).join(" ")}
            type="button"
            role="radio"
            aria-checked={picked === i}
            tabIndex={picked === i ? 0 : -1}
            disabled={se.closed}
            onClick={() => select(i)}
          >
            <span className={styles.wb__ring} aria-hidden="true" />
            <span className={styles.wb__day}>{se.day}</span>
            <span className={[styles.wb__seat, se.closed ? styles["wb__seat--closed"] : ""].filter(Boolean).join(" ")}>
              {se.seats}
            </span>
            <span className={styles.wb__ok} aria-hidden="true">
              <svg className={styles["wb__ok-ic"]} viewBox="0 0 24 24" width="10" height="10">
                <polyline points="4 12 9 17 20 6" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              확정됨
            </span>
          </button>
        ))}
      </div>
      <p className={styles.wb__cd} role="timer" aria-live="off">
        <span className={styles["wb__cd-ic"]} aria-hidden="true"><Clock /></span>
        선택 회차 마감까지
        <span className={styles.wb__clock} aria-hidden="true">
          <b className={styles.wb__mm}>{m < 10 ? `0${m}` : m}</b>:
          <Digit value={Math.floor(s / 10)} />
          <Digit value={s % 10} strip />
        </span>
        <span className={styles["sr-only"]}>{`${m}분 ${s}초 남음`}</span>
      </p>
      <button className={styles.wb__go} type="button" onClick={book}>이 회차로 예약하기</button>
      <p className={styles.wb__msg} role="status" aria-live="polite">{msg}</p>
    </section>
  );
}
