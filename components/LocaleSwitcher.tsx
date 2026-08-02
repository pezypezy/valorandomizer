"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import clsx from "clsx";

export function LocaleSwitcher() {
  const t = useTranslations("locale");
  const active = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    <div
      role="group"
      className="clip-btn flex items-center gap-px border border-[var(--color-line)] bg-[var(--color-surface)] p-px"
      aria-label={t("switch")}
    >
      {routing.locales.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          aria-pressed={locale === active}
          disabled={isPending}
          onClick={() => {
            if (locale === active) return;
            const href = `${pathname}${window.location.search}`;
            startTransition(() => router.replace(href, { locale }));
          }}
          className={clsx(
            "px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
            locale === active
              ? "bg-[var(--color-primary)] text-white"
              : "text-[var(--color-muted)] hover:text-[var(--color-ink)]",
          )}
        >
          {t(locale)}
        </button>
      ))}
    </div>
  );
}
