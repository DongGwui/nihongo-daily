import { readFileSync } from 'fs';
import { db } from '../../db/client.js';
import { contents } from '../../db/schema.js';
import { classifyLevel } from '../classifiers/level-classifier.js';

interface TatoebaSentence {
  id: string;
  lang: string;
  text: string;
}

interface SentencePair {
  ja: string;
  ko: string;
}

export async function importFromTsv(
  jaFilePath: string,
  koFilePath: string,
  linksFilePath: string,
  limit = 500
): Promise<number> {
  // Tatoeba TSV format: id\tlang\ttext
  const jaLines = readFileSync(jaFilePath, 'utf-8').split('\n').filter(Boolean);
  const koLines = readFileSync(koFilePath, 'utf-8').split('\n').filter(Boolean);
  const links = readFileSync(linksFilePath, 'utf-8').split('\n').filter(Boolean);

  // Build lookup maps
  const jaMap = new Map<string, string>();
  for (const line of jaLines) {
    const [id, , text] = line.split('\t');
    if (id && text) jaMap.set(id, text);
  }

  const koMap = new Map<string, string>();
  for (const line of koLines) {
    const [id, , text] = line.split('\t');
    if (id && text) koMap.set(id, text);
  }

  // Find Japanese-Korean pairs via links
  const pairs: SentencePair[] = [];
  for (const line of links) {
    const [jaId, koId] = line.split('\t');
    const ja = jaMap.get(jaId ?? '');
    const ko = koMap.get(koId ?? '');
    if (ja && ko) {
      pairs.push({ ja, ko });
      if (pairs.length >= limit) break;
    }
  }

  let saved = 0;
  for (const pair of pairs) {
    try {
      const level = await classifyLevel(pair.ja);

      await db.insert(contents).values({
        type: 'sentence',
        jlptLevel: level.level,
        bodyJa: pair.ja,
        bodyKo: pair.ko,
        source: 'tatoeba',
      });

      saved++;
    } catch {
      // skip duplicates or errors
    }
  }

  return saved;
}

export async function importFromJson(jsonFilePath: string, limit = 200): Promise<number> {
  const data = JSON.parse(readFileSync(jsonFilePath, 'utf-8')) as SentencePair[];
  let saved = 0;

  for (const pair of data.slice(0, limit)) {
    try {
      const level = await classifyLevel(pair.ja);

      await db.insert(contents).values({
        type: 'sentence',
        jlptLevel: level.level,
        bodyJa: pair.ja,
        bodyKo: pair.ko,
        source: 'tatoeba',
      });

      saved++;
    } catch {
      // skip
    }
  }

  return saved;
}
