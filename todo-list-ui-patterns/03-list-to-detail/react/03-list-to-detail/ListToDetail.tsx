// ListToDetail — vanilla 판(run/377/demo/03-list-to-detail/index.html) 의 React 포트.
// FLIP: 카드의 실제 화면 좌표와 상세 패널이 이미 차지한 좌표 차이를 실측해 변환값을 만들고,
// 그 값을 적용한 뒤 지워서(역전 제거) 확대·축소돼 보이게 한다.
import { useEffect, useRef, useState } from "react";
import styles from "./ListToDetail.module.scss";

type Box<T> = { current: T };
type Flip = { dx: number; dy: number; sx: number; sy: number };

const DUR_MS = 420;

const DATA = [
  { title: "장보기 목록 정리", items: ["우유 1개", "계란 한 판", "식빵"] },
  { title: "주간 회의 자료", items: ["안건 정리", "자료 인쇄", "회의실 예약", "참석자 확인", "노트북 충전"] },
];

export default function ListToDetail() {
  const [isDemo, setIsDemo] = useState(true);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [transform, setTransform] = useState("translate(0,0) scale(1,1)");
  const [animate, setAnimate] = useState(false);
  const cardRefs = useRef([]) as unknown as Box<(HTMLButtonElement | null)[]>;
  const detailRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const backRef = useRef<Flip | null>(null) as unknown as Box<Flip | null>;
  const timerRef = useRef(0) as unknown as Box<number>;
  const stepRef = useRef(0) as unknown as Box<number>;

  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function flipFrom(cardEl: HTMLButtonElement) {
    const c = cardEl.getBoundingClientRect();
    const d = detailRef.current.getBoundingClientRect();
    return { dx: c.left - d.left, dy: c.top - d.top, sx: c.width / d.width, sy: c.height / d.height };
  }

  function openDetail(i: number) {
    const cardEl = cardRefs.current[i];
    if (!cardEl) return;
    setOpenIndex(i);
    setAnimate(false);
    requestAnimationFrame(function () {
      const f = flipFrom(cardEl);
      backRef.current = f;
      setTransform("translate(" + f.dx + "px," + f.dy + "px) scale(" + f.sx + "," + f.sy + ")");
      requestAnimationFrame(function () {
        setAnimate(!reduce);
        setTransform("translate(0,0) scale(1,1)");
      });
    });
  }

  function closeDetail() {
    const f = backRef.current;
    if (!f) { setOpenIndex(null); return; }
    setAnimate(!reduce);
    setTransform("translate(" + f.dx + "px," + f.dy + "px) scale(" + f.sx + "," + f.sy + ")");
  }

  function onDetailTransitionEnd() {
    if (transform !== "translate(0,0) scale(1,1)") setOpenIndex(null);
  }

  function human() {
    if (isDemo) { setIsDemo(false); window.clearInterval(timerRef.current); }
  }

  useEffect(function () {
    if (reduce) return;
    function autoStep() {
      const i = stepRef.current;
      openDetail(i);
      window.setTimeout(function () { closeDetail(); }, 900);
      stepRef.current = (i + 1) % DATA.length;
    }
    autoStep();
    timerRef.current = window.setInterval(autoStep, 1400);
    return function () { window.clearInterval(timerRef.current); };
    // eslint-disable-next-line
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.scene + (isDemo ? " " + styles.isDemo : "")}>
        <ul className={styles.cards}>
          {DATA.map(function (item, i) {
            return (
              <li key={item.title}>
                <button
                  className={styles.card}
                  type="button"
                  aria-haspopup="dialog"
                  ref={function (el: HTMLButtonElement | null) { cardRefs.current[i] = el; }}
                  onClick={function () { human(); openDetail(i); }}
                >
                  <span className={styles.cardTitle}>{item.title}</span>
                  <span className={styles.cardMeta}>{item.items.length}개 항목</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div
          className={styles.detail}
          ref={detailRef}
          role="dialog"
          aria-modal="true"
          aria-hidden={openIndex === null}
          style={{
            display: openIndex === null ? "none" : "flex",
            transform: transform,
            transition: animate ? "transform " + DUR_MS + "ms var(--flip-ease)" : "none",
          }}
          onTransitionEnd={onDetailTransitionEnd}
        >
          <button
            className={styles.backBtn}
            type="button"
            aria-label="목록으로 돌아가기"
            onClick={function () { human(); closeDetail(); }}
          >
            <svg viewBox="0 0 256 256" aria-hidden="true">
              <g fill="currentColor">
                <path d="M112 56v144l-72-72Z" opacity=".2" />
                <path d="M216 120h-96V56a8 8 0 0 0-13.66-5.66l-72 72a8 8 0 0 0 0 11.32l72 72A8 8 0 0 0 120 200v-64h96a8 8 0 0 0 0-16m-112 60.69L51.31 128L104 75.31Z" />
              </g>
            </svg>
          </button>
          <h2 className={styles.detailTitle}>{openIndex !== null ? DATA[openIndex].title : ""}</h2>
          <ul className={styles.detailList}>
            {openIndex !== null ? DATA[openIndex].items.map(function (t) { return <li key={t}>{t}</li>; }) : null}
          </ul>
        </div>
      </div>
    </main>
  );
}
