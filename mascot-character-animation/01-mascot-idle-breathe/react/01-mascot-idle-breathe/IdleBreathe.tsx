// IdleBreathe — vanilla 판(run/300/demo/01-mascot-idle-breathe/index.html) 의 React 포트.
// 몸 하나가 세로로 늘었다 줄고 그림자가 반대로 넓어진다. 눈은 한 프레임에 감겼다 뜬다.
// 사람이 화면에 손을 대면 미리보기 루프를 떼고, 멈춰 보이지 않게 깜빡임만 타이머로 이어 간다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./IdleBreathe.module.scss";

export type IdleBreatheProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };

const HINT = "아무도 건드리지 않는 동안의 기본 자세입니다";
const CHAR_LABEL = "가만히 서서 숨 쉬는 마스코트";
const BEAT_LABEL = "숨";

// 미리보기를 뗀 뒤의 깜빡임 간격·길이. vanilla 의 setInterval(3200) · setTimeout(120) 과 같은 값이다
const BLINK_EVERY = 3200;
const BLINK_HOLD = 120;

export default function IdleBreathe({ duration, easing, color }: IdleBreatheProps) {
  const [awake, setAwake] = useState(false);
  const [blink, setBlink] = useState(false);
  const holdRef = useRef(0) as Box<number>;

  useEffect(() => {
    if (!awake) return;
    const every = window.setInterval(() => {
      setBlink(true);
      holdRef.current = window.setTimeout(() => setBlink(false), BLINK_HOLD);
    }, BLINK_EVERY);
    return () => {
      window.clearInterval(every);
      window.clearTimeout(holdRef.current);
    };
  }, [awake]);

  const wake = () => setAwake(true);

  const vars: Vars = {};
  if (duration) vars["--duration"] = duration;
  if (easing) vars["--easing"] = easing;
  if (color) vars["--color"] = color;

  const cls = [styles.root, awake ? "" : styles.demo, blink ? styles.blink : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls} style={vars} onPointerDown={wake} onPointerEnter={wake}>
      <p className={styles.hint}>
        <svg className={styles.ico} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
          <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
          <path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24m0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88M80 108a12 12 0 1 1 12 12a12 12 0 0 1-12-12m96 0a12 12 0 1 1-12-12a12 12 0 0 1 12 12m-1.08 48c-10.29 17.79-27.39 28-46.92 28s-36.63-10.2-46.92-28a8 8 0 1 1 13.84-8c7.47 12.91 19.21 20 33.08 20s25.61-7.1 33.08-20a8 8 0 1 1 13.84 8" />
        </svg>
        <span>{HINT}</span>
      </p>

      <div className={styles.floor}>
        {/* 캐릭터는 아이콘이 아니라 이 데모의 피사체라 손으로 그린다. 부품이 적을수록 숨 한 번이 선명하다. */}
        <div className={styles.char} role="img" aria-label={CHAR_LABEL}>
          <span className={styles.body}>
            <i className={`${styles.eye} ${styles.eyeL}`} />
            <i className={`${styles.eye} ${styles.eyeR}`} />
            <i className={`${styles.cheek} ${styles.cheekL}`} />
            <i className={`${styles.cheek} ${styles.cheekR}`} />
            <i className={styles.mouth} />
          </span>
          <span className={styles.shadow} />
        </div>
      </div>

      <p className={styles.beat}>
        <span className={styles.beatLabel}>{BEAT_LABEL}</span>
        <span className={styles.beatTrack}>
          <i className={styles.beatFill} />
        </span>
      </p>
    </div>
  );
}
