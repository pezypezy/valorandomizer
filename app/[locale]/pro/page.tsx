import { setRequestLocale } from "next-intl/server";
import { BackLink } from "@/components/BackLink";
import { ProPickPicker } from "@/components/ProPickPicker";

export default async function ProPage({ params }: PageProps<"/[locale]/pro">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex flex-col gap-10 pt-2">
      <BackLink />
      <ProPickPicker />
    </div>
  );
}
