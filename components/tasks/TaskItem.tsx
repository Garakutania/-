'use client';

import { Task } from '@/lib/types';

interface Props {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const priorityColors: Record<Task['priority'], string> = {
  high: 'var(--danger)',
  medium: 'var(--warning)',
  low: 'var(--success)',
};

const priorityLabels: Record<Task['priority'], string> = {
  high: '高',
  medium: '中',
  low: '低',
};

export default function TaskItem({ task, onToggle, onDelete }: Props) {
  const isDone = task.status === 'done';
  return (
    <div
      className="flex items-start gap-2 py-2 px-1 rounded group"
      style={{ opacity: isDone ? 0.5 : 1 }}
    >
      <button
        onClick={() => onToggle(task.id)}
        className="mt-0.5 w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors"
        style={{
          borderColor: isDone ? 'var(--success)' : 'var(--border)',
          backgroundColor: isDone ? 'var(--success)' : 'transparent',
        }}
      >
        {isDone && <span className="text-white text-xs leading-none">✓</span>}
      </button>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm leading-snug"
          style={{
            color: 'var(--text-primary)',
            textDecoration: isDone ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className="text-xs px-1.5 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: `${priorityColors[task.priority]}22`, color: priorityColors[task.priority] }}
          >
            {priorityLabels[task.priority]}
          </span>
          {task.dueDate && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {new Date(task.dueDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}まで
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 text-xs transition-opacity flex-shrink-0"
        style={{ color: 'var(--text-muted)' }}
      >
        ✕
      </button>
    </div>
  );
}
