import { readFileSync } from 'fs';
import { db } from '../../db/client.js';
import { contents } from '../../db/schema.js';
import type { JlptLevel } from '../../db/schema.js';

interface GrammarEntry {
  pattern: string;
  meaning_ko: string;
  example: string;
  example_ko: string;
}

export async function importGrammarFromJson(
  filePath: string,
  level: JlptLevel,
): Promise<number> {
  const data = JSON.parse(readFileSync(filePath, 'utf-8')) as GrammarEntry[];
  let saved = 0;

  for (const entry of data) {
    try {
      await db.insert(contents).values({
        type: 'grammar',
        jlptLevel: level,
        title: entry.pattern,
        bodyJa: `${entry.pattern}: ${entry.example}`,
        bodyKo: `${entry.meaning_ko}: ${entry.example_ko}`,
        source: 'manual',
      });
      saved++;
    } catch {
      // skip duplicates
    }
  }

  return saved;
}

export async function importAllGrammarLevels(): Promise<Record<string, number>> {
  const levels: { level: JlptLevel; file: string }[] = [
    { level: 'N5', file: 'data/jlpt-grammar-n5.json' },
    { level: 'N4', file: 'data/jlpt-grammar-n4.json' },
    { level: 'N3', file: 'data/jlpt-grammar-n3.json' },
    { level: 'N2', file: 'data/jlpt-grammar-n2.json' },
    { level: 'N1', file: 'data/jlpt-grammar-n1.json' },
  ];

  const results: Record<string, number> = {};

  for (const { level, file } of levels) {
    try {
      results[level] = await importGrammarFromJson(file, level);
      console.log(`Imported ${results[level]} ${level} grammar patterns`);
    } catch {
      console.warn(`[SKIP] ${file} not found`);
      results[level] = 0;
    }
  }

  return results;
}
