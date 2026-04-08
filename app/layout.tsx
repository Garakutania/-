import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '秘書アシスタント',
  description: 'タスク・スケジュール・メモ・AI会話・ニュースを一括管理',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
