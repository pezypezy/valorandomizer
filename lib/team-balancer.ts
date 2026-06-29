export const VALORANT_RANKS = [
  { value: "iron1", label: "アイアン 1", score: 1 },
  { value: "iron2", label: "アイアン 2", score: 2 },
  { value: "iron3", label: "アイアン 3", score: 3 },
  { value: "bronze1", label: "ブロンズ 1", score: 4 },
  { value: "bronze2", label: "ブロンズ 2", score: 5 },
  { value: "bronze3", label: "ブロンズ 3", score: 6 },
  { value: "silver1", label: "シルバー 1", score: 7 },
  { value: "silver2", label: "シルバー 2", score: 8 },
  { value: "silver3", label: "シルバー 3", score: 9 },
  { value: "gold1", label: "ゴールド 1", score: 10 },
  { value: "gold2", label: "ゴールド 2", score: 11 },
  { value: "gold3", label: "ゴールド 3", score: 12 },
  { value: "platinum1", label: "プラチナ 1", score: 13 },
  { value: "platinum2", label: "プラチナ 2", score: 14 },
  { value: "platinum3", label: "プラチナ 3", score: 15 },
  { value: "diamond1", label: "ダイヤ 1", score: 16 },
  { value: "diamond2", label: "ダイヤ 2", score: 17 },
  { value: "diamond3", label: "ダイヤ 3", score: 18 },
  { value: "ascendant1", label: "アセンダント 1", score: 19 },
  { value: "ascendant2", label: "アセンダント 2", score: 20 },
  { value: "ascendant3", label: "アセンダント 3", score: 21 },
  { value: "immortal1", label: "イモータル 1", score: 22 },
  { value: "immortal2", label: "イモータル 2", score: 23 },
  { value: "immortal3", label: "イモータル 3", score: 24 },
  { value: "radiant", label: "レディアント", score: 25 },
] as const;

export type RankValue = (typeof VALORANT_RANKS)[number]["value"];

export type TeamParticipant = {
  id: string;
  name: string;
  rank: RankValue;
  joinedAt: string;
};

export type BalancedTeams = {
  teamA: TeamParticipant[];
  teamB: TeamParticipant[];
  teamAScore: number;
  teamBScore: number;
  scoreDiff: number;
};

const rankScore = new Map(VALORANT_RANKS.map((rank) => [rank.value, rank.score]));

export function getRankLabel(rank: RankValue) {
  return VALORANT_RANKS.find((item) => item.value === rank)?.label ?? rank;
}

export function getRankScore(rank: RankValue) {
  return rankScore.get(rank) ?? 0;
}

export function isRankValue(value: string): value is RankValue {
  return rankScore.has(value as RankValue);
}

export function balanceTeams(participants: TeamParticipant[]): BalancedTeams {
  return generateBalancedTeamCandidates(participants, 1)[0] ?? emptyTeams();
}

export function generateBalancedTeamCandidates(
  participants: TeamParticipant[],
  maxCandidates = 3,
): BalancedTeams[] {
  if (participants.length === 0) return [emptyTeams()];

  const sorted = [...participants].sort((a, b) => {
    const byScore = getRankScore(b.rank) - getRankScore(a.rank);
    return byScore !== 0 ? byScore : a.name.localeCompare(b.name);
  });
  const teamSizes = [...new Set([Math.floor(sorted.length / 2), Math.ceil(sorted.length / 2)])];
  const seen = new Set<string>();
  const candidates: BalancedTeams[] = [];

  for (const size of teamSizes) {
    for (const indexes of combinations(sorted.length, size)) {
      const selected = new Set(indexes);
      const teamA = sorted.filter((_, index) => selected.has(index));
      const teamB = sorted.filter((_, index) => !selected.has(index));
      const key = normalizedPartitionKey(teamA, teamB);
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(makeBalancedTeams(teamA, teamB));
    }
  }

  return candidates
    .sort((a, b) => {
      const byDiff = a.scoreDiff - b.scoreDiff;
      if (byDiff !== 0) return byDiff;
      const bySize = Math.abs(a.teamA.length - a.teamB.length) - Math.abs(b.teamA.length - b.teamB.length);
      if (bySize !== 0) return bySize;
      return Math.abs(a.teamAScore - a.teamBScore) - Math.abs(b.teamAScore - b.teamBScore);
    })
    .slice(0, maxCandidates);
}

function combinations(length: number, size: number) {
  const result: number[][] = [];
  const current: number[] = [];

  function walk(start: number) {
    if (current.length === size) {
      result.push([...current]);
      return;
    }

    const remaining = size - current.length;
    for (let index = start; index <= length - remaining; index++) {
      current.push(index);
      walk(index + 1);
      current.pop();
    }
  }

  walk(0);
  return result;
}

function makeBalancedTeams(teamA: TeamParticipant[], teamB: TeamParticipant[]): BalancedTeams {
  const teamAScore = sumScore(teamA);
  const teamBScore = sumScore(teamB);

  return {
    teamA,
    teamB,
    teamAScore,
    teamBScore,
    scoreDiff: Math.abs(teamAScore - teamBScore),
  };
}

function sumScore(participants: TeamParticipant[]) {
  return participants.reduce((total, participant) => total + getRankScore(participant.rank), 0);
}

function normalizedPartitionKey(teamA: TeamParticipant[], teamB: TeamParticipant[]) {
  const a = teamA.map((participant) => participant.id).sort().join(",");
  const b = teamB.map((participant) => participant.id).sort().join(",");
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function emptyTeams(): BalancedTeams {
  return {
    teamA: [],
    teamB: [],
    teamAScore: 0,
    teamBScore: 0,
    scoreDiff: 0,
  };
}
