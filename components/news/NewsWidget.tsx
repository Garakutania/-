'use client';

import { useEffect } from 'react';
import { useNews } from '@/hooks/useNews';
import WidgetShell from '../layout/WidgetShell';

export default function NewsWidget() {
  const { cache, loading, error, fetchNews, isFresh } = useNews();

  useEffect(() => {
    fetchNews();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchedAt = cache?.fetchedAt
    ? new Date(cache.fetchedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <WidgetShell
      title="ニュース要約"
      action={
        <button
          onClick={() => fetchNews(true)}
          disabled={loading}
          className="text-xs px-2 py-1 rounded"
          style={{ backgroundColor: 'var(--bg-secondary)', color: loading ? 'var(--text-muted)' : 'var(--accent-light)', border: '1px solid var(--border)' }}
        >
          {loading ? '取得中...' : '更新'}
        </button>
      }
      className="flex-1"
    >
      {/* Summary */}
      {loading && !cache && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>ニュースを取得・要約中...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg mb-3" style={{ backgroundColor: '#e05c6e22', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
          <p className="text-xs">{error}</p>
        </div>
      )}

      {cache && (
        <>
          {fetchedAt && (
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              {isFresh ? '✓ ' : ''}取得: {fetchedAt}
              {!isFresh && <span className="ml-1" style={{ color: 'var(--warning)' }}>(キャッシュ期限切れ)</span>}
            </p>
          )}
          {/* AI Summary */}
          <div className="p-3 rounded-lg mb-4" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--accent-light)' }}>AI要約</p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              {cache.summary}
            </p>
          </div>

          {/* Headlines */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>見出し一覧</p>
            <div className="space-y-2">
              {cache.items.map((item, idx) => (
                <a
                  key={idx}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-2 rounded-lg transition-colors hover:opacity-80"
                  style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                >
                  <p className="text-xs font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
                    {item.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {item.source}
                    {item.pubDate && ` · ${new Date(item.pubDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}`}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </WidgetShell>
  );
}
