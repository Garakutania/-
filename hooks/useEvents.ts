'use client';

import { useLocalStorage } from './useLocalStorage';
import { Event } from '@/lib/types';

export function useEvents() {
  const [events, setEvents] = useLocalStorage<Event[]>('secretary-events', []);

  const addEvent = (data: Omit<Event, 'id'>) => {
    const event: Event = { ...data, id: crypto.randomUUID() };
    setEvents((prev) => [...prev, event].sort((a, b) => a.date.localeCompare(b.date)));
  };

  const deleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  return { events, addEvent, deleteEvent };
}
