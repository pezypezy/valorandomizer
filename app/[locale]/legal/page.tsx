import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildLocalizedMetadata } from "@/lib/seo";

const META = {
  ja: {
    title: "Legal / Fan Project Notice | Valorandomizer",
    description: "ValorandomizerのRiot Games非公式ファンプロジェクト表記、権利表記、免責、プライバシーに関する説明。",
  },
  en: {
    title: "Legal / Fan Project Notice | Valorandomizer",
    description: "Fan project notice, Riot Games IP disclaimer, privacy notes, and legal information for Valorandomizer.",
  },
  ko: {
    title: "Legal / Fan Project Notice | Valorandomizer",
    description: "Valorandomizer의 Riot Games 비공식 팬 프로젝트 고지, 권리 표기, 면책, 개인정보 관련 안내입니다.",
  },
} as const;

const BETA_PRIVACY = {
  ja: {
    title: "限定ランク統計ベータについて",
    body: "共有パスワード、AI相談、同意済みアカウントの試合履歴を扱う限定ベータには、通常機能とは別のデータ取扱い説明があります。参加前に内容を確認してください。",
    link: "ベータ版プライバシー説明を見る",
  },
  en: {
    title: "Private ranked-meta beta",
    body: "The password-protected beta uses AI advice and official match histories from consented accounts. It has a separate data-handling notice that participants should review before joining.",
    link: "Read the beta privacy notice",
  },
  ko: {
    title: "비공개 랭크 통계 베타",
    body: "공유 비밀번호, AI 상담, 동의한 계정의 공식 경기 기록을 사용하는 비공개 베타에는 별도의 데이터 처리 안내가 있습니다. 참여 전에 확인해 주세요.",
    link: "베타 개인정보 안내 보기",
  },
} as const;

export async function generateMetadata({ params }: PageProps<"/[locale]/legal">) {
  const { locale } = await params;
  const meta = META[locale as keyof typeof META] ?? META.en;
  return buildLocalizedMetadata(locale, { ...meta, path: "legal" });
}

export default async function LegalPage({ params }: PageProps<"/[locale]/legal">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const language = locale === "ja" || locale === "ko" ? locale : "en";
  return <LegalContent locale={language} />;
}

function LegalContent({ locale }: { locale: "ja" | "en" | "ko" }) {
  const t = useTranslations("legalPage");
  const beta = BETA_PRIVACY[locale];

  return (
    <article className="mx-auto flex max-w-4xl flex-col gap-6 py-8">
      <section className="clip-frame border border-[var(--color-line)] bg-[var(--color-surface)] p-6 sm:p-8">
        <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-[var(--color-primary)]">
          {t("eyebrow")}
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold text-[var(--color-ink)] sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-5 text-sm leading-7 text-[var(--color-muted)]">{t("intro")}</p>
      </section>

      <LegalSection title={t("fanTitle")} body={t("fanBody")} />
      <LegalSection title={t("ipTitle")} body={t("ipBody")} />
      <LegalSection title={t("dataTitle")} body={t("dataBody")} />
      <LegalSection title={t("privacyTitle")} body={t("privacyBody")} />

      <section className="clip-card border border-[var(--color-primary)]/40 bg-[var(--color-surface)] p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">{beta.title}</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">{beta.body}</p>
        <Link href="/meta-beta/privacy" className="mt-4 inline-block text-sm font-semibold text-[var(--color-primary)] hover:underline">
          {beta.link} →
        </Link>
      </section>

      <LegalSection title={t("accuracyTitle")} body={t("accuracyBody")} />

      <section className="border border-[var(--color-line)] bg-[var(--color-surface)] p-5 text-xs leading-6 text-[var(--color-muted)]">
        <p>{t("officialNotice")}</p>
        <p className="mt-3">{t("contact")}</p>
      </section>
    </article>
  );
}

function LegalSection({ title, body }: { title: string; body: string }) {
  return (
    <section className="clip-card border border-[var(--color-line)] bg-[var(--color-surface)] p-5 sm:p-6">
      <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">{body}</p>
    </section>
  );
}
