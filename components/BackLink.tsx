import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function BackLink() {
  const t = useTranslations("mode");

  return (
    <div className="flex justify-start">
      <Link
        href="/"
        className="clip-btn inline-flex items-center justify-center border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-semibold uppercase tracking-wider text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-2)]"
      >
        {t("back")}
      </Link>
    </div>
  );
}
