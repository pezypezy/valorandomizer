"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "./ui/Button";

export function TeamBuilderHome({ locale }: { locale: string }) {
  const [shareUrl, setShareUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function createRoom() {
    setBusy(true);
    setCopied(false);
    try {
      const response = await fetch("/api/team-rooms", { method: "POST" });
      if (!response.ok) throw new Error("Failed to create room");
      const room = (await response.json()) as { id: string };
      setShareUrl(`${window.location.origin}/${locale}/team-builder/${room.id}`);
    } finally {
      setBusy(false);
    }
  }

  async function copyUrl() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
  }

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6 pt-10">
      <Link
        href="/"
        className="w-fit border border-[var(--color-line)] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
      >
        戻る
      </Link>

      <div className="border border-[var(--color-line)] bg-[var(--color-surface)] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
          Team Builder
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold text-[var(--color-ink)]">
          チーム分け用URLを発行
        </h1>
        <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">
          URLを作成してメンバーに配布してください。各ユーザーが名前とランクを入力すると、
          ランクスコアをもとに2チームへ分けられます。
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button onClick={createRoom} disabled={busy} className="px-6 py-3">
            {busy ? "発行中..." : "URLを発行"}
          </Button>
          {shareUrl && (
            <Button variant="ghost" onClick={copyUrl} className="px-6 py-3">
              {copied ? "コピー済み" : "URLをコピー"}
            </Button>
          )}
        </div>

        {shareUrl && (
          <div className="mt-6 border border-[var(--color-line)] bg-[var(--color-bg-deep)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Share URL
            </p>
            <a
              href={shareUrl}
              className="mt-2 block break-all text-sm font-semibold text-[var(--color-ink)] underline decoration-[var(--color-primary)] underline-offset-4"
            >
              {shareUrl}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
