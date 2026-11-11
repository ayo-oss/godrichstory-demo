import { useEffect, useRef } from "react";
import styles from "./CommentThreadSkeletonShimmerStagger.module.scss";

// 기법: 행 순서(위→아래 data-row 정렬)를 계산해 각 행 반짝임(glare) 시작을
// SHIMMER_STAGGER_STEP_MS 씩 밀어 시차를 만들고, "실제 댓글 도착"도 같은 순서로 stagger
// 시켜 도착한 행은 그 즉시 스켈레톤과 제자리 교차 페이드한다.
const SHIMMER_BASE_DELAY_MS = 200;
const SHIMMER_STAGGER_STEP_MS = 140;
const SWAP_BASE_DELAY_MS = 760;
const SWAP_STAGGER_STEP_MS = 170;

const ROWS = [
  { name: "은하수밤", time: "7분 전", text: "스켈레톤이 사라지는 타이밍이 매끄러워요." },
  { name: "구름조각", time: "31분 전", text: "행마다 반짝임이 한 박자씩 밀리는 게 보이네요." },
  { name: "달빛서점", time: "1시간 전", text: "로딩 상태를 이렇게 표현하면 기다림이 덜 지루해요." },
  { name: "소나기우산", time: "2시간 전", text: "다음 글에서도 이 패턴 써먹어야겠어요." },
];

export default function CommentThreadSkeletonShimmerStagger() {
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const replayRef = useRef<HTMLButtonElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const list = listRef.current;
    const replay = replayRef.current;
    const status = statusRef.current;
    if (!root || !list || !replay || !status) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) root.classList.remove("is-demo");

    function rowsInOrder(): HTMLElement[] {
      const items = Array.from(list!.querySelectorAll<HTMLElement>(".skel__item"));
      items.sort((a, b) => parseInt(a.getAttribute("data-row")!, 10) - parseInt(b.getAttribute("data-row")!, 10));
      return items;
    }

    function resetRow(item: HTMLElement) {
      item.getAnimations().forEach((a) => a.cancel());
      item.querySelectorAll<HTMLElement>(".skel__glare, .skel__ghost, .skel__real").forEach((b) => {
        b.getAnimations().forEach((a) => a.cancel());
      });
      item.classList.remove("is-real");
    }

    function swapRow(item: HTMLElement, delayMs: number) {
      const ghost = item.querySelector<HTMLElement>(".skel__ghost");
      const real = item.querySelector<HTMLElement>(".skel__real");
      if (!ghost || !real) return;
      ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 170, delay: delayMs, easing: "ease-out", fill: "forwards" });
      const anim = real.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 170, delay: delayMs, easing: "ease-out", fill: "forwards" });
      anim.onfinish = () => { item.classList.add("is-real"); };
    }

    function runSequence(animate: boolean) {
      const rows = rowsInOrder();
      rows.forEach((row, i) => {
        resetRow(row);
        if (!animate || reduce) {
          row.classList.add("is-real");
          return;
        }
        const glareDelay = SHIMMER_BASE_DELAY_MS + i * SHIMMER_STAGGER_STEP_MS;
        row.querySelectorAll<HTMLElement>(".skel__glare").forEach((glare) => {
          glare.animate(
            [{ transform: "translateX(-220%)" }, { transform: "translateX(340%)" }],
            { duration: 1300, delay: glareDelay, iterations: Infinity, easing: "linear" }
          );
        });
        swapRow(row, SWAP_BASE_DELAY_MS + i * SWAP_STAGGER_STEP_MS);
      });
      status!.textContent = animate ? "댓글 4개를 불러왔습니다." : "댓글 4개가 표시되었습니다.";
    }

    const onActivate = () => { root.classList.remove("is-demo"); runSequence(true); };
    replay.addEventListener("click", onActivate);
    replay.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onActivate(); }
    });

    runSequence(!reduce);
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.skel} is-demo`} ref={rootRef}>
        <div className={styles.skel__head}>
          <button type="button" className={styles.skel__replayBtn} ref={replayRef}>다시 불러오기</button>
        </div>
        <ul className={styles.skel__list} role="list" ref={listRef}>
          {ROWS.map((r, i) => (
            <li key={i} className={`skel__item ${styles.skel__item}`} data-row={i}>
              <div className={`skel__ghost ${styles.skel__ghost}`}>
                <span className={`skel__avatar ${styles.skel__avatar}`}><i className={`skel__glare ${styles.skel__glare}`} /></span>
                <span className={styles.skel__boneGroup}>
                  <span className={`skel__bone ${styles["skel__bone--name"]}`}><i className={`skel__glare ${styles.skel__glare}`} /></span>
                  <span className={`skel__bone ${styles["skel__bone--text"]}`}><i className={`skel__glare ${styles.skel__glare}`} /></span>
                </span>
              </div>
              <div className={`skel__real ${styles.skel__real}`}>
                <span className={styles.skel__realAvatar} aria-hidden="true" />
                <div className={styles.skel__realBody}>
                  <p className={styles.skel__meta}>
                    <strong className={styles.skel__name}>{r.name}</strong>
                    <span className={styles.skel__time}>{r.time}</span>
                  </p>
                  <p className={styles.skel__text}>{r.text}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <p className={styles.skel__sr} ref={statusRef} aria-live="polite" />
      </div>
    </main>
  );
}
