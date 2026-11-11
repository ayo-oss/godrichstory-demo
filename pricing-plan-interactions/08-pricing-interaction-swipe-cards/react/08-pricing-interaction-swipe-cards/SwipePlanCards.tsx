import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SwipePlanCards.module.scss";

export type SwipePlan = { name: string; price: string; tag?: string; features: [string, string] };
export type SwipePlanCardsProps = {
  plans?: SwipePlan[];
  per?: string;
  label?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

// React 이벤트 타입은 'react' 앰비언트에 없다 — 쓰는 모양만 여기서 직접 적는다
type PtrEvt = {
  clientX: number;
  pointerId: number;
  currentTarget: { setPointerCapture(id: number): void; getBoundingClientRect(): { width: number } };
};
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type TrackVars = CSSProperties & { "--i"?: string; "--dx"?: string };

const GAP = 12; // 카드 사이 간격 — scss 의 margin-right 와 같은 값

const DEFAULT_PLANS: SwipePlan[] = [
  { name: "Starter", price: "$9", features: ["Unlimited projects included", "Invite teammates"] },
  { name: "Pro", price: "$29", tag: "Popular", features: ["Priority support", "Invite teammates"] },
  { name: "Business", price: "$79", features: ["Audit log", "Dedicated support"] },
];

export default function SwipePlanCards({
  plans = DEFAULT_PLANS,
  per = "/ mo",
  label = "Swipe between plans",
  duration = 300,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#6ec8ff",
}: SwipePlanCardsProps) {
  const [demo, setDemo] = useState(true);
  const [index, setIndex] = useState(0);
  const [dx, setDx] = useState(0);
  const [drag, setDrag] = useState(false);
  const [grab, setGrab] = useState({ x: 0, w: 0 }); // 잡은 지점과 그때의 뷰포트 너비
  const last = plans.length - 1;

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const trackVars: TrackVars = { "--i": String(index), "--dx": `${dx}px` };

  // 카드는 plans.length 장뿐이다. 복제도 텔레포트도 없고 양 끝에서 clamp 으로 멈춘다
  function go(k: number) {
    setIndex(Math.max(0, Math.min(last, k)));
    setDx(0);
  }
  function down(e: PtrEvt) {
    setDemo(false);
    // 손가락이 상자 밖으로 나가도 move·up 이 계속 이 요소로 온다
    e.currentTarget.setPointerCapture(e.pointerId);
    setGrab({ x: e.clientX, w: e.currentTarget.getBoundingClientRect().width });
    setDrag(true);
  }
  function move(e: PtrEvt) {
    if (!drag) return;
    setDx(e.clientX - grab.x);
  }
  function release(e: PtrEvt) {
    if (!drag) return;
    setDrag(false);
    go(index - Math.round((e.clientX - grab.x) / (grab.w + GAP))); // 가장 가까운 카드로 스냅
  }

  return (
    <div className={`${styles.sw} ${demo ? styles.isDemo : ""}`} style={vars} role="group" aria-label={label}>
      {/* 뷰포트 상자와 트랙은 다른 요소다. transform 은 트랙에만 — 잘라 내는 창인 뷰포트를 밀면 내용이 창과 함께 움직인다 */}
      <div
        className={styles.view}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <div className={`${styles.track} ${drag ? styles.isDrag : ""}`} style={trackVars}>
          {plans.map((p) => (
            <article key={p.name} className={styles.card}>
              <div className={styles.inner}>
                <p className={styles.name}>
                  <span className={styles.nametext}>{p.name}</span>
                  {p.tag ? <span className={styles.tag}>{p.tag}</span> : null}
                </p>
                <p className={styles.price}>
                  <span className={styles.amt}>{p.price}</span>
                  <span className={styles.per}>{per}</span>
                </p>
                <ul className={styles.list}>
                  <li>{p.features[0]}</li>
                  <li>{p.features[1]}</li>
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className={styles.dots}>
        {plans.map((p, i) => (
          <button
            key={p.name}
            className={styles.dot}
            type="button"
            data-go={String(i)}
            aria-current={i === index ? "true" : undefined}
            onClick={() => { setDemo(false); go(i); }}
          >
            <span className={styles.vh}>{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
