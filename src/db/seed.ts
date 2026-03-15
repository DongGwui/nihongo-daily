import { readFileSync } from 'fs';
import { sql } from 'drizzle-orm';
import { db } from './client.js';
import { contents, vocabularies, quizzes } from './schema.js';
import type { JlptLevel } from './schema.js';

interface VocabEntry {
  word: string;
  reading: string;
  meaning_ko: string;
  pos: string;
}

interface GrammarEntry {
  pattern: string;
  meaning_ko: string;
  example: string;
  example_ko: string;
}

const VOCAB_FILES: { level: JlptLevel; file: string }[] = [
  { level: 'N5', file: 'data/jlpt-vocab-n5.json' },
  { level: 'N4', file: 'data/jlpt-vocab-n4.json' },
  { level: 'N3', file: 'data/jlpt-vocab-n3.json' },
];

const GRAMMAR_FILES: { level: JlptLevel; file: string }[] = [
  { level: 'N5', file: 'data/jlpt-grammar-n5.json' },
  { level: 'N4', file: 'data/jlpt-grammar-n4.json' },
  { level: 'N3', file: 'data/jlpt-grammar-n3.json' },
];

export async function seedDatabase() {
  // 이미 데이터가 있으면 스킵
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(contents);
  if (Number(count) > 0) {
    console.log('Database already seeded, skipping.');
    return;
  }

  console.log('Seeding database with initial data...');

  // 1. 어휘 → contents + vocabularies + quizzes
  for (const { level, file } of VOCAB_FILES) {
    const data = JSON.parse(readFileSync(file, 'utf-8')) as VocabEntry[];

    for (const entry of data) {
      // contents 테이블에 어휘 콘텐츠 추가
      const [content] = await db.insert(contents).values({
        type: 'vocabulary',
        jlptLevel: level,
        title: entry.word,
        bodyJa: `${entry.word}(${entry.reading})`,
        bodyReading: entry.reading,
        bodyKo: entry.meaning_ko,
        source: 'jmdict',
      }).returning({ id: contents.id });

      // vocabularies 테이블에 추가
      await db.insert(vocabularies).values({
        word: entry.word,
        reading: entry.reading,
        meaningKo: entry.meaning_ko,
        jlptLevel: level,
        partOfSpeech: entry.pos,
        contentId: content.id,
      });

      // 기본 퀴즈 생성 (의미 맞추기)
      const wrongAnswers = getWrongAnswers(data, entry, 3);
      const options = shuffle([entry.meaning_ko, ...wrongAnswers]);
      await db.insert(quizzes).values({
        contentId: content.id,
        type: 'vocabulary',
        question: `「${entry.word}」의 뜻은?`,
        options: JSON.stringify(options),
        answer: entry.meaning_ko,
        explanation: `${entry.word}(${entry.reading}) = ${entry.meaning_ko} [${entry.pos}]`,
        jlptLevel: level,
        difficulty: 1,
      });

      // 읽기 퀴즈 생성
      const wrongReadings = getWrongReadings(data, entry, 3);
      const readingOptions = shuffle([entry.reading, ...wrongReadings]);
      await db.insert(quizzes).values({
        contentId: content.id,
        type: 'reading',
        question: `「${entry.word}」의 읽기는?`,
        options: JSON.stringify(readingOptions),
        answer: entry.reading,
        explanation: `${entry.word} → ${entry.reading} (${entry.meaning_ko})`,
        jlptLevel: level,
        difficulty: 1,
      });
    }

    console.log(`  ${level} vocabulary: ${data.length} words + ${data.length * 2} quizzes`);
  }

  // 2. 문법 → contents + quizzes
  for (const { level, file } of GRAMMAR_FILES) {
    const data = JSON.parse(readFileSync(file, 'utf-8')) as GrammarEntry[];

    for (const entry of data) {
      const [content] = await db.insert(contents).values({
        type: 'grammar',
        jlptLevel: level,
        title: entry.pattern,
        bodyJa: entry.example,
        bodyReading: entry.example,
        bodyKo: `${entry.meaning_ko}\n예: ${entry.example_ko}`,
        source: 'generated',
      }).returning({ id: contents.id });

      // 문법 퀴즈 생성
      const wrongMeanings = getWrongGrammarAnswers(data, entry, 3);
      const options = shuffle([entry.meaning_ko, ...wrongMeanings]);
      await db.insert(quizzes).values({
        contentId: content.id,
        type: 'grammar',
        question: `「${entry.pattern}」의 뜻은?`,
        options: JSON.stringify(options),
        answer: entry.meaning_ko,
        explanation: `${entry.pattern} = ${entry.meaning_ko}\n예: ${entry.example} (${entry.example_ko})`,
        jlptLevel: level,
        difficulty: 1,
      });
    }

    console.log(`  ${level} grammar: ${data.length} patterns + ${data.length} quizzes`);
  }

  console.log('Database seeding complete!');
}

// --- 헬퍼 함수 ---

function getWrongAnswers(data: VocabEntry[], correct: VocabEntry, count: number): string[] {
  const others = data.filter(e => e.meaning_ko !== correct.meaning_ko);
  return pickRandom(others, count).map(e => e.meaning_ko);
}

function getWrongReadings(data: VocabEntry[], correct: VocabEntry, count: number): string[] {
  const others = data.filter(e => e.reading !== correct.reading);
  return pickRandom(others, count).map(e => e.reading);
}

function getWrongGrammarAnswers(data: GrammarEntry[], correct: GrammarEntry, count: number): string[] {
  const others = data.filter(e => e.meaning_ko !== correct.meaning_ko);
  return pickRandom(others, count).map(e => e.meaning_ko);
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}
