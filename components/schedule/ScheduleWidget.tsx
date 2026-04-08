'use client';

import { useState } from 'react';
import { useEvents } from '@/hooks/useEvents';
import CalendarMini from './CalendarMini';
import WidgetShell from '../layout/WidgetShell';

export default function ScheduleWidget() {
  const { events, addEvent, deleteEvent } = useEvents();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(today.toISOString().slice(0, 10));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', time: '', description: '' });

  const eventDates = new Set(events.map((e) => e.date));
  const dayEvents = selectedDate ? events.filter((e) => e.date === selectedDate) : [];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const submitEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !selectedDate) return;
    addEvent({ title: form.title.trim(), date: selectedDate, time: form.time || undefined, description: form.description || undefined });
    setForm({ title: '', time: '', description: '' });
    setShowForm(false);
  };

  return (
    <WidgetShell title="スケジュール">
      <CalendarMini
        year={viewYear}
        month={viewMonth}
        eventDates={eventDates}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
        onPrev={prevMonth}
        onNext={nextMonth}
      />
      <div className="mt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {selectedDate
              ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })
              : '日付を選択'}
          </span>
          {selectedDate && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="text-xs px-2 py-0.5 rounded"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            >
              + 追加
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={submitEvent} className="mb-2 flex flex-col gap-1.5 p-2 rounded" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <input
              autoFocus
              className="bg-transparent text-sm outline-none"
              style={{ color: 'var(--text-primary)' }}
              placeholder="予定名..."
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
            />
            <input
              type="time"
              className="bg-transparent text-xs outline-none"
              style={{ color: 'var(--text-secondary)' }}
              value={form.time}
              onChange={(e) => setForm(f => ({ ...f, time: e.target.value }))}
            />
            <div className="flex gap-2 justify-end mt-1">
              <button type="button" onClick={() => setShowForm(false)} className="text-xs" style={{ color: 'var(--text-muted)' }}>
                キャンセル
              </button>
              <button type="submit" className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                保存
              </button>
            </div>
          </form>
        )}

        <div className="space-y-1 max-h-28 overflow-y-auto">
          {dayEvents.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>予定なし</p>
          ) : (
            dayEvents.map((ev) => (
              <div key={ev.id} className="flex items-center gap-2 text-xs py-1 px-2 rounded group" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                {ev.time && <span style={{ color: 'var(--accent-light)' }}>{ev.time}</span>}
                <span className="flex-1" style={{ color: 'var(--text-primary)' }}>{ev.title}</span>
                <button
                  onClick={() => deleteEvent(ev.id)}
                  className="opacity-0 group-hover:opacity-100"
                  style={{ color: 'var(--text-muted)' }}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </WidgetShell>
  );
}
