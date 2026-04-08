'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Message } from '@/lib/types';
import MessageBubble from './MessageBubble';
import WidgetShell from '../layout/WidgetShell';

export default function ChatWidget() {
  const [messages, setMessages] = useLocalStorage<Message[]>('secretary-messages', []);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setIsLoading(true);
    setStreaming('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.body) throw new Error('no body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setStreaming(accumulated);
      }

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: accumulated,
        timestamp: new Date().toISOString(),
      };
      setMessages([...next, assistantMsg]);
    } catch {
      const errMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'エラーが発生しました。ANTHROPIC_API_KEYが設定されているか確認してください。',
        timestamp: new Date().toISOString(),
      };
      setMessages([...next, errMsg]);
    } finally {
      setIsLoading(false);
      setStreaming('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => setMessages([]);

  return (
    <WidgetShell
      title="AI秘書"
      action={
        messages.length > 0 ? (
          <button onClick={clearChat} className="text-xs" style={{ color: 'var(--text-muted)' }}>
            クリア
          </button>
        ) : undefined
      }
      noPad
      className="flex-1"
    >
      <div className="flex flex-col h-80">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 && !streaming && (
            <div className="h-full flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ backgroundColor: 'var(--accent)' }}>
                秘
              </div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>何でもお気軽にどうぞ</p>
            </div>
          )}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          {streaming && (
            <MessageBubble
              message={{ id: 'streaming', role: 'assistant', content: streaming + '▋', timestamp: '' }}
            />
          )}
          <div ref={bottomRef} />
        </div>
        {/* Input */}
        <div className="flex items-end gap-2 p-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <textarea
            className="flex-1 bg-transparent text-sm outline-none resize-none"
            style={{ color: 'var(--text-primary)', maxHeight: 80 }}
            rows={1}
            placeholder="メッセージを入力... (Enter で送信)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-opacity"
            style={{
              backgroundColor: 'var(--accent)',
              color: '#fff',
              opacity: isLoading || !input.trim() ? 0.5 : 1,
            }}
          >
            {isLoading ? '...' : '送信'}
          </button>
        </div>
      </div>
    </WidgetShell>
  );
}
