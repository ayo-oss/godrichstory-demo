// OrderNumberBoard — vanilla 판(run/298/demo/07-kiosk-order-number-board/index.html) 의 React 포트.
// 「만드는 중」의 번호를 누르면(Enter 도 같다 — 네이티브 button) 그 조각이 「나왔어요」 칸 맨 위로 옮겨간다.
// 옮겨 간 칸에 aria-live="polite" 가 붙어 있어 화면을 못 보는 사람도 새로 나온 번호를 듣는다.
// 미리보기 루프(.isDemo)는 CSS 키프레임이고 여기는 실제 목록 이동이라 둘은 별개 코드다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./OrderNumberBoard.module.scss";

export type OrderNumberBoardProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// 나온 번호 한 줄 — moved 는 사람이 눌러 건너온 조각인지(그러면 disabled 버튼이다)
type Ready = { num: string; moved: boolean };

const BOARD_TITLE = "주문번호 호출판";
const HEAD_MAKING = "만드는 중";
const HEAD_READY = "나왔어요";
// 호출판은 최근 MAX_READY 건만 남긴다. 무한히 쌓으면 칸이 화면 밖으로 자란다
// (298-07 실측: 네 칸이 되자 320×200 에서 문서높이 239px — 조작 전만 재는 BD9 는 이걸 못 본다)
const MAX_READY = 3;
const FIRST_MAKING = ["A12", "A13", "A14"];
const FIRST_READY: Ready[] = [{ num: "A09", moved: false }];
// 왼쪽 칸의 자리마다 붙는 미리보기 클래스 — 맨 위는 건너가고 아래 둘은 빈자리를 메우며 올라선다
const MAKING_ANIM = ["numGo", "numUp1", "numUp2"];

export default function OrderNumberBoard({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#ffd23f",
}: OrderNumberBoardProps) {
  const makingRef = useRef<HTMLUListElement | null>(null);
  const wantFocusRef = useRef<boolean>(false) as Box<boolean>;
  const [demo, setDemo] = useState(true);
  const [making, setMaking] = useState<string[]>(FIRST_MAKING);
  const [ready, setReady] = useState<Ready[]>(FIRST_READY);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 옮긴 뒤 남은 줄의 맨 위로 초점을 넘긴다 — 목록이 다시 그려진 다음이라야 그 버튼이 있다
  useEffect(() => {
    if (!wantFocusRef.current) return;
    wantFocusRef.current = false;
    const list = makingRef.current;
    if (!list) return;
    const next = list.querySelector("button");
    if (next) next.focus({ preventScroll: true });
  }, [making]);

  function call(num: string): void {
    setDemo(false);
    setMaking(making.filter((item) => item !== num));
    setReady([{ num: num, moved: true }].concat(ready).slice(0, MAX_READY));
    wantFocusRef.current = true;
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <p className={styles.title}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M208,192H48a8,8,0,0,1-6.88-12C47.71,168.6,56,147.81,56,112a72,72,0,0,1,144,0c0,35.82,8.3,56.6,14.9,68A8,8,0,0,1,208,192Z" opacity="0.2"/><path d="M224,71.1a8,8,0,0,1-10.78-3.42,94.13,94.13,0,0,0-33.46-36.91,8,8,0,1,1,8.54-13.54,111.46,111.46,0,0,1,39.12,43.09A8,8,0,0,1,224,71.1ZM35.71,72a8,8,0,0,0,7.1-4.32A94.13,94.13,0,0,1,76.27,30.77a8,8,0,1,0-8.54-13.54A111.46,111.46,0,0,0,28.61,60.32,8,8,0,0,0,35.71,72Zm186.1,103.94A16,16,0,0,1,208,200H167.2a40,40,0,0,1-78.4,0H48a16,16,0,0,1-13.79-24.06C43.22,160.39,48,138.28,48,112a80,80,0,0,1,160,0C208,138.27,212.78,160.38,221.81,175.94ZM150.62,200H105.38a24,24,0,0,0,45.24,0ZM208,184c-10.64-18.27-16-42.49-16-72a64,64,0,0,0-128,0c0,29.52-5.38,53.74-16,72Z"/></svg>
          <span className={styles.titleText}>{BOARD_TITLE}</span>
        </p>
        <div className={styles.cols}>
          <section className={styles.col}>
            <h2 className={`${styles.head} ${styles.headMaking}`}>{HEAD_MAKING}</h2>
            <ul className={styles.list} ref={makingRef}>
              {making.map((num, i) => (
                <li key={num}>
                  <button
                    type="button"
                    className={`${styles.num} ${styles.numMaking} ${styles[MAKING_ANIM[i]] || ""}`}
                    onClick={() => call(num)}
                  >{num}</button>
                </li>
              ))}
            </ul>
          </section>
          <section className={styles.col}>
            <h2 className={`${styles.head} ${styles.headReady}`}>{HEAD_READY}</h2>
            <ul className={styles.list} aria-live="polite">
              {ready.map((item) => (
                <li key={item.num}>
                  {item.moved ? (
                    <button type="button" className={`${styles.num} ${styles.numReady}`} disabled>{item.num}</button>
                  ) : (
                    <span className={`${styles.num} ${styles.numReady} ${styles.numDown}`}>{item.num}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
