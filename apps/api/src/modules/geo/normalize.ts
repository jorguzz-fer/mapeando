/** Remove acentos e normaliza para maiúsculas, colapsa espaços. */
export function norm(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Só dígitos (CNPJ/CPF/CEP/telefone). */
export function digits(s: string | null | undefined): string {
  return (s ?? '').replace(/\D+/g, '');
}

/** Monta um endereço textual para geocodificar. */
export function buildAddress(c: {
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  uf?: string | null;
  cep?: string | null;
}): string {
  const parts = [
    [c.logradouro, c.numero].filter(Boolean).join(', '),
    c.bairro,
    [c.municipio, c.uf].filter(Boolean).join(' - '),
    c.cep ? `CEP ${c.cep}` : null,
    'Brasil',
  ].filter((p) => p && String(p).trim());
  return parts.join(', ');
}

/** Chave de cache estável para um endereço. */
export function addressKey(c: Parameters<typeof buildAddress>[0]): string {
  return norm(buildAddress(c));
}
