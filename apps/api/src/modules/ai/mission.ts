import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env.js';
import { missionSystemPrompt } from './prompts.js';
import { runTool, toolDefinitions } from './tools.js';

/**
 * Missão Comercial: a IA monta o roteiro completo a partir de um objetivo em
 * linguagem natural. Loop de tool-use não-streaming; retorna o texto final.
 */
export async function runMission(params: {
  tenantId: string;
  empresa: string;
  pedido: string;
}): Promise<{ texto: string }> {
  if (!env.ANTHROPIC_API_KEY) {
    return {
      texto:
        'A Missão Comercial usa IA e precisa de ANTHROPIC_API_KEY configurada. ' +
        'Configure a chave para gerar missões automáticas.',
    };
  }
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: params.pedido }];

  for (let turn = 0; turn < 10; turn++) {
    const res = await client.messages.create({
      model: env.ANTHROPIC_MODEL_MISSION,
      max_tokens: 4096,
      system: missionSystemPrompt(params.empresa),
      tools: toolDefinitions,
      messages,
    });
    if (res.stop_reason !== 'tool_use') {
      const texto = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n');
      return { texto };
    }
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const b of res.content) {
      if (b.type !== 'tool_use') continue;
      const out = await runTool(params.tenantId, b.name, b.input as Record<string, unknown>).catch(
        (e) => ({ erro: String((e as Error).message) }),
      );
      results.push({ type: 'tool_result', tool_use_id: b.id, content: JSON.stringify(out) });
    }
    messages.push({ role: 'assistant', content: res.content });
    messages.push({ role: 'user', content: results });
  }
  return { texto: 'Não consegui concluir a missão (muitos passos). Tente um objetivo mais específico.' };
}
