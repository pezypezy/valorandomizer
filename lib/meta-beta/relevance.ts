import { AGENTS } from "@/lib/agents";

export type RelevanceDecision =
  | { allowed: true; reason: "valorant-signal" | "conversation-follow-up" }
  | { allowed: false; reason: "empty" | "too-long" | "prompt-injection" | "unrelated" };

interface RelevanceContext {
  hasConversationContext?: boolean;
}

const MAX_MESSAGE_LENGTH = 1200;

const NORMALIZED_AGENT_NAMES = AGENTS.map((agent) => agent.name.toLocaleLowerCase("en-US"));

const STRONG_VALORANT_TERMS = [
  "valorant",
  "ヴァロラント",
  "valo",
  "コンペ",
  "ランクマ",
  "アンレート",
  "エージェント",
  "デュエリスト",
  "イニシエーター",
  "コントローラー",
  "センチネル",
  "アセント",
  "バインド",
  "ヘイヴン",
  "ヘイブン",
  "スプリット",
  "ロータス",
  "サンセット",
  "アイスボックス",
  "ブリーズ",
  "アビス",
  "ascent",
  "bind",
  "haven",
  "split",
  "lotus",
  "sunset",
  "icebox",
  "breeze",
  "abyss",
  "iron",
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
  "ascendant",
  "immortal",
  "radiant",
  "アイアン",
  "ブロンズ",
  "シルバー",
  "ゴールド",
  "プラチナ",
  "ダイヤ",
  "アセンダント",
  "イモータル",
  "レディアント",
  ...NORMALIZED_AGENT_NAMES,
];

const COMPOSITION_TERMS = [
  "構成",
  "編成",
  "ピック",
  "メタ",
  "オフメタ",
  "勝率",
  "使用率",
  "ピック率",
  "試合数",
  "補正",
  "相性",
  "代替",
  "残り枠",
  "残り2枠",
  "おすすめ",
  "野良",
  "ソロキュー",
  "フルパ",
  "3パ",
  "スリーパ",
  "役割",
  "ロール",
  "攻め",
  "守り",
  "セットアップ",
  "ウルト",
  "アビリティ",
  "comp",
  "composition",
  "team comp",
  "win rate",
  "pick rate",
  "solo queue",
  "off meta",
];

const FOLLOW_UP_PATTERNS = [
  /^なぜ[？?]?$/u,
  /^どうして[？?]?$/u,
  /^他は[？?]?$/u,
  /^別案は[？?]?$/u,
  /^詳しく/u,
  /^もう少し/u,
  /^それで/u,
  /^この構成/u,
  /^その構成/u,
  /^弱点は[？?]?$/u,
  /^強みは[？?]?$/u,
  /^why[?]?$/iu,
  /^more$/iu,
  /^another one[?]?$/iu,
];

const PROMPT_INJECTION_PATTERNS = [
  /前の指示を無視/u,
  /以前の指示を無視/u,
  /システムプロンプト/u,
  /内部プロンプト/u,
  /隠された指示/u,
  /api\s*キー/iu,
  /秘密鍵/u,
  /jailbreak/iu,
  /ignore (all|any|the) previous instructions/iu,
  /reveal (the )?(system|developer) prompt/iu,
  /show (me )?(the )?(system|developer) prompt/iu,
];

const OBVIOUSLY_UNRELATED_TERMS = [
  "天気",
  "気温",
  "ニュース",
  "政治",
  "選挙",
  "株価",
  "為替",
  "レシピ",
  "料理",
  "翻訳して",
  "英訳して",
  "和訳して",
  "プログラムを書いて",
  "コードを書いて",
  "宿題",
  "恋愛相談",
  "占い",
  "weather",
  "stock price",
  "recipe",
  "translate this",
  "write code",
];

function normalize(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("ja-JP").replace(/\s+/gu, " ").trim();
}

function includesAny(message: string, terms: string[]): boolean {
  return terms.some((term) => message.includes(term));
}

export function classifyMetaChatMessage(
  rawMessage: string,
  context: RelevanceContext = {},
): RelevanceDecision {
  const message = normalize(rawMessage);
  if (!message) return { allowed: false, reason: "empty" };
  if (message.length > MAX_MESSAGE_LENGTH) return { allowed: false, reason: "too-long" };

  if (PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(message))) {
    return { allowed: false, reason: "prompt-injection" };
  }

  const hasStrongSignal = includesAny(message, STRONG_VALORANT_TERMS);
  const hasCompositionSignal = includesAny(message, COMPOSITION_TERMS);
  if (hasStrongSignal || hasCompositionSignal) {
    return { allowed: true, reason: "valorant-signal" };
  }

  if (
    context.hasConversationContext &&
    message.length <= 40 &&
    FOLLOW_UP_PATTERNS.some((pattern) => pattern.test(message))
  ) {
    return { allowed: true, reason: "conversation-follow-up" };
  }

  if (includesAny(message, OBVIOUSLY_UNRELATED_TERMS)) {
    return { allowed: false, reason: "unrelated" };
  }

  return { allowed: false, reason: "unrelated" };
}

export function getRejectedMessage(locale: string, reason: RelevanceDecision extends { allowed: false } ? never : never): string;
export function getRejectedMessage(locale: string, reason: "empty" | "too-long" | "prompt-injection" | "unrelated"): string;
export function getRejectedMessage(
  locale: string,
  reason: "empty" | "too-long" | "prompt-injection" | "unrelated",
): string {
  const messages = {
    ja: {
      empty: "相談内容を入力してください。",
      "too-long": "入力が長すぎます。1,200文字以内で、構成相談に必要な内容へ絞ってください。",
      "prompt-injection": "このチャットでは、内部設定・秘密情報・指示の上書きに関する依頼には対応できません。VALORANTの構成相談を入力してください。",
      unrelated: "このチャットはVALORANTのマップ・ランク・エージェント構成相談専用です。構成や使用エージェントについて質問してください。",
    },
    en: {
      empty: "Enter a question first.",
      "too-long": "Your message is too long. Keep it under 1,200 characters and focus on the team-composition question.",
      "prompt-injection": "This chat cannot help with internal instructions, secrets, or attempts to override its rules. Ask a VALORANT composition question instead.",
      unrelated: "This chat is limited to VALORANT maps, ranks, agents, and team compositions.",
    },
    ko: {
      empty: "상담 내용을 입력해 주세요.",
      "too-long": "입력이 너무 깁니다. 1,200자 이내로 팀 조합 질문에 필요한 내용만 입력해 주세요.",
      "prompt-injection": "내부 설정, 비밀 정보 또는 지시 덮어쓰기 요청에는 대응하지 않습니다. VALORANT 조합을 질문해 주세요.",
      unrelated: "이 채팅은 VALORANT 맵, 랭크, 요원, 팀 조합 상담 전용입니다.",
    },
  } as const;

  const language = locale === "en" || locale === "ko" ? locale : "ja";
  return messages[language][reason];
}
