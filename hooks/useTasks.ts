'use client';

import { useLocalStorage } from './useLocalStorage';
import { Task } from '@/lib/types';

export function useTasks() {
  const [tasks, setTasks] = useLocalStorage<Task[]>('secretary-tasks', []);

  const addTask = (data: Omit<Task, 'id' | 'createdAt' | 'status'>) => {
    const task: Task = {
      ...data,
      id: crypto.randomUUID(),
      status: 'todo',
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [task, ...prev]);
  };

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: t.status === 'todo' ? 'done' : 'todo' } : t))
    );
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  return { tasks, addTask, toggleTask, deleteTask };
}
