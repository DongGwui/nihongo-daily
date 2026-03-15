/**
 * data/ JSON 파일에서 SQL INSERT 문을 생성하는 스크립트
 * 생성된 SQL을 홈서버에서 직접 실행
 *
 * 사용법:
 *   npx tsx scripts/generate-seed-sql.ts > seed.sql
 *   scp seed.sql homeserver:~/
 *   ssh homeserver "docker exec -i shared-postgres psql -U postgres -d nihongo < ~/seed.sql"
 */
import { readFileSync } from 'fs';

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

function esc(s: string): string {
  return s.replace(/'/g, "''");
}

const VOCAB_FILES = [
  { level: 'N5', file: 'data/jlpt-vocab-n5.json' },
  { level: 'N4', file: 'data/jlpt-vocab-n4.json' },
  { level: 'N3', file: 'data/jlpt-vocab-n3.json' },
];

const GRAMMAR_FILES = [
  { level: 'N5', file: 'data/jlpt-grammar-n5.json' },
  { level: 'N4', file: 'data/jlpt-grammar-n4.json' },
  { level: 'N3', file: 'data/jlpt-grammar-n3.json' },
];

console.log('-- nihongo-daily seed data');
console.log('-- Generated: ' + new Date().toISOString());
console.log('BEGIN;');
console.log('');

// 기존 데이터 삭제 (의존 순서)
console.log('DELETE FROM user_quiz_results;');
console.log('DELETE FROM review_cards;');
console.log('DELETE FROM daily_logs;');
console.log('DELETE FROM quizzes;');
console.log('DELETE FROM vocabularies;');
console.log('DELETE FROM contents;');
console.log('');

for (const { level, file } of VOCAB_FILES) {
  const data = JSON.parse(readFileSync(file, 'utf-8')) as VocabEntry[];

  for (const entry of data) {
    // contents INSERT + RETURNING id 대신, currval 사용
    console.log(
      `INSERT INTO contents (type, jlpt_level, title, body_ja, body_reading, body_ko, source) VALUES ` +
      `('vocabulary', '${level}', '${esc(entry.word)}', '${esc(entry.word)}(${esc(entry.reading)})', '${esc(entry.reading)}', '${esc(entry.meaning_ko)}', 'jmdict');`
    );

    // vocabulary
    console.log(
      `INSERT INTO vocabularies (word, reading, meaning_ko, jlpt_level, part_of_speech, content_id) VALUES ` +
      `('${esc(entry.word)}', '${esc(entry.reading)}', '${esc(entry.meaning_ko)}', '${level}', '${esc(entry.pos)}', currval('contents_id_seq'));`
    );

    // 의미 퀴즈
    const wrongMeanings = getWrongAnswers(data, entry, 3);
    const meaningOptions = shuffle([entry.meaning_ko, ...wrongMeanings]);
    console.log(
      `INSERT INTO quizzes (content_id, type, question, options, answer, explanation, jlpt_level, difficulty) VALUES ` +
      `(currval('contents_id_seq'), 'vocabulary', '「${esc(entry.word)}」의 뜻은?', '${JSON.stringify(meaningOptions).replace(/'/g, "''")}', '${esc(entry.meaning_ko)}', '${esc(entry.word)}(${esc(entry.reading)}) = ${esc(entry.meaning_ko)} [${esc(entry.pos)}]', '${level}', 1);`
    );

    // 읽기 퀴즈
    const wrongReadings = getWrongReadings(data, entry, 3);
    const readingOptions = shuffle([entry.reading, ...wrongReadings]);
    console.log(
      `INSERT INTO quizzes (content_id, type, question, options, answer, explanation, jlpt_level, difficulty) VALUES ` +
      `(currval('contents_id_seq'), 'reading', '「${esc(entry.word)}」의 읽기는?', '${JSON.stringify(readingOptions).replace(/'/g, "''")}', '${esc(entry.reading)}', '${esc(entry.word)} → ${esc(entry.reading)} (${esc(entry.meaning_ko)})', '${level}', 1);`
    );
  }
  console.log(`-- ${level} vocabulary: ${data.length} words`);
  console.log('');
}

for (const { level, file } of GRAMMAR_FILES) {
  const data = JSON.parse(readFileSync(file, 'utf-8')) as GrammarEntry[];

  for (const entry of data) {
    console.log(
      `INSERT INTO contents (type, jlpt_level, title, body_ja, body_reading, body_ko, source) VALUES ` +
      `('grammar', '${level}', '${esc(entry.pattern)}', '${esc(entry.example)}', '${esc(entry.example)}', '${esc(entry.meaning_ko)}\n예: ${esc(entry.example_ko)}', 'generated');`
    );

    const wrongMeanings = getWrongGrammarAnswers(data, entry, 3);
    const options = shuffle([entry.meaning_ko, ...wrongMeanings]);
    console.log(
      `INSERT INTO quizzes (content_id, type, question, options, answer, explanation, jlpt_level, difficulty) VALUES ` +
      `(currval('contents_id_seq'), 'grammar', '「${esc(entry.pattern)}」의 뜻은?', '${JSON.stringify(options).replace(/'/g, "''")}', '${esc(entry.meaning_ko)}', '${esc(entry.pattern)} = ${esc(entry.meaning_ko)}\n예: ${esc(entry.example)} (${esc(entry.example_ko)})', '${level}', 1);`
    );
  }
  console.log(`-- ${level} grammar: ${data.length} patterns`);
  console.log('');
}

console.log('COMMIT;');

// --- helpers ---
function getWrongAnswers(data: VocabEntry[], correct: VocabEntry, count: number): string[] {
  return pickRandom(data.filter(e => e.meaning_ko !== correct.meaning_ko), count).map(e => e.meaning_ko);
}
function getWrongReadings(data: VocabEntry[], correct: VocabEntry, count: number): string[] {
  return pickRandom(data.filter(e => e.reading !== correct.reading), count).map(e => e.reading);
}
function getWrongGrammarAnswers(data: GrammarEntry[], correct: GrammarEntry, count: number): string[] {
  return pickRandom(data.filter(e => e.meaning_ko !== correct.meaning_ko), count).map(e => e.meaning_ko);
}
function pickRandom<T>(arr: T[], count: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, count);
}
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}
