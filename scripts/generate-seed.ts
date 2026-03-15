/**
 * JLPT 전 레벨 seed.sql 생성기
 *
 * 각 단어별로:
 * 1. contents 테이블 INSERT (vocabulary 타입)
 * 2. vocabularies 테이블 INSERT
 * 3. quizzes 테이블 INSERT x2 (vocabulary + reading 퀴즈)
 *
 * 사용법: npx tsx scripts/generate-seed.ts
 * 출력: seed.sql
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface VocabEntry {
  word: string;
  reading: string;
  meaning_ko: string;
  pos: string;
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

  lines.push('COMMIT;');
  lines.push('');
  lines.push(`-- 통계: ${totalWords}개 단어, ${totalQuizzes}개 퀴즈`);

  return lines.join('\n');
}

const sql = generateSQL();
const outPath = join(import.meta.dirname ?? '.', '..', 'seed.sql');
writeFileSync(outPath, sql, 'utf-8');

console.log(`\nseed.sql 생성 완료!`);
console.log(`파일: ${outPath}`);
console.log(`크기: ${(sql.length / 1024).toFixed(1)} KB`);
