import { useEffect, useRef } from "react";
import styles from "./CommentThreadReplyIndentDepth.module.scss";

const REPLY_INDENT_STEP_PX = 24;

const CARET_PATH = (
  <g fill="currentColor">
    <path d="m208 96l-80 80l-80-80Z" opacity=".2" />
    <path d="M215.39 92.94A8 8 0 0 0 208 88H48a8 8 0 0 0-5.66 13.66l80 80a8 8 0 0 0 11.32 0l80-80a8 8 0 0 0 1.73-8.72M128 164.69L67.31 104h121.38Z" />
  </g>
);

type GroupRefs = { ul: HTMLUListElement | null; toggle: HTMLButtonElement | null };

export default function CommentThreadReplyIndentDepth() {
  const rootRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const g1 = useRef<HTMLUListElement>(null);
  const g1a = useRef<HTMLUListElement>(null);
  const g1a1 = useRef<HTMLUListElement>(null);
  const g2 = useRef<HTMLUListElement>(null);
  const t1 = useRef<HTMLButtonElement>(null);
  const t1a = useRef<HTMLButtonElement>(null);
  const t1a1 = useRef<HTMLButtonElement>(null);
  const t2 = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const status = statusRef.current;
    if (!root || !status) return;

    const items = root.querySelectorAll<HTMLElement>("[data-depth]");
    items.forEach((el) => {
      const depth = parseInt(el.getAttribute("data-depth") || "0", 10) || 0;
      el.style.setProperty("--depth-indent", `${depth * REPLY_INDENT_STEP_PX}px`);
    });

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) root.classList.remove("is-demo");

    function parts(group: GroupRefs) {
      const ul = group.ul;
      const guides: HTMLElement[] = [];
      const bodies: HTMLElement[] = [];
      if (ul) {
        ul.querySelectorAll<HTMLElement>(":scope > li").forEach((li) => {
          const guide = li.querySelector<HTMLElement>(":scope > .guide");
          const body = li.querySelector<HTMLElement>(":scope > .row .body");
          if (guide) guides.push(guide);
          if (body) bodies.push(body);
        });
      }
      return { guides, bodies };
    }

    function closeInstant(group: GroupRefs) {
      const { guides, bodies } = parts(group);
      if (group.toggle) group.toggle.setAttribute("aria-expanded", "false");
      guides.forEach((g) => { g.style.transform = "scaleY(0)"; });
      bodies.forEach((b) => { b.style.opacity = "0"; b.style.transform = "translateY(6px)"; });
    }

    function open(group: GroupRefs, delayMs: number, durMs: number) {
      const { guides, bodies } = parts(group);
      if (group.toggle) group.toggle.setAttribute("aria-expanded", "true");
      if (reduce) {
        guides.forEach((g) => { g.style.transform = "scaleY(1)"; });
        bodies.forEach((b) => { b.style.opacity = "1"; b.style.transform = "translateY(0)"; });
        return;
      }
      guides.forEach((g) => {
        g.animate(
          [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }],
          { duration: durMs, delay: delayMs, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" }
        );
      });
      bodies.forEach((b) => {
        b.animate(
          [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "translateY(0)" }],
          { duration: durMs, delay: delayMs + 60, easing: "ease-out", fill: "forwards" }
        );
      });
    }

    const groups: Record<string, GroupRefs> = {
      replies1: { ul: g1.current, toggle: t1.current },
      replies1a: { ul: g1a.current, toggle: t1a.current },
      replies1a1: { ul: g1a1.current, toggle: t1a1.current },
      replies2: { ul: g2.current, toggle: t2.current }
    };

    function playSequence() {
      Object.values(groups).forEach(closeInstant);
      open(groups.replies1, 200, 460);
      open(groups.replies2, 200, 460);
      open(groups.replies1a, 560, 460);
      open(groups.replies1a1, 920, 460);
      if (status) status.textContent = "깊이 3단계까지 답글이 펼쳐졌습니다.";
    }

    function bind(group: GroupRefs, key: string) {
      const toggle = group.toggle;
      if (!toggle) return;
      const onActivate = () => {
        if (!root) return;
        root.classList.remove("is-demo");
        const isOpen = toggle.getAttribute("aria-expanded") === "true";
        if (isOpen) closeInstant(group);
        else open(group, 0, reduce ? 0 : 260);
      };
      toggle.addEventListener("click", onActivate);
      toggle.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onActivate(); }
      });
    }
    Object.entries(groups).forEach(([key, g]) => bind(g, key));

    let timer: number | undefined;
    if (reduce) {
      Object.values(groups).forEach((g) => open(g, 0, 0));
    } else {
      playSequence();
      timer = window.setInterval(() => {
        if (!root.classList.contains("is-demo")) return;
        playSequence();
      }, 2400);
    }

    return () => { if (timer) window.clearInterval(timer); };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.cmt} is-demo`} ref={rootRef}>
        <ul className={styles.cmt__list} role="list">
          <li className={styles.cmt__item} data-depth="0">
            <div className={`row ${styles.cmt__row}`}>
              <span className={styles.cmt__avatar} aria-hidden="true" />
              <div className={`body ${styles.cmt__body}`}>
                <p className={styles.cmt__meta}><strong className={styles.cmt__name}>그린라임</strong></p>
                <p className={styles.cmt__text}>이 배색 조합 정말 잘 어울리네요.</p>
                <button type="button" className={styles.cmt__toggle} ref={t1} aria-expanded="false" aria-controls="replies1">
                  <svg className={styles.cmt__toggleIcon} viewBox="0 0 256 256" aria-hidden="true">{CARET_PATH}</svg>
                  <span>답글 2개</span>
                </button>
              </div>
            </div>
            <ul className={styles.cmt__replies} role="list" id="replies1" ref={g1}>
              <li className={styles.cmt__item} data-depth="1">
                <span className={`guide ${styles.cmt__guide}`} aria-hidden="true" />
                <div className={`row ${styles.cmt__row}`}>
                  <span className={styles.cmt__avatar} aria-hidden="true" />
                  <div className={`body ${styles.cmt__body}`}>
                    <p className={styles.cmt__meta}><strong className={styles.cmt__name}>파도소리</strong></p>
                    <p className={styles.cmt__text}>저도 같은 생각이에요, 특히 여백이 좋아요.</p>
                    <button type="button" className={styles.cmt__toggle} ref={t1a} aria-expanded="false" aria-controls="replies1a">
                      <svg className={styles.cmt__toggleIcon} viewBox="0 0 256 256" aria-hidden="true">{CARET_PATH}</svg>
                      <span>답글 1개</span>
                    </button>
                  </div>
                </div>
                <ul className={styles.cmt__replies} role="list" id="replies1a" ref={g1a}>
                  <li className={styles.cmt__item} data-depth="2">
                    <span className={`guide ${styles.cmt__guide}`} aria-hidden="true" />
                    <div className={`row ${styles.cmt__row}`}>
                      <span className={styles.cmt__avatar} aria-hidden="true" />
                      <div className={`body ${styles.cmt__body}`}>
                        <p className={styles.cmt__meta}><strong className={styles.cmt__name}>여름언덕</strong></p>
                        <p className={styles.cmt__text}>저는 간격을 조금 더 넓히고 싶던데요.</p>
                        <button type="button" className={styles.cmt__toggle} ref={t1a1} aria-expanded="false" aria-controls="replies1a1">
                          <svg className={styles.cmt__toggleIcon} viewBox="0 0 256 256" aria-hidden="true">{CARET_PATH}</svg>
                          <span>답글 1개</span>
                        </button>
                      </div>
                    </div>
                    <ul className={styles.cmt__replies} role="list" id="replies1a1" ref={g1a1}>
                      <li className={styles.cmt__item} data-depth="3">
                        <span className={`guide ${styles.cmt__guide}`} aria-hidden="true" />
                        <div className={`row ${styles.cmt__row}`}>
                          <span className={styles.cmt__avatar} aria-hidden="true" />
                          <div className={`body ${styles.cmt__body}`}>
                            <p className={styles.cmt__meta}><strong className={styles.cmt__name}>그린라임</strong></p>
                            <p className={styles.cmt__text}>넓히는 것도 좋을 것 같아요, 다음에 반영할게요.</p>
                          </div>
                        </div>
                      </li>
                    </ul>
                  </li>
                </ul>
              </li>
            </ul>
          </li>
          <li className={styles.cmt__item} data-depth="0">
            <div className={`row ${styles.cmt__row}`}>
              <span className={styles.cmt__avatar} aria-hidden="true" />
              <div className={`body ${styles.cmt__body}`}>
                <p className={styles.cmt__meta}><strong className={styles.cmt__name}>민트페이지</strong></p>
                <p className={styles.cmt__text}>버튼 크기도 지금이 딱 좋아요.</p>
                <button type="button" className={styles.cmt__toggle} ref={t2} aria-expanded="false" aria-controls="replies2">
                  <svg className={styles.cmt__toggleIcon} viewBox="0 0 256 256" aria-hidden="true">{CARET_PATH}</svg>
                  <span>답글 1개</span>
                </button>
              </div>
            </div>
            <ul className={styles.cmt__replies} role="list" id="replies2" ref={g2}>
              <li className={styles.cmt__item} data-depth="1">
                <span className={`guide ${styles.cmt__guide}`} aria-hidden="true" />
                <div className={`row ${styles.cmt__row}`}>
                  <span className={styles.cmt__avatar} aria-hidden="true" />
                  <div className={`body ${styles.cmt__body}`}>
                    <p className={styles.cmt__meta}><strong className={styles.cmt__name}>파도소리</strong></p>
                    <p className={styles.cmt__text}>맞아요, 누르기 편해졌어요.</p>
                  </div>
                </div>
              </li>
            </ul>
          </li>
        </ul>
        <p className={styles.cmt__sr} ref={statusRef} aria-live="polite" />
      </div>
    </main>
  );
}
