// AlbumGridLightbox — vanilla 판(run/082/demo/08-slider-album-grid-lightbox/index.html) 의 React 포트.
// grid-template-columns 로 짠 앨범 격자의 칸은 진짜 button 이고, 누르면 dialog.showModal() 로 창이 열린다.
// 창 안은 다시 인덱스 슬라이더라 닫지 않고 좌우로 다음 장을 본다. Esc 로 닫히고, 닫히면 눌렀던 칸으로 초점이 돌아간다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./AlbumGridLightbox.module.scss";

export type AlbumGridLightboxProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef<T> 는 T | null 을 돌려준다 — ambient 타입에 맞춰 상자 타입을 따로 둔다
type Box<T> = { current: T | null };

const TITLE = "앨범 격자";
const HINT = "창을 닫지 않고 넘깁니다";
const DIALOG_LABEL = "사진 크게 보기";
const CAROUSEL_LABEL = "라이트박스 사진 슬라이더";
const PREV_LABEL = "이전 사진";
const NEXT_LABEL = "다음 사진";
const CLOSE_LABEL = "닫기";
const PHOTOS = [
  { tone: "a", alt: "새벽 부두의 컨테이너", open: "새벽 부두의 컨테이너 크게 보기", slide: "6장 중 1장" },
  { tone: "b", alt: "노을 진 사막 능선", open: "노을 진 사막 능선 크게 보기", slide: "6장 중 2장" },
  { tone: "c", alt: "비 온 뒤 도심 골목", open: "비 온 뒤 도심 골목 크게 보기", slide: "6장 중 3장" },
  { tone: "d", alt: "눈 덮인 자작나무 숲", open: "눈 덮인 자작나무 숲 크게 보기", slide: "6장 중 4장" },
  { tone: "e", alt: "한낮의 수영장 물결", open: "한낮의 수영장 물결 크게 보기", slide: "6장 중 5장" },
  { tone: "f", alt: "밤 열차의 창가 불빛", open: "밤 열차의 창가 불빛 크게 보기", slide: "6장 중 6장" },
];

// Phosphor Duotone (MIT) — 인라인이라 런타임 외부 요청이 없다
const CaretLeft = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256" aria-hidden="true">
    <g fill="currentColor">
      <path d="M160 48v160l-80-80Z" opacity=".2" />
      <path d="M163.06 40.61a8 8 0 0 0-8.72 1.73l-80 80a8 8 0 0 0 0 11.32l80 80A8 8 0 0 0 168 208V48a8 8 0 0 0-4.94-7.39M152 188.69L91.31 128L152 67.31Z" />
    </g>
  </svg>
);
const CaretRight = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256" aria-hidden="true">
    <g fill="currentColor">
      <path d="m176 128l-80 80V48Z" opacity=".2" />
      <path d="m181.66 122.34l-80-80A8 8 0 0 0 88 48v160a8 8 0 0 0 13.66 5.66l80-80a8 8 0 0 0 0-11.32M104 188.69V67.31L164.69 128Z" />
    </g>
  </svg>
);
const CloseMark = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256" aria-hidden="true">
    <g fill="currentColor">
      <path d="M216 56v144a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" opacity=".2" />
      <path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128L50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z" />
    </g>
  </svg>
);

export default function AlbumGridLightbox(props: AlbumGridLightboxProps) {
  const duration = props.duration ?? 300;
  const easing = props.easing ?? "cubic-bezier(.2, .8, .2, 1)";
  const color = props.color ?? "#0a4fe8";
  const [index, setIndex] = useState<number>(0);
  const [preview, setPreview] = useState<boolean>(true);
  const dialogRef = useRef<HTMLDialogElement>(null) as Box<HTMLDialogElement>;
  const openerRef = useRef<HTMLButtonElement>(null) as Box<HTMLButtonElement>;
  const indexRef = useRef<number>(0) as Box<number>;

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const show = (next: number) => {
    setIndex((next + PHOTOS.length) % PHOTOS.length);
  };

  const open = (at: number, from: HTMLButtonElement | null) => {
    openerRef.current = from;
    setIndex(at);
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  };

  const close = () => {
    const dialog = dialogRef.current;
    if (dialog && dialog.open) {
      dialog.close();
    }
  };

  // Esc 로 닫아도 close 이벤트는 온다 — 초점은 항상 눌렀던 격자 칸으로 돌아간다
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    const onClose = () => {
      const opener = openerRef.current;
      if (opener) {
        opener.focus({ preventScroll: true });
      }
    };
    dialog.addEventListener("close", onClose);
    return () => {
      dialog.removeEventListener("close", onClose);
    };
  }, []);

  // 미리보기 — 창을 열고, 열린 채로 끝까지 넘기고, 닫는다
  useEffect(() => {
    if (!preview) {
      return;
    }
    const id = window.setInterval(() => {
      const dialog = dialogRef.current;
      const at = indexRef.current ?? 0;
      if (!dialog) {
        return;
      }
      if (!dialog.open) {
        setIndex(0);
        dialog.showModal();
      } else if (at < PHOTOS.length - 1) {
        setIndex(at + 1);
      } else {
        dialog.close();
      }
    }, 460);
    return () => {
      window.clearInterval(id);
    };
  }, [preview]);

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };

  return (
    <main className={styles.stage} style={vars}>
      <section className={styles.root}>
        <header className={styles.bar}>
          <span className={styles.title}>{TITLE}</span>
          <span className={styles.hint}>{HINT}</span>
        </header>
        <ul className={styles.grid}>
          {PHOTOS.map((photo, i) => (
            <li className={styles.cell} key={photo.tone}>
              <button
                className={styles.btn}
                type="button"
                aria-label={photo.open}
                onClick={(e: { currentTarget: HTMLButtonElement }) => {
                  setPreview(false);
                  open(i, e.currentTarget);
                }}
              >
                <span className={styles.ph + " " + styles["ph--" + photo.tone]} role="img" aria-label={photo.alt} />
              </button>
            </li>
          ))}
        </ul>
      </section>
      <dialog
        className={styles.lb}
        ref={dialogRef}
        aria-label={DIALOG_LABEL}
        onKeyDown={(e: { key: string; preventDefault: () => void }) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") {
            return;
          }
          e.preventDefault();
          setPreview(false);
          show(index + (e.key === "ArrowRight" ? 1 : -1));
        }}
      >
        <div className={styles.box} role="region" aria-roledescription="carousel" aria-label={CAROUSEL_LABEL}>
          <div className={styles.frame}>
            <div className={styles.track} style={{ transform: "translateX(" + -index * 100 + "%)" }}>
              {PHOTOS.map((photo, i) => (
                <span
                  className={styles.slide}
                  key={photo.tone}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={photo.slide}
                  aria-hidden={i === index ? "false" : "true"}
                >
                  <span className={styles.ph + " " + styles["ph--" + photo.tone]} role="img" aria-label={photo.alt} />
                </span>
              ))}
            </div>
          </div>
          <div className={styles.lbbar}>
            <button
              className={styles.nav}
              type="button"
              aria-label={PREV_LABEL}
              onClick={() => {
                setPreview(false);
                show(index - 1);
              }}
            >
              <CaretLeft />
            </button>
            <span className={styles.count}>{index + 1} / {PHOTOS.length}</span>
            <button
              className={styles.nav}
              type="button"
              aria-label={NEXT_LABEL}
              onClick={() => {
                setPreview(false);
                show(index + 1);
              }}
            >
              <CaretRight />
            </button>
            <button
              className={styles.close}
              type="button"
              aria-label={CLOSE_LABEL}
              onClick={() => {
                setPreview(false);
                close();
              }}
            >
              <CloseMark />
            </button>
          </div>
        </div>
      </dialog>
    </main>
  );
}
