import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isMetaBetaAuthenticated } from "@/lib/meta-beta/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Private Beta Login | Valorandomizer",
  robots: { index: false, follow: false },
};

const COPY = {
  ja: {
    eyebrow: "PRIVATE BETA ACCESS",
    title: "限定テストにログイン",
    body: "VALORANT仲間向けのランク構成統計・AI相談ベータです。グループで共有されたパスワードを入力してください。",
    password: "共有パスワード",
    placeholder: "パスワードを入力",
    submit: "ログイン",
    invalid: "パスワードが違います。グループ内で共有された文字列を確認してください。",
    rateLimit: "短時間にログインを試しすぎています。1分ほど待ってから再試行してください。",
    configuration: "認証用Secretが未設定です。Cloudflare側でMETA_BETA_PASSWORDとMETA_BETA_AUTH_SECRETを設定してください。",
    note: "ログイン状態はこのブラウザで7日間維持されます。パスワードはURLやフロントコードには保存されません。",
    privacy: "ベータ版のデータ・プライバシー説明を確認",
  },
  en: {
    eyebrow: "PRIVATE BETA ACCESS",
    title: "Sign in to the private beta",
    body: "This is the private ranked-composition statistics and AI advice beta for the VALORANT group. Enter the shared password.",
    password: "Shared password",
    placeholder: "Enter password",
    submit: "Sign in",
    invalid: "That password is incorrect. Check the value shared with the group.",
    rateLimit: "Too many login attempts. Wait about a minute before trying again.",
    configuration: "Authentication secrets are missing. Configure META_BETA_PASSWORD and META_BETA_AUTH_SECRET in Cloudflare.",
    note: "The session lasts seven days in this browser. The password is never stored in the URL or client code.",
    privacy: "Review the beta data and privacy notice",
  },
  ko: {
    eyebrow: "PRIVATE BETA ACCESS",
    title: "비공개 베타 로그인",
    body: "VALORANT 그룹용 랭크 조합 통계・AI 상담 베타입니다. 그룹에서 공유한 비밀번호를 입력해 주세요.",
    password: "공유 비밀번호",
    placeholder: "비밀번호 입력",
    submit: "로그인",
    invalid: "비밀번호가 올바르지 않습니다. 그룹에서 공유한 값을 확인해 주세요.",
    rateLimit: "짧은 시간에 로그인을 너무 많이 시도했습니다. 약 1분 후 다시 시도해 주세요.",
    configuration: "인증 Secret이 설정되지 않았습니다. Cloudflare에서 META_BETA_PASSWORD와 META_BETA_AUTH_SECRET을 설정해 주세요.",
    note: "로그인 상태는 이 브라우저에서 7일간 유지됩니다. 비밀번호는 URL이나 클라이언트 코드에 저장되지 않습니다.",
    privacy: "베타 데이터 및 개인정보 안내 확인",
  },
} as const;

export default async function MetaBetaLoginPage({
  params,
  searchParams,
}: PageProps<"/[locale]/meta-beta/login">) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);

  if (await isMetaBetaAuthenticated()) {
    redirect(`/${locale}/meta-beta`);
  }

  const language = locale === "en" || locale === "ko" ? locale : "ja";
  const copy = COPY[language];
  const error = typeof query.error === "string" ? query.error : null;
  const errorMessage =
    error === "configuration"
      ? copy.configuration
      : error === "rate-limit"
        ? copy.rateLimit
        : copy.invalid;

  return (
    <div className="mx-auto flex min-h-[68vh] max-w-xl items-center py-10">
      <section className="clip-frame w-full border border-[var(--color-line)] bg-[var(--color-surface)]/90 p-6 sm:p-9">
        <p className="font-display-en text-xs font-bold tracking-[0.25em] text-[var(--color-primary)]">{copy.eyebrow}</p>
        <h1 className="font-ui-ja mt-3 text-3xl font-bold">{copy.title}</h1>
        <p className="mt-4 leading-7 text-[var(--color-muted)]">{copy.body}</p>

        {error ? (
          <p className="mt-5 rounded-lg border border-[var(--color-primary)]/50 bg-[var(--color-primary)]/10 px-4 py-3 text-sm">
            {errorMessage}
          </p>
        ) : null}

        <form action="/api/meta-beta/login" method="post" className="mt-7">
          <input type="hidden" name="returnTo" value={`/${language}/meta-beta`} />
          <label htmlFor="meta-beta-password" className="text-sm font-semibold">{copy.password}</label>
          <input
            id="meta-beta-password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder={copy.placeholder}
            className="mt-2 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-deep)] px-4 py-3 text-base outline-none focus:border-[var(--color-primary)]"
          />
          <button
            type="submit"
            className="clip-btn mt-4 w-full bg-[var(--color-primary)] px-5 py-3 font-bold text-white transition hover:bg-[var(--color-primary-soft)]"
          >
            {copy.submit}
          </button>
        </form>

        <p className="mt-5 text-xs leading-5 text-[var(--color-muted)]">{copy.note}</p>
        <Link href="/meta-beta/privacy" className="mt-3 inline-block text-xs font-semibold text-[var(--color-primary)] hover:underline">
          {copy.privacy}
        </Link>
      </section>
    </div>
  );
}
