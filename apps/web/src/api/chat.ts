import type { ChatRequest } from '@mapeando/shared';

export interface ChatEvent {
  type: 'text' | 'trace' | 'done' | 'error';
  delta?: string;
  tool?: string;
  message?: string;
}

/** Faz POST no chat (SSE) e entrega eventos incrementais ao callback. */
export async function streamChat(body: ChatRequest, onEvent: (e: ChatEvent) => void): Promise<void> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.body) {
    onEvent({ type: 'error', message: 'Sem resposta do servidor' });
    onEvent({ type: 'done' });
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith('data:')) continue;
      try {
        onEvent(JSON.parse(line.slice(5).trim()) as ChatEvent);
      } catch {
        /* ignora linha malformada */
      }
    }
  }
}
