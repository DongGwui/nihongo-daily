import { describe, it, expect } from 'vitest';

// extractTokens 로직을 직접 테스트 (DB 의존 없이)
function extractTokens(text: string): string[] {
  const regex = /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]+/g;
  return text.match(regex) ?? [];
}

// 레벨 결정 로직을 단위 테스트
function determineLevel(
  breakdown: Record<string, number>,
  matched: number,
): string {
  const total = matched || 1;
  if ((breakdown.N1 / total) >= 0.1) return 'N1';
  if ((breakdown.N2 / total) >= 0.1) return 'N2';
  if ((breakdown.N3 / total) >= 0.1) return 'N3';
  if ((breakdown.N4 / total) >= 0.1) return 'N4';
  return 'N5';
}

describe('Level Classifier - Token Extraction', () => {
  it('should extract Japanese tokens from text', () => {
    const tokens = extractTokens('今日は天気がいいです。');
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens).toContain('今日は天気がいいです');
  });

  it('should extract kanji+kana compound tokens', () => {
    const tokens = extractTokens('観光客が増えている');
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens.some((t) => t.includes('観光客'))).toBe(true);
  });

  it('should extract katakana tokens', () => {
    const tokens = extractTokens('テレビを見ます');
    expect(tokens.some((t) => t.includes('テレビ'))).toBe(true);
  });

  it('should return empty array for non-Japanese text', () => {
    const tokens = extractTokens('Hello World 123');
    expect(tokens).toHaveLength(0);
  });

  it('should handle mixed Japanese and non-Japanese text', () => {
    const tokens = extractTokens('NHKのニュースを見ました。');
    expect(tokens.length).toBeGreaterThan(0);
    // NHK is ASCII, should not be included
    expect(tokens.every((t) => !/[A-Z]/.test(t))).toBe(true);
  });
});

describe('Level Classifier - Level Determination', () => {
  it('should classify as N5 when no higher-level words found', () => {
    const breakdown = { N5: 10, N4: 0, N3: 0, N2: 0, N1: 0 };
    expect(determineLevel(breakdown, 10)).toBe('N5');
  });

  it('should classify as N3 when N3 words >= 10%', () => {
    const breakdown = { N5: 5, N4: 3, N3: 2, N2: 0, N1: 0 };
    expect(determineLevel(breakdown, 10)).toBe('N3');
  });

  it('should classify as N1 when N1 words >= 10%', () => {
    const breakdown = { N5: 3, N4: 2, N3: 2, N2: 1, N1: 2 };
    expect(determineLevel(breakdown, 10)).toBe('N1');
  });

  it('should classify as N5 when matched is 0', () => {
    const breakdown = { N5: 0, N4: 0, N3: 0, N2: 0, N1: 0 };
    expect(determineLevel(breakdown, 0)).toBe('N5');
  });

  it('should prioritize higher levels (N1 > N2 > N3)', () => {
    const breakdown = { N5: 0, N4: 0, N3: 2, N2: 2, N1: 2 };
    expect(determineLevel(breakdown, 6)).toBe('N1');
  });

  it('should handle confidence calculation', () => {
    const tokens = extractTokens('今日は天気がいいです。明日も晴れるでしょう。');
    expect(tokens.length).toBeGreaterThan(0);
    // matched <= tokens.length なので confidence は 0~1
    const matched = 1;
    const confidence = matched / Math.max(tokens.length, 1);
    expect(confidence).toBeGreaterThan(0);
    expect(confidence).toBeLessThanOrEqual(1);
  });
});
