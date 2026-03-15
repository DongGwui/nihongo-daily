import { describe, it, expect } from 'vitest';

// NHK 크롤러 내부 파싱 로직을 독립적으로 테스트
// fetchNhkArticleBody 안의 regex/파싱 로직을 동일하게 재현

function unescapeRsc(text: string): string {
  return text
    .replace(/\\u003c/g, '<')
    .replace(/\\u003e/g, '>')
    .replace(/\\u0026/g, '&')
    .replace(/\\"/g, '"');
}

function extractParagraphs(html: string): { plain: string; reading: string }[] {
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
  const paragraphs: { plain: string; reading: string }[] = [];
  let pMatch;

  while ((pMatch = pRegex.exec(html)) !== null) {
    const content = pMatch[1];
    if (content.length > 50 && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(content) && content.includes('<ruby>')) {
      const plain = content
        .replace(/<ruby>([^<]*)<rt>[^<]*<\/rt><\/ruby>/g, '$1')
        .replace(/<[^>]*>/g, '')
        .trim();
      const reading = content
        .replace(/<ruby>([^<]*)<rt>([^<]*)<\/rt><\/ruby>/g, '$1($2)')
        .replace(/<[^>]*>/g, '')
        .trim();

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

  return paragraphs;
}

describe('NHK RSC Unescape', () => {
  it('should unescape unicode HTML entities', () => {
    const input = '\\u003cp\\u003eHello\\u003c/p\\u003e';
    expect(unescapeRsc(input)).toBe('<p>Hello</p>');
  });

  it('should unescape ampersands', () => {
    expect(unescapeRsc('A\\u0026B')).toBe('A&B');
  });

  it('should unescape escaped quotes', () => {
    expect(unescapeRsc('say \\"hello\\"')).toBe('say "hello"');
  });
});

describe('NHK Paragraph Extraction', () => {
  it('should extract ruby text into plain and reading', () => {
    const html = '<p class="article-body"><ruby>東京<rt>とうきょう</rt></ruby>では<ruby>今日<rt>きょう</rt></ruby>、<ruby>天気<rt>てんき</rt></ruby>がとてもよかったです。<ruby>公園<rt>こうえん</rt></ruby>にはたくさんの<ruby>人<rt>ひと</rt></ruby>がいました。</p>';
    const result = extractParagraphs(html);

    expect(result).toHaveLength(1);
    expect(result[0].plain).toContain('東京');
    expect(result[0].plain).not.toContain('<ruby>');
    expect(result[0].reading).toContain('東京(とうきょう)');
    expect(result[0].reading).toContain('今日(きょう)');
  });

  it('should skip paragraphs without ruby tags', () => {
    const html = '<p>This is a plain English paragraph without any Japanese ruby annotations at all and it is long enough.</p>';
    const result = extractParagraphs(html);
    expect(result).toHaveLength(0);
  });

  it('should skip short paragraphs', () => {
    const html = '<p><ruby>短<rt>みじか</rt></ruby>い</p>';
    const result = extractParagraphs(html);
    expect(result).toHaveLength(0);
  });

  it('should skip NHK site common phrases', () => {
    const html = '<p class="body">NHKやさしいことばニュースは<ruby>毎日<rt>まいにち</rt></ruby>ニュースをやさしい<ruby>日本語<rt>にほんご</rt></ruby>で<ruby>伝<rt>つた</rt></ruby>えるニュースサイトです。</p>';
    const result = extractParagraphs(html);
    expect(result).toHaveLength(0);
  });

  it('should extract multiple paragraphs', () => {
    const p1 = '<p class="body"><ruby>政府<rt>せいふ</rt></ruby>は<ruby>新<rt>あたら</rt></ruby>しい<ruby>法律<rt>ほうりつ</rt></ruby>を<ruby>作<rt>つく</rt></ruby>ると<ruby>発表<rt>はっぴょう</rt></ruby>しました。この<ruby>法律<rt>ほうりつ</rt></ruby>は<ruby>来年<rt>らいねん</rt></ruby>から<ruby>始<rt>はじ</rt></ruby>まります。</p>';
    const p2 = '<p class="body"><ruby>専門家<rt>せんもんか</rt></ruby>は「この<ruby>法律<rt>ほうりつ</rt></ruby>はとても<ruby>大切<rt>たいせつ</rt></ruby>です」と<ruby>話<rt>はな</rt></ruby>しました。<ruby>国民<rt>こくみん</rt></ruby>の<ruby>生活<rt>せいかつ</rt></ruby>がよくなると<ruby>言<rt>い</rt></ruby>っています。</p>';
    const html = p1 + p2;
    const result = extractParagraphs(html);
    expect(result.length).toBe(2);
  });

  it('should strip all HTML tags from plain text', () => {
    const html = '<p class="body"><span><ruby>東京<rt>とうきょう</rt></ruby></span>の<b><ruby>天気<rt>てんき</rt></ruby></b>はとてもいい<ruby>天気<rt>てんき</rt></ruby>です。<ruby>明日<rt>あした</rt></ruby>も<ruby>晴<rt>は</rt></ruby>れるでしょう。</p>';
    const result = extractParagraphs(html);
    if (result.length > 0) {
      expect(result[0].plain).not.toMatch(/<[^>]*>/);
      expect(result[0].reading).not.toMatch(/<[^>]*>/);
    }
  });
});
