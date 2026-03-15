import { db } from '../../db/client.js';
import { contents } from '../../db/schema.js';
import { config } from '../../lib/config.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { eq } from 'drizzle-orm';

/**
 * NHK Easy News 크롤러 + Gemini fallback 하이브리드 방식
 *
 * 1차: NHK Easy News에서 실제 기사 크롤링 (후리가나 포함)
 * 2차: NHK 실패 시 Gemini로 학습 콘텐츠 생성 (fallback)
 */

interface ArticleContent {
  title: string;
  bodyJa: string;
  bodyReading: string;
  bodyKo: string;
  source: 'nhk_easy' | 'generated';
  sourceUrl?: string;
}

interface NhkArticleMeta {
  news_id: string;
  title: string;
  title_with_ruby: string;
  news_prearranged_time: string;
}

// ====== NHK Easy News 크롤러 ======

/**
 * NHK 인증: profileType=abroad로 JWT 쿠키 발급
 * 리다이렉트 체인을 따라가며 쿠키 수집
 */
async function nhkAuthenticate(): Promise<Record<string, string>> {
  const cookies: Record<string, string> = {};
  const headers = { 'User-Agent': 'curl/8.14.1' };

  // Step 1: 홈페이지 접근 (초기 쿠키)
  const homeRes = await fetch('https://news.web.nhk/news/easy/', {
    headers,
    redirect: 'manual',
  });
  collectCookies(homeRes, cookies);

  // Step 2: abroad 프로필로 JWT 발급 요청
  const authUrl = new URL('https://news.web.nhk/tix/build_authorize');
  authUrl.searchParams.set('idp', 'a-alaz');
  authUrl.searchParams.set('profileType', 'abroad');
  authUrl.searchParams.set('redirect_uri', 'https://news.web.nhk/news/easy/');
  authUrl.searchParams.set('entity', 'none');
  authUrl.searchParams.set('area', '130');
  authUrl.searchParams.set('pref', '13');
  authUrl.searchParams.set('jisx0402', '13101');
  authUrl.searchParams.set('postal', '1000001');

  let res = await fetch(authUrl.toString(), {
    headers: { ...headers, Cookie: formatCookies(cookies) },
    redirect: 'manual',
  });
  collectCookies(res, cookies);

  // Step 3: 리다이렉트 체인 따라가기 (JWT 쿠키 획득)
  let location = res.headers.get('location');
  let maxRedirects = 10;
  while (location && maxRedirects-- > 0) {
    const url = location.startsWith('/')
      ? 'https://news.web.nhk' + location
      : location;
    res = await fetch(url, {
      headers: { ...headers, Cookie: formatCookies(cookies) },
      redirect: 'manual',
    });
    collectCookies(res, cookies);
    location = res.headers.get('location');
  }

  return cookies;
}

function collectCookies(res: Response, cookies: Record<string, string>) {
  const setCookies = res.headers.getSetCookie?.() ?? [];
  for (const sc of setCookies) {
    const match = sc.match(/^([^=]+)=([^;]*)/);
    if (match) cookies[match[1]] = match[2];
  }
}

function formatCookies(cookies: Record<string, string>): string {
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function fetchNhkArticleList(cookies: Record<string, string>): Promise<NhkArticleMeta[]> {
  const res = await fetch('https://news.web.nhk/news/easy/news-list.json', {
    headers: {
      'User-Agent': 'curl/8.14.1',
      Cookie: formatCookies(cookies),
    },
  });

  if (!res.ok) {
    throw new Error(`NHK news-list.json returned ${res.status}`);
  }

  // 구조: [{"2026-03-13": [{article}, ...]}, ...]
  const data = (await res.json()) as Array<Record<string, NhkArticleMeta[]>>;
  const articles: NhkArticleMeta[] = [];
  for (const dateObj of data) {
    for (const dateArticles of Object.values(dateObj)) {
      articles.push(...dateArticles);
    }
  }
  return articles;
}

/**
 * RSC flight 요청으로 기사 본문 추출 (후리가나 포함)
 */
async function fetchNhkArticleBody(
  newsId: string,
  cookies: Record<string, string>,
): Promise<{ bodyJa: string; bodyReading: string } | null> {
  const url = `https://news.web.nhk/news/easy/${newsId}/${newsId}.html?_rsc=1`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'curl/8.14.1',
      Cookie: formatCookies(cookies),
      RSC: '1',
      'Next-Router-State-Tree': '%5B%22%22%5D',
    },
  });

  if (!res.ok) return null;

  const rscText = await res.text();
  const unescaped = rscText
    .replace(/\\u003c/g, '<')
    .replace(/\\u003e/g, '>')
    .replace(/\\u0026/g, '&')
    .replace(/\\"/g, '"');

  // 기사 본문 <p> 태그 추출 (ruby 포함, 30자 이상의 일본어 단락)
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
  const paragraphs: { plain: string; reading: string }[] = [];
  let pMatch;

  while ((pMatch = pRegex.exec(unescaped)) !== null) {
    const content = pMatch[1];
    // 30자 이상 + 일본어 포함 + ruby 태그 포함 (기사 본문 식별)
    if (content.length > 50 && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(content) && content.includes('<ruby>')) {
      const plain = content
        .replace(/<ruby>([^<]*)<rt>[^<]*<\/rt><\/ruby>/g, '$1')
        .replace(/<[^>]*>/g, '')
        .trim();
      const reading = content
        .replace(/<ruby>([^<]*)<rt>([^<]*)<\/rt><\/ruby>/g, '$1($2)')
        .replace(/<[^>]*>/g, '')
        .trim();

      // 사이트 공통 문구 및 노이즈 제외
      const skipPatterns = [
        'NHKやさしいことばニュース', 'やさしい日本語で', '月曜日から金曜日',
        'ラジオ', '読みこみ中', 'がいこくご', '災害情報', '日本語を学ぶ',
        'キャスター', '上田', '石井', '後藤',
      ];
      if (skipPatterns.some((p) => plain.includes(p))) continue;
      if (plain.length < 20) continue;

      paragraphs.push({ plain, reading });
    }
  }

  if (paragraphs.length === 0) return null;

  return {
    bodyJa: paragraphs.map((p) => p.plain).join('\n'),
    bodyReading: paragraphs.map((p) => p.reading).join('\n'),
  };
}

async function translateWithGemini(title: string, bodyJa: string): Promise<string> {
  if (!config.GEMINI_API_KEY) return '';

  const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const result = await model.generateContent(
    `다음 일본어 뉴스를 한국어로 번역해주세요. 번역문만 출력하세요.\n\n제목: ${title}\n본문: ${bodyJa}`,
  );
  return result.response.text().trim();
}

export async function fetchFromNhk(limit: number): Promise<ArticleContent[]> {
  console.log('[NHK] 인증 중...');
  const cookies = await nhkAuthenticate();

  console.log('[NHK] 기사 목록 조회 중...');
  const metas = await fetchNhkArticleList(cookies);
  console.log(`[NHK] ${metas.length}개 기사 발견`);

  const results: ArticleContent[] = [];

  for (const meta of metas.slice(0, limit * 2)) {
    if (results.length >= limit) break;

    try {
      const body = await fetchNhkArticleBody(meta.news_id, cookies);
      if (!body || !body.bodyJa) continue;

      const title = meta.title.replace(/<[^>]*>/g, '');
      const bodyKo = await translateWithGemini(title, body.bodyJa);

      results.push({
        title,
        bodyJa: body.bodyJa,
        bodyReading: body.bodyReading,
        bodyKo,
        source: 'nhk_easy',
        sourceUrl: `https://news.web.nhk/news/easy/${meta.news_id}/${meta.news_id}.html`,
      });
    } catch (err) {
      console.error(`[NHK] 기사 처리 실패 (${meta.news_id}):`, err);
    }
  }

  return results;
}

// ====== Gemini fallback ======

async function fetchFromGemini(): Promise<ArticleContent[]> {
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
    "bodyKo": "본문 (한국어 번역)"
  }
]

주제: 일상생활, 계절, 음식, 여행, 문화 등 다양하게.
난이도: N3~N5 수준의 쉬운 문장.
반드시 JSON 배열로만 응답하세요.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  const parsed = JSON.parse(jsonMatch[0]) as Array<{
    title: string;
    bodyJa: string;
    bodyReading: string;
    bodyKo: string;
  }>;

  return parsed.map((a) => ({
    ...a,
    source: 'generated' as const,
  }));
}

// ====== 공개 API ======

export async function fetchArticleList(): Promise<ArticleContent[]> {
  // 1차: NHK Easy News 크롤링 시도
  try {
    const nhkArticles = await fetchFromNhk(5);
    if (nhkArticles.length > 0) {
      console.log(`[Pipeline] NHK에서 ${nhkArticles.length}개 기사 가져옴`);
      return nhkArticles;
    }
    console.warn('[Pipeline] NHK 기사 0개 → Gemini fallback');
  } catch (err) {
    console.warn('[Pipeline] NHK 크롤링 실패 → Gemini fallback:', (err as Error).message);
  }

  // 2차: Gemini fallback
  const generated = await fetchFromGemini();
  console.log(`[Pipeline] Gemini로 ${generated.length}개 콘텐츠 생성`);
  return generated;
}

export async function crawlAndSave(limit = 5): Promise<number> {
  const articles = await fetchArticleList();
  let saved = 0;

  // 기존 콘텐츠의 title 목록으로 중복 체크
  const existing = await db
    .select({ title: contents.title })
    .from(contents)
    .where(eq(contents.source, articles[0]?.source ?? 'nhk_easy'));
  const existingTitles = new Set(existing.map((e) => e.title));

  for (const article of articles.slice(0, limit)) {
    if (existingTitles.has(article.title)) {
      console.log(`[Skip] 이미 존재: ${article.title}`);
      continue;
    }

    try {
      await db.insert(contents).values({
        type: 'news',
        jlptLevel: 'N3',
        title: article.title,
        bodyJa: article.bodyJa,
        bodyReading: article.bodyReading,
        bodyKo: article.bodyKo,
        source: article.source,
        sourceUrl: article.sourceUrl,
      });
      saved++;
      existingTitles.add(article.title);
    } catch (err) {
      console.error(`Failed to save content:`, err);
    }
  }

  return saved;
}
