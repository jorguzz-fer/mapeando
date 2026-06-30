import type { WhatsappMessage } from '@mapeando/shared';
import { digits } from '../geo/normalize.js';
import { clientsService } from '../clients/clients.service.js';

/** Gera uma mensagem de WhatsApp pronta + link wa.me. */
export async function gerarWhatsapp(
  tenantId: string,
  input: { clientId: string; cidade: string; data?: string; hora?: string },
): Promise<WhatsappMessage> {
  const c = await clientsService.get(tenantId, input.clientId);
  if (!c) return { texto: '', telefone: null, link: null };

  const primeiroNome = (c.nome || 'tudo bem').split(' ')[0];
  const quando = input.data ? `no dia ${input.data}` : 'na próxima semana';
  const horario = input.hora ? ` Tenho disponibilidade às ${input.hora}.` : '';
  const texto =
    `Olá, ${primeiroNome}! Tudo bem? ` +
    `Estarei em ${input.cidade} ${quando} e gostaria de aproveitar para fazer uma visita rápida.` +
    `${horario} Podemos agendar um horário?`;

  const tel = digits(c.telefone1 ?? c.telefone2);
  const telefone = c.telefone1 ?? c.telefone2 ?? null;
  // wa.me exige DDI; assume Brasil (55) quando faltar.
  const numero = tel ? (tel.length <= 11 ? `55${tel}` : tel) : null;
  const link = numero ? `https://wa.me/${numero}?text=${encodeURIComponent(texto)}` : null;

  return { texto, telefone, link };
}
