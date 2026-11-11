// MpaCrossDocument — vanilla 판(run/401/demo/02-view-transition-mpa-cross-document/index.html) 의 React 포트.
// 시뮬레이션 안내: 실제 문서 간(MPA) 전환은 브라우저가 @view-transition { navigation: auto } 규칙을
// 문서마다 읽어 두 문서의 스냅샷을 자동으로 잇는다. 이 포트는 같은 문서 안에서 주소 표시줄 값과
// 문서 A/B 전환만 흉내 낸 것으로, 실제 페이지 이동·불러오기는 없다.
import { useEffect, useRef } from "react";
import styles from "./MpaCrossDocument.module.scss";

type Box<T> = { current: T };

const HOLD_MS = 1000;

export default function MpaCrossDocument() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const urlRef = useRef(null) as unknown as Box<HTMLElement>;
  const listRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const articleRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const openBtnRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const backBtnRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const chipListRef = useRef(null) as unknown as Box<HTMLElement>;
  const chipArtRef = useRef(null) as unknown as Box<HTMLElement>;
  const timerRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const SUPPORTS_VT = "startViewTransition" in document;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;
    let atArticle = false;

    function human() {
      if (isDemo) { rootRef.current?.classList.remove(styles.isDemo); isDemo = false; }
    }

    function toArticleRender() {
      if (urlRef.current) urlRef.current.textContent = "godrichstory.example/list/item-07";
      listRef.current?.setAttribute("hidden", "");
      articleRef.current?.removeAttribute("hidden");
      if (chipArtRef.current && chipListRef.current) chipArtRef.current.textContent = chipListRef.current.textContent;
      atArticle = true;
    }

    function toListRender() {
      if (urlRef.current) urlRef.current.textContent = "godrichstory.example/list";
      articleRef.current?.setAttribute("hidden", "");
      listRef.current?.removeAttribute("hidden");
      atArticle = false;
    }

    function change(fn: () => void) {
      if (SUPPORTS_VT) { document.startViewTransition(fn); }
      else { fn(); }
    }

    function toArticle() { if (atArticle) return; change(toArticleRender); }
    function toList() { if (!atArticle) return; change(toListRender); }

    function onOpenClick() { human(); toArticle(); }
    function onBackClick() { human(); toList(); }
    function onKeydown(e: KeyboardEvent) { if (e.key === "Escape") { human(); toList(); } }

    openBtnRef.current?.addEventListener("click", onOpenClick);
    backBtnRef.current?.addEventListener("click", onBackClick);
    rootRef.current?.addEventListener("keydown", onKeydown);

    function loop() {
      if (!isDemo) return;
      if (atArticle) toList(); else toArticle();
      timerRef.current = window.setTimeout(loop, HOLD_MS);
    }

    if (!reduce) {
      timerRef.current = window.setTimeout(loop, HOLD_MS);
    } else {
      rootRef.current?.classList.remove(styles.isDemo);
    }

    return () => {
      window.clearTimeout(timerRef.current);
      openBtnRef.current?.removeEventListener("click", onOpenClick);
      backBtnRef.current?.removeEventListener("click", onBackClick);
      rootRef.current?.removeEventListener("keydown", onKeydown);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.mp + " " + styles.isDemo} ref={rootRef}>
        <p className={styles.bar} aria-hidden="true"><span className={styles.dot} /><span ref={urlRef}>godrichstory.example/list</span></p>
        <div className={styles.view}>
          <div className={styles.doc} ref={listRef}>
            <p className={styles.kicker}>문서 A</p>
            <p className={styles.h}>글 목록</p>
            <button type="button" className={styles.row} ref={openBtnRef} aria-label="글 항목 열기 — 같은 문서인 것처럼 시뮬레이션">
              <span className={styles.chip} ref={chipListRef}>N</span><span className={styles.rowT}>전환 항목</span>
            </button>
            <p className={styles.row + " " + styles.rowGhost} />
            <p className={styles.row + " " + styles.rowGhost} />
          </div>
          <div className={styles.doc + " " + styles.docArticle} ref={articleRef} hidden>
            <button type="button" className={styles.back} ref={backBtnRef} aria-label="목록 문서로 돌아가기">뒤로</button>
            <span className={styles.chip + " " + styles.chipLg} ref={chipArtRef}>N</span>
            <p className={styles.h}>전환 항목</p>
            <p className={styles.desc}>이 화면은 실제 새 문서 값을 불러온 것처럼 시뮬레이션한 것이다</p>
          </div>
        </div>
        <p className={styles.note}>같은 문서 안에서 문서 이동을 흉내 낸 시뮬레이션 — 실제 새 문서를 불러오지 않는다</p>
      </div>
    </main>
  );
}
