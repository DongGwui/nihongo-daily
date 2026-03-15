import * as cheerio from 'cheerio';
import { db } from '../../db/client.js';
import { contents } from '../../db/schema.js';

const NHK_EASY_API = 'https://www3.nhk.or.jp/news/easy/news/list.json';
const NHK_EASY_ARTICLE = 'https://www3.nhk.or.jp/news/easy';

interface NhkArticle {
  id: string;
  title: string;
  titleWithRuby: string;
  body: string;
  bodyWithRuby: string;
  publishedAt: Date;
  url: string;
}

export async function fetchArticleList(): Promise<{ news_id: string; title: string; title_with_ruby: string; news_prearranged_time: string }[]> {
  const res = await fetch(NHK_EASY_API);
  const data = await res.json() as Record<string, { news_id: string; title: string; title_with_ruby: string; news_prearranged_time: string }[]>;

  // API returns { "YYYY-MM-DD": [...articles] }
  const articles: { news_id: string; title: string; title_with_ruby: string; news_prearranged_time: string }[] = [];
  for (const dateArticles of Object.values(data)) {
    articles.push(...dateArticles);
  }

  return articles.slice(0, 10); // 최신 10개
}

export async function fetchArticleBody(newsId: string): Promise<{ body: string; bodyWithRuby: string }> {
  const url = `${NHK_EASY_ARTICLE}/${newsId}/${newsId}.html`;
  const res = await fetch(url);
  const html = await res.text();

  const $ = cheerio.load(html);
  const articleBody = $('#js-article-body');

  // Ruby 태그에서 후리가나 추출
  const bodyWithRuby = articleBody.html() ?? '';
  const body = articleBody.text().trim();

  return { body, bodyWithRuby };
}

function extractReadingFromRuby(html: string): string {
  const $ = cheerio.load(html);
  let result = '';

  $('body').contents().each(function () {
    const el = $(this);
    if (this.type === 'text') {
      result += el.text();
    } else if (this.type === 'tag' && this.name === 'ruby') {
      const base = el.find('rb').text() || el.contents().first().text();
      const reading = el.find('rt').text();
      result += reading ? `${base}(${reading})` : base;
    } else {
      result += el.text();
    }
  });

  return result;
}

export async function crawlAndSave(limit = 5): Promise<number> {
  const articles = await fetchArticleList();
  let saved = 0;

  for (const article of articles.slice(0, limit)) {
    try {
      const { body, bodyWithRuby } = await fetchArticleBody(article.news_id);
      if (!body) continue;

      const reading = extractReadingFromRuby(bodyWithRuby);

      await db.insert(contents).values({
        type: 'news',
        jlptLevel: 'N3', // NHK Easy는 기본 N3
        title: article.title.replace(/<[^>]*>/g, ''),
        bodyJa: body,
        bodyReading: reading,
        source: 'nhk_easy',
        sourceUrl: `${NHK_EASY_ARTICLE}/${article.news_id}/${article.news_id}.html`,
      }).onConflictDoNothing();

      saved++;
    } catch (err) {
      console.error(`Failed to crawl article ${article.news_id}:`, err);
    }
  }

  return saved;
}
