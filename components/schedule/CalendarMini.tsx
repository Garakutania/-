'use client';

interface Props {
  year: number;
  month: number; // 0-indexed
  eventDates: Set<string>; // 'YYYY-MM-DD'
  selectedDate: string | null;
  onSelect: (date: string) => void;
  onPrev: () => void;
  onNext: () => void;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export default function CalendarMini({ year, month, eventDates, selectedDate, onSelect, onPrev, onNext }: Props) {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button onClick={onPrev} className="text-xs px-2 py-1 rounded" style={{ color: 'var(--text-secondary)' }}>
          ＜
        </button>
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {year}年{month + 1}月
        </span>
        <button onClick={onNext} className="text-xs px-2 py-1 rounded" style={{ color: 'var(--text-secondary)' }}>
          ＞
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className="text-xs py-1 font-medium"
            style={{ color: i === 0 ? 'var(--danger)' : i === 6 ? '#7ba7ff' : 'var(--text-muted)' }}
          >
            {d}
          </div>
        ))}
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const hasEvent = eventDates.has(dateStr);
          return (
            <button
              key={idx}
              onClick={() => onSelect(dateStr)}
              className="relative text-xs py-1 rounded transition-colors"
              style={{
                backgroundColor: isSelected ? 'var(--accent)' : isToday ? 'var(--bg-secondary)' : 'transparent',
                color: isSelected ? '#fff' : isToday ? 'var(--accent-light)' : 'var(--text-secondary)',
                fontWeight: isToday || isSelected ? 600 : 400,
              }}
            >
              {day}
              {hasEvent && !isSelected && (
                <span
                  className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ backgroundColor: 'var(--accent)' }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
