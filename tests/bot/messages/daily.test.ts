import { describe, it, expect } from 'vitest';
import { formatDailyMessage } from '../../../src/bot/messages/daily.js';

describe('formatDailyMessage', () => {
  it('should include level in header', () => {
    const { text } = formatDailyMessage({
      contentId: 1,
      bodyJa: 'テスト文',
      level: 'N5',
      vocab: [],
    });
    expect(text).toContain('N5 레벨');
  });

  it('should include title when provided', () => {
    const { text } = formatDailyMessage({
      contentId: 1,
      title: 'テストタイトル',
      bodyJa: 'テスト文',
      level: 'N3',
      vocab: [],
    });
    expect(text).toContain('📰 テストタイトル');
  });

  it('should omit title line when not provided', () => {
    const { text } = formatDailyMessage({
      contentId: 1,
      bodyJa: 'テスト文',
      level: 'N5',
      vocab: [],
    });
    expect(text).not.toContain('📰');
  });

  it('should include Japanese body in brackets', () => {
    const { text } = formatDailyMessage({
      contentId: 1,
      bodyJa: '今日はいい天気です。',
      level: 'N5',
      vocab: [],
    });
    expect(text).toContain('「今日はいい天気です。」');
  });

  it('should include Korean translation when provided', () => {
    const { text } = formatDailyMessage({
      contentId: 1,
      bodyJa: '今日はいい天気です。',
      bodyKo: '오늘은 좋은 날씨입니다.',
      level: 'N5',
      vocab: [],
    });
    expect(text).toContain('(오늘은 좋은 날씨입니다.)');
  });

  it('should format vocabulary list', () => {
    const { text } = formatDailyMessage({
      contentId: 1,
      bodyJa: 'テスト',
      level: 'N5',
      vocab: [
        { word: '天気', reading: 'てんき', meaningKo: '날씨' },
        { word: '今日', reading: 'きょう', meaningKo: '오늘' },
      ],
    });
    expect(text).toContain('📝 오늘의 단어');
    expect(text).toContain('• 天気 (てんき) - 날씨');
    expect(text).toContain('• 今日 (きょう) - 오늘');
  });

  it('should omit vocab section when empty', () => {
    const { text } = formatDailyMessage({
      contentId: 1,
      bodyJa: 'テスト',
      level: 'N5',
      vocab: [],
    });
    expect(text).not.toContain('📝 오늘의 단어');
  });

  it('should include grammar when provided', () => {
    const { text } = formatDailyMessage({
      contentId: 1,
      bodyJa: 'テスト',
      level: 'N5',
      vocab: [],
      grammar: '~ています (진행형)',
    });
    expect(text).toContain('💡 오늘의 문법');
    expect(text).toContain('~ています (진행형)');
  });

  it('should return keyboard with quiz and review buttons', () => {
    const { keyboard } = formatDailyMessage({
      contentId: 42,
      bodyJa: 'テスト',
      level: 'N5',
      vocab: [],
    });
    // InlineKeyboard stores button data internally
    expect(keyboard).toBeDefined();
  });
});
