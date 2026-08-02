import { setRequestLocale } from "next-intl/server";
import { BackLink } from "@/components/BackLink";
import { Picker } from "@/components/Picker";

export default async function RandomPage({ params }: PageProps<"/[locale]/random">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex flex-col gap-10 pt-2">
      <BackLink />
      <Picker />
    </div>
  );
}
