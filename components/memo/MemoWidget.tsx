'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useMemos } from '@/hooks/useMemos';
import WidgetShell from '../layout/WidgetShell';
import { Memo } from '@/lib/types';

export default function MemoWidget() {
  const { memos, addMemo, updateMemo, deleteMemo } = useMemos();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localTitle, setLocalTitle] = useState('');
  const [localContent, setLocalContent] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = memos.find((m) => m.id === selectedId) ?? null;

  useEffect(() => {
    if (selected) {
      setLocalTitle(selected.title);
      setLocalContent(selected.content);
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const scheduleSave = useCallback(
    (id: string, fields: Partial<Pick<Memo, 'title' | 'content'>>) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => updateMemo(id, fields), 500);
    },
    [updateMemo]
  );

  const handleNewMemo = () => {
    const id = addMemo();
    setSelectedId(id);
  };

  return (
    <WidgetShell
      title="メモ"
      badge={memos.length > 0 ? String(memos.length) : undefined}
      action={
        <button
          onClick={handleNewMemo}
          className="text-xs px-2 py-1 rounded font-medium"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          + 新規
        </button>
      }
      noPad
    >
      <div className="flex h-64">
        {/* Memo list */}
        <div className="w-1/3 border-r overflow-y-auto flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          {memos.length === 0 && (
            <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
              メモなし
            </p>
          )}
          {memos.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedId(m.id)}
              className="w-full text-left px-3 py-2 text-xs border-b transition-colors"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: selectedId === m.id ? 'var(--bg-secondary)' : 'transparent',
                color: selectedId === m.id ? 'var(--accent-light)' : 'var(--text-secondary)',
              }}
            >
              <div className="truncate font-medium">{m.title}</div>
              <div className="truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {m.content.slice(0, 40) || '（空白）'}
              </div>
            </button>
          ))}
        </div>
        {/* Editor */}
        <div className="flex-1 flex flex-col">
          {selected ? (
            <>
              <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                <input
                  className="flex-1 bg-transparent text-sm font-medium outline-none"
                  style={{ color: 'var(--text-primary)' }}
                  value={localTitle}
                  onChange={(e) => {
                    setLocalTitle(e.target.value);
                    scheduleSave(selected.id, { title: e.target.value });
                  }}
                />
                <button
                  onClick={() => { deleteMemo(selected.id); setSelectedId(null); }}
                  className="text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  削除
                </button>
              </div>
              <textarea
                className="flex-1 bg-transparent text-sm p-3 outline-none resize-none"
                style={{ color: 'var(--text-primary)' }}
                placeholder="メモを入力..."
                value={localContent}
                onChange={(e) => {
                  setLocalContent(e.target.value);
                  scheduleSave(selected.id, { content: e.target.value });
                }}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                メモを選択または新規作成
              </p>
            </div>
          )}
        </div>
      </div>
    </WidgetShell>
  );
}
