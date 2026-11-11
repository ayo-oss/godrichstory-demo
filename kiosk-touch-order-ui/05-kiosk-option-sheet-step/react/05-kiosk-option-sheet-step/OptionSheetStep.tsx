// OptionSheetStep — vanilla 판(run/298/demo/05-kiosk-option-sheet-step/index.html) 의 React 포트.
// 옵션을 한 화면에 다 늘어놓지 않고 크기·온도 두 걸음으로 나눈다. 두 판은 같은 격자 칸(grid-area: 1 / 1)에
// 겹쳐 서고 visibility + opacity 로만 갈린다 — 높이가 큰 쪽으로 고정돼 걸음이 바뀔 때 시트가 들썩이지 않는다.
// 고른 값은 걸음을 오가도 버리지 않는다. 라디오 상태를 DOM 에 그대로 두고 보이는 칸만 바꾸기 때문이다.
// 라디오 묶음은 Tab 이 한 번만 들어오는 로빙 tabindex 다 — 안에서는 화살표로 옮겨 다닌다.
// 미리보기 루프(.isDemo)는 CSS 키프레임이 돌리고, 사람이 만지면 여기서 루프를 뗀다. 값·수치는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./OptionSheetStep.module.scss";

export type OptionSheetStepProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};
// ambient 타입에는 React 이벤트 제네릭이 없다 — 핸들러가 실제로 쓰는 것만 지역 타입으로 적는다
type KeyEvt = { key: string; preventDefault(): void };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };

const MENU_NAME = "아메리카노";
const MENU_PRICE = "4,200원";
const BACK_LABEL = "뒤로";
const NEXT_LABEL = "다음";

type Group = { pane: string; title: string; label: string; opts: string[] };
const GROUPS: Group[] = [
  { pane: "pane1", title: "크기를 고르세요", label: "크기 고르기", opts: ["작게", "보통", "크게"] },
  { pane: "pane2", title: "온도를 고르세요", label: "온도 고르기", opts: ["따뜻하게", "차갑게"] },
];
const FIRST_PICKS: string[] = ["보통", "따뜻하게"];

export default function OptionSheetStep({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: OptionSheetStepProps) {
  const box1 = useRef<HTMLDivElement | null>(null);
  const box2 = useRef<HTMLDivElement | null>(null);
  const boxes = [box1, box2];
  // 첫 렌더에는 초점을 옮기지 않는다 — 사람이 만진 뒤부터가 걸음 이동이다
  const touchedRef = useRef<boolean>(false) as Box<boolean>;
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState(FIRST_PICKS);
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    if (!touchedRef.current) return;
    const box = boxes[step].current;
    if (!box) return;
    // 걸음을 옮기면 그 판에서 이미 고른 칸으로 초점이 간다 (없으면 첫 칸)
    const on = box.querySelector('[aria-checked="true"]') as HTMLButtonElement | null;
    const first = on || (box.querySelector("button") as HTMLButtonElement | null);
    if (first) first.focus({ preventScroll: true });
  }, [step]);

  function go(to: number): void {
    touchedRef.current = true;
    setDemo(false);
    setStep(Math.max(0, Math.min(GROUPS.length - 1, to)));
  }

  function pick(gi: number, value: string): void {
    setDemo(false);
    setPicks((prev) => prev.map((v, i) => (i === gi ? value : v)));
  }

  // 라디오 묶음은 화살표로 옮겨 다닌다 — 로빙 tabindex 라 초점은 늘 고른 칸에 있다
  function keys(gi: number, event: KeyEvt): void {
    let d = 0;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") d = 1;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") d = -1;
    else return;
    event.preventDefault();
    const opts = GROUPS[gi].opts;
    const at = opts.indexOf(picks[gi]);
    const next = (at + d + opts.length) % opts.length;
    pick(gi, opts[next]);
    const box = boxes[gi].current;
    if (!box) return;
    const btn = box.querySelectorAll("button")[next] as HTMLButtonElement | undefined;
    if (btn) btn.focus({ preventScroll: true });
  }

  const cls = [styles.root, demo ? styles.isDemo : "", step === 1 ? styles.isStep2 : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <p className={styles.menu}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M208,88v48a88,88,0,0,1-51.3,80H83.3A88,88,0,0,1,32,136V88Z" opacity="0.2"/><path d="M80,56V24a8,8,0,0,1,16,0V56a8,8,0,0,1-16,0Zm40,8a8,8,0,0,0,8-8V24a8,8,0,0,0-16,0V56A8,8,0,0,0,120,64Zm32,0a8,8,0,0,0,8-8V24a8,8,0,0,0-16,0V56A8,8,0,0,0,152,64Zm96,56v8a40,40,0,0,1-37.51,39.91,96.59,96.59,0,0,1-27,40.09H208a8,8,0,0,1,0,16H32a8,8,0,0,1,0-16H56.54A96.3,96.3,0,0,1,24,136V88a8,8,0,0,1,8-8H208A40,40,0,0,1,248,120ZM200,96H40v40a80.27,80.27,0,0,0,45.12,72h69.76A80.27,80.27,0,0,0,200,136Zm32,24a24,24,0,0,0-16-22.62V136a95.78,95.78,0,0,1-1.2,15A24,24,0,0,0,232,128Z"/></svg>
          <span className={styles.name}>{MENU_NAME}</span>
          <b className={styles.price}>{MENU_PRICE}</b>
        </p>

        <div className={styles.sheet}>
          <span className={styles.steps} aria-hidden="true">
            <i className={`${styles.seg} ${styles.seg1}`}></i>
            <i className={`${styles.seg} ${styles.seg2}`}></i>
          </span>

          <div className={styles.panes}>
            {GROUPS.map((group, gi) => (
              <section className={`${styles.pane} ${styles[group.pane]}`} key={group.pane} aria-hidden={gi === step ? "false" : "true"}>
                <h2 className={styles.title}>{group.title}</h2>
                <div
                  className={styles.opts}
                  role="radiogroup"
                  aria-label={group.label}
                  ref={boxes[gi]}
                  onKeyDown={(event: KeyEvt) => keys(gi, event)}
                >
                  {group.opts.map((opt) => {
                    const on = picks[gi] === opt;
                    return (
                      <button
                        type="button"
                        key={opt}
                        className={[styles.opt, on ? styles.isOn : ""].filter(Boolean).join(" ")}
                        role="radio"
                        aria-checked={on ? "true" : "false"}
                        tabIndex={on ? 0 : -1}
                        onClick={() => pick(gi, opt)}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <div className={styles.nav}>
            <button type="button" className={styles.back} disabled={step === 0} onClick={() => go(step - 1)}>{BACK_LABEL}</button>
            <button type="button" className={styles.next} disabled={step === GROUPS.length - 1} onClick={() => go(step + 1)}>
              <span>{NEXT_LABEL}</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.caret} aria-hidden="true"><path d="M176,128,96,208V48Z" opacity="0.2"/><path d="M181.66,122.34l-80-80A8,8,0,0,0,88,48V208a8,8,0,0,0,13.66,5.66l80-80A8,8,0,0,0,181.66,122.34ZM104,188.69V67.31L164.69,128Z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
