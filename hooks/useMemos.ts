'use client';

import { useLocalStorage } from './useLocalStorage';
import { Memo } from '@/lib/types';

export function useMemos() {
  const [memos, setMemos] = useLocalStorage<Memo[]>('secretary-memos', []);

  const addMemo = () => {
    const memo: Memo = {
      id: crypto.randomUUID(),
      title: '新しいメモ',
      content: '',
      updatedAt: new Date().toISOString(),
    };
    setMemos((prev) => [memo, ...prev]);
    return memo.id;
  };

  const updateMemo = (id: string, fields: Partial<Pick<Memo, 'title' | 'content'>>) => {
    setMemos((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...fields, updatedAt: new Date().toISOString() } : m))
    );
  };

  const deleteMemo = (id: string) => {
    setMemos((prev) => prev.filter((m) => m.id !== id));
  };

  return { memos, addMemo, updateMemo, deleteMemo };
}
