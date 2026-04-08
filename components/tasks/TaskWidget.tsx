'use client';

import { useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import TaskItem from './TaskItem';
import TaskForm from './TaskForm';
import WidgetShell from '../layout/WidgetShell';

export default function TaskWidget() {
  const { tasks, addTask, toggleTask, deleteTask } = useTasks();
  const [showForm, setShowForm] = useState(false);

  const pending = tasks.filter((t) => t.status === 'todo');
  const done = tasks.filter((t) => t.status === 'done');

  return (
    <WidgetShell
      title="タスク"
      badge={pending.length > 0 ? String(pending.length) : undefined}
      action={
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs px-2 py-1 rounded font-medium"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          + 追加
        </button>
      }
    >
      {showForm && (
        <TaskForm onAdd={(d) => { addTask(d); setShowForm(false); }} onCancel={() => setShowForm(false)} />
      )}
      {tasks.length === 0 && !showForm && (
        <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
          タスクがありません
        </p>
      )}
      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
        {pending.map((t) => (
          <TaskItem key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} />
        ))}
        {done.map((t) => (
          <TaskItem key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} />
        ))}
      </div>
    </WidgetShell>
  );
}
