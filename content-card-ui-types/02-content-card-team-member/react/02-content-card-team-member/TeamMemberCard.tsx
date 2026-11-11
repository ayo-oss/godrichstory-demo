// TeamMemberCard — vanilla 판(run/081/demo/02-content-card-team-member/index.html) 의 React 포트.
// 숨은 연락 줄을 clip-path 로 걷어낸다. 높이는 늘 차지하므로 옆 카드가 밀리지 않는다.
// 여는 조건은 :hover 와 :focus-within 둘 다 — 키보드로 링크에 닿아도 같은 상태가 보인다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TeamMemberCard.module.scss";

export type TeamMemberCardProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

type Member = { name: string; role: string; mail: string; href: string };

// 링크 글자는 조각으로 잇지 않는다 — 언어팩 사전의 키가 문장 전체여야 en·ja 판이 반쪽으로 안 나간다
const MEMBERS: Member[] = [
  { name: "김서연", role: "프로덕트 디자이너", mail: "김서연에게 메일", href: "#seoyeon" },
  { name: "박도윤", role: "프런트엔드 개발자", mail: "박도윤에게 메일", href: "#doyun" },
  { name: "이하준", role: "데이터 분석가", mail: "이하준에게 메일", href: "#hajun" },
];

function UserMark() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256">
      <g fill="currentColor">
        <path d="M230.14 219.93a8 8 0 0 1-6.14 2.07H32a8 8 0 0 1-6.14-2.07a8 8 0 0 1-1.63-8.28C33.79 187.16 55 168.51 80.6 159.86a4 4 0 0 1 3.38.31a75.24 75.24 0 0 0 88 0a4 4 0 0 1 3.43-.31c25.62 8.65 46.81 27.3 56.37 51.79a8 8 0 0 1-1.64 8.28M168 88a40 40 0 1 1-40-40a40 40 0 0 1 40 40" opacity=".2" />
        <path d="M230.92 212c-15.23-26.33-38.7-45.21-66.09-54.16a72 72 0 1 0-73.66 0c-27.39 8.94-50.86 27.82-66.09 54.16a8 8 0 1 0 13.85 8c18.84-32.56 52.14-52 89.07-52s70.23 19.44 89.07 52a8 8 0 1 0 13.85-8M72 96a56 56 0 1 1 56 56a56.06 56.06 0 0 1-56-56" />
      </g>
    </svg>
  );
}

function EnvelopeMark() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256">
      <g fill="currentColor">
        <path d="m224 56l-96 88l-96-88Z" opacity=".2" />
        <path d="M224 48H32a8 8 0 0 0-8 8v136a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a8 8 0 0 0-8-8m-20.57 16L128 133.15L52.57 64ZM216 192H40V74.19l82.59 75.71a8 8 0 0 0 10.82 0L216 74.19z" />
      </g>
    </svg>
  );
}

export default function TeamMemberCard(props: TeamMemberCardProps) {
  const duration = props.duration ?? 600;
  const easing = props.easing ?? "cubic-bezier(.2, .8, .2, 1)";
  const color = props.color ?? "#2f6df6";
  const [preview, setPreview] = useState<boolean>(true);

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };
  const stop = () => setPreview(false);

  return (
    <main className={styles.stage}>
      <ul
        className={styles.tm + (preview ? " " + styles.isDemo : "")}
        style={vars}
        onPointerDown={stop}
        onPointerOver={stop}
        onFocus={stop}
      >
        {MEMBERS.map((member) => (
          <li className={styles.card} key={member.name}>
            <span className={styles.face} aria-hidden="true"><UserMark /></span>
            <h3 className={styles.name}>{member.name}</h3>
            <p className={styles.role}>{member.role}</p>
            <p className={styles.contact}>
              <span className={styles.ic} aria-hidden="true"><EnvelopeMark /></span>
              <a className={styles.link} href={member.href}>{member.mail}</a>
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
