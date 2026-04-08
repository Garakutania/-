import { Message } from '@/lib/types';

interface Props {
  message: Message;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mr-2 mt-0.5"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          秘
        </div>
      )}
      <div
        className="max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap"
        style={
          isUser
            ? { backgroundColor: 'var(--accent)', color: '#fff', borderBottomRightRadius: 4 }
            : { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', borderBottomLeftRadius: 4, border: '1px solid var(--border)' }
        }
      >
        {message.content}
      </div>
    </div>
  );
}
