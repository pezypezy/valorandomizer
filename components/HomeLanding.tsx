"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/Button";

type Language = "ja" | "en" | "ko";
type AccessErrorCode = "invalid" | "rate-limit" | "configuration" | "unknown";

type Copy = {
  eyebrow: string;
  title: string;
  description: string;
  randomCta: string;
  proCta: string;
  aiCta: string;
  randomMeta: string;
  randomTitle: string;
  randomDescription: string;
  proMeta: string;
  proTitle: string;
  proDescription: string;
  aiMeta: string;
  aiTitle: string;
  aiDescription: string;
  aiLocked: string;
  select: string;
  statOne: string;
  statTwo: string;
  statThree: string;
  howTitle: string;
  howBody: string;
  loginEyebrow: string;
  loginTitle: string;
  loginBody: string;
  password: string;
  placeholder: string;
  submit: string;
  submitting: string;
  cancel: string;
  invalid: string;
  rateLimit: string;
  configuration: string;
  unknown: string;
};

const COPY: Record<Language, Copy> = {
  ja: {
    eyebrow: "VALORANT COMPOSITION TOOLKIT",
    title: "遊ぶ構成も、勝ちにいく構成も。",
    description: "ランダム構成、過去のプロ構成、ランク統計を使ったAI構成相談を、ひとつの場所から選べます。",
    randomCta: "Random Pickを使う",
    proCta: "Pro Pickを使う",
    aiCta: "AI構成を使う",
    randomMeta: "ROLE BASED",
    randomTitle: "RANDOM PICK",
    randomDescription: "ロール人数を指定して5人構成を生成。固定と個別の振り直しにも対応します。",
    proMeta: "MATCH BASED",
    proTitle: "PRO PICK",
    proDescription: "過去のVCT・プロ試合構成から、マップや地域を条件に抽選します。",
    aiMeta: "PRIVATE BETA",
    aiTitle: "AI COMP",
    aiDescription: "現パッチ・直近7日のランク統計をもとに、セオリー・オフメタ・野良向け構成を比較します。",
    aiLocked: "共有パスワードが必要",
    select: "開く",
    statOne: "5人構成をすぐに生成",
    statTwo: "プロ試合データから抽選",
    statThree: "統計とAIで構成を相談",
    howTitle: "3つの使い方",
    howBody: "身内カスタムはRandom Pick、プロ構成縛りはPro Pick、ランクで勝ちにいく構成相談はAI Compを選んでください。",
    loginEyebrow: "PRIVATE BETA ACCESS",
    loginTitle: "AI構成にログイン",
    loginBody: "グループ内で共有されているパスワードを入力してください。ログイン状態はこのブラウザで7日間維持されます。",
    password: "共有パスワード",
    placeholder: "パスワードを入力",
    submit: "AI構成を開く",
    submitting: "確認中...",
    cancel: "キャンセル",
    invalid: "パスワードが違います。共有された文字列を確認してください。",
    rateLimit: "短時間に試行しすぎています。1分ほど待ってから再試行してください。",
    configuration: "認証設定が未完了です。CloudflareのSecret設定を確認してください。",
    unknown: "ログインに失敗しました。少し待ってから再試行してください。",
  },
  en: {
    eyebrow: "VALORANT COMPOSITION TOOLKIT",
    title: "Draft for fun, or draft to win.",
    description: "Choose role-based random squads, past pro compositions, or AI composition advice backed by ranked statistics.",
    randomCta: "Use Random Pick",
    proCta: "Use Pro Pick",
    aiCta: "Use AI Comp",
    randomMeta: "ROLE BASED",
    randomTitle: "RANDOM PICK",
    randomDescription: "Set role counts, generate five agents, then lock or reroll individual slots.",
    proMeta: "MATCH BASED",
    proTitle: "PRO PICK",
    proDescription: "Draw past VCT and pro-match compositions with map, region, and event filters.",
    aiMeta: "PRIVATE BETA",
    aiTitle: "AI COMP",
    aiDescription: "Compare theory, off-meta, and solo-queue options using current-patch, rolling seven-day ranked statistics.",
    aiLocked: "Shared password required",
    select: "Open",
    statOne: "Generate five-agent squads",
    statTwo: "Draw from pro match data",
    statThree: "Ask with ranked stats and AI",
    howTitle: "Three ways to build a team",
    howBody: "Use Random Pick for customs, Pro Pick for pro-composition challenges, and AI Comp for a data-backed ranked recommendation.",
    loginEyebrow: "PRIVATE BETA ACCESS",
    loginTitle: "Sign in to AI Comp",
    loginBody: "Enter the password shared with the group. The session remains active in this browser for seven days.",
    password: "Shared password",
    placeholder: "Enter password",
    submit: "Open AI Comp",
    submitting: "Checking...",
    cancel: "Cancel",
    invalid: "That password is incorrect. Check the value shared with the group.",
    rateLimit: "Too many attempts. Wait about a minute before trying again.",
    configuration: "Authentication is not configured. Check the Cloudflare secrets.",
    unknown: "Sign-in failed. Wait a moment and try again.",
  },
  ko: {
    eyebrow: "VALORANT COMPOSITION TOOLKIT",
    title: "재미있는 조합도, 승리를 위한 조합도.",
    description: "역할 기반 랜덤 조합, 과거 프로 조합, 랭크 통계 기반 AI 조합 상담을 한곳에서 선택할 수 있습니다.",
    randomCta: "Random Pick 사용",
    proCta: "Pro Pick 사용",
    aiCta: "AI 조합 사용",
    randomMeta: "ROLE BASED",
    randomTitle: "RANDOM PICK",
    randomDescription: "역할 인원수를 정해 5인 조합을 만들고 원하는 자리만 고정하거나 다시 추첨합니다.",
    proMeta: "MATCH BASED",
    proTitle: "PRO PICK",
    proDescription: "과거 VCT 및 프로 경기 조합을 맵, 지역, 이벤트 조건으로 추첨합니다.",
    aiMeta: "PRIVATE BETA",
    aiTitle: "AI COMP",
    aiDescription: "현 패치・최근 7일 랭크 통계로 정석, 오프메타, 솔로 랭크 조합을 비교합니다.",
    aiLocked: "공유 비밀번호 필요",
    select: "열기",
    statOne: "5인 조합 즉시 생성",
    statTwo: "프로 경기 데이터에서 추첨",
    statThree: "통계와 AI로 조합 상담",
    howTitle: "세 가지 조합 도구",
    howBody: "내전은 Random Pick, 프로 조합 규칙은 Pro Pick, 랭크 승리를 위한 상담은 AI Comp를 선택하세요.",
    loginEyebrow: "PRIVATE BETA ACCESS",
    loginTitle: "AI 조합 로그인",
    loginBody: "그룹에서 공유한 비밀번호를 입력해 주세요. 로그인 상태는 이 브라우저에서 7일간 유지됩니다.",
    password: "공유 비밀번호",
    placeholder: "비밀번호 입력",
    submit: "AI 조합 열기",
    submitting: "확인 중...",
    cancel: "취소",
    invalid: "비밀번호가 올바르지 않습니다. 공유된 값을 확인해 주세요.",
    rateLimit: "짧은 시간에 너무 많이 시도했습니다. 약 1분 후 다시 시도해 주세요.",
    configuration: "인증 설정이 완료되지 않았습니다. Cloudflare Secret을 확인해 주세요.",
    unknown: "로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.",
  },
};

function languageFor(locale: string): Language {
  return locale === "en" || locale === "ko" ? locale : "ja";
}

function errorMessage(copy: Copy, code: AccessErrorCode | null): string | null {
  if (code === "invalid") return copy.invalid;
  if (code === "rate-limit") return copy.rateLimit;
  if (code === "configuration") return copy.configuration;
  if (code === "unknown") return copy.unknown;
  return null;
}

export function HomeLanding({ locale }: { locale: string }) {
  const router = useRouter();
  const language = languageFor(locale);
  const copy = COPY[language];
  const [loginOpen, setLoginOpen] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<AccessErrorCode | null>(null);
  const aiPath = `/${language}/ai-composition`;

  useEffect(() => {
    if (!loginOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) setLoginOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [loginOpen, submitting]);

  async function openAiComposition() {
    if (checkingAccess) return;
    setCheckingAccess(true);
    setError(null);
    try {
      const response = await fetch("/api/meta-beta/access", { cache: "no-store" });
      const result = (await response.json()) as { authenticated?: boolean };
      if (response.ok && result.authenticated) {
        router.push(aiPath);
        return;
      }
    } catch {
      // Fall through to the password dialog.
    } finally {
      setCheckingAccess(false);
    }
    setLoginOpen(true);
  }

  function closeLogin() {
    if (submitting) return;
    setLoginOpen(false);
    setPassword("");
    setError(null);
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/meta-beta/access", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = (await response.json()) as { ok?: boolean; error?: AccessErrorCode };
      if (response.ok && result.ok) {
        setLoginOpen(false);
        setPassword("");
        router.push(aiPath);
        router.refresh();
        return;
      }
      setError(result.error ?? "unknown");
    } catch {
      setError("unknown");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-10 pt-2">
      <motion.section
        initial={{ opacity: 0, filter: "blur(8px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
        className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden border-y border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-16 sm:px-6 lg:py-24"
      >
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.35em] text-[var(--color-primary)]">{copy.eyebrow}</p>
            {language !== "ja" ? <h1 className="mt-5 max-w-4xl font-display text-[clamp(3rem,7vw,6.5rem)] font-bold leading-none tracking-wide text-[var(--color-ink)]">{copy.title}</h1> : null}
            <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--color-muted)] sm:text-lg">{copy.description}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button type="button" onClick={() => router.push(`/${language}/random-pick`)} className="px-7 py-3">{copy.randomCta}</Button>
              <Button type="button" variant="ghost" onClick={() => router.push(`/${language}/pro-pick`)} className="px-7 py-3">{copy.proCta}</Button>
              <Button type="button" variant="ghost" onClick={() => void openAiComposition()} disabled={checkingAccess} className="px-7 py-3">{checkingAccess ? copy.submitting : copy.aiCta}</Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <LandingStat value="5" label={copy.statOne} />
            <LandingStat value="VCT" label={copy.statTwo} />
            <LandingStat value="AI" label={copy.statThree} />
          </div>
        </div>
      </motion.section>

      <section className="relative left-1/2 grid w-screen -translate-x-1/2 overflow-hidden border-y border-[var(--color-line)] md:grid-cols-3">
        <ChoiceCard meta={copy.randomMeta} title={copy.randomTitle} description={copy.randomDescription} action={copy.select} accent="var(--color-primary)" delay={0} onClick={() => router.push(`/${language}/random-pick`)} />
        <ChoiceCard meta={copy.proMeta} title={copy.proTitle} description={copy.proDescription} action={copy.select} accent="var(--color-sentinel)" delay={0.06} onClick={() => router.push(`/${language}/pro-pick`)} />
        <ChoiceCard meta={copy.aiMeta} title={copy.aiTitle} description={copy.aiDescription} action={checkingAccess ? copy.submitting : copy.select} note={copy.aiLocked} accent="var(--color-initiator)" delay={0.12} disabled={checkingAccess} onClick={() => void openAiComposition()} />
      </section>

      <section className="clip-frame border border-[var(--color-line)] bg-[var(--color-surface)] p-6 sm:p-8">
        <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-[var(--color-primary)]">SELECT YOUR MODE</p>
        <h2 className="mt-3 font-display text-2xl font-bold text-[var(--color-ink)] sm:text-3xl">{copy.howTitle}</h2>
        <p className="mt-4 max-w-4xl text-sm leading-7 text-[var(--color-muted)]">{copy.howBody}</p>
      </section>

      <AnimatePresence>
        {loginOpen ? (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => { if (event.target === event.currentTarget) closeLogin(); }}
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="ai-login-title"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              className="clip-frame w-full max-w-md border border-[var(--color-line)] bg-[var(--color-surface)] p-6 shadow-2xl sm:p-8"
            >
              <p className="font-display text-xs font-bold uppercase tracking-[0.28em] text-[var(--color-initiator)]">{copy.loginEyebrow}</p>
              <h2 id="ai-login-title" className="mt-3 font-display text-3xl font-bold text-[var(--color-ink)]">{copy.loginTitle}</h2>
              <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">{copy.loginBody}</p>
              {errorMessage(copy, error) ? <p className="mt-5 border border-[var(--color-primary)]/60 bg-[var(--color-primary)]/10 px-4 py-3 text-sm" role="alert">{errorMessage(copy, error)}</p> : null}
              <form onSubmit={submitLogin} className="mt-6">
                <label htmlFor="home-ai-password" className="text-sm font-semibold text-[var(--color-ink)]">{copy.password}</label>
                <input id="home-ai-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoFocus autoComplete="current-password" placeholder={copy.placeholder} className="mt-2 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-deep)] px-4 py-3 text-base outline-none transition focus:border-[var(--color-initiator)]" />
                <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button type="button" variant="ghost" onClick={closeLogin} disabled={submitting} className="px-5 py-3">{copy.cancel}</Button>
                  <Button type="submit" disabled={submitting || !password} className="px-5 py-3">{submitting ? copy.submitting : copy.submit}</Button>
                </div>
              </form>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function LandingStat({ value, label }: { value: string; label: string }) {
  return <div className="clip-frame border border-[var(--color-line)] bg-[var(--color-surface-2)] p-5"><p className="font-display text-4xl font-bold text-[var(--color-primary)]">{value}</p><p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{label}</p></div>;
}

function ChoiceCard({ meta, title, description, action, note, accent, delay, disabled = false, onClick }: { meta: string; title: string; description: string; action: string; note?: string; accent: string; delay: number; disabled?: boolean; onClick: () => void }) {
  return (
    <motion.button type="button" disabled={disabled} onClick={onClick} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.52, delay, ease: [0.16, 1, 0.3, 1] }} whileHover={disabled ? undefined : { y: -4 }} whileTap={disabled ? undefined : { scale: 0.99 }} className="group relative flex min-h-[24rem] overflow-hidden border-b border-[var(--color-line)] bg-[var(--color-surface)] px-7 py-9 text-left transition-colors hover:bg-[var(--color-surface-2)] disabled:cursor-wait disabled:opacity-70 md:min-h-[31rem] md:border-b-0 md:border-r md:px-9 lg:px-12 last:md:border-r-0">
      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: `linear-gradient(145deg, ${accent}, transparent 32%)` }} />
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} />
      <div className="relative flex w-full flex-col justify-between gap-10 self-stretch">
        <div className="pt-5 md:pt-8">
          <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-[var(--color-muted)]">{meta}</p>
          <h2 className="mt-5 break-words font-display text-[clamp(2.8rem,4.2vw,5.2rem)] font-bold leading-none tracking-wide text-[var(--color-ink)]">{title}</h2>
          <p className="mt-6 text-sm leading-7 text-[var(--color-muted)] sm:text-base">{description}</p>
          {note ? <span className="mt-5 inline-flex border border-[var(--color-line)] bg-black/20 px-3 py-1.5 text-xs font-semibold text-[var(--color-muted)]">🔒 {note}</span> : null}
        </div>
        <div className="flex items-center justify-between gap-3 pb-2"><span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">{action}</span><span className="flex h-12 w-12 items-center justify-center border border-[var(--color-line)] text-2xl transition-transform group-hover:translate-x-1" style={{ color: accent }} aria-hidden="true">→</span></div>
      </div>
    </motion.button>
  );
}