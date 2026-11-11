import { useEffect, useRef, useState, useCallback } from "react";
import styles from "./AvatarInitialsFallback.module.scss";

// 이름 값 → 이니셜 계산(자리표시자) + 글자코드 합 해시(배지 색) + 행 인덱스 값(등장 지연).
const NAMES = ["김하늘", "이도윤", "박서준"];
const PALETTE = ["lai__row--a", "lai__row--b", "lai__row--c", "lai__row--d"];
const ROW_STAGGER_MS = 260;
const LOAD_BASE_MS = 320;
const CYCLE_GAP_MS = 2400;

function getInitials(name: string): string {
  return name.slice(0, 2);
}

function colorHashClass(name: string): string {
  let sum = 0;
  for (let i = 0; i < name.length; i += 1) { sum += name.charCodeAt(i); }
  return PALETTE[sum % PALETTE.length];
}

type Box<T> = { current: T };
function useBox<T>(initial: T): Box<T> {
  return useRef(initial) as unknown as Box<T>;
}

export default function AvatarInitialsFallback() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [demo, setDemo] = useState(true);
  const [loaded, setLoaded] = useState<boolean[]>(NAMES.map(() => false));
  const timersRef = useBox<number[]>([]);
  const loopTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  }, [timersRef]);

  const loadPhotos = useCallback(() => {
    setLoaded(NAMES.map(() => false));
    NAMES.forEach((_, i) => {
      const t = window.setTimeout(() => {
        setLoaded((prev) => prev.map((v, j) => (j === i ? true : v)));
      }, LOAD_BASE_MS + i * ROW_STAGGER_MS);
      timersRef.current.push(t);
    });
  }, [timersRef]);

  const onClickLoad = useCallback(() => {
    setDemo(false);
    clearTimers();
    loadPhotos();
  }, [clearTimers, loadPhotos]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDemo(false);
      setLoaded(NAMES.map(() => true));
      return;
    }
    let cancelled = false;
    function loop() {
      if (cancelled) { return; }
      clearTimers();
      loadPhotos();
      loopTimerRef.current = window.setTimeout(() => {
        if (cancelled || !rootRef.current?.classList.contains(styles["is-demo"])) { return; }
        setLoaded(NAMES.map(() => false));
        loopTimerRef.current = window.setTimeout(() => {
          if (!cancelled && rootRef.current?.classList.contains(styles["is-demo"])) { loop(); }
        }, 500);
      }, LOAD_BASE_MS + NAMES.length * ROW_STAGGER_MS + CYCLE_GAP_MS);
    }
    loop();
    return () => {
      cancelled = true;
      clearTimers();
      if (loopTimerRef.current !== null) { window.clearTimeout(loopTimerRef.current); }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div ref={rootRef} className={`${styles.lai} ${demo ? styles["is-demo"] : ""}`}>
        <ul className={styles["lai__list"]}>
          {NAMES.map((name, i) => (
            <li key={name} className={styles["lai__row"]}>
              <span className={`${styles["lai__avatar"]} ${styles[colorHashClass(name)]} ${loaded[i] ? styles["lai__avatar--loaded"] : ""}`}>
                <span className={styles["lai__initials"]}>{getInitials(name)}</span>
                <span className={styles["lai__photo"]} />
              </span>
              <span className={styles["lai__name"]}>{name}</span>
            </li>
          ))}
        </ul>
        <button type="button" className={styles["lai__btn"]} onClick={onClickLoad}>사진 불러오기</button>
      </div>
    </main>
  );
}
