import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "./LocaleSwitcher";

export function SiteHeader() {
  const t = useTranslations("app");
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
      <div className="flex items-baseline gap-3">
        <span
          className="font-display text-glitch text-2xl font-bold text-[var(--color-primary)] sm:text-3xl"
          style={{ textShadow: "0 0 18px rgba(255,70,85,0.45)" }}
        >
          {t("title")}
        </span>
        <span className="hidden text-xs uppercase tracking-[0.3em] text-[var(--color-muted)] sm:inline">
          {t("tagline")}
        </span>
      </div>
      <LocaleSwitcher />
    </header>
  );
}
