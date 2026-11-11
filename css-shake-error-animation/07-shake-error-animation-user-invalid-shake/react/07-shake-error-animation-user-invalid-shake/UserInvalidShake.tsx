import { useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import styles from "./UserInvalidShake.module.scss";

export type UserInvalidShakeProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

// React 는 :user-invalid 를 직접 읽지 못해, onBlur 에서 checkValidity() 로 같은 순간을 흉내 낸다.
// 실제 zip 의 vanilla 판은 JS 없이 CSS 의사 클래스 하나로 끝난다 — 이 파일은 React 이식일 뿐이다.
export default function UserInvalidShake({ duration = 500, easing = "ease-out", color = "#c2361a" }: UserInvalidShakeProps) {
  const [touched, setTouched] = useState(true);
  const [run, setRun] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const onBlur = (e: ChangeEvent<HTMLInputElement>) => {
    setTouched(!e.target.checkValidity());
    setRun((n) => n + 1);
  };

  return (
    <div className={styles.ui} style={vars}>
      <label className={styles.label} htmlFor="ui-email">이메일</label>
      <input
        key={run}
        id="ui-email"
        className={`${styles.input} ${touched ? styles.shake : ""}`}
        type="email"
        required
        pattern=".+@.+\..+"
        defaultValue="broken"
        onBlur={onBlur}
      />
      <p className={styles.msg}>올바른 이메일 주소를 입력하세요</p>
    </div>
  );
}
