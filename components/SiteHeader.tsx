import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./LocaleSwitcher";

export function SiteHeader() {
  const t = useTranslations();
  return (
    <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
      <Link href="/" className="flex items-baseline gap-3">
        <span
          className="font-display-en text-glitch text-2xl font-bold text-[var(--color-primary)] sm:text-3xl"
          style={{ textShadow: "0 0 18px rgba(255,70,85,0.45)" }}
        >
          {t("app.title")}
        </span>
        <span className="font-ui-ja hidden text-xs uppercase tracking-[0.3em] text-[var(--color-muted)] sm:inline">
          {t("app.tagline")}
        </span>
      </Link>
      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
        <nav className="font-display-en hidden items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] md:flex">
          <Link href="/random-pick" className="transition-colors hover:text-[var(--color-ink)]">
            Random
          </Link>
          <span className="text-[var(--color-line)]">/</span>
          <Link href="/pro-pick" className="transition-colors hover:text-[var(--color-ink)]">
            Pro
          </Link>
          <span className="text-[var(--color-line)]">/</span>
          <Link href="/legal" className="transition-colors hover:text-[var(--color-ink)]">
            Legal
          </Link>
        </nav>
        <LocaleSwitcher />
      </div>
    </header>
  );
}
