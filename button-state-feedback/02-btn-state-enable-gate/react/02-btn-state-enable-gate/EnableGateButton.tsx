import { useState, useRef, useEffect } from "react";
import type { CSSProperties } from "react";
import styles from "./EnableGateButton.module.scss";

export type EnableGateButtonProps = {
  labels?: { submit: string; tip: string; placeholder: string; mail: string };
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Timer = ReturnType<typeof setTimeout>;
type MailEvt = { currentTarget: { value: string; checkValidity(): boolean } };

const TIP_ID = "eg-why";
const WHY_MS = 1400; // 잠긴 이유를 보여 주는 시간

export default function EnableGateButton({
  labels = {
    submit: "Sign up",
    tip: "Enter a valid email first",
    placeholder: "you@example.com",
    mail: "Email address",
  },
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
}: EnableGateButtonProps) {
  const [demo, setDemo] = useState(true);
  const [ok, setOk] = useState(false);
  const [why, setWhy] = useState(false);
  const [sent, setSent] = useState(false);
  const tw = useRef<Timer>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => () => {
    if (tw.current !== null) clearTimeout(tw.current); // 떠날 때 예약된 타이머를 버린다
  }, []);

  // disabled 대신 aria-disabled 를 쓴다. 초점은 받되 동작만 막아, 왜 못 누르는지 읽힐 수 있다
  function check(e: MailEvt) {
    setDemo(false); // 사람이 입력했으니 자동 루프를 끈다
    const el = e.currentTarget;
    setOk(el.checkValidity() && el.value.length > 0);
  }

  function press() {
    setDemo(false);
    if (!ok) {
      setWhy(true); // 잠긴 이유를 한 번 흔들어 보여 준다
      if (tw.current !== null) clearTimeout(tw.current);
      tw.current = setTimeout(() => setWhy(false), WHY_MS);
      return;
    }
    setSent(true);
  }

  return (
    <div className={`${styles.eg} ${demo ? styles.isDemo : ""}`} style={vars}>
      <div className={styles.field}>
        <input
          className={styles.input}
          type="email"
          required
          placeholder={labels.placeholder}
          aria-label={labels.mail}
          onChange={check}
        />
        <span className={styles.ghost} aria-hidden="true">{labels.placeholder}</span>
      </div>
      <div className={styles.wrap}>
        <button
          className={styles.btn}
          type="button"
          aria-disabled={!ok}
          aria-describedby={TIP_ID}
          data-why={why ? "1" : undefined}
          data-sent={sent ? "1" : undefined}
          onClick={press}
        >
          {labels.submit}
        </button>
        <p className={styles.tip} id={TIP_ID} role="note">{labels.tip}</p>
      </div>
    </div>
  );
}
