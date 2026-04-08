export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import Anthropic from '@anthropic-ai/sdk';
import Parser from 'rss-parser';
import { NextResponse } from 'next/server';
import { NewsItem } from '@/lib/types';

const RSS_FEEDS = [
  { url: 'https://www.nhk.or.jp/rss/news/cat4.xml', source: 'NHK 政治・経済' },
  { url: 'https://www.nhk.or.jp/rss/news/cat6.xml', source: 'NHK 国際' },
];

const parser = new Parser({
  customFields: { item: ['description'] },
  requestOptions: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; SecretaryBot/1.0)',
    },
  },
});

async function fetchFeed(url: string, source: string): Promise<NewsItem[]> {
  try {
    const feed = await parser.parseURL(url);
    return (feed.items ?? []).slice(0, 5).map((item) => ({
      title: item.title ?? '',
      link: item.link ?? '',
      pubDate: item.pubDate ?? item.isoDate ?? '',
      source,
    }));
  } catch {
    return [];
  }
}

export async function GET() {
  const results = await Promise.allSettled(
    RSS_FEEDS.map((f) => fetchFeed(f.url, f.source))
  );
  const items: NewsItem[] = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

  if (items.length === 0) {
    return NextResponse.json({ summary: 'ニュースを取得できませんでした。', items: [] });
  }

  const headlineText = items.map((it) => `・${it.source}: ${it.title}`).join('\n');

  const client = new Anthropic();
  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `以下の今日のニュース見出しを3〜5文で簡潔に日本語で要約してください。政治・経済の重要ポイントを中心にまとめてください。\n\n${headlineText}`,
      },
    ],
  });

  const summary = res.content[0].type === 'text' ? res.content[0].text : '';

  return NextResponse.json({ summary, items });
}
