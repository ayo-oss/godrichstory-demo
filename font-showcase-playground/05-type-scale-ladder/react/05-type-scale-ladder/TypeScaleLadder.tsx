// TypeScaleLadder — vanilla 판(run/074/demo/05-type-scale-ladder/index.html) 의 React 포트.
// 비율을 고르면 --ratio 하나가 사다리 다섯 단의 calc() 사슬을 함께 움직이고,
// 화면 px 숫자는 세 비율의 값을 toFixed 로 미리 만들어 둔 것 중 지금 비율의 것만 보인다.
import { useState } from "react";
import type { FC } from "react";
import styles from "./TypeScaleLadder.module.scss";

export type TypeScaleLadderProps = {
  duration?: number;
  easing?: string;
  color?: string;
  base?: number;
};

type RatioKey = "a" | "b" | "c";

const RATIOS: Record<RatioKey, number> = { a: 1.125, b: 1.25, c: 1.333 };
const KEYS: RatioKey[] = ["a", "b", "c"];
const RUNGS: { step: number; label: string }[] = [
  { step: 4, label: "다섯째 단" },
  { step: 3, label: "넷째 단" },
  { step: 2, label: "셋째 단" },
  { step: 1, label: "둘째 단" },
  { step: 0, label: "본문 한 단" },
];

const TypeScaleLadder: FC<TypeScaleLadderProps> = ({
  duration,
  easing,
  color,
  base = 11,
}) => {
  const [key, setKey] = useState<RatioKey>("b");
  const [demo, setDemo] = useState(true);

  const cls = [styles.ts, demo ? styles["is-demo"] : "", styles["is-" + key]]
    .filter(Boolean).join(" ");
  const vars = {
    "--ratio": String(RATIOS[key]),
    "--base": String(base),
    "--duration": duration != null ? duration + "ms" : undefined,
    "--easing": easing,
    "--color": color,
  } as never;

  return (
    <div className={cls} style={vars}>
      <div className={styles.ts__bar} role="group" aria-label="비율 고르기">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            className={styles.ts__pick}
            aria-pressed={key === k ? "true" : "false"}
            onClick={() => {
              setDemo(false);
              setKey(k);
            }}
          >
            {RATIOS[k]}
          </button>
        ))}
      </div>
      <ul className={styles.ts__ladder}>
        {RUNGS.map((r) => (
          <li
            key={r.step}
            className={[styles.ts__rung, styles["ts__rung--" + (r.step + 1)]].join(" ")}
          >
            <span className={styles.ts__glyph}>{r.label}</span>
            <span className={styles.ts__px}>
              {KEYS.map((k) => (
                <span key={k} className={styles["ts__v--" + k]}>
                  {(base * Math.pow(RATIOS[k], r.step)).toFixed(1)}px
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <span className={styles.ts__beam} aria-hidden="true" />
    </div>
  );
};

export default TypeScaleLadder;
