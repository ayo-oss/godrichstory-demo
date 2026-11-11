// EyesCoverPassword — vanilla 판(run/300/demo/04-mascot-eyes-cover-password/index.html) 의 React 포트.
// 글자가 들어오면 두 팔이 어깨를 축으로 올라와 눈을 덮고, 보기 단추를 켜면 내려간다.
// 캐릭터는 장식(aria-hidden), 상태는 단추의 aria-pressed 가 알린다. 값·수치는 vanilla 와 같다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./EyesCoverPassword.module.scss";

export type EyesCoverPasswordProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// 로컬 이벤트 타입 — ambient 에 React 이벤트 제네릭이 없다 (292 실측 계열)
type InputEvt = { target: { value: string } };
type SubmitEvt = { preventDefault(): void };

const LABEL_SHOW = "비밀번호 보기";
const LABEL_HIDE = "비밀번호 숨기기";
const HINT_TEXT = "비밀번호를 넣으면 눈을 가려 줍니다";
const LABEL_TEXT = "비밀번호";
const PLACEHOLDER = "비밀번호를 입력하세요";
const NOTE_TEXT = "보기 단추를 켜면 팔이 내려갑니다";
const GHOST_TEXT = "•••••";

export default function EyesCoverPassword({
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: EyesCoverPasswordProps) {
  const [value, setValue] = useState("");
  const [shown, setShown] = useState(false);
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cover = value !== "" && !shown;
  const rootCls = cover
    ? `${styles.mc} ${styles["is-cover"]}`
    : styles.mc;

  return (
    <main className={styles.stage}>
      <div
        className={demo ? `${rootCls} ${styles["is-demo"]}` : rootCls}
        style={vars}
        onPointerEnter={() => setDemo(false)}
      >
        <p className={styles.mc__hint}>
          <svg className={styles.mc__ico} aria-hidden="true">
            <use href="#ico-eye-closed" />
          </svg>
          <span>{HINT_TEXT}</span>
        </p>

        <div className={styles.mc__row}>
          {/* 캐릭터는 장식 — 상태는 보기 단추의 aria-pressed 로 알린다 */}
          <div className={styles.mc__char} aria-hidden={true}>
            <span className={styles.mc__body}>
              <i className={`${styles.mc__eye} ${styles["mc__eye--l"]}`}></i>
              <i className={`${styles.mc__eye} ${styles["mc__eye--r"]}`}></i>
              <i className={`${styles.mc__cheek} ${styles["mc__cheek--l"]}`}></i>
              <i className={`${styles.mc__cheek} ${styles["mc__cheek--r"]}`}></i>
              <i className={styles.mc__mouth}></i>
              <i className={`${styles.mc__arm} ${styles["mc__arm--l"]}`}></i>
              <i className={`${styles.mc__arm} ${styles["mc__arm--r"]}`}></i>
            </span>
          </div>

          <form
            className={styles.mc__form}
            autoComplete="off"
            onSubmit={(e: SubmitEvt) => e.preventDefault()}
          >
            <label className={styles.mc__label} htmlFor="mc-pw">{LABEL_TEXT}</label>
            <span className={styles.mc__field}>
              <input
                id="mc-pw"
                className={styles.mc__input}
                type={shown ? "text" : "password"}
                placeholder={PLACEHOLDER}
                autoComplete="off"
                value={value}
                onFocus={() => setDemo(false)}
                onChange={(e: InputEvt) => { setDemo(false); setValue(e.target.value); }}
              />
              <button
                type="button"
                className={styles.mc__reveal}
                aria-pressed={shown ? "true" : "false"}
                aria-label={shown ? LABEL_HIDE : LABEL_SHOW}
                onClick={() => { setDemo(false); setShown((s) => !s); }}
              >
                <svg className={styles.mc__revealIco} aria-hidden="true">
                  <use href="#ico-eye-closed" />
                </svg>
              </button>
              {/* 미리보기에서만 글자가 들어오는 흉내를 내는 겹침 */}
              <span className={styles.mc__ghost} aria-hidden={true}>{GHOST_TEXT}</span>
            </span>
            <p className={styles.mc__note}>{NOTE_TEXT}</p>
          </form>
        </div>
      </div>
    </main>
  );
}
