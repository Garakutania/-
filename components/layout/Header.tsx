'use client';

import { useEffect, useState } from 'react';

export default function Header() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const dateStr = now
    ? now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
    : '';
  const timeStr = now
    ? now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '';

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: 'var(--accent)' }}>
          秘
        </div>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          秘書アシスタント
        </h1>
      </div>
      <div className="text-right">
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{dateStr}</div>
        <div className="text-xl font-mono font-semibold" style={{ color: 'var(--accent-light)' }}>{timeStr}</div>
      </div>
    </header>
  );
}
