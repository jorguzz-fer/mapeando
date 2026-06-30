import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env.js';
import { systemPrompt } from './prompts.js';
import { runTool, toolDefinitions } from './tools.js';

export interface CopilotEvent {
  type: 'text' | 'trace' | 'done' | 'error';
  delta?: string;
  tool?: string;
  message?: string;
}

export interface CopilotParams {
  tenantId: string;
  empresa: string;
  resumoBase?: string;
  historico: { role: 'user' | 'assistant'; content: string }[];
  mensagem: string;
  contexto?: { cidade?: string; lat?: number; lng?: number };
  model?: string;
}

const TRACE_LABEL: Record<string, string> = {
  resolver_cidade: 'localizando a cidade…',
  buscar_clientes_proximos: 'buscando clientes próximos…',
  obter_cliente: 'consultando o cliente…',
  planejar_rota: 'otimizando a rota…',
  estimar_custos: 'calculando custos e ROI…',
};

/** Executa o copiloto com tool-use, emitindo eventos (SSE). */
export async function runCopilot(
  params: CopilotParams,
  emit: (e: CopilotEvent) => void,
): Promise<void> {
  if (!env.ANTHROPIC_API_KEY) {
    emit({
      type: 'text',
      delta:
        'A IA ainda não está configurada (defina ANTHROPIC_API_KEY). ' +
        'Mesmo assim, você pode planejar viagens e ver o Score na tela de Planejamento.',
    });
    emit({ type: 'done' });
    return;
  }

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const system = systemPrompt({ empresa: params.empresa, resumoBase: params.resumoBase });

  let userText = params.mensagem;
  if (params.contexto?.lat != null && params.contexto?.lng != null) {
    userText += `\n\n[contexto: estou em ${params.contexto.cidade ?? 'minha localização'} (lat ${params.contexto.lat}, lng ${params.contexto.lng})]`;
  }

  const messages: Anthropic.MessageParam[] = [
    ...params.historico.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userText },
  ];

  try {
    for (let turn = 0; turn < 8; turn++) {
      const stream = client.messages.stream({
        model: params.model ?? env.ANTHROPIC_MODEL_CHAT,
        max_tokens: 2048,
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        tools: toolDefinitions,
        messages,
      });
      stream.on('text', (delta) => emit({ type: 'text', delta }));
      const final = await stream.finalMessage();

      if (final.stop_reason !== 'tool_use') {
        emit({ type: 'done' });
        return;
      }

      const toolUses = final.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      );
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        emit({ type: 'trace', tool: TRACE_LABEL[tu.name] ?? tu.name });
        const out = await runTool(params.tenantId, tu.name, tu.input as Record<string, unknown>).catch(
          (e) => ({ erro: String((e as Error).message) }),
        );
        results.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: JSON.stringify(out),
        });
      }
      messages.push({ role: 'assistant', content: final.content });
      messages.push({ role: 'user', content: results });
    }
    emit({ type: 'done' });
  } catch (err) {
    emit({ type: 'error', message: (err as Error).message });
    emit({ type: 'done' });
  }
}
