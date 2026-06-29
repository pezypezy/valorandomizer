"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  VALORANT_RANKS,
  generateBalancedTeamCandidates,
  getRankLabel,
  getRankScore,
  type BalancedTeams,
  type RankValue,
  type TeamParticipant,
} from "@/lib/team-balancer";
import { Link } from "@/i18n/navigation";
import { Button } from "./ui/Button";

type TeamRoom = {
  id: string;
  createdAt: string;
  participants: TeamParticipant[];
};

export function TeamRoomView({
  initialRoom,
  locale,
  roomId,
}: {
  initialRoom: TeamRoom | null;
  locale: string;
  roomId: string;
}) {
  const [room, setRoom] = useState<TeamRoom | null>(initialRoom);
  const [name, setName] = useState("");
  const [rank, setRank] = useState<RankValue>("silver1");
  const [selectedCandidate, setSelectedCandidate] = useState(0);
  const [status, setStatus] = useState<"idle" | "saving" | "deleting" | "error">(initialRoom ? "idle" : "error");
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window === "undefined" ? "" : `${window.location.origin}/${locale}/team-builder/${roomId}`;
  const candidates = useMemo(
    () => generateBalancedTeamCandidates(room?.participants ?? [], 3),
    [room],
  );
  const currentCandidate = candidates[Math.min(selectedCandidate, candidates.length - 1)] ?? candidates[0];

  async function loadRoom() {
    try {
      const response = await fetch(`/api/team-rooms/${roomId}`);
      if (!response.ok) throw new Error("Room not found");
      setRoom((await response.json()) as TeamRoom);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    const timer = window.setInterval(() => void loadRoom(), 4000);
    return () => window.clearInterval(timer);
    // roomId is stable for this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    try {
      const response = await fetch(`/api/team-rooms/${roomId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, rank }),
      });
      if (!response.ok) throw new Error("Failed to save participant");
      setName("");
      await loadRoom();
    } catch {
      setStatus("error");
    }
  }

  async function deleteParticipant(participantId: string) {
    setStatus("deleting");
    try {
      const response = await fetch(`/api/team-rooms/${roomId}/participants/${participantId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete participant");
      await loadRoom();
    } catch {
      setStatus("error");
    }
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
  }

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-6 pt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/team-builder"
          className="border border-[var(--color-line)] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
        >
          戻る
        </Link>
        <Button variant="ghost" onClick={copyUrl} className="px-4">
          {copied ? "URLコピー済み" : "URLをコピー"}
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
            Room {roomId}
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold text-[var(--color-ink)]">
            名前とランクを入力
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">
            基本はこのURLを参加者に配布して、各自に名前とランクを入力してもらいます。
            ホストがまとめて全員分を入力する場合も、このフォームを続けて使えます。
          </p>

          <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                Player name
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={24}
                required
                className="border border-[var(--color-line)] bg-[var(--color-bg-deep)] px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-primary)]"
                placeholder="名前"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                Rank
              </span>
              <select
                value={rank}
                onChange={(event) => setRank(event.target.value as RankValue)}
                className="border border-[var(--color-line)] bg-[var(--color-bg-deep)] px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-primary)]"
              >
                {VALORANT_RANKS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <Button type="submit" disabled={status === "saving" || name.trim().length === 0} className="py-3">
              {status === "saving" ? "登録中..." : "登録する"}
            </Button>
          </form>

          {status === "error" && (
            <p className="mt-4 border border-[var(--color-primary)] px-4 py-3 text-sm text-[var(--color-primary-soft)]">
              ルームの読み込み、または操作に失敗しました。
            </p>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <ParticipantList
            deleting={status === "deleting"}
            onDelete={deleteParticipant}
            participants={room?.participants ?? []}
          />
          <CandidateTabs
            candidates={candidates}
            selectedCandidate={selectedCandidate}
            onSelect={setSelectedCandidate}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <TeamPanel title="Team A" participants={currentCandidate.teamA} score={currentCandidate.teamAScore} />
            <TeamPanel title="Team B" participants={currentCandidate.teamB} score={currentCandidate.teamBScore} />
          </div>
          <div className="border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-muted)]">
            選択中のスコア差:{" "}
            <span className="font-bold text-[var(--color-ink)]">{currentCandidate.scoreDiff}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function CandidateTabs({
  candidates,
  selectedCandidate,
  onSelect,
}: {
  candidates: BalancedTeams[];
  selectedCandidate: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-[var(--color-ink)]">チーム分け候補</h2>
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          up to 3
        </span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {candidates.map((candidate, index) => (
          <button
            key={`${candidate.teamAScore}-${candidate.teamBScore}-${index}`}
            type="button"
            onClick={() => onSelect(index)}
            className={
              index === selectedCandidate
                ? "border border-[var(--color-primary)] bg-[var(--color-bg-deep)] px-3 py-2 text-left text-sm text-[var(--color-ink)]"
                : "border border-[var(--color-line)] bg-[var(--color-bg-deep)] px-3 py-2 text-left text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
            }
          >
            <span className="block font-semibold">候補 {index + 1}</span>
            <span className="mt-1 block text-xs">
              {candidate.teamAScore} - {candidate.teamBScore} / 差 {candidate.scoreDiff}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ParticipantList({
  deleting,
  onDelete,
  participants,
}: {
  deleting: boolean;
  onDelete: (participantId: string) => void;
  participants: TeamParticipant[];
}) {
  return (
    <div className="border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-[var(--color-ink)]">参加者</h2>
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          {participants.length} players
        </span>
      </div>
      <div className="mt-4 grid gap-2">
        {participants.length > 0 ? (
          participants.map((participant) => (
            <div
              key={participant.id}
              className="flex items-center justify-between gap-3 border border-[var(--color-line)] bg-[var(--color-bg-deep)] px-3 py-2 text-sm"
            >
              <div>
                <p className="font-semibold text-[var(--color-ink)]">{participant.name}</p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  {getRankLabel(participant.rank)} / {getRankScore(participant.rank)}
                </p>
              </div>
              <button
                type="button"
                disabled={deleting}
                onClick={() => onDelete(participant.id)}
                className="shrink-0 border border-[var(--color-line)] px-2 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                削除
              </button>
            </div>
          ))
        ) : (
          <p className="border border-dashed border-[var(--color-line)] px-4 py-8 text-center text-sm text-[var(--color-muted)]">
            まだ参加者がいません。
          </p>
        )}
      </div>
    </div>
  );
}

function TeamPanel({
  title,
  participants,
  score,
}: {
  title: string;
  participants: TeamParticipant[];
  score: number;
}) {
  return (
    <div className="border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-[var(--color-ink)]">{title}</h2>
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          score {score}
        </span>
      </div>
      <div className="mt-4 grid gap-2">
        {participants.length > 0 ? (
          participants.map((participant) => (
            <div
              key={participant.id}
              className="border border-[var(--color-line)] bg-[var(--color-bg-deep)] px-3 py-2"
            >
              <p className="text-sm font-semibold text-[var(--color-ink)]">{participant.name}</p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">{getRankLabel(participant.rank)}</p>
            </div>
          ))
        ) : (
          <p className="border border-dashed border-[var(--color-line)] px-4 py-8 text-center text-sm text-[var(--color-muted)]">
            人数が増えるとここに表示されます。
          </p>
        )}
      </div>
    </div>
  );
}
