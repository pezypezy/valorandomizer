import { setRequestLocale } from "next-intl/server";
import { TeamBuilderHome } from "@/components/TeamBuilderHome";

export default async function TeamBuilderPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <TeamBuilderHome locale={locale} />;
}
