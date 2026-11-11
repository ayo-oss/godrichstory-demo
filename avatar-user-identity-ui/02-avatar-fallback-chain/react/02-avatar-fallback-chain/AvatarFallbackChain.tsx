import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./AvatarFallbackChain.module.scss";

export type AvatarFallbackChainProps = {
  label?: string;
  name?: string;
  stepPhoto?: string;
  stepInitials?: string;
  stepMark?: string;
  btnToMark?: string;
  btnToInitials?: string;
  /** 세 단계 컷이 도는 한 바퀴(ms) */
  duration?: number;
  easing?: string;
  /** 옐로 무대 글자색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

// 이니셜은 이름에서 계산한다(한국어 첫 글자 1자 · 라틴 앞 두 단어 머리글자)
function initialsOf(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (/[가-힣]/.test(trimmed[0])) return trimmed[0];
  const words = trimmed.split(/\s+/).filter((w) => /[A-Za-z]/.test(w[0] || ""));
  return words.slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

export default function AvatarFallbackChain({
  label = "3단 대체 아바타",
  name = "관리자",
  stepPhoto = "1단계 · 사진 기다리는 중",
  stepInitials = "2단계 · 이니셜 대체",
  stepMark = "3단계 · 사람 도형 대체",
  btnToMark = "사람 도형으로",
  btnToInitials = "이니셜로 되돌리기",
  duration = 2000,
  easing = "ease-out",
  color = "#17141a",
}: AvatarFallbackChainProps): ReactNode {
  const [step, setStep] = useState<"photo" | "initials" | "mark">("photo");
  const [loop, setLoop] = useState<boolean>(true);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section
      className={loop ? `${styles.fb} ${styles.isDemo}` : styles.fb}
      style={vars}
      aria-label={label}
      data-step={step}
      onPointerDown={() => setLoop(false)}
      onFocus={() => setLoop(false)}
    >
      <p className={styles.name}>{name}</p>

      {/* 세 겹이 한 자리에 겹쳐 앉는다: 사진 자리(로딩 시머) · 이니셜 · 사람 도형.
          data-step 이 어느 겹을 보일지 정한다 */}
      <span className={styles.slot}>
        <span className={styles.shine} aria-hidden="true" />
        {/* 사진 파일은 일부러 없다(404) — error 에서 스스로 이니셜 단계로 내려간다 */}
        <img
          className={styles.photo}
          src="member-photo.jpg"
          alt=""
          onError={() => setStep((s) => (s === "photo" ? "initials" : s))}
        />
        <span className={styles.initial} aria-hidden="true">{initialsOf(name)}</span>
        <span className={styles.mark} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="34" height="34" aria-hidden="true" focusable="false" fill="currentColor"><path d="M192,96a64,64,0,1,1-64-64A64,64,0,0,1,192,96Z" opacity="0.2" /><path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z" /></svg>
        </span>
      </span>

      <p className={styles.step}>
        <span className={`${styles.stepTxt} ${styles.stepTxtPhoto}`}>{stepPhoto}</span>
        <span className={`${styles.stepTxt} ${styles.stepTxtInitials}`}>{stepInitials}</span>
        <span className={`${styles.stepTxt} ${styles.stepTxtMark}`}>{stepMark}</span>
      </p>

      {/* 버튼 하나가 이니셜과 사람 도형을 오간다 (키보드 Enter·Space 로도 눌린다) */}
      <button
        className={styles.btn}
        type="button"
        onClick={() => setStep((s) => (s === "mark" ? "initials" : "mark"))}
      >
        <span className={`${styles.btnTxt} ${styles.btnTxtMark}`}>{btnToMark}</span>
        <span className={`${styles.btnTxt} ${styles.btnTxtInitials}`}>{btnToInitials}</span>
      </button>
    </section>
  );
}
