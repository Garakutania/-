export interface Task {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  status: 'todo' | 'done';
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  time?: string;
  description?: string;
}

export interface Memo {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

export interface NewsCache {
  fetchedAt: string;
  summary: string;
  items: NewsItem[];
}
