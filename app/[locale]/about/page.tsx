import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6 pt-10">
      <Link
        href="/"
        className="w-fit border border-[var(--color-line)] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
      >
        戻る
      </Link>
      <div className="border border-[var(--color-line)] bg-[var(--color-surface)] p-6 sm:p-8">
        <h1 className="font-display text-3xl font-bold text-[var(--color-ink)]">
          このツールについて
        </h1>
        <div className="mt-5 flex flex-col gap-4 text-sm leading-7 text-[var(--color-muted)]">
          <p>
            Valorandomizer は、VALORANT のエージェント構成をすばやく決めるためのツールです。
            ロール構成を指定してランダムにチームを作成したり、過去のプロチーム構成から
            カスタムゲーム用のピックを選んだりできます。
          </p>
          <p>
            エージェント名、ポートレート、ロール情報は、ピック結果を表示する目的でのみ使用しています。
            フレンドとのカスタムゲームや練習の構成決めに使ってください。
          </p>
        </div>
      </div>
    </section>
  );
}
