'use client';

import { useState } from 'react';
import { Task } from '@/lib/types';

interface Props {
  onAdd: (data: Omit<Task, 'id' | 'createdAt' | 'status'>) => void;
  onCancel: () => void;
}

export default function TaskForm({ onAdd, onCancel }: Props) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [dueDate, setDueDate] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ title: title.trim(), priority, dueDate: dueDate || undefined });
    setTitle('');
    setPriority('medium');
    setDueDate('');
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 p-3 rounded-lg mb-2" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
      <input
        autoFocus
        className="w-full bg-transparent border-none outline-none text-sm"
        style={{ color: 'var(--text-primary)' }}
        placeholder="タスク名を入力..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <select
          className="text-xs rounded px-2 py-1 flex-1"
          style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          value={priority}
          onChange={(e) => setPriority(e.target.value as Task['priority'])}
        >
          <option value="high">高優先度</option>
          <option value="medium">中優先度</option>
          <option value="low">低優先度</option>
        </select>
        <input
          type="date"
          className="text-xs rounded px-2 py-1 flex-1"
          style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="text-xs px-3 py-1 rounded" style={{ color: 'var(--text-muted)' }}>
          キャンセル
        </button>
        <button type="submit" className="text-xs px-3 py-1 rounded font-medium" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
          追加
        </button>
      </div>
    </form>
  );
}
