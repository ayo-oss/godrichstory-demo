import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ShipSameAddressCollapse.module.scss";

export type ShipSameAddressCollapseProps = {
  kicker?: string;
  ordererName?: string;
  ordererAddress?: string;
  ordererTel?: string;
  sameLabel?: string;
  nameLabel?: string;
  addressLabel?: string;
  telLabel?: string;
  groupLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 가 얇아 이벤트 타입을 못 쓴다 — 필요한 꼴만 로컬 타입으로 선언
type CheckChange = { target: { checked: boolean } };
type FieldChange = { target: { value: string } };

function UserIcon() {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor"><path d="M192,96a64,64,0,1,1-64-64A64,64,0,0,1,192,96Z" opacity="0.2"/><path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z"/></svg>
  );
}
function HouseIcon() {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor"><path d="M216,120v96H152V152H104v64H40V120a8,8,0,0,1,2.34-5.66l80-80a8,8,0,0,1,11.32,0l80,80A8,8,0,0,1,216,120Z" opacity="0.2"/><path d="M219.31,108.68l-80-80a16,16,0,0,0-22.62,0l-80,80A15.87,15.87,0,0,0,32,120v96a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V160h32v56a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V120A15.87,15.87,0,0,0,219.31,108.68ZM208,208H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48V120l80-80,80,80Z"/></svg>
  );
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor"><path d="M232,56V200a16,16,0,0,1-16,16H40a16,16,0,0,1-16-16V56A16,16,0,0,1,40,40H216A16,16,0,0,1,232,56Z" opacity="0.2"/><path d="M205.66,85.66l-96,96a8,8,0,0,1-11.32,0l-40-40a8,8,0,0,1,11.32-11.32L104,164.69l90.34-90.35a8,8,0,0,1,11.32,11.32Z"/></svg>
  );
}

export default function ShipSameAddressCollapse({
  kicker = "주문자",
  ordererName = "김도윤",
  ordererAddress = "서울 마포구 양화로 12, 3층",
  ordererTel = "010-2345-6789",
  sameLabel = "주문자와 같음",
  nameLabel = "받는 분",
  addressLabel = "주소",
  telLabel = "연락처",
  groupLabel = "배송지 입력",
  demo = true,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: ShipSameAddressCollapseProps) {
  const [same, setSame] = useState(true);
  const [live, setLive] = useState(demo);
  const [shipName, setShipName] = useState(ordererName);
  const [shipAddress, setShipAddress] = useState(ordererAddress);
  const [shipTel, setShipTel] = useState(ordererTel);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 주문자와 같음 — 값 복사는 여기서, 접힌 칸은 aria-hidden + inert 로 초점에서 뺀다
  function onSame(e: CheckChange) {
    const folded = e.target.checked;
    setLive(false);
    setSame(folded);
    if (folded) {
      setShipName(ordererName);
      setShipAddress(ordererAddress);
      setShipTel(ordererTel);
    }
  }

  const cls = [styles.sa, live ? styles.isDemo : "", same ? styles.isSame : ""].filter(Boolean).join(" ");
  const summary = `${ordererName} · ${ordererAddress}`;

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <div className={styles.who}>
        <p className={styles.kicker}>{kicker}</p>
        <p className={styles.line}>
          <span className={styles.ic} aria-hidden="true"><UserIcon /></span>
          <b className={styles.v}>{ordererName}</b>
        </p>
        <p className={styles.line}>
          <span className={styles.ic} aria-hidden="true"><HouseIcon /></span>
          <span className={styles.v}>{ordererAddress}</span>
        </p>
      </div>

      <label className={styles.same}>
        <input className={styles.box} type="checkbox" checked={same} onChange={onSame} />
        <span className={styles.tick} aria-hidden="true"><CheckIcon /></span>
        <span className={styles.label}>{sameLabel}</span>
      </label>

      {/* 접혔을 때 남는 요약 한 줄 — 주문자 이름·주소가 이미 들어와 있다 */}
      <div className={styles.sumfold}>
        <p className={styles.sum}><b className={styles.sumtext}>{summary}</b></p>
      </div>

      <div className={styles.fold} aria-hidden={same} inert={same ? "" : undefined}>
        <div className={styles.inner}>
          <p className={styles.field}>
            <span className={styles.fk}>{nameLabel}</span>
            <input
              className={styles.fv}
              type="text"
              value={shipName}
              aria-label={nameLabel}
              onChange={(e: FieldChange) => setShipName(e.target.value)}
            />
          </p>
          <p className={styles.field}>
            <span className={styles.fk}>{addressLabel}</span>
            <input
              className={styles.fv}
              type="text"
              value={shipAddress}
              aria-label={addressLabel}
              onChange={(e: FieldChange) => setShipAddress(e.target.value)}
            />
          </p>
          <p className={styles.field}>
            <span className={styles.fk}>{telLabel}</span>
            <input
              className={styles.fv}
              type="tel"
              value={shipTel}
              aria-label={telLabel}
              onChange={(e: FieldChange) => setShipTel(e.target.value)}
            />
          </p>
        </div>
      </div>
    </section>
  );
}
