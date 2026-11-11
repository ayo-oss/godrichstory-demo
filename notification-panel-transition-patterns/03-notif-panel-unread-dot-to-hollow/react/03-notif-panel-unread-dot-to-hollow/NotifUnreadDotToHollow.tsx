// NotifUnreadDotToHollow — vanilla 판(run/405/demo/03-.../index.html) 의 React 포트.
// 계산 겹: CSS 트랜지션이 아니라 매 프레임 위치·속도를 직접 적분하는 감쇠 스프링으로 채운
// 점 → 빈 원 전환을 만든다. target 을 0 또는 1 로 바꾸면 그 순간의 속도를 그대로 이어받아
// 다음 목표로 다시 움직인다(끊기지 않는다) — vanilla 와 동일 동작.
import { useEffect, useRef, useState } from "react";
import styles from "./NotifUnreadDotToHollow.module.scss";

type Box<T> = { current: T };

const NAMES = ["결제가 승인됐어요", "새 댓글이 달렸어요", "회의 10분 전이에요", "업로드가 끝났어요"];

class Spring {
  private pos = 0;
  private vel = 0;
  private target = 0;
  private raf = 0;
  private last: number | null = null;
  constructor(private tintEl: HTMLElement | null, private fillEl: HTMLElement, private ringEl: HTMLElement, private stiffness: number, private damping: number) {
    this.apply(0);
  }
  private apply(p: number) {
    const c = Math.max(0, Math.min(1, p));
    const over = Math.max(0, p - 1);
    this.fillEl.style.opacity = String(1 - c);
    this.ringEl.style.borderWidth = (c * 2.4).toFixed(2) + "px";
    const bump = 1 + over * 0.85;
    const parent = this.fillEl.parentNode as HTMLElement | null;
    if (parent) parent.style.transform = "scale(" + bump.toFixed(3) + ")";
    // 같은 스프링 값(c)으로 행 전체 톤도 함께 보간한다 — 안 읽음일수록 진하고, 읽으면 투명해진다
    if (this.tintEl) this.tintEl.style.opacity = (0.10 * (1 - c)).toFixed(3);
  }
  private tick = (ts: number) => {
    if (this.last === null) this.last = ts;
    const dt = Math.min((ts - this.last) / 1000, 0.032);
    this.last = ts;
    const acc = -this.stiffness * (this.pos - this.target) - this.damping * this.vel;
    this.vel += acc * dt;
    this.pos += this.vel * dt;
    this.apply(this.pos);
    if (Math.abs(this.pos - this.target) > 0.002 || Math.abs(this.vel) > 0.01) {
      this.raf = requestAnimationFrame(this.tick);
    } else {
      this.pos = this.target;
      this.apply(this.pos);
      this.raf = 0;
      this.last = null;
    }
  };
  to(t: number, immediate?: boolean) {
    this.target = t;
    if (immediate) {
      this.pos = t; this.vel = 0; this.apply(this.pos);
      if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
      this.last = null;
      return;
    }
    if (!this.raf) { this.last = null; this.raf = requestAnimationFrame(this.tick); }
  }
}

type Row = { btn: HTMLButtonElement; read: boolean; spring: Spring };

export default function NotifUnreadDotToHollow() {
  const [isDemo, setIsDemo] = useState(true);

  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const synthRef = useRef(false) as unknown as Box<boolean>;
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const listRef = useRef(null) as unknown as Box<HTMLUListElement>;
  const srRef = useRef(null) as unknown as Box<HTMLParagraphElement>;
  const badgeFillRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const badgeRingRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const badgeSpringRef = useRef(null) as unknown as Box<Spring | null>;
  const rowsRef = useRef([] as Row[]) as unknown as Box<Row[]>;
  const unreadRef = useRef(NAMES.length) as unknown as Box<number>;
  const loopTimerRef = useRef(0) as unknown as Box<number>;

  function human() {
    if (synthRef.current) return;
    if (isDemoRef.current) { isDemoRef.current = false; setIsDemo(false); }
  }

  function updateSr() {
    if (srRef.current) srRef.current.textContent = unreadRef.current + "개 안 읽음";
  }

  function markRead(row: Row) {
    if (row.read) return;
    row.read = true;
    unreadRef.current--;
    row.spring.to(1);
    if (unreadRef.current <= 0 && badgeSpringRef.current) badgeSpringRef.current.to(1);
    updateSr();
  }

  function markUnread(row: Row) {
    if (!row.read) return;
    row.read = false;
    unreadRef.current++;
    row.spring.to(0);
    if (badgeSpringRef.current) badgeSpringRef.current.to(0);
    updateSr();
  }

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const list = listRef.current;
    if (!list || !badgeFillRef.current || !badgeRingRef.current) return;

    badgeSpringRef.current = new Spring(null, badgeFillRef.current, badgeRingRef.current, reduce ? 999 : 220, reduce ? 999 : 17);

    const rows: Row[] = [];
    NAMES.forEach((name) => {
      const li = document.createElement("li");
      li.className = styles.item;
      li.setAttribute("role", "listitem");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = styles.row;
      btn.setAttribute("aria-pressed", "false");

      const tint = document.createElement("span");
      tint.className = styles.rowTint;
      tint.setAttribute("aria-hidden", "true");

      const dot = document.createElement("span");
      dot.className = styles.dot;
      const fill = document.createElement("span");
      fill.className = styles.dotFill;
      const ring = document.createElement("span");
      ring.className = styles.dotRing;
      dot.appendChild(fill);
      dot.appendChild(ring);

      const nameEl = document.createElement("span");
      nameEl.className = styles.name;
      nameEl.textContent = name;

      btn.appendChild(tint);
      btn.appendChild(dot);
      btn.appendChild(nameEl);
      li.appendChild(btn);
      list.appendChild(li);

      const row: Row = { btn, read: false, spring: new Spring(tint, fill, ring, reduce ? 999 : 220, reduce ? 999 : 17) };
      rows.push(row);

      btn.addEventListener("click", () => {
        human();
        if (row.read) markUnread(row); else markRead(row);
        btn.setAttribute("aria-pressed", row.read ? "true" : "false");
      });
    });
    rowsRef.current = rows;

    if (reduce) {
      rows.forEach((row) => markRead(row));
    } else {
      let idx = 0;
      let phase = "read";
      function loop() {
        if (!isDemoRef.current) return;
        synthRef.current = true;
        if (phase === "read") {
          const row = rowsRef.current[idx];
          markRead(row);
          row.btn.setAttribute("aria-pressed", "true");
          idx++;
          if (idx >= rowsRef.current.length) { phase = "reset"; }
        } else {
          rowsRef.current.forEach((r) => {
            r.read = false;
            r.spring.to(0, true);
            r.btn.setAttribute("aria-pressed", "false");
          });
          unreadRef.current = NAMES.length;
          if (badgeSpringRef.current) badgeSpringRef.current.to(0, true);
          updateSr();
          idx = 0;
          phase = "read";
        }
        synthRef.current = false;
        loopTimerRef.current = window.setTimeout(loop, phase === "reset" ? 900 : 480);
      }
      loopTimerRef.current = window.setTimeout(loop, 250);
    }

    return () => { window.clearTimeout(loopTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.ud + " " + (isDemo ? styles.isDemo : "")} ref={rootRef}>
        <div className={styles.head}>
          <span className={styles.badge}>
            <span className={styles.dotFill + " " + styles.badgeFill} ref={badgeFillRef} />
            <span className={styles.dotRing + " " + styles.badgeRing} ref={badgeRingRef} />
          </span>
          <span className={styles.headLabel}>알림</span>
          <p className={styles.sr} aria-live="polite" ref={srRef}>4개 안 읽음</p>
        </div>
        <ul className={styles.list} role="list" ref={listRef} />
      </div>
    </main>
  );
}
