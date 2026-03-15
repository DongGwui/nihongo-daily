/**
 * JLPT 전 레벨 seed.sql 생성기
 *
 * 콘텐츠 타입별:
 * - vocabulary: contents + vocabularies + quizzes x2
 * - grammar: contents + quizzes x1
 * - sentence: contents + quizzes x1
 *
 * 사용법: npx tsx scripts/generate-seed.ts
 * 출력: seed.sql
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

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

interface SentenceEntry {
  ja: string;
  ko: string;
  reading?: string;
}

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;
const DATA_DIR = join(import.meta.dirname ?? '.', '..', 'data');

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''");
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateWrongOptions(
  correct: string,
  allValues: string[],
  count: number,
): string[] {
  const candidates = allValues.filter((v) => v !== correct);
  const shuffled = shuffle(candidates);
  return shuffled.slice(0, count);
}

function generateSQL(): string {
  const lines: string[] = [];
  lines.push('-- nihongo-daily seed data (JLPT N5~N1)');
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push('BEGIN;');
  lines.push('');
  lines.push('-- 기존 데이터 초기화 (FK 순서)');
  lines.push('DELETE FROM user_quiz_results;');
  lines.push('DELETE FROM review_cards;');
  lines.push('DELETE FROM daily_logs;');
  lines.push('DELETE FROM quizzes;');
  lines.push('DELETE FROM vocabularies;');
  lines.push('DELETE FROM contents;');
  lines.push('');

  let totalWords = 0;
  let totalQuizzes = 0;

  for (const level of LEVELS) {
    const filePath = join(DATA_DIR, `jlpt-vocab-${level.toLowerCase()}.json`);
    let entries: VocabEntry[];

    try {
      entries = JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch {
      console.warn(`[SKIP] ${filePath} not found`);
      continue;
    }

    console.log(`[${level}] ${entries.length}개 단어 처리 중...`);

    // 오답 후보용 전체 목록
    const allMeanings = entries.map((e) => e.meaning_ko);
    const allReadings = entries.map((e) => e.reading);

    lines.push(`-- ====== ${level} (${entries.length}개) ======`);
    lines.push('');

    for (const entry of entries) {
      const word = escapeSQL(entry.word);
      const reading = escapeSQL(entry.reading);
      const meaningKo = escapeSQL(entry.meaning_ko);
      const pos = escapeSQL(entry.pos);

      // 1. contents INSERT
      lines.push(
        `INSERT INTO contents (type, jlpt_level, title, body_ja, body_reading, body_ko, source) ` +
        `VALUES ('vocabulary', '${level}', '${word}', '${word}(${reading})', '${reading}', '${meaningKo}', 'jmdict');`,
      );

      // 2. vocabularies INSERT
      lines.push(
        `INSERT INTO vocabularies (word, reading, meaning_ko, jlpt_level, part_of_speech, content_id) ` +
        `VALUES ('${word}', '${reading}', '${meaningKo}', '${level}', '${pos}', currval('contents_id_seq'));`,
      );

      // 3. vocabulary quiz (뜻 맞추기)
      const wrongMeanings = generateWrongOptions(entry.meaning_ko, allMeanings, 3);
      const vocabOptions = shuffle([entry.meaning_ko, ...wrongMeanings]);
      lines.push(
        `INSERT INTO quizzes (content_id, type, question, options, answer, explanation, jlpt_level, difficulty) ` +
        `VALUES (currval('contents_id_seq'), 'vocabulary', '「${word}」의 뜻은?', ` +
        `'${escapeSQL(JSON.stringify(vocabOptions))}', '${meaningKo}', ` +
        `'${word}(${reading}) = ${meaningKo} [${pos}]', '${level}', 1);`,
      );

      // 4. reading quiz (읽기 맞추기)
      const wrongReadings = generateWrongOptions(entry.reading, allReadings, 3);
      const readingOptions = shuffle([entry.reading, ...wrongReadings]);
      lines.push(
        `INSERT INTO quizzes (content_id, type, question, options, answer, explanation, jlpt_level, difficulty) ` +
        `VALUES (currval('contents_id_seq'), 'reading', '「${word}」의 읽기는?', ` +
        `'${escapeSQL(JSON.stringify(readingOptions))}', '${reading}', ` +
        `'${word} → ${reading} (${meaningKo})', '${level}', 1);`,
      );

      totalWords++;
      totalQuizzes += 2;
    }

    lines.push('');
  }

  // ====== Grammar ======
  let totalGrammar = 0;

  for (const level of LEVELS) {
    const filePath = join(DATA_DIR, `jlpt-grammar-${level.toLowerCase()}.json`);
    if (!existsSync(filePath)) continue;

    let entries: GrammarEntry[];
    try {
      entries = JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch {
      continue;
    }

    console.log(`[${level}] ${entries.length}개 문법 처리 중...`);

    const allMeanings = entries.map((e) => e.meaning_ko);

    lines.push(`-- ====== ${level} Grammar (${entries.length}개) ======`);
    lines.push('');

    for (const entry of entries) {
      const pattern = escapeSQL(entry.pattern);
      const meaningKo = escapeSQL(entry.meaning_ko);
      const example = escapeSQL(entry.example);
      const exampleKo = escapeSQL(entry.example_ko);

      // contents INSERT
      lines.push(
        `INSERT INTO contents (type, jlpt_level, title, body_ja, body_ko, source) ` +
        `VALUES ('grammar', '${level}', '${pattern}', '${pattern}: ${example}', '${meaningKo}: ${exampleKo}', 'manual');`,
      );

      // grammar quiz (뜻 맞추기)
      const wrongMeanings = generateWrongOptions(entry.meaning_ko, allMeanings, 3);
      const options = shuffle([entry.meaning_ko, ...wrongMeanings]);
      lines.push(
        `INSERT INTO quizzes (content_id, type, question, options, answer, explanation, jlpt_level, difficulty) ` +
        `VALUES (currval('contents_id_seq'), 'grammar', '「${pattern}」의 뜻은?', ` +
        `'${escapeSQL(JSON.stringify(options))}', '${meaningKo}', ` +
        `'${pattern} = ${meaningKo} / 예: ${example} (${exampleKo})', '${level}', 1);`,
      );

      totalGrammar++;
      totalQuizzes++;
    }

    lines.push('');
  }

  // ====== Sentences ======
  let totalSentences = 0;

  for (const level of LEVELS) {
    const filePath = join(DATA_DIR, `jlpt-sentences-${level.toLowerCase()}.json`);
    if (!existsSync(filePath)) continue;

    let entries: SentenceEntry[];
    try {
      entries = JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch {
      continue;
    }

    console.log(`[${level}] ${entries.length}개 예문 처리 중...`);

    lines.push(`-- ====== ${level} Sentences (${entries.length}개) ======`);
    lines.push('');

    for (const entry of entries) {
      const ja = escapeSQL(entry.ja);
      const ko = escapeSQL(entry.ko);
      const reading = entry.reading ? escapeSQL(entry.reading) : null;

      // contents INSERT
      lines.push(
        `INSERT INTO contents (type, jlpt_level, body_ja, body_reading, body_ko, source) ` +
        `VALUES ('sentence', '${level}', '${ja}', ${reading ? `'${reading}'` : 'NULL'}, '${ko}', 'manual');`,
      );

      // translate quiz (번역 맞추기)
      lines.push(
        `INSERT INTO quizzes (content_id, type, question, answer, explanation, jlpt_level, difficulty) ` +
        `VALUES (currval('contents_id_seq'), 'translate', '다음 문장을 번역하세요: 「${ja}」', '${ko}', ` +
        `'${ja} → ${ko}', '${level}', 1);`,
      );

      totalSentences++;
      totalQuizzes++;
    }

    lines.push('');
  }

  lines.push('COMMIT;');
  lines.push('');
  lines.push(`-- 통계: ${totalWords}개 단어, ${totalGrammar}개 문법, ${totalSentences}개 예문, ${totalQuizzes}개 퀴즈`);

  return lines.join('\n');
}

const sql = generateSQL();
const outPath = join(import.meta.dirname ?? '.', '..', 'seed.sql');
writeFileSync(outPath, sql, 'utf-8');

console.log(`\nseed.sql 생성 완료!`);
console.log(`파일: ${outPath}`);
console.log(`크기: ${(sql.length / 1024).toFixed(1)} KB`);
