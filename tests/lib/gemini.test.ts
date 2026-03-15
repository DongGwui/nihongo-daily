import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const quizSchema = z.object({
  type: z.enum(['reading', 'vocabulary', 'grammar', 'translate']),
  question: z.string(),
  options: z.array(z.string()).optional(),
  answer: z.string(),
  explanation: z.string().optional().default(''),
});

describe('Gemini Quiz Parsing', () => {
  it('should parse valid quiz with all fields', () => {
    const input = {
      type: 'reading',
      question: '「観光客」の読み方は？',
      options: ['かんこうきゃく', 'かんこうかく', 'みこうきゃく', 'かんひかりきゃく'],
      answer: 'かんこうきゃく',
      explanation: '観(かん)+光(こう)+客(きゃく)',
    };

    const result = quizSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('reading');
      expect(result.data.options).toHaveLength(4);
    }
  });

  it('should parse quiz without explanation (optional field)', () => {
    const input = {
      type: 'vocabulary',
      question: '「食べる」の意味は？',
      options: ['먹다', '마시다', '자다', '걷다'],
      answer: '먹다',
    };

    const result = quizSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.explanation).toBe('');
    }
  });

  it('should parse translate quiz without options', () => {
    const input = {
      type: 'translate',
      question: '다음을 일본어로 번역하세요: "좋은 아침입니다"',
      answer: 'おはようございます',
      explanation: '아침 인사의 정중한 표현',
    };

    const result = quizSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.options).toBeUndefined();
    }
  });

  it('should reject quiz with missing answer', () => {
    const input = {
      type: 'reading',
      question: '「観光客」の読み方は？',
      options: ['かんこうきゃく'],
    };

    const result = quizSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject quiz with invalid type', () => {
    const input = {
      type: 'listening',
      question: 'test',
      answer: 'test',
    };

    const result = quizSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should extract JSON from markdown code block', () => {
    const geminiResponse = '```json\n[{"type":"reading","question":"test","answer":"test"}]\n```';
    const jsonMatch = geminiResponse.match(/\[[\s\S]*\]/);
    expect(jsonMatch).not.toBeNull();

    const parsed = JSON.parse(jsonMatch![0]) as unknown[];
    expect(parsed).toHaveLength(1);

    const result = quizSchema.safeParse(parsed[0]);
    expect(result.success).toBe(true);
  });

  it('should handle batch parsing with mixed valid/invalid items', () => {
    const items = [
      { type: 'reading', question: 'Q1', answer: 'A1', options: ['A1', 'B', 'C', 'D'] },
      { type: 'invalid', question: 'Q2' },
      { type: 'grammar', question: 'Q3', answer: 'A3', explanation: '해설' },
    ];

    const quizzes = [];
    for (const item of items) {
      const result = quizSchema.safeParse(item);
      if (result.success) quizzes.push(result.data);
    }

    expect(quizzes).toHaveLength(2);
    expect(quizzes[0].type).toBe('reading');
    expect(quizzes[1].type).toBe('grammar');
  });
});
