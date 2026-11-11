// TextRhythmPreview — vanilla 판(run/074/demo/04-text-rhythm-preview/index.html) 의 React 포트.
// 한 줄 길이를 ch 슬라이더로 정하고 기준선 격자를 토글한다. 슬라이더 값은 상태로, 판 폭은 --measure 로 흀러간다.
import { useState } from "react";
import type { ChangeEvent, FC } from "react";
import styles from "./TextRhythmPreview.module.scss";

export type TextRhythmPreviewProps = {
  duration?: number;
  easing?: string;
  color?: string;
  initialMeasure?: number;
  initialGrid?: boolean;
};

const NOTE = "격자 줄에 행이 앉으면 단락의 리듬이 잡힙니다";
const SAMPLE =
  "서체를 고르기 전에 정할 것이 한 줄의 길이다. 한 줄이 길면 눈이 다음 줄의 첫 글자를 놓치고, 너무 짧으면 문장이 자꾸 끊긴다. 행간은 그 길이를 따라간다.";

const TextRhythmPreview: FC<TextRhythmPreviewProps> = ({
  duration,
  easing,
  color,
  initialMeasure = 44,
  initialGrid = true,
}) => {
  const [measure, setMeasure] = useState(String(initialMeasure));
  const [gridOn, setGridOn] = useState(initialGrid);
  const [demo, setDemo] = useState(true);

  const cls = [styles.tr, demo ? styles["is-demo"] : "", gridOn ? styles["is-grid"] : ""]
    .filter(Boolean).join(" ");
  const vars = {
    "--measure": measure,
    "--duration": duration != null ? duration + "ms" : undefined,
    "--easing": easing,
    "--color": color,
  } as never;

  return (
    <div className={cls} style={vars}>
      <div className={styles.tr__bar}>
        <span className={styles.tr__label}>한 줄 길이</span>
        <input
          className={styles.tr__range}
          type="range"
          min="24"
          max="46"
          step="1"
          value={measure}
          aria-label="한 줄 길이"
          onInput={() => setDemo(false)}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setMeasure(e.currentTarget.value)}
        />
        <span className={styles.tr__val}>{measure}ch</span>
        <button
          type="button"
          className={styles.tr__toggle}
          aria-pressed={gridOn ? "true" : "false"}
          onClick={() => {
            setDemo(false);
            setGridOn((g) => !g);
          }}
        >
          기준선 격자
        </button>
      </div>
      <div
        className={[styles.tr__sheet, gridOn ? styles["is-grid"] : ""].filter(Boolean).join(" ")}
        data-sheet
      >
        <p className={styles.tr__p}>{SAMPLE}</p>
      </div>
      <p className={styles.tr__note}>{NOTE}</p>
    </div>
  );
};

export default TextRhythmPreview;
