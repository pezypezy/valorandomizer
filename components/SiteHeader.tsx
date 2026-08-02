import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./LocaleSwitcher";

export function SiteHeader() {
  const t = useTranslations("app");
  return (
    <header className="mx-auto flex w-full max-w-6xl flex-col items-stretch gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-5">
      <div className="flex min-w-0 items-baseline gap-3">
        <Link
          href="/"
          className="font-display text-glitch text-2xl font-bold text-[var(--color-primary)] sm:text-3xl"
          style={{ textShadow: "0 0 18px rgba(255,70,85,0.45)" }}
        >
          {t("title")}
        </Link>
        <span className="hidden text-xs uppercase tracking-[0.3em] text-[var(--color-muted)] sm:inline">
          {t("tagline")}
        </span>
      </div>
      <div className="flex justify-end">
        <LocaleSwitcher />
      </div>
    </header>
  );
}
