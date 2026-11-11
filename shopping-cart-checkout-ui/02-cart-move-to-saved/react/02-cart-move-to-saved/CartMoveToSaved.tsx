import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CartMoveToSaved.module.scss";

export type CartSavedItem = {
  id: string;
  name: string;
  price: string;
  moveLabel: string;
  backLabel: string;
};

export type CartMoveToSavedProps = {
  cartLabel?: string;
  savedLabel?: string;
  groupLabel?: string;
  items?: CartSavedItem[];
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const DEFAULT_ITEMS: CartSavedItem[] = [
  { id: "p1", name: "라탄 바구니", price: "24,000원", moveLabel: "라탄 바구니를 나중에 담기로 옮기기", backLabel: "라탄 바구니를 장바구니로 되돌리기" },
  { id: "p2", name: "린넨 앞치마", price: "16,000원", moveLabel: "린넨 앞치마를 나중에 담기로 옮기기", backLabel: "린넨 앞치마를 장바구니로 되돌리기" },
];

function BookmarkIcon() {
  return (
    <svg viewBox="0 0 256 256" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M192,48V224l-64-40L64,224V48a8,8,0,0,1,8-8H184A8,8,0,0,1,192,48Z" opacity="0.2"/><path d="M184,32H72A16,16,0,0,0,56,48V224a8,8,0,0,0,12.24,6.78L128,193.43l59.77,37.35A8,8,0,0,0,200,224V48A16,16,0,0,0,184,32Zm0,177.57-51.77-32.35a8,8,0,0,0-8.48,0L72,209.57V48H184Z"/></svg>
  );
}
function CartIcon() {
  return (
    <svg viewBox="0 0 256 256" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M224,64l-12.16,66.86A16,16,0,0,1,196.1,144H70.55L56,64Z" opacity="0.2"/><path d="M230.14,58.87A8,8,0,0,0,224,56H62.68L56.6,22.57A8,8,0,0,0,48.73,16H24a8,8,0,0,0,0,16h18L67.56,172.29a24,24,0,0,0,5.33,11.27,28,28,0,1,0,44.4,8.44h45.42A27.75,27.75,0,0,0,160,204a28,28,0,1,0,28-28H91.17a8,8,0,0,1-7.87-6.57L80.13,152h116a24,24,0,0,0,23.61-19.71l12.16-66.86A8,8,0,0,0,230.14,58.87ZM104,204a12,12,0,1,1-12-12A12,12,0,0,1,104,204Zm96,0a12,12,0,1,1-12-12A12,12,0,0,1,200,204Zm4-74.57A8,8,0,0,1,196.1,136H77.22L65.59,72H214.41Z"/></svg>
  );
}

export default function CartMoveToSaved({
  cartLabel = "장바구니",
  savedLabel = "나중에 담기",
  groupLabel = "장바구니와 나중에 담기",
  items = DEFAULT_ITEMS,
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
}: CartMoveToSavedProps) {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [live, setLive] = useState(demo);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 같은 상품 줄을 두 목록에 한 벌씩 두고 높이(1fr↔0fr)만 주고받는다 — 카드 전체 높이는 그대로다
  function move(id: string, toSaved: boolean) {
    setLive(false);
    setSavedIds((prev: string[]) => (toSaved ? prev.concat([id]) : prev.filter((x) => x !== id)));
  }

  const cartCount = items.length - savedIds.length;
  const savedCount = savedIds.length;
  // 미리보기 루프가 컷으로 갈아 끼우는 두 번째 숫자 — 둘째 줄이 옮겨 갔을 때의 개수
  const altCart = items.length - 1;
  const altSaved = 1;

  function count(now: number, alt: number) {
    return (
      <output className={`${styles.n} ${styles.swap}`}>
        <span className={styles.value}>{now}</span>
        {live ? <span className={styles.alt} aria-hidden="true">{alt}</span> : null}
      </output>
    );
  }

  function row(item: CartSavedItem, saved: boolean) {
    const out = saved ? savedIds.indexOf(item.id) < 0 : savedIds.indexOf(item.id) >= 0;
    const cls = [styles.row, saved ? styles.rowSaved : "", out ? styles.isOut : ""].filter(Boolean).join(" ");
    return (
      <li className={cls} key={item.id}>
        <div className={styles.box}>
          <div className={styles.in}>
            <span className={styles.name}>{item.name}</span>
            <span className={styles.price}>{item.price}</span>
            <button
              className={`${styles.btn} ${saved ? styles.btnBack : ""}`}
              type="button"
              onClick={() => move(item.id, !saved)}
              aria-label={saved ? item.backLabel : item.moveLabel}
            >
              {saved ? <CartIcon /> : <BookmarkIcon />}
            </button>
          </div>
        </div>
      </li>
    );
  }

  const cls = [styles.mv, live ? styles.isDemo : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <div className={styles.group}>
        <p className={styles.head}>
          <span className={styles.label}>{cartLabel}</span>
          {count(cartCount, altCart)}
        </p>
        <ul className={`${styles.list} ${styles.listCart}`}>{items.map((it) => row(it, false))}</ul>
      </div>
      <div className={styles.group}>
        <p className={styles.head}>
          <span className={styles.label}>{savedLabel}</span>
          {count(savedCount, altSaved)}
        </p>
        <ul className={`${styles.list} ${styles.listSaved}`}>{items.map((it) => row(it, true))}</ul>
      </div>
    </section>
  );
}
