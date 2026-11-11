// CarryLoading — vanilla 판(run/300/demo/05-mascot-carry-loading/index.html) 의 React 포트.
// 캐릭터가 상자를 들고 왕복하는 동안 막대가 왼쪽부터 채워진다. CSS 만으로 성립 — JS 상태가 없다.
// duration·easing·color 는 props → CSS 변수. 걷기(편도)·발 딛임·카운터 단위는 duration 의 약수로 파생
// (2s 기준 1s · 250ms · 200ms — 왕복 한 바퀴가 duration 안에 들어온다).
import type { CSSProperties } from "react";
import styles from "./CarryLoading.module.scss";

export type CarryLoadingProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--walk"?: string;
  "--step"?: string;
  "--odo-u"?: string;
};

const HINT_TEXT = "짐을 나르는 동안 막대가 채워집니다";
const PROGRESS_LABEL = "짐 나르기 진행률";
const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

export default function CarryLoading({
  duration = 2000,
  easing = "ease-out",
  color = "#fff7e6",
}: CarryLoadingProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--walk": `${duration / 2}ms`,
    "--step": `${duration / 8}ms`,
    "--odo-u": `${duration / 10}ms`,
  };

  return (
    <main className={styles.stage}>
      <div className={styles.ml} style={vars as CSSProperties}>
        <p className={styles.ml__hint}>
          <svg className={styles.ml__ico} aria-hidden="true">
            <use href="#ico-package" />
          </svg>
          <span>{HINT_TEXT}</span>
        </p>

        <div className={styles.ml__scene}>
          <i className={styles.ml__ground}></i>
          {/* 캐릭터·상자는 장식 — 진행 상태는 아래 막대의 role="progressbar" 가 알린다 */}
          <div className={styles.ml__lane} aria-hidden={true}>
            <div className={styles.ml__step}>
              <i className={`${styles.ml__arm} ${styles["ml__arm--l"]}`}></i>
              <i className={`${styles.ml__arm} ${styles["ml__arm--r"]}`}></i>
              <span className={styles.ml__body}>
                <i className={`${styles.ml__eye} ${styles["ml__eye--l"]}`}></i>
                <i className={`${styles.ml__eye} ${styles["ml__eye--r"]}`}></i>
                <i className={`${styles.ml__cheek} ${styles["ml__cheek--l"]}`}></i>
                <i className={`${styles.ml__cheek} ${styles["ml__cheek--r"]}`}></i>
                <i className={styles.ml__mouth}></i>
              </span>
              <span className={styles.ml__box}></span>
            </div>
          </div>
        </div>

        <p className={styles.ml__meta}>
          {/* 숫자는 막대 밖 잉크 무대 위 — 카운터는 00 부터 99 까지 duration 에 한 바퀴 */}
          <span className={styles.ml__odo} aria-hidden={true}>
            <i className={styles.ml__odoWin}>
              <i className={`${styles.ml__odoCol} ${styles["ml__odoCol--t"]}`}>
                {DIGITS.map((d) => <b key={d}>{d}</b>)}
              </i>
            </i>
            <i className={styles.ml__odoWin}>
              <i className={`${styles.ml__odoCol} ${styles["ml__odoCol--u"]}`}>
                {DIGITS.map((d) => <b key={d}>{d}</b>)}
              </i>
            </i>
            <b className={styles.ml__pct}>%</b>
          </span>
          <span
            className={styles.ml__track}
            role="progressbar"
            aria-valuenow="0"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-label={PROGRESS_LABEL}
          >
            <i className={styles.ml__fill}></i>
          </span>
        </p>
      </div>
    </main>
  );
}
