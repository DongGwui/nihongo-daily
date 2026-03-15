import { db } from '../../db/client.js';
import { contents } from '../../db/schema.js';
import { config } from '../../lib/config.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { JlptLevel } from '../../db/schema.js';

/**
 * Gemini를 사용해 JLPT 레벨별 일본어 학습 콘텐츠를 생성합니다.
 * NHK Easy News API 인증 변경으로 크롤링 대신 AI 생성 방식 사용.
 */

interface GeneratedContent {
  title: string;
  bodyJa: string;
  bodyReading: string;
  bodyKo: string;
  type: 'news' | 'sentence' | 'grammar' | 'vocabulary';
}

export async function fetchArticleList(): Promise<GeneratedContent[]> {
  if (!config.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not set, skipping content generation');
    return [];
  }

  const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `일본어 학습자(JLPT N3~N5)를 위한 짧은 일본어 읽기 자료 5개를 생성해주세요.
각 자료는 다음 형식의 JSON 배열로 응답하세요:

[
  {
    "title": "제목 (일본어)",
    "bodyJa": "본문 (일본어, 3~5문장)",
    "bodyReading": "본문 (후리가나 포함, 한자(읽기) 형태)",
    "bodyKo": "본문 (한국어 번역)",
    "type": "news"
  }
]

주제: 일상생활, 계절, 음식, 여행, 문화 등 다양하게.
난이도: N3~N5 수준의 쉬운 문장.
반드시 JSON 배열로만 응답하세요.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  return JSON.parse(jsonMatch[0]) as GeneratedContent[];
}

export async function crawlAndSave(limit = 5): Promise<number> {
  const articles = await fetchArticleList();
  let saved = 0;

  for (const article of articles.slice(0, limit)) {
    try {
      await db.insert(contents).values({
        type: article.type || 'news',
        jlptLevel: 'N3',
        title: article.title,
        bodyJa: article.bodyJa,
        bodyReading: article.bodyReading,
        bodyKo: article.bodyKo,
        source: 'generated',
      });
      saved++;
    } catch (err) {
      console.error(`Failed to save content:`, err);
    }
  }

  return saved;
}
