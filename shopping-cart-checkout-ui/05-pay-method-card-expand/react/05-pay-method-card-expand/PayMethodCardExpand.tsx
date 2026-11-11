import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./PayMethodCardExpand.module.scss";

export type PayMethodCardExpandProps = {
  legend?: string;
  cardName?: string;
  cardDetail?: string;
  walletName?: string;
  walletDetail?: string;
  bankName?: string;
  bankDetail?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 가 얇아 이벤트 타입을 못 쓴다 — 필요한 꼴만 로컬 타입으로 선언
type Method = { value: string; name: string; detail: string; icon: ReactNode };

function CardIcon() {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor"><path d="M232,96v96a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V96Z" opacity="0.2"/><path d="M224,48H32A16,16,0,0,0,16,64V192a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V64A16,16,0,0,0,224,48Zm0,16V88H32V64Zm0,128H32V104H224v88Zm-16-24a8,8,0,0,1-8,8H168a8,8,0,0,1,0-16h32A8,8,0,0,1,208,168Zm-64,0a8,8,0,0,1-8,8H120a8,8,0,0,1,0-16h16A8,8,0,0,1,144,168Z"/></svg>
  );
}
function WalletIcon() {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor"><path d="M224,80V192a8,8,0,0,1-8,8H56a16,16,0,0,1-16-16V56A16,16,0,0,0,56,72H216A8,8,0,0,1,224,80Z" opacity="0.2"/><path d="M216,64H56a8,8,0,0,1,0-16H192a8,8,0,0,0,0-16H56A24,24,0,0,0,32,56V184a24,24,0,0,0,24,24H216a16,16,0,0,0,16-16V80A16,16,0,0,0,216,64Zm0,128H56a8,8,0,0,1-8-8V78.63A23.84,23.84,0,0,0,56,80H216Zm-48-60a12,12,0,1,1,12,12A12,12,0,0,1,168,132Z"/></svg>
  );
}
function BankIcon() {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor"><path d="M232,96H24L128,32Z" opacity="0.2"/><path d="M24,104H48v64H32a8,8,0,0,0,0,16H224a8,8,0,0,0,0-16H208V104h24a8,8,0,0,0,4.19-14.81l-104-64a8,8,0,0,0-8.38,0l-104,64A8,8,0,0,0,24,104Zm40,0H96v64H64Zm80,0v64H112V104Zm48,64H160V104h32ZM128,41.39,203.74,88H52.26ZM248,208a8,8,0,0,1-8,8H16a8,8,0,0,1,0-16H240A8,8,0,0,1,248,208Z"/></svg>
  );
}

export default function PayMethodCardExpand({
  legend = "결제 수단",
  cardName = "카드",
  cardDetail = "카드 번호와 할부 개월을 여기서 고릅니다",
  walletName = "간편결제",
  walletDetail = "앱에서 지문으로 확인하면 끝납니다",
  bankName = "계좌이체",
  bankDetail = "입금하실 계좌를 다음 화면에 띄웁니다",
  demo = true,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: PayMethodCardExpandProps) {
  const [picked, setPicked] = useState("card");
  const [live, setLive] = useState(demo);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const methods: Method[] = [
    { value: "card", name: cardName, detail: cardDetail, icon: <CardIcon /> },
    { value: "wallet", name: walletName, detail: walletDetail, icon: <WalletIcon /> },
    { value: "bank", name: bankName, detail: bankDetail, icon: <BankIcon /> },
  ];

  // 라디오는 키보드 화살표로도 옮겨 다닌다 — onChange 하나면 마우스·키보드가 같이 걸린다
  function pick(value: string) {
    setLive(false);
    setPicked(value);
  }

  const loopClass = [styles.loopA, styles.loopB, ""];

  return (
    <form className={[styles.pm, live ? styles.isDemo : ""].filter(Boolean).join(" ")} style={vars}>
      <fieldset className={styles.set}>
        <legend className={styles.legend}>{legend}</legend>
        {methods.map((m, i) => (
          <div key={m.value} className={[styles.item, loopClass[i]].filter(Boolean).join(" ")}>
            <label className={styles.row} aria-expanded={picked === m.value}>
              <input
                className={styles.radio}
                type="radio"
                name="payMethod"
                value={m.value}
                checked={picked === m.value}
                onChange={() => pick(m.value)}
              />
              <span className={styles.ic} aria-hidden="true">{m.icon}</span>
              <span className={styles.name}>{m.name}</span>
              <span className={styles.dot} aria-hidden="true"></span>
            </label>
            {/* 상세 칸 — 닫힘 0fr, 열림 1fr. 높이를 px 로 짐작하지 않으니 글자가 길어져도 맞는다 */}
            <div className={styles.fold}>
              <p className={styles.detail}><span className={styles.dtext}>{m.detail}</span></p>
            </div>
          </div>
        ))}
      </fieldset>
    </form>
  );
}
