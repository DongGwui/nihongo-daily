import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from './config.js';
import { z } from 'zod';

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

const quizSchema = z.object({
  type: z.enum(['reading', 'vocabulary', 'grammar', 'translate']),
  question: z.string(),
  options: z.array(z.string()).optional(),
  answer: z.string(),
  explanation: z.string().optional().default(''),
});

export type GeneratedQuiz = z.infer<typeof quizSchema>;

export async function generateQuizzes(content: string, level: string): Promise<GeneratedQuiz[]> {
  if (!config.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not set, skipping quiz generation');
    return [];
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `당신은 일본어 교육 전문가입니다.
다음 일본어 텍스트를 기반으로 ${level} 수준의 학습 퀴즈를 생성하세요.

텍스트: ${content}

다음 4종류의 퀴즈를 JSON 배열로 생성하세요:
1. reading: 한자 읽기 퀴즈 (4지선다, options 포함)
2. vocabulary: 어휘 의미 퀴즈 (4지선다, options 포함)
3. grammar: 문법 빈칸 퀴즈 (4지선다, options 포함)
4. translate: 일본어→한국어 번역 퀴즈 (정답 텍스트, options 없음)

각 퀴즈는 반드시 다음 필드를 포함해야 합니다:
- type: 퀴즈 유형
- question: 문제
- options: 선택지 배열 (translate 제외)
- answer: 정답 문자열
- explanation: 해설 문자열

각 퀴즈의 오답은 학습자가 흔히 혼동하는 것으로 구성하세요.
반드시 JSON 배열로만 응답하세요. 다른 텍스트는 포함하지 마세요.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // JSON 추출 (코드블록 감싸기 대응)
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  const parsed = JSON.parse(jsonMatch[0]) as unknown[];
  const quizzes: GeneratedQuiz[] = [];

  for (const item of parsed) {
    const result = quizSchema.safeParse(item);
    if (result.success) {
      quizzes.push(result.data);
    } else {
      console.warn('Invalid quiz item skipped:', result.error.issues[0]?.message);
    }
  }

  return quizzes;
}
