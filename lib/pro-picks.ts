import { PRO_PICKS_2025_VCT } from "@/data/pro-picks-2025-vct";
import proPickData from "@/data/pro-picks.json";

export type ProRegion = "Americas" | "EMEA" | "Pacific" | "China";

export interface ProPick {
  id: string;
  event: string;
  match: string;
  map: string;
  region: ProRegion;
  team: string;
  agents: string[];
  source?: string;
}

export const PRO_PICKS = [...(proPickData as ProPick[]), ...PRO_PICKS_2025_VCT];
