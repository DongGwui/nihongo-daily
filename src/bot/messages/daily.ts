import { InlineKeyboard } from 'grammy';

interface DailyContent {
  contentId: number;
  title?: string;
  bodyJa: string;
  bodyKo?: string;
  vocab: { word: string; reading: string; meaningKo: string }[];
  grammar?: string;
  level: string;
}

export function formatDailyMessage(content: DailyContent) {
  let msg = `📚 오늘의 일본어 (${content.level} 레벨)\n\n`;

  if (content.title) {
    msg += `📰 ${content.title}\n`;
  }
  msg += `「${content.bodyJa}」\n`;
  if (content.bodyKo) {
    msg += `(${content.bodyKo})\n`;
  }

  if (content.vocab.length > 0) {
    msg += `\n📝 오늘의 단어\n`;
    for (const v of content.vocab) {
      msg += `• ${v.word} (${v.reading}) - ${v.meaningKo}\n`;
    }
  }

  if (content.grammar) {
    msg += `\n💡 오늘의 문법\n• ${content.grammar}\n`;
  }

  const keyboard = new InlineKeyboard()
    .text('퀴즈 풀기', `daily_action:quiz:${content.contentId}`)
    .text('복습하기', `daily_action:review:0`);

  return { text: msg, keyboard };
}
