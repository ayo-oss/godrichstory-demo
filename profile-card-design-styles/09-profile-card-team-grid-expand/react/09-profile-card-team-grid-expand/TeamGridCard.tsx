import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TeamGridCard.module.scss";

export type TeamGridCardProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault(): void };
// useRef 는 항상 `T | null` 을 돌려주므로 목록 보관용 상자는 널이 아닌 타입으로 좁혀 쓴다
type Box<T> = { current: T };
type Member = { initials: string; name: string; role: string; tone: string };

const MEMBERS: Member[] = [
  { initials: "JH", name: "강주하", role: "팀 리드", tone: "a" },
  { initials: "ES", name: "노은설", role: "프로덕트 디자이너", tone: "b" },
  { initials: "GO", name: "임가온", role: "프론트엔드 개발자", tone: "c" },
];

const IconUsers = () => (
  <svg viewBox="0 0 256 256" width="15" height="15" aria-hidden="true"><g fill="currentColor"><path d="M168 144a40 40 0 1 1-40-40a40 40 0 0 1 40 40M64 56a32 32 0 1 0 32 32a32 32 0 0 0-32-32m128 0a32 32 0 1 0 32 32a32 32 0 0 0-32-32" opacity=".2"/><path d="M244.8 150.4a8 8 0 0 1-11.2-1.6A51.6 51.6 0 0 0 192 128a8 8 0 0 1 0-16a24 24 0 1 0-23.24-30a8 8 0 1 1-15.5-4A40 40 0 1 1 219 117.51a67.94 67.94 0 0 1 27.43 21.68a8 8 0 0 1-1.63 11.21M190.92 212a8 8 0 1 1-13.85 8a57 57 0 0 0-98.15 0a8 8 0 1 1-13.84-8a72.06 72.06 0 0 1 33.74-29.92a48 48 0 1 1 58.36 0A72.06 72.06 0 0 1 190.92 212M128 176a32 32 0 1 0-32-32a32 32 0 0 0 32 32m-56-56a8 8 0 0 0-8-8a24 24 0 1 1 23.24-30a8 8 0 1 0 15.5-4A40 40 0 1 0 37 117.51a67.94 67.94 0 0 0-27.4 21.68a8 8 0 1 0 12.8 9.61A51.6 51.6 0 0 1 64 128a8 8 0 0 0 8-8"/></g></svg>
);
const IconUserPlus = () => (
  <svg viewBox="0 0 256 256" width="13" height="13" aria-hidden="true"><g fill="currentColor"><path d="M168 100a60 60 0 1 1-60-60a60 60 0 0 1 60 60" opacity=".2"/><path d="M256 136a8 8 0 0 1-8 8h-16v16a8 8 0 0 1-16 0v-16h-16a8 8 0 0 1 0-16h16v-16a8 8 0 0 1 16 0v16h16a8 8 0 0 1 8 8m-57.87 58.85a8 8 0 0 1-12.26 10.3C165.75 181.19 138.09 168 108 168s-57.75 13.19-77.87 37.15a8 8 0 0 1-12.25-10.3c14.94-17.78 33.52-30.41 54.17-37.17a68 68 0 1 1 71.9 0c20.65 6.76 39.23 19.39 54.18 37.17M108 152a52 52 0 1 0-52-52a52.06 52.06 0 0 0 52 52"/></g></svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 256 256" width="13" height="13" aria-hidden="true"><g fill="currentColor"><path d="M232 56v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16" opacity=".2"/><path d="m205.66 85.66l-96 96a8 8 0 0 1-11.32 0l-40-40a8 8 0 0 1 11.32-11.32L104 164.69l90.34-90.35a8 8 0 0 1 11.32 11.32"/></g></svg>
);

export default function TeamGridCard({
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: TeamGridCardProps) {
  const [at, setAt] = useState(0);
  const [followed, setFollowed] = useState<boolean[]>([false, false, false]);
  const mainsRef = useRef<(HTMLButtonElement | null)[]>([null, null, null]) as Box<(HTMLButtonElement | null)[]>;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function onKey(e: KeyEvt, i: number): void {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = (i + (e.key === "ArrowRight" ? 1 : MEMBERS.length - 1)) % MEMBERS.length;
    setAt(next);
    const el = mainsRef.current[next];
    if (el) el.focus({ preventScroll: true });
  }

  function toggleFollow(i: number): void {
    setFollowed(followed.map((v: boolean, k: number): boolean => (k === i ? !v : v)));
  }

  return (
    <div className={styles.tg} style={vars}>
      <p className={styles.head}><IconUsers />팀 멤버</p>
      <div className={styles.row}>
        {MEMBERS.map((m: Member, i: number) => {
          const open = i === at;
          const tone = m.tone === "a" ? styles.toneA : m.tone === "b" ? styles.toneB : styles.toneC;
          return (
            <div
              key={m.initials}
              className={open ? `${styles.tile} ${styles.isOpen}` : styles.tile}
              onPointerEnter={(): void => setAt(i)}
            >
              <button
                type="button"
                ref={(el: HTMLButtonElement | null): void => { mainsRef.current[i] = el; }}
                className={styles.main}
                aria-expanded={open}
                onClick={(): void => setAt(i)}
                onKeyDown={(e: KeyEvt): void => onKey(e, i)}
              >
                <span className={`${styles.avatar} ${tone}`} aria-hidden="true">{m.initials}</span>
                <span className={styles.name}>{m.name}</span>
                <span className={styles.role}>{m.role}</span>
              </button>
              <button
                type="button"
                className={followed[i] ? `${styles.follow} ${styles.isOn}` : styles.follow}
                aria-pressed={followed[i]}
                tabIndex={open ? undefined : -1}
                onClick={(): void => toggleFollow(i)}
              >
                <span className={styles.fOff}><IconUserPlus />팔로우</span>
                <span className={styles.fOn}><IconCheck />팔로잉</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
