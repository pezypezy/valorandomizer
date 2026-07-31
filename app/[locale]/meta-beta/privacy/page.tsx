import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Ranked Meta Beta Privacy Notice | Valorandomizer",
  robots: { index: false, follow: false },
};

type Language = "ja" | "en" | "ko";

const COPY = {
  ja: {
    eyebrow: "PRIVATE BETA / PRIVACY",
    title: "ランク構成統計ベータのプライバシー説明",
    intro: "このページは、約10人のVALORANTグループで検証する限定ベータにおけるデータの扱いを説明します。一般公開版の方針は、公開範囲と取得方法が確定した時点で改訂します。",
    authTitle: "共有パスワードとセッション",
    authBody: "共有パスワードはCloudflareのSecretで照合し、URLやブラウザ側コードには保存しません。ログイン後はランダムなセッション識別子を含む署名済みHttpOnly Cookieを最大7日間使用します。セッション識別子はAI相談回数の制限にも使用されます。",
    chatTitle: "AI相談",
    chatBody: "入力された相談内容と直近の会話は、回答生成のためCloudflare Workers AIへ送信されます。無関係と判定された入力はAIへ送信しません。自由入力のチャット本文はD1へ永続保存しません。3つの定型質問ボタンに対するAI回答のみ、同じ統計条件で再利用するため最大12時間キャッシュします。キャッシュには自由入力本文や利用者識別子を保存しません。API障害調査のため、Cloudflareの実行ログへエラー情報が短期間記録される場合があります。秘密情報や個人情報は入力しないでください。",
    statsTitle: "試合統計",
    statsBody: "同意した参加者の公式Riot試合履歴を起点として、試合ID、マップ、パッチ、時刻、5人構成、ランク帯、勝敗、ラウンド数を集計します。統計テーブルにはプレイヤー名・Riot ID・チャット・位置情報を保存しません。重複取得防止のため試合IDを保持します。",
    accountTitle: "同意済みアカウント",
    accountBody: "履歴を継続取得するため、同意済み参加者のPUUIDを運用テーブルへ保存します。参加は任意です。停止または削除を希望する場合は運営者へ連絡してください。本人確認できない第三者のアカウントを登録してはいけません。",
    retentionTitle: "保存期間と削除",
    retentionBody: "AI日次利用数は運用上必要な短期間のみ保持します。試合・集計データは統計の再計算と検証のため保持しますが、公開前に保存期間を再評価します。参加者から削除依頼があった場合、追跡対象から外し、個人に紐づく運用識別子を削除します。匿名集計へ既に反映された試合結果は、個人を識別できない形で残る場合があります。",
    thirdTitle: "外部サービス",
    thirdBody: "本ベータはCloudflare Workers、D1、Workers AIおよびRiot Games APIを利用します。各サービスにはそれぞれの利用規約・プライバシーポリシーが適用されます。ValorandomizerはRiot Gamesの公式サービスではありません。",
    back: "ログイン画面へ戻る",
  },
  en: {
    eyebrow: "PRIVATE BETA / PRIVACY",
    title: "Ranked meta beta privacy notice",
    intro: "This notice explains data handling for the private beta tested by a VALORANT group of about ten people. It will be revised before any broader public release.",
    authTitle: "Shared password and session",
    authBody: "The shared password is checked against a Cloudflare Secret and is not stored in the URL or client code. After login, a signed HttpOnly cookie containing a random session identifier is used for up to seven days. The identifier is also used for AI quota enforcement.",
    chatTitle: "AI advice",
    chatBody: "Your question and recent conversation context are sent to Cloudflare Workers AI to generate a response. Inputs rejected as unrelated are not sent to AI. Free-form chat text is not persisted in D1. Only AI answers to the three predefined quick-prompt buttons are cached for up to 12 hours so identical statistical requests can be reused. The cache does not store free-form input or a user identifier. Error details may appear temporarily in Cloudflare execution logs for troubleshooting. Do not enter secrets or personal information.",
    statsTitle: "Match statistics",
    statsBody: "Official Riot match histories of consented participants are used as collection seeds. The service aggregates match ID, map, patch, time, five-agent composition, rank bucket, result, and round score. Statistical tables do not store player names, Riot IDs, chat, or location data. Match IDs are retained for deduplication.",
    accountTitle: "Consented accounts",
    accountBody: "A consented participant's PUUID is stored in an operational table so their history can be polled again. Participation is optional. Contact the operator to stop collection or request deletion. Do not register an account belonging to someone who has not consented.",
    retentionTitle: "Retention and deletion",
    retentionBody: "Daily AI usage counters are retained only as needed for operation. Match and aggregate data are retained for statistical recalculation and validation, with retention to be reviewed before public launch. On request, the participant is removed from tracking and their operational identifier is deleted. Match outcomes already included in anonymous aggregates may remain when they can no longer identify the participant.",
    thirdTitle: "External services",
    thirdBody: "The beta uses Cloudflare Workers, D1, Workers AI, and the Riot Games API. Each provider's terms and privacy policy also apply. Valorandomizer is not an official Riot Games service.",
    back: "Back to sign in",
  },
  ko: {
    eyebrow: "PRIVATE BETA / PRIVACY",
    title: "랭크 조합 통계 베타 개인정보 안내",
    intro: "약 10명의 VALORANT 그룹이 테스트하는 비공개 베타의 데이터 처리 방식을 설명합니다. 더 넓게 공개하기 전에 정책을 다시 개정합니다.",
    authTitle: "공유 비밀번호와 세션",
    authBody: "공유 비밀번호는 Cloudflare Secret과 대조하며 URL이나 클라이언트 코드에 저장하지 않습니다. 로그인 후 무작위 세션 식별자가 포함된 서명된 HttpOnly Cookie를 최대 7일 사용합니다. 이 식별자는 AI 상담 횟수 제한에도 사용됩니다.",
    chatTitle: "AI 상담",
    chatBody: "질문과 최근 대화 문맥은 답변 생성을 위해 Cloudflare Workers AI로 전송됩니다. 관련 없는 입력은 AI로 전송하지 않습니다. 자유 입력 채팅 본문은 D1에 영구 저장하지 않습니다. 세 개의 정해진 빠른 질문 버튼에 대한 AI 답변만 동일한 통계 조건에서 재사용하기 위해 최대 12시간 캐시합니다. 캐시에는 자유 입력 내용이나 사용자 식별자를 저장하지 않습니다. 장애 조사용 오류 정보가 Cloudflare 실행 로그에 일시적으로 남을 수 있습니다. 비밀 정보나 개인정보를 입력하지 마세요.",
    statsTitle: "경기 통계",
    statsBody: "동의한 참가자의 공식 Riot 경기 기록을 수집 출발점으로 사용합니다. 경기 ID, 맵, 패치, 시각, 5인 조합, 랭크 구간, 승패, 라운드 점수를 집계합니다. 통계 테이블에는 플레이어 이름, Riot ID, 채팅, 위치 정보를 저장하지 않습니다. 중복 방지를 위해 경기 ID를 보관합니다.",
    accountTitle: "동의한 계정",
    accountBody: "기록을 계속 조회하기 위해 동의한 참가자의 PUUID를 운영 테이블에 저장합니다. 참여는 선택 사항입니다. 수집 중단 또는 삭제를 원하면 운영자에게 요청해 주세요. 동의하지 않은 타인의 계정을 등록하면 안 됩니다.",
    retentionTitle: "보관과 삭제",
    retentionBody: "AI 일일 사용량은 운영에 필요한 짧은 기간만 보관합니다. 경기 및 집계 데이터는 통계 재계산과 검증을 위해 보관하며 공개 전에 보관 기간을 다시 검토합니다. 요청 시 추적 대상에서 제외하고 개인과 연결된 운영 식별자를 삭제합니다. 이미 익명 집계에 반영되어 개인을 식별할 수 없는 경기 결과는 남을 수 있습니다.",
    thirdTitle: "외부 서비스",
    thirdBody: "본 베타는 Cloudflare Workers, D1, Workers AI 및 Riot Games API를 사용합니다. 각 서비스의 이용약관과 개인정보처리방침도 적용됩니다. Valorandomizer는 Riot Games 공식 서비스가 아닙니다.",
    back: "로그인 화면으로 돌아가기",
  },
} as const;

function NoticeSection({ title, body }: { title: string; body: string }) {
  return (
    <section className="clip-card border border-[var(--color-line)] bg-[var(--color-surface)] p-5 sm:p-6">
      <h2 className="font-ui-ja text-xl font-bold">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">{body}</p>
    </section>
  );
}

export default async function MetaBetaPrivacyPage({ params }: PageProps<"/[locale]/meta-beta/privacy">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const language: Language = locale === "en" || locale === "ko" ? locale : "ja";
  const copy = COPY[language];

  return (
    <article className="mx-auto flex max-w-4xl flex-col gap-6 py-8">
      <section className="clip-frame border border-[var(--color-line)] bg-[var(--color-surface)] p-6 sm:p-8">
        <p className="font-display-en text-xs font-bold tracking-[0.3em] text-[var(--color-primary)]">{copy.eyebrow}</p>
        <h1 className="font-ui-ja mt-3 text-3xl font-bold sm:text-5xl">{copy.title}</h1>
        <p className="mt-5 text-sm leading-7 text-[var(--color-muted)]">{copy.intro}</p>
      </section>
      <NoticeSection title={copy.authTitle} body={copy.authBody} />
      <NoticeSection title={copy.chatTitle} body={copy.chatBody} />
      <NoticeSection title={copy.statsTitle} body={copy.statsBody} />
      <NoticeSection title={copy.accountTitle} body={copy.accountBody} />
      <NoticeSection title={copy.retentionTitle} body={copy.retentionBody} />
      <NoticeSection title={copy.thirdTitle} body={copy.thirdBody} />
      <Link href="/meta-beta/login" className="self-start text-sm font-semibold text-[var(--color-primary)] hover:underline">
        ← {copy.back}
      </Link>
    </article>
  );
}
