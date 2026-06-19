import { setRequestLocale } from "next-intl/server";
import { Picker } from "@/components/Picker";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Picker />;
}
