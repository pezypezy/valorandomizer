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

export const PRO_PICKS: ProPick[] = [
  {
    id: "champions-2024-edg-abyss",
    event: "VALORANT Champions 2024",
    match: "Edward Gaming vs Team Heretics",
    map: "Abyss",
    region: "China",
    team: "Edward Gaming",
    agents: ["Jett", "Sova", "KAY/O", "Omen", "Cypher"],
    source: "https://www.vlr.gg/event/2097/valorant-champions-2024",
  },
  {
    id: "champions-2024-th-sunset",
    event: "VALORANT Champions 2024",
    match: "Edward Gaming vs Team Heretics",
    map: "Sunset",
    region: "EMEA",
    team: "Team Heretics",
    agents: ["Neon", "Breach", "Fade", "Omen", "Cypher"],
    source: "https://www.vlr.gg/event/2097/valorant-champions-2024",
  },
  {
    id: "masters-shanghai-2024-geng-lotus",
    event: "Masters Shanghai 2024",
    match: "Gen.G vs Team Heretics",
    map: "Lotus",
    region: "Pacific",
    team: "Gen.G",
    agents: ["Raze", "Fade", "Omen", "Viper", "Killjoy"],
    source: "https://www.vlr.gg/event/1999/champions-tour-2024-masters-shanghai",
  },
  {
    id: "masters-madrid-2024-sen-split",
    event: "Masters Madrid 2024",
    match: "Sentinels vs Gen.G",
    map: "Split",
    region: "Americas",
    team: "Sentinels",
    agents: ["Raze", "Skye", "Omen", "Viper", "Cypher"],
    source: "https://www.vlr.gg/event/1921/champions-tour-2024-masters-madrid",
  },
  {
    id: "champions-2023-eg-bind",
    event: "VALORANT Champions 2023",
    match: "Evil Geniuses vs Paper Rex",
    map: "Bind",
    region: "Americas",
    team: "Evil Geniuses",
    agents: ["Raze", "Skye", "Viper", "Brimstone", "Cypher"],
    source: "https://www.vlr.gg/event/1657/valorant-champions-2023",
  },
  {
    id: "masters-tokyo-2023-fnc-lotus",
    event: "Masters Tokyo 2023",
    match: "Fnatic vs Evil Geniuses",
    map: "Lotus",
    region: "EMEA",
    team: "Fnatic",
    agents: ["Raze", "Fade", "Omen", "Viper", "Killjoy"],
    source: "https://www.vlr.gg/event/1494/champions-tour-2023-masters-tokyo",
  },
];
