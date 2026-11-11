import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./PostCardWall.module.scss";

/* ambient 에 KeyboardEvent 가 없어 파일 안에 필요한 만큼만 선언한다 */
type KeyEvt = { key: string; preventDefault(): void };
type Box<T> = { current: T };

export type PostCard = {
  /** 아바타 원에 얹는 이니셜 한 글자 */
  initial: string;
  /** 일반 명사 이름 */
  name: string;
  /** 「@」 손잡이 대신 직함 한 줄 */
  role: string;
  body: string;
  likes: number;
  /** 하트 수를 읽어 줄 문장 */
  likesLabel: string;
};

export type PostCardWallProps = {
  label?: string;
  cards?: PostCard[];
  /** 세 장이 떠올랐다 앉는 한 바퀴 = 오로라가 한 바퀴 도는 시간(ms) */
  duration?: number;
  easing?: string;
  /** 무대 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const HeartIcon = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true" focusable="false" fill="currentColor">
    <path d="M232,102c0,66-104,122-104,122S24,168,24,102A54,54,0,0,1,78,48c22.59,0,41.94,12.31,50,32,8.06-19.69,27.41-32,50-32A54,54,0,0,1,232,102Z" opacity="0.2" />
    <path d="M178,40c-20.65,0-38.73,8.88-50,23.89C116.73,48.88,98.65,40,78,40a62.07,62.07,0,0,0-62,62c0,70,103.79,126.66,108.21,129a8,8,0,0,0,7.58,0C136.21,228.66,240,172,240,102A62.07,62.07,0,0,0,178,40ZM128,214.8C109.74,204.16,32,155.69,32,102A46.06,46.06,0,0,1,78,56c19.45,0,35.78,10.36,42.6,27a8,8,0,0,0,14.8,0c6.82-16.67,23.15-27,42.6-27a46.06,46.06,0,0,1,46,46C224,155.61,146.24,204.15,128,214.8Z" />
  </svg>
);

const DEFAULT_CARDS: PostCard[] = [
  { initial: "디", name: "디자인 스튜디오", role: "브랜드 디자이너", body: "버튼 하나 고치는 데 새벽까지 안 걸렸다", likes: 128, likesLabel: "좋아요 128개" },
  { initial: "소", name: "소규모 개발팀", role: "프런트엔드 담당", body: "테두리 한 줄 바꿨더니 문의가 줄었다", likes: 86, likesLabel: "좋아요 86개" },
  { initial: "문", name: "문구 편집자", role: "콘텐츠 운영", body: "설명서 없이 그대로 붙여 썼다", likes: 47, likesLabel: "좋아요 47개" },
];

const TONE = [styles.cardA, styles.cardB, styles.cardC];

export default function PostCardWall({
  label = "짧은 후기 카드 모음",
  cards = DEFAULT_CARDS,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
}: PostCardWallProps): ReactNode {
  const [loop, setLoop] = useState<boolean>(true);
  const refs = useRef<Array<HTMLAnchorElement | null>>([]) as Box<Array<HTMLAnchorElement | null>>;

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  /* 카드 사이를 좌우 화살표로 옮겨 다닌다 (Home·End 는 양 끝) */
  const onKey = (e: KeyEvt, i: number): void => {
    const list = refs.current;
    let to = -1;
    if (e.key === "ArrowRight") { to = (i + 1) % cards.length; }
    if (e.key === "ArrowLeft") { to = (i - 1 + cards.length) % cards.length; }
    if (e.key === "Home") { to = 0; }
    if (e.key === "End") { to = cards.length - 1; }
    if (to < 0) { return; }
    e.preventDefault();
    setLoop(false);
    const next = list[to];
    if (next) { next.focus({ preventScroll: true }); }
  };

  return (
    <section
      className={loop ? `${styles.pw} ${styles.isDemo}` : styles.pw}
      style={vars}
      aria-label={label}
      onPointerEnter={() => setLoop(false)}
      onFocus={() => setLoop(false)}
    >
      <div className={styles.wall}>
        {cards.map((c: PostCard, i: number) => (
          <article className={`${styles.card} ${TONE[i % TONE.length]}`} key={c.name}>
            <header className={styles.top}>
              <span className={styles.ini} aria-hidden="true">{c.initial}</span>
              <a
                className={styles.who}
                href="#"
                ref={(el: HTMLAnchorElement | null) => { refs.current[i] = el; }}
                onKeyDown={(e: KeyEvt) => onKey(e, i)}
              >
                <span className={styles.name}>{c.name}</span>
                <span className={styles.role}>{c.role}</span>
              </a>
            </header>
            <p className={styles.body}>{c.body}</p>
            <p className={styles.likes} role="img" aria-label={c.likesLabel}>
              <HeartIcon />
              <span className={styles.count}>{c.likes}</span>
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
