import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function ModeSelection() {
  const t = useTranslations();

  return (
    <section className="relative left-1/2 -mt-2 grid min-h-[calc(100vh-5.5rem)] w-screen -translate-x-1/2 overflow-hidden border-y border-[var(--color-line)] md:grid-cols-2">
      <h1 className="sr-only">
        {t("app.title")} — {t("app.tagline")}
      </h1>
      <ModeLink
        title={t("mode.randomTitle")}
        description={t("mode.randomDescription")}
        meta={t("mode.randomMeta")}
        selectLabel={t("mode.select")}
        accent="var(--color-primary)"
        direction="left"
        href="/random"
      />
      <ModeLink
        title={t("mode.proTitle")}
        description={t("mode.proDescription")}
        meta={t("mode.proMeta")}
        selectLabel={t("mode.select")}
        accent="var(--color-sentinel)"
        direction="right"
        href="/pro"
      />
    </section>
  );
}

function ModeLink({
  title,
  description,
  meta,
  selectLabel,
  accent,
  direction,
  href,
}: {
  title: string;
  description: string;
  meta: string;
  selectLabel: string;
  accent: string;
  direction: "left" | "right";
  href: "/random" | "/pro";
}) {
  return (
    <Link
      href={href}
      className="group relative flex min-h-[48vh] overflow-hidden border-b border-[var(--color-line)] bg-[var(--color-surface)] px-8 py-10 text-left transition-[background-color,transform] hover:bg-[var(--color-surface-2)] active:scale-[0.99] sm:px-12 md:min-h-full md:border-b-0 md:border-r md:px-14 lg:px-20 last:md:border-r-0"
    >
      <div
        className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `linear-gradient(135deg, ${accent}, transparent 34%)` }}
      />
      <div
        className="absolute inset-x-0 top-0 h-1 md:inset-y-0 md:inset-x-auto md:h-auto md:w-1"
        style={{ background: accent, [direction === "left" ? "right" : "left"]: 0 }}
      />
      <div className="relative flex w-full flex-col justify-between gap-10 self-stretch">
        <div className="max-w-2xl pt-[8vh] md:pt-[10vh]">
          <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-[var(--color-muted)] sm:text-sm">
            {meta}
          </p>
          <h2 className="mt-5 font-display text-[clamp(3.5rem,5.6vw,7rem)] font-bold leading-none tracking-wide text-[var(--color-ink)]">
            {title}
          </h2>
          <p className="mt-6 max-w-xl text-sm leading-7 text-[var(--color-muted)] sm:text-base">
            {description}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 pb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            {selectLabel}
          </span>
          <span
            className="flex h-12 w-12 items-center justify-center border border-[var(--color-line)] text-2xl transition-transform group-hover:translate-x-1"
            style={{ color: accent }}
            aria-hidden="true"
          >
            →
          </span>
        </div>
      </div>
    </Link>
  );
}
