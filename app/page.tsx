import Header from '@/components/layout/Header';
import TaskWidget from '@/components/tasks/TaskWidget';
import ScheduleWidget from '@/components/schedule/ScheduleWidget';
import MemoWidget from '@/components/memo/MemoWidget';
import ChatWidget from '@/components/chat/ChatWidget';
import NewsWidget from '@/components/news/NewsWidget';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Header />
      <main className="flex-1 p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 h-full">
          {/* Left column */}
          <div className="flex flex-col gap-4 lg:gap-5">
            <TaskWidget />
            <ScheduleWidget />
          </div>
          {/* Center column */}
          <div className="flex flex-col gap-4 lg:gap-5">
            <ChatWidget />
            <MemoWidget />
          </div>
          {/* Right column */}
          <div className="flex flex-col gap-4 lg:gap-5">
            <NewsWidget />
          </div>
        </div>
      </main>
    </div>
  );
}
