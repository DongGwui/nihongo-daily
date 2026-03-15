import { readFileSync } from 'fs';
import { db } from '../../db/client.js';
import { contents } from '../../db/schema.js';
import type { JlptLevel } from '../../db/schema.js';

interface SentenceEntry {
  ja: string;
  ko: string;
  reading?: string;
}

export async function importSentencesFromJson(
  filePath: string,
  level: JlptLevel,
): Promise<number> {
  const data = JSON.parse(readFileSync(filePath, 'utf-8')) as SentenceEntry[];
  let saved = 0;

  for (const entry of data) {
    try {
      await db.insert(contents).values({
        type: 'sentence',
        jlptLevel: level,
        bodyJa: entry.ja,
        bodyReading: entry.reading ?? null,
        bodyKo: entry.ko,
        source: 'manual',
      });
      saved++;
    } catch {
      // skip duplicates
    }
  }

  return saved;
}

export async function importAllSentenceLevels(): Promise<Record<string, number>> {
  const levels: { level: JlptLevel; file: string }[] = [
    { level: 'N5', file: 'data/jlpt-sentences-n5.json' },
    { level: 'N4', file: 'data/jlpt-sentences-n4.json' },
    { level: 'N3', file: 'data/jlpt-sentences-n3.json' },
    { level: 'N2', file: 'data/jlpt-sentences-n2.json' },
    { level: 'N1', file: 'data/jlpt-sentences-n1.json' },
  ];

  const results: Record<string, number> = {};

  for (const { level, file } of levels) {
    try {
      results[level] = await importSentencesFromJson(file, level);
      console.log(`Imported ${results[level]} ${level} sentences`);
    } catch {
      console.warn(`[SKIP] ${file} not found`);
      results[level] = 0;
    }
  }

  return results;
}
