import { db } from '../../db/client.js';
import { vocabularies } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import type { JlptLevel } from '../../db/schema.js';

export interface ClassificationResult {
  level: JlptLevel;
  confidence: number;
  wordLevelBreakdown: Record<JlptLevel, number>;
}

// 간이 형태소 분석: 어휘 DB와 매칭하여 레벨 판별
export async function classifyLevel(text: string): Promise<ClassificationResult> {
  // 텍스트에서 한자+히라가나 단어 추출 (간이 토큰화)
  const tokens = extractTokens(text);

  const breakdown: Record<JlptLevel, number> = { N5: 0, N4: 0, N3: 0, N2: 0, N1: 0 };
  let matched = 0;

  for (const token of tokens) {
    const [vocab] = await db
      .select({ level: vocabularies.jlptLevel })
      .from(vocabularies)
      .where(eq(vocabularies.word, token))
      .limit(1);

    if (vocab) {
      breakdown[vocab.level as JlptLevel]++;
      matched++;
    }
  }

  // 레벨 결정: 가장 높은 레벨의 비율로 판별
  let level: JlptLevel = 'N5';
  const total = matched || 1;

  if ((breakdown.N1 / total) >= 0.1) level = 'N1';
  else if ((breakdown.N2 / total) >= 0.1) level = 'N2';
  else if ((breakdown.N3 / total) >= 0.1) level = 'N3';
  else if ((breakdown.N4 / total) >= 0.1) level = 'N4';

  const confidence = matched / Math.max(tokens.length, 1);

  return { level, confidence, wordLevelBreakdown: breakdown };
}

function extractTokens(text: string): string[] {
  // 한자+히라가나/카타카나 패턴으로 간이 토큰 추출
  const regex = /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]+/g;
  return text.match(regex) ?? [];
}
