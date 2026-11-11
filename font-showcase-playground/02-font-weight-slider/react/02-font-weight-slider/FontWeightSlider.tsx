// FontWeightSlider — vanilla 판(run/074/demo/02-font-weight-slider/index.html) 의 React 포트.
// 슬라이더가 font-weight 100~900 을 움직이고 화면 숫자는 getComputedStyle 로 브라우저가 실제로
// 계산한 값을 다시 읽어 보여준다(vanilla 의 oninput 경로 대신 React 의 onInput 프롭).
// 가변 축은 font-variation-settings 'wght' 를 함께 건다 — 키프레임은 vanilla 와 같은 글자다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FontWeightSlider.module.scss";

export type FontWeightSliderProps = {
  duration?: number;
  easing?: string;
  color?: string;
  initialWeight?: number;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--w"?: string;
};
type Box<T> = { current: T | null };
// 이벤트 핸들러 파라미터는 로컬 타입으로 — ambient 타입이 React 제네릭을 안 준다
type RangeEvt = { target: { value: string } };

const NOTE = "손잡이를 끌면 브라우저가 계산한 값이 따라옵니다";
const ARIA_LABEL = "굵기 슬라이더";
const BIG_TEXT = "Ag 09";
const HANGUL_TEXT = "다람쥐 헌 쳇바퀴";
const SCALE = ["100", "500", "900"];

export default function FontWeightSlider(props: FontWeightSliderProps) {
  const duration = props.duration ?? 220;
  const easing = props.easing ?? "cubic-bezier(.2, .8, .2, 1)";
  const color = props.color ?? "#2f6df6";
  const initial = props.initialWeight ?? 700;
  const [weight, setWeight] = useState<number>(initial);
  const [computed, setComputed] = useState<string>(String(initial));
  const [preview, setPreview] = useState<boolean>(true);
  const bigRef = useRef<HTMLParagraphElement>(null) as Box<HTMLParagraphElement>;

  // 화면 숫자는 작성값이 아니라 브라우저가 계산한 값 — 렌더 뒤에 다시 읽는다.
  // 미리보기 루프가 돌던 중이면 계산값이 보간 중간값이니 읽지 않고 초기값(700)을 유지한다.
  useEffect(() => {
    const big = bigRef.current;
    if (big && !preview) setComputed(getComputedStyle(big).fontWeight);
  }, [weight, preview]);

  const vars: Vars = {
    "--duration": duration + "ms",
    "--easing": easing,
    "--color": color,
    "--w": String(weight),
  };
  const fill = ((weight - 100) / 8).toFixed(1) + "%";

  return (
    <main className={styles.stage}>
      <section className={styles.root + (preview ? " " + styles.isDemo : "")} style={vars} aria-label={ARIA_LABEL}>
        <header className={styles.bar}>
          <span className={styles.name}>font-weight</span>
          <span className={styles.out}>{computed}</span>
        </header>
        <div className={styles.spec}>
          <p className={styles.big} ref={bigRef} style={{ fontWeight: weight }}>{BIG_TEXT}</p>
          <p className={styles.hangul} style={{ fontWeight: weight }}>{HANGUL_TEXT}</p>
        </div>
        <input
          className={styles.range}
          type="range"
          min="100"
          max="900"
          step="100"
          value={weight}
          aria-label={ARIA_LABEL}
          aria-valuemin="100"
          aria-valuemax="900"
          aria-valuenow={weight}
          style={{ "--fill": fill } as CSSProperties}
          onPointerDown={() => setPreview(false)}
          onInput={(e: RangeEvt) => {
            setPreview(false);
            setWeight(Number(e.target.value));
          }}
        />
        <div className={styles.ruler} aria-hidden="true">
          {Array.from({ length: 9 }, (_, i) => (
            <i key={i}></i>
          ))}
        </div>
        <p className={styles.scale}>
          {SCALE.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </p>
        <p className={styles.note}>{NOTE}</p>
      </section>
    </main>
  );
}
