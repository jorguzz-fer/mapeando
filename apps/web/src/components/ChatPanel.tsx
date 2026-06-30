import { useRef, useState } from 'react';
import { streamChat } from '../api/chat';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content:
        'Olá! Sou o copiloto do Mapeando. Me diga onde você tem uma visita marcada que eu sugiro quem mais vale visitar, a melhor rota e o retorno esperado. Ex.: "Tenho reunião em Pederneiras".',
    },
  ]);
  const [input, setInput] = useState('');
  const [trace, setTrace] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollDown() {
    requestAnimationFrame(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight));
  }

  async function enviar() {
    const mensagem = input.trim();
    if (!mensagem || busy) return;
    setInput('');
    setBusy(true);
    setTrace(null);
    const historico = messages.filter((m) => m.role === 'user' || m.role === 'assistant');
    setMessages((m) => [...m, { role: 'user', content: mensagem }, { role: 'assistant', content: '' }]);
    scrollDown();

    await streamChat({ mensagem, historico }, (e) => {
      if (e.type === 'text' && e.delta) {
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = {
            role: 'assistant',
            content: copy[copy.length - 1]!.content + e.delta,
          };
          return copy;
        });
        setTrace(null);
        scrollDown();
      } else if (e.type === 'trace') {
        setTrace(e.tool ?? null);
      } else if (e.type === 'error') {
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: 'assistant', content: `⚠️ ${e.message}` };
          return copy;
        });
      } else if (e.type === 'done') {
        setBusy(false);
        setTrace(null);
      }
    });
    setBusy(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2 font-semibold text-brand-700">
            <span>💬</span> Copiloto Mapeando
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-auto p-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
              <div
                className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                  m.role === 'user'
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {m.content || (busy ? '…' : '')}
              </div>
            </div>
          ))}
          {trace && <div className="text-xs italic text-slate-400">⚙️ {trace}</div>}
        </div>

        <div className="border-t border-slate-200 p-3">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && enviar()}
              placeholder="Tenho reunião em…"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500"
            />
            <button
              onClick={enviar}
              disabled={busy}
              className="rounded-lg bg-brand-600 px-4 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
