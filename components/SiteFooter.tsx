import { useTranslations } from "next-intl";

export function SiteFooter({ locale }: { locale: string }) {
  const t = useTranslations("legalNotice");

  return (
    <footer className="relative z-10 border-t border-[var(--color-line)] bg-[var(--color-bg-deep)] px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 text-xs leading-6 text-[var(--color-muted)] md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <p className="font-display font-bold uppercase tracking-[0.2em] text-[var(--color-ink)]">
            {t("heading")}
          </p>
          <p className="mt-2">{t("body")}</p>
        </div>
        <a
          href={`/${locale}/legal`}
          className="w-fit border border-[var(--color-line)] px-3 py-1.5 font-semibold uppercase tracking-wider text-[var(--color-ink)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
        >
          {t("link")}
        </a>
      </div>
    </footer>
  );
}
