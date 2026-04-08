import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { Message } from '@/lib/types';

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const { messages } = (await req.json()) as { messages: Message[] };

  // Send only the last 20 messages to avoid token limits
  const trimmed = messages.slice(-20);

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `あなたはプロフェッショナルな秘書アシスタントです。
ユーザーの仕事をサポートし、タスク管理・スケジュール・情報整理などを手伝います。
日本語で簡潔かつ丁寧に回答してください。`,
    messages: trimmed.map((m) => ({ role: m.role, content: m.content })),
  });

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          controller.enqueue(new TextEncoder().encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}
