import { useEffect, useRef } from "react";
import styles from "./PasswordResetRequest.module.scss";

// 비밀번호 재설정 요청(06) — 입력된 이메일의 글자 구성과 골뱅이·도메인 포함 여부를 매 프레임
// 다시 검사해 유효성 점수를 직접 계산하고, 그 점수로 요청 버튼의 활성화 여부와 힌트 색을 정한다.
// 이메일은 example.com 가상 주소가 타이핑되는 모습을 흉내낸 것이며 실제로 전송되지 않는다.
const SAMPLE = "jordan@example.com";
const TYPE_MS = 90;
const SCORE_THRESHOLD = 0.9;
const CYCLE_MS = 2000;

function currentText(t: number): string {
  const n = Math.min(Math.max(Math.floor(t / TYPE_MS), 0), SAMPLE.length);
  return SAMPLE.slice(0, n);
}

function score(text: string): number {
  const domain = text.split("@")[1] || "";
  let s = 0;
  if (text.indexOf("@") !== -1) s += 0.4;
  if (/\.[a-z]{2,}$/i.test(domain)) s += 0.4;
  s += Math.min(text.length / 12, 1) * 0.2;
  return s;
}

export default function PasswordResetRequest() {
  const inputRef = useRef<HTMLInputElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    const hint = hintRef.current;
    const submit = submitRef.current;
    if (!input || !hint || !submit) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function apply(t: number) {
      const text = currentText(t);
      const sc = score(text);
      const invalid = sc < SCORE_THRESHOLD;
      if (input) {
        input.value = text;
        input.setAttribute("aria-invalid", String(invalid));
      }
      if (submit) {
        submit.disabled = invalid;
        submit.setAttribute("aria-disabled", String(invalid));
      }
      if (hint) {
        hint.classList.remove(styles.isError, styles.isNeutral, styles.isValid);
        if (sc < 0.4) {
          hint.classList.add(styles.isError);
          hint.textContent = "이메일 형식을 확인해 주세요";
        } else if (sc < SCORE_THRESHOLD) {
          hint.classList.add(styles.isNeutral);
          hint.textContent = "이메일 주소를 마저 입력해 주세요";
        } else {
          hint.classList.add(styles.isValid);
          hint.textContent = "이메일 형식이 올바릅니다";
        }
      }
    }

    let start: number | null = null;
    let raf = 0;
    function frame(ts: number) {
      if (start === null) start = ts;
      const t = (ts - start) % CYCLE_MS;
      apply(t);
      raf = requestAnimationFrame(frame);
    }

    if (reduce) {
      apply(0);
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <section className={styles.card}>
        <p className={styles.title}>비밀번호를 잊으셨나요?</p>
        <p className={styles.desc}>이메일을 입력하면 재설정 링크를 보내드립니다</p>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="resetEmail">
            이메일 주소
          </label>
          <input
            ref={inputRef}
            className={styles.input}
            type="email"
            id="resetEmail"
            autoComplete="email"
            aria-describedby="resetHint"
            aria-invalid="true"
            defaultValue=""
          />
        </div>
        <p ref={hintRef} className={styles.hint + " " + styles.isNeutral} id="resetHint">
          이메일 형식을 입력해 주세요
        </p>
        <button ref={submitRef} className={styles.submit} type="button" disabled aria-disabled="true">
          재설정 링크 요청
        </button>
      </section>
    </main>
  );
}
