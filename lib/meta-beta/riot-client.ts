export interface RiotMatchlistEntry {
  matchId: string;
  gameStartTimeMillis?: number;
  queueId?: string;
}

export interface RiotMatchlistResponse {
  puuid?: string;
  history: RiotMatchlistEntry[];
}

export interface RiotRecentMatchesResponse {
  currentTime: number;
  matchIds: string[];
}

export interface RiotContentMap {
  id: string;
  name: string;
  assetName?: string;
}

export interface RiotContentResponse {
  version?: string;
  maps: RiotContentMap[];
}

export interface RiotApiClientOptions {
  baseUrl: string;
  apiKey: string;
  fetcher?: typeof fetch;
}

export class RiotApiError extends Error {
  readonly status: number;
  readonly retryAfterSeconds: number | null;

  constructor(message: string, status: number, retryAfterSeconds: number | null = null) {
    super(message);
    this.name = "RiotApiError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("RIOT_VAL_BASE_URL must use HTTPS");
  return url.toString().replace(/\/$/u, "");
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number.parseInt(value, 10);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

function assertMatchlist(value: unknown): RiotMatchlistResponse {
  if (!value || typeof value !== "object") throw new Error("Invalid Riot matchlist response");
  const candidate = value as Partial<RiotMatchlistResponse>;
  if (!Array.isArray(candidate.history)) throw new Error("Riot matchlist response has no history array");

  const history = candidate.history.filter((entry): entry is RiotMatchlistEntry =>
    Boolean(entry) && typeof entry === "object" && typeof entry.matchId === "string" && entry.matchId.length > 0,
  );
  return { puuid: typeof candidate.puuid === "string" ? candidate.puuid : undefined, history };
}

function assertRecentMatches(value: unknown): RiotRecentMatchesResponse {
  if (!value || typeof value !== "object") throw new Error("Invalid Riot recent matches response");
  const candidate = value as { currentTime?: unknown; matchIds?: unknown };
  if (!Array.isArray(candidate.matchIds)) {
    throw new Error("Riot recent matches response has no matchIds array");
  }
  const matchIds = [...new Set(candidate.matchIds.filter(
    (matchId): matchId is string => typeof matchId === "string" && matchId.length > 0,
  ))];
  return {
    currentTime: typeof candidate.currentTime === "number" && Number.isFinite(candidate.currentTime)
      ? candidate.currentTime
      : 0,
    matchIds,
  };
}

function assertContent(value: unknown): RiotContentResponse {
  if (!value || typeof value !== "object") throw new Error("Invalid Riot content response");
  const candidate = value as { version?: unknown; maps?: unknown };
  const maps = Array.isArray(candidate.maps)
    ? candidate.maps.flatMap((entry): RiotContentMap[] => {
        if (!entry || typeof entry !== "object") return [];
        const map = entry as { id?: unknown; name?: unknown; assetName?: unknown };
        if (typeof map.id !== "string" || typeof map.name !== "string") return [];
        return [{
          id: map.id,
          name: map.name,
          assetName: typeof map.assetName === "string" ? map.assetName : undefined,
        }];
      })
    : [];
  return {
    version: typeof candidate.version === "string" ? candidate.version : undefined,
    maps,
  };
}

export class RiotValorantApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetcher: typeof fetch;

  constructor(options: RiotApiClientOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.apiKey = options.apiKey.trim();
    this.fetcher = options.fetcher ?? fetch;
    if (!this.apiKey) throw new Error("RIOT_API_KEY is required");
  }

  private async request(path: string): Promise<unknown> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      headers: {
        accept: "application/json",
        "X-Riot-Token": this.apiKey,
      },
    });

    if (!response.ok) {
      const retryAfterSeconds = parseRetryAfter(response.headers.get("retry-after"));
      throw new RiotApiError(
        `Riot API request failed with status ${response.status}`,
        response.status,
        retryAfterSeconds,
      );
    }
    return response.json();
  }

  async getContent(locale = "en-US"): Promise<RiotContentResponse> {
    const result = await this.request(`/val/content/v1/contents?locale=${encodeURIComponent(locale)}`);
    return assertContent(result);
  }

  async getRecentMatches(queue = "competitive"): Promise<RiotRecentMatchesResponse> {
    const result = await this.request(`/val/match/v1/recent-matches/by-queue/${encodeURIComponent(queue)}`);
    return assertRecentMatches(result);
  }

  async getMatchlistByPuuid(puuid: string): Promise<RiotMatchlistResponse> {
    const result = await this.request(`/val/match/v1/matchlists/by-puuid/${encodeURIComponent(puuid)}`);
    return assertMatchlist(result);
  }

  async getMatchById(matchId: string): Promise<unknown> {
    return this.request(`/val/match/v1/matches/${encodeURIComponent(matchId)}`);
  }
}
