import React from 'react';

interface Props {
  title: string;
  badge?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPad?: boolean;
}

export default function WidgetShell({ title, badge, action, children, className = '', noPad }: Props) {
  return (
    <div
      className={`rounded-xl flex flex-col ${className}`}
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </span>
          {badge && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            >
              {badge}
            </span>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
      {/* Body */}
      <div className={`flex-1 overflow-auto ${noPad ? '' : 'p-4'}`}>{children}</div>
    </div>
  );
}
