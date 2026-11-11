import { useState } from "react";
import styles from "./AbandonedCart.module.scss";

export type AbandonedCartProps = { duration?: number; easing?: string; color?: string };

type Item = { name: string; opt: string; price: number; thumb: string };

const ITEMS: Item[] = [
  { name: "주방 칼 다이 스탠드", opt: "크림 · 1개 입고 예정", price: 28900, thumb: "a" },
  { name: "리넨 키친 타올 3장", opt: "그린 · 재고 4개", price: 12700, thumb: "b" },
];

function money(n: number): string {
  const lang = document.documentElement.lang || "ko";
  const digits = n.toLocaleString("ko-KR");
  if (lang === "ja") { return digits + "ウォン"; }
  if (lang === "en") { return "₩" + digits; }
  return digits + "원";
}

export default function AbandonedCart({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#0a4fe8" }: AbandonedCartProps) {
  const [demo, setDemo] = useState(true);
  const [qtys, setQtys] = useState<number[]>([1, 1]);

  const total = qtys.reduce((sum, q, i) => sum + q * ITEMS[i].price, 0);

  const step = (i: number, dir: number) => {
    setDemo(false);
    setQtys((qs) => qs.map((q, j) => (j === i ? Math.min(9, Math.max(1, q + dir)) : q)));
  };

  return (
    <main className={styles.stage}>
      <div className={styles.mk}>
        <div className={styles.card}>
          <div className={styles.brand}>◆ Acme</div>
          <div className={styles.hero}>
            <span className={styles.badge} style={{ background: color }} aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico}><path d="M232,72l-25.63,92.28A16,16,0,0,1,191,176H92.16a16,16,0,0,1-15.41-11.72L51.11,72Z" opacity="0.2"/><path d="M104,216a16,16,0,1,1-16-16A16,16,0,0,1,104,216Zm88-16a16,16,0,1,0,16,16A16,16,0,0,0,192,200ZM239.71,74.14l-25.64,92.28A24.06,24.06,0,0,1,191,184H92.16A24.06,24.06,0,0,1,69,166.42L33.92,40H16a8,8,0,0,1,0-16H40a8,8,0,0,1,7.71,5.86L57.19,64H232a8,8,0,0,1,7.71,10.14ZM221.47,80H61.64l22.81,82.14A8,8,0,0,0,92.16,168H191a8,8,0,0,0,7.71-5.86Z"/></svg>
            </span>
          </div>
          <div className={styles.title}>담아둔 상품이 기다리고 있어요</div>
          <div className={styles.body}>수량을 바꾸면 합계가 바로 따라옵니다.</div>
          <div className={styles.items}>
            {ITEMS.map((it, i) => (
              <div key={it.name} className={styles.item} style={demo ? { animationName: "acSlide", animationDuration: "2s", animationTimingFunction: easing, animationIterationCount: "infinite", animationDelay: `${i * 140}ms`, animationFillMode: "backwards" } : undefined}>
                <span className={`${styles.thumb} ${it.thumb === "a" ? styles.thumbA : styles.thumbB}`} aria-hidden="true"></span>
                <span className={styles.meta}>
                  <span className={styles.name}>{it.name}</span>
                  <span className={styles.opt}>{it.opt}</span>
                </span>
                <span className={styles.qty}>
                  <button type="button" className={styles.stepBtn} aria-label="수량 줄이기" onClick={() => step(i, -1)}>−</button>
                  <span className={styles.n}>{qtys[i]}</span>
                  <button type="button" className={styles.stepBtn} aria-label="수량 늘리기" onClick={() => step(i, 1)}>+</button>
                </span>
                <span className={styles.price}>{money(qtys[i] * it.price)}</span>
              </div>
            ))}
            <div className={styles.total}>
              <span className={styles.totalLabel}>합계</span>
              <span className={styles.totalVal}>{money(total)}</span>
            </div>
          </div>
          <div className={styles.ctawrap}>
            <a href="#" role="button" className={styles.cta} style={{ background: "#2a5fd8" }} onClick={(e: { preventDefault: () => void }) => { e.preventDefault(); }}>구매 계속하기</a>
          </div>
          <div className={styles.footer}>Acme Inc · 서울 · <a href="#" className={styles.unsub}>수신거부</a></div>
        </div>
      </div>
    </main>
  );
}
