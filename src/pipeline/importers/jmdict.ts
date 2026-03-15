import { readFileSync } from 'fs';
import { db } from '../../db/client.js';
import { vocabularies } from '../../db/schema.js';
import type { JlptLevel } from '../../db/schema.js';

interface VocabEntry {
  word: string;
  reading: string;
  meaning_ko: string;
  pos: string;
}

export async function importVocabFromJson(
  filePath: string,
  level: JlptLevel
): Promise<number> {
  const data = JSON.parse(readFileSync(filePath, 'utf-8')) as VocabEntry[];
  let saved = 0;

  for (const entry of data) {
    try {
      await db.insert(vocabularies).values({
        word: entry.word,
        reading: entry.reading,
        meaningKo: entry.meaning_ko,
        jlptLevel: level,
        partOfSpeech: entry.pos,
      });
      saved++;
    } catch {
      // skip duplicates
    }
  }

  return saved;
}

export async function importAllLevels(): Promise<Record<string, number>> {
  const levels: { level: JlptLevel; file: string }[] = [
    { level: 'N5', file: 'data/jlpt-vocab-n5.json' },
    { level: 'N4', file: 'data/jlpt-vocab-n4.json' },
    { level: 'N3', file: 'data/jlpt-vocab-n3.json' },
  ];

  const results: Record<string, number> = {};

  for (const { level, file } of levels) {
    results[level] = await importVocabFromJson(file, level);
    console.log(`Imported ${results[level]} ${level} vocabularies`);
  }

  return results;
}
