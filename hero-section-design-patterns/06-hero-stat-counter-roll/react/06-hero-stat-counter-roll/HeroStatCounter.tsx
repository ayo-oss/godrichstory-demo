import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./HeroStatCounter.module.scss";

/* ambient 에 FocusEvent 가 없어 파일 안에 필요한 만큼만 선언한다 */
type FocusEvt = { target: unknown; currentTarget: unknown };

export type Stat = {
  /** 자릿수 스트립 — 마지막 칸이 확정된 숫자다 */
  digits: string[][];
  /** 숫자 뒤 단위 (%, ×, h …) */
  unit: string;
  /** 스크린 리더가 읽을 값 */
  value: string;
  label: string;
};

export type HeroStatCounterProps = {
  title?: string;
  stats?: Stat[];
  againLabel?: string;
  /** 굴림 + 확정 밑줄 한 바퀴(ms) */
  duration?: number;
  easing?: string;
  /** 옐로 무대 위 강조는 잉크뿐 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const DEFAULT_STATS: Stat[] = [
  { digits: [["3", "4", "5", "6", "7", "8", "9"], ["2", "3", "4", "5", "6", "7", "8"]], unit: "%", value: "98퍼센트", label: "가동 안정성" },
  { digits: [["5", "6", "7", "8", "9", "0", "1"], ["6", "7", "8", "9", "0", "1", "2"]], unit: "×", value: "12배", label: "배포 속도" },
  { digits: [["6", "7", "8", "9", "0", "1", "2"], ["8", "9", "0", "1", "2", "3", "4"]], unit: "h", value: "24시간", label: "평균 응답" },
];

export default function HeroStatCounter({
  title = "숫자가 먼저 말하는 회사 소개",
  stats = DEFAULT_STATS,
  againLabel = "다시 세기",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
}: HeroStatCounterProps): ReactNode {
  const [loop, setLoop] = useState<boolean>(true);
  /* 같은 애니메이션을 처음부터 다시 걸기 위한 열쇠 — 값이 바뀌면 노드가 새로 선다 */
  const [run, setRun] = useState<number>(0);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const delay = ["0s", ".16s", ".32s"];

  const again = (): void => {
    setLoop(true);
    setRun(run + 1);
  };

  return (
    <section
      className={loop ? `${styles.hc} ${styles.isDemo}` : styles.hc}
      style={vars}
      onFocus={(e: FocusEvt) => { if (e.target !== e.currentTarget) { setLoop(false); } }}
    >
      <h1 className={styles.title}>{title}</h1>

      <div className={styles.row} key={run} onPointerEnter={() => setLoop(false)}>
        {stats.map((s: Stat, i: number) => (
          <div className={styles.cell} key={s.label} style={{ "--d": delay[i % delay.length] } as CSSProperties}>
            {/* 자릿수 스트립은 창 안에서 굴러간다 — 읽히는 값은 aria-label 하나 */}
            <p className={styles.value} role="img" aria-label={s.value}>
              {s.digits.map((col: string[], k: number) => (
                <span className={styles.win} aria-hidden="true" key={k}>
                  <span className={k === 1 ? `${styles.strip} ${styles.stripB}` : styles.strip}>
                    {col.map((d: string, n: number) => (
                      <span className={styles.digit} key={n}>{d}</span>
                    ))}
                  </span>
                </span>
              ))}
              <span className={styles.unit} aria-hidden="true">{s.unit}</span>
            </p>
            <span className={styles.rule} aria-hidden="true" />
            <p className={styles.label}>{s.label}</p>
          </div>
        ))}
      </div>

      <button className={styles.again} type="button" onClick={again}>{againLabel}</button>
    </section>
  );
}
