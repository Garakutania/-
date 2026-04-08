'use client';

import { useState } from 'react';
import { NewsCache } from '@/lib/types';

const CACHE_KEY = 'secretary-news-cache';
const TTL_MS = 60 * 60 * 1000; // 1 hour

export function useNews() {
  const [cache, setCache] = useState<NewsCache | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFresh = cache && Date.now() - new Date(cache.fetchedAt).getTime() < TTL_MS;

  const fetchNews = async (force = false) => {
    if (isFresh && !force) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/news');
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      const newCache: NewsCache = { ...data, fetchedAt: new Date().toISOString() };
      setCache(newCache);
      localStorage.setItem(CACHE_KEY, JSON.stringify(newCache));
    } catch {
      setError('ニュースの取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return { cache, loading, error, fetchNews, isFresh: !!isFresh };
}
