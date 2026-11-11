// ChordSequence — vanilla 판(run/288/demo/05-shortcut-chord-sequence/index.html) 의 React 포트.
// G 다음 I. 첫 키가 들어온 뒤 WINDOW_MS 안에 두 번째 키가 안 오면 setTimeout 이 대기를 스스로 푼다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ChordSequence.module.scss";

export type ChordSequenceProps = {
  /** 격자 미리보기용 2초 자동 루프. 사람이 G 를 누르면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
/** useRef<T> 는 T | null 을 돌려주므로 항상 값이 있는 상자로 좁혀 쓴다 */
type Box<T> = { current: T };

const WINDOW_MS = 1200;

export default function ChordSequence({
  demo = true,
  duration = 300,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#4cd4a6",
}: ChordSequenceProps) {
  const [live, setLive] = useState(demo);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const pendingRef = useRef<boolean>(false) as Box<boolean>;
  const timerRef = useRef<number>(0) as Box<number>;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    function cancelChord() {
      pendingRef.current = false;
      setPending(false);
    }
    function startChord() {
      pendingRef.current = true;
      setPending(true);
      setDone(false);
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(cancelChord, WINDOW_MS);
    }
    function finishChord() {
      window.clearTimeout(timerRef.current);
      pendingRef.current = false;
      setPending(false);
      setDone(true);
    }
    function handleDown(e: KeyboardEvent) {
      if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }
      const key = e.key.toLowerCase();
      if (!pendingRef.current && key === "g") {
        setLive(false);
        startChord();
        return;
      }
      if (pendingRef.current && key === "i") {
        finishChord();
      }
    }
    window.addEventListener("keydown", handleDown);
    return () => {
      window.clearTimeout(timerRef.current);
      window.removeEventListener("keydown", handleDown);
    };
  }, []);

  const cls = [styles.root, live ? styles.isDemo : "", pending ? styles.isPending : "", done ? styles.isDone : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <main className={styles.stage} style={vars}>
      <div className={cls}>
        <p className={styles.cap}>G 를 누르고 이어서 I</p>
        <div className={styles.keys}>
          <kbd className={[styles.key, styles.keyFirst].join(" ")}>G</kbd>
          <span className={styles.then} aria-hidden="true">{"›"}</span>
          <kbd className={[styles.key, styles.keySecond].join(" ")}>I</kbd>
        </div>
        <div className={styles.meter}>
          <span className={styles.fill} />
        </div>
        <p className={styles.dest}>
          <span className={styles.destLabel}>이동한 곳</span>
          <b className={styles.destBox}>
            <span className={styles.destIdle}>대기 중</span>
            <span className={styles.destDone}>받은 편지함</span>
          </b>
        </p>
      </div>
    </main>
  );
}
