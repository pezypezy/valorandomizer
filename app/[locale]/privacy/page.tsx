import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function PrivacyPage({
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
          プライバシーポリシー
        </h1>
        <div className="mt-5 flex flex-col gap-4 text-sm leading-7 text-[var(--color-muted)]">
          <p>
            このツールはアカウント登録を必要とせず、氏名、メールアドレス、
            住所などの個人情報を収集しません。
          </p>
          <p>
            Pro Pick モードの対戦記録は、お使いのブラウザのローカルストレージにのみ保存されます。
            このアプリからサーバーへ送信されることはありません。
          </p>
          <p>
            エージェント画像などの公開ゲームアセットは、ピック結果を表示する目的でのみ使用します。
            それらの権利は各権利者に帰属します。
          </p>
        </div>
      </div>
    </section>
  );
}
