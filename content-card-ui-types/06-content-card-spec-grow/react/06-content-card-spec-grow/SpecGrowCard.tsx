// SpecGrowCard — vanilla 판(run/081/demo/06-content-card-spec-grow/index.html) 의 React 포트.
// 여닫이 칸은 grid-template-rows 0fr → 1fr 로 자라고, 자식의 overflow: hidden + min-height: 0 이
// 접힌 상태를 실제로 0 높이로 만든다. 옆 카드가 안 밀리는 건 바깥 격자의 align-items: start 덕이다.
// @keyframes 본문은 vanilla 와 같은 글자다 (값을 다시 타이핑하지 않는다).
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SpecGrowCard.module.scss";

export type SpecGrowCardProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

type Spec = { key: string; val: string };
type Product = { name: string; price: string; more: string; thumb: string; spec: Spec[] };

const PRODUCTS: Product[] = [
  {
    name: "무선 조명",
    price: "39,000원",
    more: "무선 조명 스펙 보기",
    thumb: "thumbA",
    spec: [{ key: "무게", val: "420g" }, { key: "전원", val: "USB-C" }, { key: "보증", val: "1년" }],
  },
  {
    name: "원목 선반",
    price: "58,000원",
    more: "원목 선반 스펙 보기",
    thumb: "thumbB",
    spec: [{ key: "무게", val: "3.1kg" }, { key: "재질", val: "오크" }, { key: "보증", val: "2년" }],
  },
  {
    name: "휴대 가습기",
    price: "27,000원",
    more: "휴대 가습기 스펙 보기",
    thumb: "thumbC",
    spec: [{ key: "무게", val: "260g" }, { key: "용량", val: "300ml" }, { key: "보증", val: "1년" }],
  },
];

const LABEL = "스펙 보기";
const PICK = 1; // 미리보기 루프에서 열리는 칸 — 가운데여야 양옆이 제자리인 게 보인다

export default function SpecGrowCard({
  duration = 600,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: SpecGrowCardProps) {
  const [open, setOpen] = useState<number[]>([]);
  const [preview, setPreview] = useState(true);

  const vars: Vars = {
    "--duration": duration + "ms",
    "--easing": easing,
    "--color": color,
  };

  const toggle = (i: number) => {
    setPreview(false);
    setOpen((prev) => (prev.indexOf(i) >= 0 ? prev.filter((x) => x !== i) : prev.concat([i])));
  };

  return (
    <main className={styles.stage}>
      <svg className={styles.defs} aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <symbol id="sgCaret" viewBox="0 0 256 256">
          <g fill="currentColor">
            <path d="m208 96l-80 80l-80-80Z" opacity=".2" />
            <path d="M215.39 92.94A8 8 0 0 0 208 88H48a8 8 0 0 0-5.66 13.66l80 80a8 8 0 0 0 11.32 0l80-80a8 8 0 0 0 1.73-8.72M128 164.69L67.31 104h121.38Z" />
          </g>
        </symbol>
      </svg>

      <div className={styles.board + (preview ? " " + styles.isDemo : "")} style={vars}>
        {PRODUCTS.map((p, i) => {
          const isOpen = open.indexOf(i) >= 0;
          return (
            <article
              className={
                styles.card + (isOpen ? " " + styles.isOpen : "") + (i === PICK ? " " + styles.isPick : "")
              }
              key={p.name}
            >
              <span className={styles.thumb + " " + styles[p.thumb]} aria-hidden="true" />
              <p className={styles.name}>{p.name}</p>
              <p className={styles.price}>{p.price}</p>
              <button
                className={styles.more}
                type="button"
                aria-expanded={isOpen}
                aria-label={p.more}
                onClick={() => toggle(i)}
              >
                <span className={styles.label}>{LABEL}</span>
                <svg className={styles.caret} aria-hidden="true">
                  <use href="#sgCaret" />
                </svg>
              </button>
              <div className={styles.grow}>
                <div className={styles.inner}>
                  <dl className={styles.spec}>
                    {p.spec.map((s) => (
                      <div className={styles.pair} key={s.key}>
                        <dt className={styles.key}>{s.key}</dt>
                        <dd className={styles.val}>{s.val}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
