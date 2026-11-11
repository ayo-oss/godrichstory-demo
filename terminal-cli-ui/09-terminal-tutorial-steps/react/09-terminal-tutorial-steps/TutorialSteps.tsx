// TutorialSteps — vanilla 판(run/294/demo/09-terminal-tutorial-steps/index.html) 의 React 포트.
// 세 단계가 차례로 과제를 내고, 맞는 명령을 치면 다음 단계로 넘어간다.
// 단계 번호는 글자가 아니라 data-step 이 세운 --step 을 counter() 로 찍는다 (module.scss).
// 격자 미리보기(isDemo)는 명령을 한 번 보내면 꺼진다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TutorialSteps.module.scss";

export type TutorialStepsProps = {
  /** 격자 미리보기용 2초 자동 루프. 명령을 보내면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// React 이벤트 제네릭이 없는 환경이라 쓰는 필드만 지역 타입으로 선언한다
type FormEvt = { preventDefault(): void };
type ChangeEvt = { target: { value: string } };
type Verdict = "" | "ok" | "no";

const WANT = ["pwd", "ls -a", "git status"];
const TASKS = [
  "지금 폴더를 봅니다. pwd 를 치고 Enter",
  "숨은 파일까지 봅니다. ls -a 를 치고 Enter",
  "바뀐 파일을 봅니다. git status 를 치고 Enter",
];

export default function TutorialSteps({
  demo = true,
  duration = 300,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2b9d74",
}: TutorialStepsProps) {
  const [live, setLive] = useState(demo);
  const [step, setStep] = useState(1);
  const [verdict, setVerdict] = useState<Verdict>("");
  const [value, setValue] = useState("");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function handleSubmit(e: FormEvt) {
    e.preventDefault();
    setLive(false);
    // 사이 공백이 몇 칸이든 같은 명령으로 본다
    const typed = value.trim().replace(/\s+/g, " ");
    if (typed !== WANT[step - 1]) { setVerdict("no"); return; }
    setVerdict("ok");
    setValue("");
    if (step < WANT.length) { setStep(step + 1); }
  }

  function handleChange(e: ChangeEvt) {
    setValue(e.target.value);
    setVerdict("");
  }

  const cls = [
    styles.root,
    live ? styles.isDemo : "",
    verdict === "ok" ? styles.isOk : "",
    verdict === "no" ? styles.isNo : "",
  ].filter(Boolean).join(" ");
  return (
    <main className={styles.stage} style={vars}>
      <div className={cls} data-step={String(step)}>
        <p className={styles.head}>
          <span className={styles.badge} aria-hidden="true"><span className={styles.no} />{" / 3"}</span>
          <span className={styles.slot}>
            {TASKS.map((task, i) => (
              <span className={styles.task} data-step={String(i + 1)} key={WANT[i]}>{task}</span>
            ))}
          </span>
        </p>
        <p
          className={styles.rail}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={3}
          aria-valuenow={step}
          aria-label="진행한 단계"
        >
          <span className={styles.fill} aria-hidden="true" />
        </p>
        <form className={styles.win} onSubmit={handleSubmit}>
          <span className={styles.sign} aria-hidden="true">$</span>
          <input
            className={styles.input}
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="여기에 명령을 치세요"
            aria-label="명령 입력칸"
            value={value}
            onChange={handleChange}
          />
          <span className={styles.say + " " + styles.sayOk} role="status">맞았어요</span>
          <span className={styles.say + " " + styles.sayNo} role="status">다시 한 번</span>
        </form>
      </div>
    </main>
  );
}
