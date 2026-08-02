import { setRequestLocale } from "next-intl/server";
import { ModeSelection } from "@/components/ModeSelection";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ModeSelection />;
}
