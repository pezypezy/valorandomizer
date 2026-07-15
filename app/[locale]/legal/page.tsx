import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
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

export async function generateMetadata({ params }: PageProps<"/[locale]/legal">) {
  const { locale } = await params;
  const meta = META[locale as keyof typeof META] ?? META.en;
  return buildLocalizedMetadata(locale, { ...meta, path: "legal" });
}

export default async function LegalPage({ params }: PageProps<"/[locale]/legal">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalContent />;
}

function LegalContent() {
  const t = useTranslations("legalPage");

  return (
    <article className="mx-auto flex max-w-4xl flex-col gap-6 py-8">
      <section className="clip-frame border border-[var(--color-line)] bg-[var(--color-surface)] p-6 sm:p-8">
        <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-[var(--color-primary)]">
          {t("eyebrow")}
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold text-[var(--color-ink)] sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-5 text-sm leading-7 text-[var(--color-muted)]">
          {t("intro")}
        </p>
      </section>

      <LegalSection title={t("fanTitle")} body={t("fanBody")} />
      <LegalSection title={t("ipTitle")} body={t("ipBody")} />
      <LegalSection title={t("dataTitle")} body={t("dataBody")} />
      <LegalSection title={t("privacyTitle")} body={t("privacyBody")} />
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
